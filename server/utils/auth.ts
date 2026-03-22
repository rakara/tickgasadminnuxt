/**
 * server/utils/auth.ts
 * JWT sign / verify helpers. Auto-imported by Nitro.
 *
 * Uses NUXT_JWT_SECRET (server-only runtimeConfig).
 */

import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

const JWT_EXPIRES = '7d'

function getSecret(): string {
  const secret = useRuntimeConfig().jwtSecret
  if (!secret) throw createError({ statusCode: 500, message: 'JWT_SECRET not configured' })
  return secret
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, getSecret()) as Record<string, unknown>
  } catch {
    return null
  }
}

export function getAuthPayload(event: H3Event): Record<string, unknown> | null {
  const auth = getHeader(event, 'authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

export function requireAdmin(event: H3Event) {
  const payload = getAuthPayload(event)
  if (!payload || payload.role !== 'admin') {
    throw createError({ statusCode: 401, message: 'Unauthorized. Admin access required.' })
  }
  return payload
}

export function requireSupplier(event: H3Event) {
  const payload = getAuthPayload(event)
  if (!payload || payload.role !== 'supplier') {
    throw createError({ statusCode: 401, message: 'Unauthorized. Supplier access required.' })
  }
  return payload
}

export function requireAgent(event: H3Event) {
  const payload = getAuthPayload(event)
  if (!payload || payload.role !== 'agent') {
    throw createError({ statusCode: 401, message: 'Unauthorized. Agent access required.' })
  }
  return payload
}
