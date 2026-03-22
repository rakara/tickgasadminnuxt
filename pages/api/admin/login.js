import { supabaseAdmin } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';
import { signToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    let valid = false;
    let adminRecord = null;

    // Try DB lookup first (admins table may not exist yet if migration hasn't run)
    try {
      const { data } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      adminRecord = data;
    } catch (dbErr) {
      // Table doesn't exist yet — fall through to env-var bootstrap
      console.warn('[admin/login] admins table not ready:', dbErr.message);
    }

    if (adminRecord) {
      valid = await bcrypt.compare(password, adminRecord.password_hash);
    } else {
      // Bootstrap: env-var credentials (set ADMIN_EMAIL + ADMIN_PASSWORD_HASH in Vercel)
      const envEmail = process.env.ADMIN_EMAIL;
      const envHash  = process.env.ADMIN_PASSWORD_HASH;
      if (envEmail && envHash && email.toLowerCase().trim() === envEmail.toLowerCase()) {
        valid = await bcrypt.compare(password, envHash);
      }
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({
      id:    adminRecord?.id || 'bootstrap-admin',
      role:  'admin',
      email: email.toLowerCase().trim()
    });

    return res.status(200).json({
      success: true,
      admin: { email: email.toLowerCase().trim(), role: 'admin' },
      token
    });

  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
