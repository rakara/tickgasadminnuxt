/**
 * GET    /api/admin/locations/[id]  — fetch a single service location
 * DELETE /api/admin/locations/[id]  — soft-delete (set active=false) a location
 *
 * Auth: admin JWT required (Bearer token in Authorization header)
 *
 * CORS: restricted to ALLOWED_ORIGIN env var (not wildcard).
 *
 * Note: the table is `service_locations`, not `locations`.
 */

import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Protect endpoint — admin token required for all methods
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Location ID required' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Location not found' });
        }
        throw error;
      }

      return res.status(200).json({ location: data });
    }

    if (req.method === 'DELETE') {
      // Soft-delete: mark inactive rather than destroying the row
      const { error } = await supabaseAdmin
        .from('service_locations')
        .update({ active: false })
        .eq('id', id);

      if (error) {
        console.error('[admin/locations/id] Delete error:', error);
        return res.status(500).json({ error: 'Failed to delete location' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[admin/locations/id] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
