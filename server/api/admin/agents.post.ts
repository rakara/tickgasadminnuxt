/** POST /api/admin/agents — create a new agent */

import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const adminPayload = requireAdmin(event)

  const { name, phone, pin, email, region } = await readBody(event)

  if (!name || !phone || !pin) {
    throw createError({ statusCode: 400, message: 'name, phone, and pin are required' })
  }
  if (String(pin).length < 4) {
    throw createError({ statusCode: 400, message: 'PIN must be at least 4 digits' })
  }

  const db      = useSupabaseAdmin()
  const cleaned = normalisePhone(phone)

  const { data: existing } = await db.from('agents').select('id').eq('phone', cleaned).maybeSingle()
  if (existing) throw createError({ statusCode: 409, message: 'An agent with this phone number already exists' })

  const pinHash = await bcrypt.hash(String(pin), 12)

  const { data: adminRow } = await db
    .from('admins')
    .select('id')
    .eq('email', (adminPayload as { email: string }).email)
    .maybeSingle()

  const { data: agent, error } = await db
    .from('agents')
    .insert([{
      name,
      phone:      cleaned,
      email:      email  || null,
      pin_hash:   pinHash,
      region:     region || null,
      status:     'active',
      created_by: (adminRow as { id: string } | null)?.id || null,
    }])
    .select('id, name, phone, email, region, status, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await db.from('admin_actions').insert([{
    admin_email: (adminPayload as { email: string }).email,
    action: 'create_agent', target_id: agent.id, target_type: 'agent',
    details: { name, phone: cleaned, region },
  }]).catch((e: Error) => console.warn('[agents] audit log failed:', e.message))

  setResponseStatus(event, 201)
  return { success: true, agent }
})
