/**
 * GET /api/admin/dashboard
 * Returns platform-wide KPIs, revenue chart data, order status counts, and
 * recent orders for the admin dashboard.
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 *
 * Query params:
 *   period — 'week' | 'month' | 'year' (default: 'week')
 *
 * Response shape:
 *   success       {boolean}
 *   stats         {object}  — totalRevenue, totalOrders, activeSuppliers,
 *                             pendingApprovals, revenueGrowth, ordersGrowth, newSuppliers
 *   revenueData   {number[]} — daily/monthly revenue values
 *   labels        {string[]} — corresponding date labels
 *   statusCounts  {object}  — per-status order counts
 *   recentOrders  {array}
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Protect endpoint — admin token required
  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    const { period = 'week' } = req.query;

    // ── Date boundaries ─────────────────────────────────────────────────────
    const now       = new Date();
    const periodStart = new Date();
    if      (period === 'week')  periodStart.setDate(now.getDate() - 7);
    else if (period === 'month') periodStart.setMonth(now.getMonth() - 1);
    else                         periodStart.setFullYear(now.getFullYear() - 1);

    // Previous period (same length) for growth calculations
    const periodLengthMs = now - periodStart;
    const prevStart = new Date(periodStart.getTime() - periodLengthMs);
    const prevEnd   = new Date(periodStart.getTime() - 1); // one ms before current period

    // ── Parallel queries ─────────────────────────────────────────────────────
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
      { data: recentOrders }
    ] = await Promise.all([
      // All-time paid orders → total revenue
      supabaseAdmin.from('orders').select('total_amount').eq('payment_status', 'paid'),

      // Current period paid orders → period revenue
      supabaseAdmin.from('orders').select('total_amount, created_at').eq('payment_status', 'paid')
        .gte('created_at', periodStart.toISOString()),

      // Previous period paid orders → growth comparison
      supabaseAdmin.from('orders').select('total_amount').eq('payment_status', 'paid')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),

      // Total order count (all time)
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),

      // Previous period total order count (for growth %)
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString()),

      // Verified (active) suppliers
      supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }).eq('verified', true),

      // Pending supplier applications
      supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

      // New suppliers registered in current period
      supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true })
        .gte('created_at', periodStart.toISOString()),

      // Status column for all orders (lightweight — used for status breakdown)
      supabaseAdmin.from('orders').select('status'),

      // Ten most recent orders with related names
      supabaseAdmin.from('orders')
        .select('*, users (name, phone), suppliers (name)')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // ── Revenue calculations ─────────────────────────────────────────────────
    const sum           = (rows) => rows?.reduce((s, o) => s + Number(o.total_amount), 0) || 0;
    const totalRevenue  = sum(allPaid);
    const periodRevenue = sum(periodPaid);
    const prevRevenue   = sum(prevPaid);

    // Growth percentages — show 0 when there's no prior period data
    const revenueGrowth = prevRevenue
      ? ((periodRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
      : 0;
    const currentOrderCount = totalOrders || 0;
    const ordersGrowth = prevOrderCount
      ? ((currentOrderCount - prevOrderCount) / prevOrderCount * 100).toFixed(1)
      : 0;

    // ── Status breakdown from single query ───────────────────────────────────
    const statusMap = { pending: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 };
    (statusRows || []).forEach(r => {
      if (r.status in statusMap) statusMap[r.status]++;
    });

    // ── Revenue chart: bucket periodPaid into date segments ─────────────────
    const bucketCount = period === 'year' ? 12 : period === 'month' ? 30 : 7;
    const labels      = [];
    const revenueData = [];

    for (let i = 0; i < bucketCount; i++) {
      const d = new Date();
      let bucketStart, bucketEnd, label;

      if (period === 'year') {
        d.setMonth(d.getMonth() - (bucketCount - 1 - i));
        bucketStart = new Date(d.getFullYear(), d.getMonth(), 1);
        bucketEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        label       = d.toLocaleDateString('en-KE', { month: 'short' });
      } else {
        d.setDate(d.getDate() - (bucketCount - 1 - i));
        bucketStart = new Date(d); bucketStart.setHours(0, 0, 0, 0);
        bucketEnd   = new Date(d); bucketEnd.setHours(23, 59, 59, 999);
        label = period === 'week'
          ? d.toLocaleDateString('en-KE', { weekday: 'short' })
          : d.getDate().toString();
      }

      const bucketTotal = (periodPaid || [])
        .filter(o => { const t = new Date(o.created_at); return t >= bucketStart && t <= bucketEnd; })
        .reduce((s, o) => s + Number(o.total_amount), 0);

      labels.push(label);
      revenueData.push(bucketTotal);
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders:       currentOrderCount,
        activeSuppliers:   activeSuppliers   || 0,
        pendingApprovals:  pendingApprovals  || 0,
        revenueGrowth,
        ordersGrowth,
        newSuppliers:      newSuppliers      || 0
      },
      revenueData,
      labels,
      statusCounts: statusMap,
      recentOrders: recentOrders || []
    });
  } catch (error) {
    console.error('[admin/dashboard] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
