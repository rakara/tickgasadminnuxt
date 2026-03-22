/**
 * GET    /api/admin/agents  — list all agents with onboarding stats
 * POST   /api/admin/agents  — create a new agent account
 * PATCH  /api/admin/agents  — edit agent details (name, phone, email, region, pin)
 * PUT    /api/admin/agents  — update agent status with optional suspension reason
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    switch (req.method) {
      case 'GET':   return await getAgents(req, res);
      case 'POST':  return await createAgent(req, res, payload);
      case 'PATCH': return await editAgent(req, res, payload);
      case 'PUT':   return await updateStatus(req, res, payload);
      default:      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('[admin/agents] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0'))                               cleaned = '254' + cleaned.slice(1);
  else if (cleaned.startsWith('7') && cleaned.length === 9) cleaned = '254' + cleaned;
  else if (!cleaned.startsWith('254'))                       cleaned = '254' + cleaned;
  return cleaned;
}

async function auditLog(adminEmail, action, targetId, details = {}) {
  return supabaseAdmin.from('admin_actions').insert([{
    admin_email: adminEmail,
    action,
    target_id:   targetId,
    target_type: 'agent',
    details
  }]).catch(e => console.warn('[admin/agents] Audit log failed:', e.message));
}

// ── GET — list agents ─────────────────────────────────────────────────────────

async function getAgents(req, res) {
  const { status, search, page = 1, limit = 20 } = req.query;

  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 20);
  const from     = (pageNum - 1) * pageSize;
  const to       = from + pageSize - 1;

  const [agentsResult, statsResult] = await Promise.all([
    (() => {
      let q = supabaseAdmin
        .from('agents')
        .select('id, name, phone, email, region, status, suspension_reason, created_at, last_login', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,region.ilike.%${search}%`);
      return q.range(from, to);
    })(),
    (async () => {
      try {
        return await supabaseAdmin.from('agent_onboarding_stats').select('*');
      } catch (err) {
        console.warn('[admin/agents] Stats view unavailable:', err.message);
        return { data: null };
      }
    })()
  ]);

  if (agentsResult.error) {
    console.error('[admin/agents] Fetch error:', agentsResult.error);
    return res.status(500).json({ error: 'Failed to fetch agents' });
  }

  const statsMap = {};
  (statsResult.data || []).forEach(s => { statsMap[s.agent_id] = s; });

  const agents = (agentsResult.data || []).map(a => ({
    ...a,
    stats: statsMap[a.id] || {
      total_onboarded: 0, total_approved: 0,
      total_pending: 0,   total_rejected: 0,
      today: 0, this_week: 0, this_month: 0
    }
  }));

  const allStats = statsResult.data || [];
  const summary = {
    totalAgents:      agentsResult.count || 0,
    activeAgents:     0,
    totalOnboarded:   allStats.reduce((s, r) => s + (r.total_onboarded || 0), 0),
    pendingApprovals: allStats.reduce((s, r) => s + (r.total_pending   || 0), 0)
  };

  const { count: activeCount } = await supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  summary.activeAgents = activeCount || 0;

  return res.status(200).json({
    success: true,
    agents,
    total:   agentsResult.count || 0,
    page:    pageNum,
    limit:   pageSize,
    summary
  });
}

// ── POST — create agent ───────────────────────────────────────────────────────

async function createAgent(req, res, adminPayload) {
  const { name, phone, pin, email, region } = req.body;

  if (!name || !phone || !pin) {
    return res.status(400).json({ error: 'name, phone, and pin are required' });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  }

  const cleaned = normalisePhone(phone);

  const { data: existing } = await supabaseAdmin
    .from('agents').select('id').eq('phone', cleaned).maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'An agent with this phone number already exists' });
  }

  const pinHash = await bcrypt.hash(String(pin), 12);

  const { data: adminRow } = await supabaseAdmin
    .from('admins').select('id').eq('email', adminPayload.email).maybeSingle();

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .insert([{
      name,
      phone:      cleaned,
      email:      email  || null,
      pin_hash:   pinHash,
      region:     region || null,
      status:     'active',
      created_by: adminRow?.id || null
    }])
    .select('id, name, phone, email, region, status, created_at')
    .single();

  if (error) {
    console.error('[admin/agents] Create error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create agent' });
  }

  await auditLog(adminPayload.email, 'create_agent', agent.id, { name, phone: cleaned, region });

  return res.status(201).json({ success: true, agent });
}

// ── PATCH — edit agent details ────────────────────────────────────────────────

async function editAgent(req, res, adminPayload) {
  const { agentId, name, phone, email, region, pin } = req.body;

  if (!agentId) return res.status(400).json({ error: 'agentId is required' });

  const updates = {};

  if (name   !== undefined) updates.name   = name.trim();
  if (email  !== undefined) updates.email  = email.trim()  || null;
  if (region !== undefined) updates.region = region.trim() || null;

  if (phone !== undefined) {
    const cleaned = normalisePhone(phone);
    const { data: existing } = await supabaseAdmin
      .from('agents').select('id').eq('phone', cleaned).neq('id', agentId).maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'Another agent already has this phone number' });
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
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select('id, name, phone, email, region, status, suspension_reason, created_at, last_login')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Agent not found' });
    console.error('[admin/agents] Edit error:', error);
    return res.status(500).json({ error: 'Failed to update agent' });
  }

  await auditLog(adminPayload.email, 'edit_agent', agentId, { fields: Object.keys(updates) });

  return res.status(200).json({ success: true, agent });
}

// ── PUT — update status ───────────────────────────────────────────────────────

async function updateStatus(req, res, adminPayload) {
  const { agentId, status, suspension_reason } = req.body;

  if (!agentId) return res.status(400).json({ error: 'agentId is required' });

  const validStatuses = ['active', 'suspended', 'inactive'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  if (status === 'suspended' && !suspension_reason?.trim()) {
    return res.status(400).json({ error: 'A suspension reason is required' });
  }

  const updates = { status };
  // Store reason when suspending; clear it on activate/deactivate
  updates.suspension_reason = status === 'suspended' ? suspension_reason.trim() : null;

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select('id, name, phone, status, suspension_reason')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return res.status(404).json({ error: 'Agent not found' });
    console.error('[admin/agents] Status update error:', error);
    return res.status(500).json({ error: 'Failed to update agent status' });
  }

  await auditLog(adminPayload.email, `${status}_agent`, agentId, {
    status,
    reason: suspension_reason || null
  });

  return res.status(200).json({ success: true, agent });
}
