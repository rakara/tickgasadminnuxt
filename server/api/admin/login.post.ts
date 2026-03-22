/**
 * POST /api/admin/login
 * Validates email + password, returns a signed JWT.
 * Falls back to env-var bootstrap credentials if the admins table is empty.
 */

import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password required' })
  }

  const db     = useSupabaseAdmin()
  const config = useRuntimeConfig()

  let valid       = false
  let adminRecord = null

  // 1. Try admins table
  try {
    const { data } = await db
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()
    adminRecord = data
  } catch (err: unknown) {
    console.warn('[login] admins table not ready:', (err as Error).message)
  }

  if (adminRecord) {
    valid = await bcrypt.compare(password, adminRecord.password_hash)
  } else {
    // 2. Bootstrap: env-var credentials
    const envEmail = config.adminEmail
    const envHash  = config.adminPasswordHash
    if (envEmail && envHash && email.toLowerCase().trim() === envEmail.toLowerCase()) {
      valid = await bcrypt.compare(password, envHash)
    }
  }

  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  const token = signToken({
    id:    adminRecord?.id ?? 'bootstrap-admin',
    role:  'admin',
    email: email.toLowerCase().trim(),
  })

  return {
    success: true,
    admin:   { email: email.toLowerCase().trim(), role: 'admin' },
    token,
  }
})
