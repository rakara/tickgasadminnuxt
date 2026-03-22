/**
 * GET /api/admin/dashboard
 * KPIs, revenue chart, order status counts, recent orders.
 * Query: period = 'week' | 'month' | 'year'
 */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const { period = 'week' } = getQuery(event) as { period?: string }
  const db  = useSupabaseAdmin()
  const now = new Date()

  // ── Date boundaries ─────────────────────────────────────────────────────────
  const periodStart = new Date()
  if      (period === 'week')  periodStart.setDate(now.getDate() - 7)
  else if (period === 'month') periodStart.setMonth(now.getMonth() - 1)
  else                         periodStart.setFullYear(now.getFullYear() - 1)

  const periodLengthMs = now.getTime() - periodStart.getTime()
  const prevStart = new Date(periodStart.getTime() - periodLengthMs)
  const prevEnd   = new Date(periodStart.getTime() - 1)

  // ── Parallel queries ─────────────────────────────────────────────────────────
  const [
    { data: allPaid },
    { data: periodPaid },
    { data: prevPaid },
    { count: totalOrders },
    { count: prevOrderCount },
    { count: activeSuppliers },
    { count: pendingApprovals },
    { count: newSuppliers },
    { data: statusRows },
    { data: recentOrders },
  ] = await Promise.all([
    db.from('orders').select('total_amount').eq('payment_status', 'paid'),
    db.from('orders').select('total_amount, created_at').eq('payment_status', 'paid').gte('created_at', periodStart.toISOString()),
    db.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('verified', true),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('suppliers').select('*', { count: 'exact', head: true }).gte('created_at', periodStart.toISOString()),
    db.from('orders').select('status'),
    db.from('orders').select('*, users (name, phone), suppliers (name)').order('created_at', { ascending: false }).limit(10),
  ])

  // ── Revenue ──────────────────────────────────────────────────────────────────
  const sum = (rows: Array<{ total_amount: number }> | null) =>
    rows?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0

  const totalRevenue  = sum(allPaid as Array<{ total_amount: number }>)
  const periodRevenue = sum(periodPaid as Array<{ total_amount: number }>)
  const prevRevenue   = sum(prevPaid as Array<{ total_amount: number }>)
  const revenueGrowth = prevRevenue ? ((periodRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0
  const currentOrderCount = totalOrders ?? 0
  const ordersGrowth = prevOrderCount ? ((currentOrderCount - (prevOrderCount ?? 0)) / (prevOrderCount ?? 1) * 100).toFixed(1) : 0

  // ── Status breakdown ─────────────────────────────────────────────────────────
  const statusMap: Record<string, number> = { pending: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 }
  ;(statusRows ?? []).forEach((r: { status: string }) => { if (r.status in statusMap) statusMap[r.status]++ })

  // ── Revenue chart ────────────────────────────────────────────────────────────
  const bucketCount = period === 'year' ? 12 : period === 'month' ? 30 : 7
  const labels: string[]      = []
  const revenueData: number[] = []

  for (let i = 0; i < bucketCount; i++) {
    const d = new Date()
    let bucketStart: Date, bucketEnd: Date, label: string

    if (period === 'year') {
      d.setMonth(d.getMonth() - (bucketCount - 1 - i))
      bucketStart = new Date(d.getFullYear(), d.getMonth(), 1)
      bucketEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      label       = d.toLocaleDateString('en-KE', { month: 'short' })
    } else {
      d.setDate(d.getDate() - (bucketCount - 1 - i))
      bucketStart = new Date(d); bucketStart.setHours(0, 0, 0, 0)
      bucketEnd   = new Date(d); bucketEnd.setHours(23, 59, 59, 999)
      label = period === 'week'
        ? d.toLocaleDateString('en-KE', { weekday: 'short' })
        : String(d.getDate())
    }

    const bucketTotal = ((periodPaid as Array<{ total_amount: number, created_at: string }>) ?? [])
      .filter(o => { const t = new Date(o.created_at); return t >= bucketStart && t <= bucketEnd })
      .reduce((s, o) => s + Number(o.total_amount), 0)

    labels.push(label)
    revenueData.push(bucketTotal)
  }

  return {
    success: true,
    stats: {
      totalRevenue,
      totalOrders:      currentOrderCount,
      activeSuppliers:  activeSuppliers  ?? 0,
      pendingApprovals: pendingApprovals ?? 0,
      revenueGrowth,
      ordersGrowth,
      newSuppliers:     newSuppliers     ?? 0,
    },
    revenueData,
    labels,
    statusCounts: statusMap,
    recentOrders: recentOrders ?? [],
  }
})
