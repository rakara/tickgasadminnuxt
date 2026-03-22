/**
 * GET  /api/admin/orders  — paginated order list with filters and stats
 * PUT  /api/admin/orders  — update an order's status
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 *
 * CORS: restricted to ALLOWED_ORIGIN env var (not wildcard).
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  // Restrict CORS to the configured frontend origin only
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // All methods on this route require admin auth
  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    switch (req.method) {
      case 'GET': return await getOrders(req, res);
      case 'PUT': return await updateOrderStatus(req, res);
      default:    return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[admin/orders] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Returns a paginated, filterable list of orders.
 * Stats (totals / today / pending / delivered) are derived from a separate
 * lightweight query so they always reflect the full dataset, not just the
 * current filter window.
 */
async function getOrders(req, res) {
  const { status, supplierId, date, search, page = 1, limit = 15 } = req.query;

  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 15);
  const from     = (pageNum - 1) * pageSize;
  const to       = from + pageSize - 1;

  // ── Build filtered query ──────────────────────────────────────────────────
  let query = supabaseAdmin
    .from('orders')
    .select('*, users (name, phone), suppliers (name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status)     query = query.eq('status', status);
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (search)     query = query.ilike('order_number', `%${search}%`);

  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);
    query = query.gte('created_at', start.toISOString())
                 .lte('created_at', end.toISOString());
  }

  // Apply DB-level pagination — avoids loading all rows into Node memory
  query = query.range(from, to);

  const { data: orders, error: fetchError, count: total } = await query;

  if (fetchError) {
    console.error('[admin/orders] Fetch error:', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }

  // ── Stats: four targeted COUNT queries — no full-table row loads ─────────
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [
    { count: statsTotal },
    { count: statsToday },
    { count: statsPending },
    { count: statsCompleted }
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')
  ]);

  const stats = {
    total:     statsTotal     || 0,
    today:     statsToday     || 0,
    pending:   statsPending   || 0,
    completed: statsCompleted || 0
  };

  return res.status(200).json({
    orders: orders || [],
    total:  total  || 0,
    page:   pageNum,
    limit:  pageSize,
    stats
  });
}

/**
 * Updates an order's status and appends a tracking entry.
 * Timestamps (confirmed_at, delivered_at, cancelled_at) are set automatically
 * when the matching status is applied.
 */
async function updateOrderStatus(req, res) {
  const { orderId, status, notes } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ error: 'Order ID and status required' });
  }

  const validStatuses = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Build timestamp fields for this transition
  const timestampFields = {};
  if (status === 'confirmed')        timestampFields.confirmed_at  = new Date();
  if (status === 'delivered')        timestampFields.delivered_at  = new Date();
  if (status === 'cancelled')        timestampFields.cancelled_at  = new Date();

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .update({ status, ...timestampFields })
    .eq('id', orderId)
    .select()
    .single();

  if (orderError) {
    if (orderError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('[admin/orders] Update error:', orderError);
    return res.status(500).json({ error: orderError.message });
  }

  // Append tracking entry (non-blocking — don't fail the response if this errors)
  await supabaseAdmin.from('order_tracking').insert([{
    order_id: orderId,
    status,
    notes: notes || `Order status updated to ${status} by admin`
  }]);

  return res.status(200).json({ order });
}
