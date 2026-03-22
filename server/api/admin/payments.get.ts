/** GET /api/admin/payments — paginated M-PESA transactions + revenue summary */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { status, startDate, endDate, page = '1', limit = '15' } =
    getQuery(event) as Record<string, string>

  const db       = useSupabaseAdmin()
  const pageNum  = Math.max(1, parseInt(page,  10) || 1)
  const pageSize = Math.max(1, parseInt(limit, 10) || 15)
  const from     = (pageNum - 1) * pageSize
  const to       = from + pageSize - 1

  // Revenue summary
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [{ data: allCompleted }, { data: monthCompleted }] = await Promise.all([
    db.from('mpesa_transactions').select('amount').eq('status', 'completed'),
    db.from('mpesa_transactions').select('amount').eq('status', 'completed')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString()),
  ])

  const sum = (rows: Array<{ amount: number }> | null) =>
    rows?.reduce((s, t) => s + (Number(t.amount) || 0), 0) ?? 0

  const totalRevenue   = sum(allCompleted as Array<{ amount: number }>)
  const monthlyRevenue = sum(monthCompleted as Array<{ amount: number }>)
  const commission     = totalRevenue * 0.05

  // Paginated transaction list
  let q = db
    .from('mpesa_transactions')
    .select('*, orders (order_number, total_amount, users (name), suppliers (name))', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)

  if (startDate) {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0)
    q = q.gte('created_at', s.toISOString())
  }
  if (endDate) {
    const e = new Date(endDate); e.setHours(23, 59, 59, 999)
    q = q.lte('created_at', e.toISOString())
  }

  q = q.range(from, to)

  const { data: transactions, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    success:      true,
    transactions: transactions ?? [],
    total:        count        ?? 0,
    page:         pageNum,
    limit:        pageSize,
    summary: {
      totalRevenue,
      monthlyRevenue,
      commission,
      totalTransactions: count ?? 0,
    },
  }
})
