/** GET /api/admin/agents — paginated agent list */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { status, search, page = '1', limit = '20' } =
    getQuery(event) as Record<string, string>

  const db       = useSupabaseAdmin()
  const pageNum  = Math.max(1, parseInt(page,  10) || 1)
  const pageSize = Math.max(1, parseInt(limit, 10) || 20)
  const from     = (pageNum - 1) * pageSize
  const to       = from + pageSize - 1

  let q = db
    .from('agents')
    .select(
      'id, name, phone, email, region, status, suspension_reason, created_at, last_login',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,region.ilike.%${search}%`)

  q = q.range(from, to)

  const { data: agents, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    success: true,
    agents:  agents ?? [],
    total:   count  ?? 0,
    page:    pageNum,
    limit:   pageSize,
  }
})
