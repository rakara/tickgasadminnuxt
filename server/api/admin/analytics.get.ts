/** GET /api/admin/analytics — platform KPIs */

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const db = useSupabaseAdmin()

  const [
    { count: totalOrders },
    { data: paidOrders },
    { count: activeSuppliers },
    { count: pendingApprovals },
    { data: recentOrders },
  ] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('orders').select('total_amount').eq('payment_status', 'paid'),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('verified', true),
    db.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('orders')
      .select('*, suppliers (name), users (phone)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalRevenue = (paidOrders as Array<{ total_amount: number }> | null)
    ?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0

  return {
    success: true,
    analytics: {
      totalOrders:      totalOrders      ?? 0,
      totalRevenue,
      activeSuppliers:  activeSuppliers  ?? 0,
      pendingApprovals: pendingApprovals ?? 0,
      recentOrders:     recentOrders     ?? [],
    },
  }
})
