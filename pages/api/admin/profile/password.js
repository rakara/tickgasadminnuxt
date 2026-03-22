/**
 * PUT /api/admin/profile/password
 * Allows an authenticated admin to change their own password.
 *
 * Body: { currentPassword, newPassword }
 * Auth: admin JWT required
 */

import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin }  from '../../../../lib/auth';
import bcrypt            from 'bcryptjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const payload = requireAdmin(req, res);
  if (!payload) return;

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    // Fetch admin record to verify current password
    const { data: admin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('id, password_hash')
      .eq('email', payload.email)
      .maybeSingle();

    if (fetchError || !admin) {
      // Bootstrap admin (env-var only, no DB row) cannot change password here
      return res.status(400).json({
        error: 'Password change is only available for database-backed admin accounts. ' +
               'Update ADMIN_PASSWORD_HASH in your environment variables instead.'
      });
    }

    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabaseAdmin
      .from('admins')
      .update({ password_hash: newHash })
      .eq('id', admin.id);

    if (updateError) {
      console.error('[admin/profile/password] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[admin/profile/password] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
