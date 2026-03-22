/**
 * composables/useAuth.ts
 * Client-side auth state — wraps localStorage so all pages share
 * the same reactive references.
 */

export interface AdminSession {
  email: string
  role:  string
}

export const useAuth = () => {
  const token = useState<string | null>('auth:token', () => {
    if (import.meta.client) return localStorage.getItem('adminToken')
    return null
  })

  const admin = useState<AdminSession | null>('auth:admin', () => {
    if (import.meta.client) {
      try { return JSON.parse(localStorage.getItem('admin') ?? 'null') }
      catch { return null }
    }
    return null
  })

  const isAuthenticated = computed(() => !!token.value)

  const adminInitial = computed(() => admin.value?.email?.[0]?.toUpperCase() ?? 'A')

  const adminHandle = computed(() => {
    const email = admin.value?.email ?? ''
    return email.includes('@') ? email.split('@')[0] : (email || 'Admin')
  })

  function saveSession(adminData: AdminSession, jwt: string) {
    token.value = jwt
    admin.value = adminData
    localStorage.setItem('adminToken', jwt)
    localStorage.setItem('admin', JSON.stringify(adminData))
  }

  function clearSession() {
    token.value = null
    admin.value = null
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('admin')
    }
  }

  return {
    token,
    admin,
    isAuthenticated,
    adminInitial,
    adminHandle,
    saveSession,
    clearSession,
  }
}
