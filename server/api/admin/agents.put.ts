/** PUT /api/admin/agents — update agent status (activate / suspend) */

export default defineEventHandler(async (event) => {
  const adminPayload = requireAdmin(event)

  const { agentId, status, suspension_reason } = await readBody(event)

  if (!agentId) throw createError({ statusCode: 400, message: 'agentId is required' })

  const validStatuses = ['active', 'suspended', 'inactive']
  if (!status || !validStatuses.includes(status)) {
    throw createError({ statusCode: 400, message: `status must be one of: ${validStatuses.join(', ')}` })
  }

  if (status === 'suspended' && !suspension_reason?.trim()) {
    throw createError({ statusCode: 400, message: 'A suspension reason is required' })
  }

  const db = useSupabaseAdmin()

  const updates = {
    status,
    suspension_reason: status === 'suspended' ? suspension_reason.trim() : null,
  }

  const { data: agent, error } = await db
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select('id, name, phone, status, suspension_reason')
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw createError({ statusCode: 404, message: 'Agent not found' })
    throw createError({ statusCode: 500, message: error.message })
  }

  await db.from('admin_actions').insert([{
    admin_email: (adminPayload as { email: string }).email,
    action: `${status}_agent`, target_id: agentId, target_type: 'agent',
    details: { status, reason: suspension_reason || null },
  }]).catch((e: Error) => console.warn('[agents] audit log failed:', e.message))

  return { success: true, agent }
})
