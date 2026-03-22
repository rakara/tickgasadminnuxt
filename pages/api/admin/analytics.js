/**
 * GET /api/admin/analytics
 * Returns platform-wide KPI figures for the admin dashboard overview.
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protect endpoint — admin token required
  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    // Total order count
    const { count: totalOrders } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Revenue from paid orders only
    const { data: paidOrders } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'paid');

    const totalRevenue = paidOrders?.reduce(
      (sum, order) => sum + Number(order.total_amount), 0
    ) || 0;

    // Active (verified) suppliers
    const { count: activeSuppliers } = await supabaseAdmin
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true);

    // Suppliers awaiting admin review
    const { count: pendingApprovals } = await supabaseAdmin
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Ten most recent orders with related names
    const { data: recentOrders } = await supabaseAdmin
      .from('orders')
      .select('*, suppliers (name), users (phone)')
      .order('created_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      success: true,
      analytics: {
        totalOrders,
        totalRevenue,
        activeSuppliers,
        pendingApprovals,
        recentOrders
      }
    });
  } catch (error) {
    console.error('[admin/analytics] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
