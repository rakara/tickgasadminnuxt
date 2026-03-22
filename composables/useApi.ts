/**
 * composables/useApi.ts
 *
 * Thin wrapper around Nuxt's $fetch that:
 *   1. Attaches the admin JWT from localStorage on every request
 *   2. Redirects to /login on 401
 *   3. Re-exports shared formatters so pages don't import from multiple places
 */

export const useApi = () => {
  const { token, clearSession } = useAuth()
  const router = useRouter()

  async function apiFetch<T = unknown>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    }
    if (token.value) headers['Authorization'] = `Bearer ${token.value}`

    try {
      return await $fetch<T>(path, { ...options, headers })
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 401) {
        clearSession()
        await router.replace('/login')
        throw err
      }
      throw err
    }
  }

  const apiGet    = <T>(path: string, params?: Record<string, unknown>) =>
    apiFetch<T>(path, { method: 'GET', params })

  const apiPost   = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body })

  const apiPut    = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body })

  const apiPatch  = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body })

  const apiDelete = <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' })

  return { apiFetch, apiGet, apiPost, apiPut, apiPatch, apiDelete }
}

// ── Shared formatters (auto-imported everywhere) ─────────────────────────────

export function formatKES(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-KE', {
    style:                 'currency',
    currency:              'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function statusBadgeClass(status: string | null | undefined): string {
  const map: Record<string, string> = {
    pending:          'badge-pending',
    confirmed:        'badge-confirmed',
    out_for_delivery: 'badge-out_for_delivery',
    delivered:        'badge-delivered',
    cancelled:        'badge-cancelled',
    approved:         'badge-approved',
    rejected:         'badge-rejected',
    active:           'badge-active',
    suspended:        'badge-suspended',
    paid:             'badge-paid',
    completed:        'badge-delivered',
    failed:           'badge-failed',
  }
  return map[status ?? ''] ?? 'badge-pending'
}
