/**
 * GET /api/admin/orders/[id]
 * Returns the full detail view of a single order, including tracking history,
 * M-PESA transaction, and related supplier/user records.
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 *
 * CORS: restricted to ALLOWED_ORIGIN env var (not wildcard).
 */

import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  // Protect endpoint — admin token required
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const { id } = req.query;

  if (!id) return res.status(400).json({ error: 'Order ID required' });

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        users (name, phone),
        suppliers (name, phone, location),
        mpesa_transactions (mpesa_receipt_number, transaction_date, amount, status),
        order_tracking (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      // PGRST116 = row not found
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      console.error('[admin/orders/id] DB error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error('[admin/orders/id] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
