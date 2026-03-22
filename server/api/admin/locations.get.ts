/** GET /api/admin/locations — paginated service locations (public, no auth) */

export default defineEventHandler(async (event) => {
  const { search, active, page = '1', limit = '20' } =
    getQuery(event) as Record<string, string>

  const db       = useSupabaseAdmin()
  const pageNum  = Math.max(1, parseInt(page,  10) || 1)
  const pageSize = Math.max(1, parseInt(limit, 10) || 20)
  const from     = (pageNum - 1) * pageSize
  const to       = from + pageSize - 1

  let q = db
    .from('service_locations')
    .select('id, name, area, latitude, longitude, active, created_at', { count: 'exact' })
    .order('name')

  if (active !== undefined && active !== '') q = q.eq('active', active === 'true')
  if (search) q = q.or(`name.ilike.%${search}%,area.ilike.%${search}%`)

  q = q.range(from, to)

  const { data: locations, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
    db.from('service_locations').select('*', { count: 'exact', head: true }),
    db.from('service_locations').select('*', { count: 'exact', head: true }).eq('active', true),
  ])

  return {
    success:   true,
    locations: locations ?? [],
    total:     count     ?? 0,
    page:      pageNum,
    limit:     pageSize,
    summary:   { total: totalCount ?? 0, active: activeCount ?? 0 },
  }
})
