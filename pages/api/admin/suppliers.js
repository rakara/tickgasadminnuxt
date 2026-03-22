/**
 * GET    /api/admin/suppliers  — paginated list with summary counts
 * POST   /api/admin/suppliers  — create a new supplier (admin-direct, no agent)
 * PATCH  /api/admin/suppliers  — edit supplier details
 * PUT    /api/admin/suppliers  — update status / verified flag
 * DELETE /api/admin/suppliers  — permanently delete a supplier
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin }  from '../../../lib/auth';
import bcrypt            from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    switch (req.method) {
      case 'GET':    return await getSuppliers(req, res);
      case 'POST':   return await createSupplier(req, res, payload);
      case 'PATCH':  return await editSupplier(req, res, payload);
      case 'PUT':    return await updateStatus(req, res, payload);
      case 'DELETE': return await deleteSupplier(req, res, payload);
      default:       return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('[admin/suppliers] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalisePhone(phone) {
  let c = phone.replace(/\D/g, '');
  if (c.startsWith('0'))                         c = '254' + c.slice(1);
  else if (c.startsWith('7') && c.length === 9)  c = '254' + c;
  else if (!c.startsWith('254'))                  c = '254' + c;
  return c;
}

async function auditLog(adminEmail, action, targetId, details = {}) {
  try {
    await supabaseAdmin.from('admin_actions').insert([{
      admin_email: adminEmail, action,
      target_id: targetId, target_type: 'supplier', details
    }]);
  } catch (e) {
    console.warn('[admin/suppliers] Audit log failed:', e.message);
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

async function getSuppliers(req, res) {
  const { status, verified, search, page = 1, limit = 10 } = req.query;

  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 10);
  const from     = (pageNum - 1) * pageSize;
  const to       = from + pageSize - 1;

  const [
    { count: total },
    { count: pending },
    { count: approved },
    { count: rejected },
    { count: verifiedCount }
  ] = await Promise.all([
    supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabaseAdmin.from('suppliers').select('*', { count: 'exact', head: true }).eq('verified', true),
  ]);

  let q = supabaseAdmin
    .from('suppliers')
    .select(
      'id, name, phone, email, location, status, verified, ' +
      'delivery_radius_km, delivery_time_min, base_price_6kg, base_price_13kg, ' +
      'onboarded_by, onboarding_ref, onboarded_at, created_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status)               q = q.eq('status', status);
  if (verified !== undefined) q = q.eq('verified', verified === 'true');
  if (search)               q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,location.ilike.%${search}%`);

  q = q.range(from, to);

  const { data: suppliers, error, count: filteredTotal } = await q;

  if (error) {
    console.error('[admin/suppliers] Fetch error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json({
    success:   true,
    suppliers: suppliers || [],
    total:     filteredTotal || 0,
    summary:   { total: total || 0, pending: pending || 0, approved: approved || 0, rejected: rejected || 0, verified: verifiedCount || 0 },
    page:      pageNum,
    limit:     pageSize
  });
}

// ── POST — create ─────────────────────────────────────────────────────────────

async function createSupplier(req, res, payload) {
  const {
    name, phone, pin, email,
    location, delivery_radius_km, delivery_time_min
  } = req.body;

  if (!name || !phone || !pin) {
    return res.status(400).json({ error: 'name, phone, and pin are required' });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  }

  const cleaned = normalisePhone(phone);

  const { data: existing } = await supabaseAdmin
    .from('suppliers').select('id').eq('phone', cleaned).maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'A supplier with this phone number already exists' });
  }

  const pinHash = await bcrypt.hash(String(pin), 12);

  const { data: supplier, error } = await supabaseAdmin
    .from('suppliers')
    .insert([{
      name,
      phone:              cleaned,
      email:              email              || null,
      pin_hash:           pinHash,
      location:           location           || 'Nairobi',
      delivery_radius_km: delivery_radius_km || 5,
      delivery_time_min:  delivery_time_min  || 30,
      verified:           false,
      status:             'pending',
    }])
    .select('id, name, phone, email, location, status, verified, created_at')
    .single();

  if (error) {
    console.error('[admin/suppliers] Create error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create supplier' });
  }

  await auditLog(payload.email, 'create_supplier', supplier.id, { name, phone: cleaned });
  return res.status(201).json({ success: true, supplier });
}

// ── PATCH — edit details ──────────────────────────────────────────────────────

async function editSupplier(req, res, payload) {
  const {
    supplierId, name, phone, email, location,
    delivery_radius_km, delivery_time_min, pin
  } = req.body;

  if (!supplierId) return res.status(400).json({ error: 'supplierId is required' });

  const updates = {};
  if (name               !== undefined) updates.name               = name.trim();
  if (email              !== undefined) updates.email              = email.trim()  || null;
  if (location           !== undefined) updates.location           = location.trim() || null;
  if (delivery_radius_km !== undefined) updates.delivery_radius_km = Number(delivery_radius_km);
  if (delivery_time_min  !== undefined) updates.delivery_time_min  = Number(delivery_time_min);

  if (phone !== undefined) {
    const cleaned = normalisePhone(phone);
    const { data: existing } = await supabaseAdmin
      .from('suppliers').select('id').eq('phone', cleaned).neq('id', supplierId).maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'Another supplier already has this phone number' });
    }
    updates.phone = cleaned;
  }

  if (pin !== undefined) {
    if (String(pin).length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    }
    updates.pin_hash = await bcrypt.hash(String(pin), 12);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data: supplier, error } = await supabaseAdmin
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select('id, name, phone, email, location, status, verified, delivery_radius_km, delivery_time_min')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Supplier not found' });
    console.error('[admin/suppliers] Edit error:', error);
    return res.status(500).json({ error: 'Failed to update supplier' });
  }

  await auditLog(payload.email, 'edit_supplier', supplierId, { fields: Object.keys(updates) });
  return res.status(200).json({ success: true, supplier });
}

// ── PUT — update status ───────────────────────────────────────────────────────

async function updateStatus(req, res, payload) {
  const { supplierId, status, verified } = req.body;

  if (!supplierId) return res.status(400).json({ error: 'supplierId is required' });

  const updates = {};

  if (status !== undefined) {
    const valid = ['pending', 'approved', 'rejected', 'suspended'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }
    updates.status = status;
    if (status === 'approved')  updates.verified = true;
    if (status === 'rejected' || status === 'suspended') updates.verified = false;
  }

  if (verified !== undefined) updates.verified = verified;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data: supplier, error } = await supabaseAdmin
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select('id, name, phone, status, verified')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Supplier not found' });
    console.error('[admin/suppliers] Status update error:', error);
    return res.status(500).json({ error: 'Failed to update supplier' });
  }

  await auditLog(payload.email, `${status || 'update'}_supplier`, supplierId, { status, verified });
  return res.status(200).json({ success: true, supplier });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

async function deleteSupplier(req, res, payload) {
  const { supplierId } = req.body;
  if (!supplierId) return res.status(400).json({ error: 'supplierId is required' });

  const { error } = await supabaseAdmin
    .from('suppliers')
    .delete()
    .eq('id', supplierId);

  if (error) {
    console.error('[admin/suppliers] Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete supplier' });
  }

  await auditLog(payload.email, 'delete_supplier', supplierId, {});
  return res.status(200).json({ success: true });
}
