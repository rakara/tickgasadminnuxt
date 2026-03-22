/**
 * GET    /api/admin/locations  — paginated list of all service locations
 * POST   /api/admin/locations  — create a new service location
 *
 * Auth: GET is public (customer app uses it); POST requires admin JWT.
 *
 * Individual location operations (GET by id, PATCH, DELETE) → locations/[id].js
 */

import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin }  from '../../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET')  return await getLocations(req, res);
    if (req.method === 'POST') {
      const payload = requireAdmin(req, res);
      if (!payload) return;
      return await createLocation(req, res, payload);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[admin/locations] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getLocations(req, res) {
  const { search, active, page = 1, limit = 20 } = req.query;

  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 20);
  const from     = (pageNum - 1) * pageSize;
  const to       = from + pageSize - 1;

  let q = supabaseAdmin
    .from('service_locations')
    .select('id, name, area, latitude, longitude, active, created_at', { count: 'exact' })
    .order('name');

  if (active !== undefined) q = q.eq('active', active === 'true');
  if (search) q = q.or(`name.ilike.%${search}%,area.ilike.%${search}%`);

  q = q.range(from, to);

  const { data: locations, error, count } = await q;

  if (error) {
    console.error('[admin/locations] Fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch locations' });
  }

  // Summary counts
  const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
    supabaseAdmin.from('service_locations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('service_locations').select('*', { count: 'exact', head: true }).eq('active', true),
  ]);

  return res.status(200).json({
    success:   true,
    locations: locations || [],
    total:     count     || 0,
    stats: {
      total:    totalCount  || 0,
      active:   activeCount || 0,
      inactive: (totalCount || 0) - (activeCount || 0),
    },
    page:  pageNum,
    limit: pageSize,
  });
}

async function createLocation(req, res, payload) {
  const { name, area, latitude, longitude, active = true } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!area?.trim()) return res.status(400).json({ error: 'area is required' });

  const { data: existing } = await supabaseAdmin
    .from('service_locations').select('id').eq('name', name.trim()).maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'A location with this name already exists' });
  }

  const { data: location, error } = await supabaseAdmin
    .from('service_locations')
    .insert([{
      name:      name.trim(),
      area:      area.trim(),
      latitude:  latitude  ? parseFloat(latitude)  : null,
      longitude: longitude ? parseFloat(longitude) : null,
      active:    Boolean(active),
    }])
    .select('id, name, area, latitude, longitude, active, created_at')
    .single();

  if (error) {
    console.error('[admin/locations] Create error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create location' });
  }

  return res.status(201).json({ success: true, location });
}
