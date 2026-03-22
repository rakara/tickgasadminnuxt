/**
 * PUT /api/admin/suppliers — update status and/or verified flag
 */

export default defineEventHandler(async (event) => {
  const adminPayload = requireAdmin(event)

  const { supplierId, status, verified } = await readBody(event)

  if (!supplierId) throw createError({ statusCode: 400, message: 'supplierId is required' })

  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    const valid = ['pending', 'approved', 'rejected', 'suspended']
    if (!valid.includes(status)) {
      throw createError({ statusCode: 400, message: `status must be one of: ${valid.join(', ')}` })
    }
    updates.status = status
    if (status === 'approved') updates.verified = true
    if (status === 'rejected' || status === 'suspended') updates.verified = false
  }

  if (verified !== undefined) updates.verified = verified

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const db = useSupabaseAdmin()

  const { data: supplier, error } = await db
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select('id, name, phone, status, verified')
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw createError({ statusCode: 404, message: 'Supplier not found' })
    throw createError({ statusCode: 500, message: error.message })
  }

  await db.from('admin_actions').insert([{
    admin_email: (adminPayload as { email: string }).email,
    action: `${status || 'update'}_supplier`, target_id: supplierId, target_type: 'supplier',
    details: { status, verified },
  }]).catch((e: Error) => console.warn('[suppliers] audit log failed:', e.message))

  return { success: true, supplier }
})
