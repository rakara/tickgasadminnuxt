/**
 * POST /api/admin/suppliers — create a new supplier
 */

import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const adminPayload = requireAdmin(event)

  const { name, phone, pin, email, location, delivery_radius_km, delivery_time_min } =
    await readBody(event)

  if (!name || !phone || !pin) {
    throw createError({ statusCode: 400, message: 'name, phone, and pin are required' })
  }
  if (String(pin).length < 4) {
    throw createError({ statusCode: 400, message: 'PIN must be at least 4 digits' })
  }

  const db      = useSupabaseAdmin()
  const cleaned = normalisePhone(phone)

  const { data: existing } = await db.from('suppliers').select('id').eq('phone', cleaned).maybeSingle()
  if (existing) throw createError({ statusCode: 409, message: 'A supplier with this phone number already exists' })

  const pinHash = await bcrypt.hash(String(pin), 12)

  const { data: supplier, error } = await db
    .from('suppliers')
    .insert([{
      name,
      phone:              cleaned,
      email:              email              || null,
      pin_hash:           pinHash,
      location:           location           || 'Nairobi',
      delivery_radius_km: delivery_radius_km || 5,
      delivery_time_min:  delivery_time_min  || 30,
      verified:           false,
      status:             'pending',
    }])
    .select('id, name, phone, email, location, status, verified, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await db.from('admin_actions').insert([{
    admin_email: (adminPayload as { email: string }).email,
    action: 'create_supplier', target_id: supplier.id, target_type: 'supplier',
    details: { name, phone: cleaned },
  }]).catch((e: Error) => console.warn('[suppliers] audit log failed:', e.message))

  setResponseStatus(event, 201)
  return { success: true, supplier }
})
