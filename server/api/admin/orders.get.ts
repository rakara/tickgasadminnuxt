/**
 * GET /api/admin/orders
 * Paginated, filterable order list with stats summary.
 */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { status, supplierId, date, search, page = '1', limit = '15' } =
    getQuery(event) as Record<string, string>

  const db       = useSupabaseAdmin()
  const pageNum  = Math.max(1, parseInt(page, 10)  || 1)
  const pageSize = Math.max(1, parseInt(limit, 10) || 15)
  const from     = (pageNum - 1) * pageSize
  const to       = from + pageSize - 1

  // ── Stats (lightweight, full dataset) ───────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [
    { count: totalCount },
    { count: todayCount },
    { count: pendingCount },
    { count: deliveredCount },
  ] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
  ])

  // ── Filtered, paginated query ────────────────────────────────────────────────
  let q = db
    .from('orders')
    .select('*, users (name, phone), suppliers (name)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status)     q = q.eq('status', status)
  if (supplierId) q = q.eq('supplier_id', supplierId)
  if (search)     q = q.ilike('order_number', `%${search}%`)
  if (date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    q = q.gte('created_at', d.toISOString()).lte('created_at', end.toISOString())
  }

  q = q.range(from, to)

  const { data: orders, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    success: true,
    orders:  orders ?? [],
    total:   count  ?? 0,
    page:    pageNum,
    limit:   pageSize,
    stats: {
      total:     totalCount     ?? 0,
      today:     todayCount     ?? 0,
      pending:   pendingCount   ?? 0,
      delivered: deliveredCount ?? 0,
    },
  }
})
