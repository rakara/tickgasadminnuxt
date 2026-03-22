/**
 * GET /api/admin/suppliers — paginated list + summary counts
 */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { status, verified, search, page = '1', limit = '15' } =
    getQuery(event) as Record<string, string>

  const db       = useSupabaseAdmin()
  const pageNum  = Math.max(1, parseInt(page,  10) || 1)
  const pageSize = Math.max(1, parseInt(limit, 10) || 15)
  const from     = (pageNum - 1) * pageSize
  const to       = from + pageSize - 1

  // Summary counts
  const [
    { count: total },
    { count: pending },
    { count: approved },
    { count: rejected },
    { count: verifiedCount },
  ] = await Promise.all([
    db.from('suppliers').select('*', { count: 'exact', head: true }),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('verified', true),
  ])

  let q = db
    .from('suppliers')
    .select(
      'id, name, phone, email, location, status, verified, ' +
      'delivery_radius_km, delivery_time_min, base_price_6kg, base_price_13kg, ' +
      'onboarded_by, onboarding_ref, onboarded_at, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })

  if (status)               q = q.eq('status', status)
  if (verified !== undefined && verified !== '') q = q.eq('verified', verified === 'true')
  if (search)               q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,location.ilike.%${search}%`)

  q = q.range(from, to)

  const { data: suppliers, error, count: filteredTotal } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    success:   true,
    suppliers: suppliers ?? [],
    total:     filteredTotal ?? 0,
    page:      pageNum,
    limit:     pageSize,
    summary:   { total: total ?? 0, pending: pending ?? 0, approved: approved ?? 0, rejected: rejected ?? 0, verified: verifiedCount ?? 0 },
  }
})
