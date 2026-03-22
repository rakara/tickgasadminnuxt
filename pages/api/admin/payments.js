/**
 * GET /api/admin/payments
 * Returns a paginated list of M-PESA transactions with summary revenue stats.
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 *
 * CORS: restricted to ALLOWED_ORIGIN env var (not wildcard).
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  // Protect endpoint — admin token required
  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    const { status, startDate, endDate, page = 1, limit = 15 } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 15);
    const from     = (pageNum - 1) * pageSize;
    const to       = from + pageSize - 1;

    // ── Revenue summary: targeted queries — no full-table row loads ──────────
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Supabase does not expose SUM() directly via the REST API, so we fetch
    // only the amount column for completed transactions and sum in JS.
    // This is bounded to completed transactions only (a subset), which is
    // acceptable. A Postgres RPC would be more efficient at very large scale.
    const [
      { data: allCompleted, error: summaryError },
      { data: monthCompleted }
    ] = await Promise.all([
      supabaseAdmin.from('mpesa_transactions').select('amount').eq('status', 'completed'),
      supabaseAdmin.from('mpesa_transactions').select('amount').eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
    ]);

    if (summaryError) {
      console.error('[admin/payments] Summary query error:', summaryError);
      return res.status(500).json({ error: 'Failed to fetch summary data' });
    }

    const totalRevenue   = allCompleted?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    const monthlyRevenue = monthCompleted?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
    const commission     = totalRevenue * 0.05;

    // ── Paginated transaction list ────────────────────────────────────────────
    let query = supabaseAdmin
      .from('mpesa_transactions')
      .select(
        '*, orders (order_number, total_amount, users (name), suppliers (name))',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status)    query = query.eq('status', status);

    if (startDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    }

    if (endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    // DB-level pagination — avoids pulling all transactions into memory
    query = query.range(from, to);

    const { data: transactions, error: fetchError, count: total } = await query;

    if (fetchError) {
      console.error('[admin/payments] Fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    return res.status(200).json({
      transactions: transactions || [],
      total:        total        || 0,
      page:         pageNum,
      limit:        pageSize,
      summary: {
        totalRevenue,
        monthlyRevenue,
        commission
      }
    });
  } catch (error) {
    console.error('[admin/payments] Unhandled error:', error);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
}
