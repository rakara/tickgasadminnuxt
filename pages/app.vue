<template>
  <div class="app-container">

    <!-- ── Overlay backdrop (mobile only) ────────────────── -->
    <div
      class="sidebar-overlay"
      :class="{ active: sidebarOpen }"
      @click="sidebarOpen = false"
    />

    <!-- ── Hamburger button (mobile only) ────────────────── -->
    <button
      class="hamburger-btn"
      :class="{ hidden: sidebarOpen }"
      aria-label="Open navigation"
      @click="sidebarOpen = true"
    >
      <span /><span /><span />
    </button>

    <!-- ── Sidebar ────────────────────────────────────────── -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <button class="sidebar-close-btn" aria-label="Close navigation" @click="sidebarOpen = false">✕</button>

      <div class="sidebar-logo">TickGas Admin</div>

      <!-- Profile card -->
      <div class="sidebar-profile" @click="navigate('/app/profile')">
        <div class="sidebar-avatar">{{ adminInitial }}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">{{ adminHandle }}</div>
          <div class="sidebar-profile-role">Administrator</div>
        </div>
        <span class="sidebar-profile-chevron">›</span>
      </div>

      <div class="sidebar-divider" />

      <!-- Nav items -->
      <div
        v-for="item in NAV_ITEMS"
        :key="item.key"
        class="nav-item"
        :class="{ active: activeKey === item.key }"
        @click="navigate(item.path)"
      >
        {{ item.icon }} {{ item.label }}
      </div>

      <!-- Spacer pushes install button to bottom -->
      <div style="flex: 1" />
      <div class="sidebar-divider" />
      <div class="sidebar-version">TickGas Admin · v1.0.0</div>
    </aside>

    <!-- ── Main content ───────────────────────────────────── -->
    <main class="main-content">
      <NuxtPage />
    </main>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route  = useRoute()
const router = useRouter()
const { adminInitial, adminHandle } = useAuth()

const sidebarOpen = ref(false)

const NAV_ITEMS = [
  { key: 'dashboard',  icon: '📊', label: 'Dashboard',  path: '/app/dashboard'  },
  { key: 'suppliers',  icon: '👥', label: 'Suppliers',   path: '/app/suppliers'  },
  { key: 'agents',     icon: '🧑', label: 'Agents',      path: '/app/agents'     },
  { key: 'orders',     icon: '📦', label: 'Orders',      path: '/app/orders'     },
  { key: 'payments',   icon: '💰', label: 'Payments',    path: '/app/payments'   },
  { key: 'analytics',  icon: '📈', label: 'Analytics',   path: '/app/analytics'  },
  { key: 'locations',  icon: '📍', label: 'Locations',   path: '/app/locations'  },
]

// Map every /app/* route back to its nav key
const PATH_TO_KEY: Record<string, string> = {
  '/app/dashboard':  'dashboard',
  '/app/suppliers':  'suppliers',
  '/app/agents':     'agents',
  '/app/orders':     'orders',
  '/app/payments':   'payments',
  '/app/analytics':  'analytics',
  '/app/locations':  'locations',
  '/app/profile':    'profile',   // no nav item, but no active highlight either
}

const activeKey = computed(() => PATH_TO_KEY[route.path] ?? '')

function navigate(path: string) {
  sidebarOpen.value = false   // close drawer on mobile after navigation
  if (route.path !== path) router.push(path)
}

// Close sidebar on route change (back button, etc.)
watch(() => route.path, () => { sidebarOpen.value = false })
</script>

<style scoped>
/* ── Shell ───────────────────────────────────────────── */
.app-container {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ─────────────────────────────────────────── */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg1);
  border-right: 1px solid var(--border);
  padding: 20px 12px;
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 200;
}

.sidebar-logo {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding: 4px 10px 16px;
  margin-bottom: 2px;
  border-bottom: 1px solid var(--border);
}

.sidebar-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}
.sidebar-profile:hover { background: var(--bg2); }

.sidebar-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #000;
  font-weight: 800;
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sidebar-profile-info { flex: 1; overflow: hidden; }
.sidebar-profile-name {
  font-size: 13px; font-weight: 600; color: var(--text1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sidebar-profile-role { font-size: 11px; color: var(--text2); margin-top: 1px; }
.sidebar-profile-chevron { font-size: 16px; color: var(--text2); flex-shrink: 0; }

.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 6px 2px 8px;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text2);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover  { background: var(--bg2); color: var(--text1); }
.nav-item.active {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #000;
  font-weight: 700;
}

.sidebar-version {
  font-size: 11px;
  color: var(--text3);
  padding: 6px 12px;
}

/* ── Sidebar close button (mobile only) ──────────────── */
.sidebar-close-btn {
  display: none;
  position: absolute;
  top: 14px; right: 12px;
  width: 28px; height: 28px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text2);
  font-size: 14px;
  cursor: pointer;
  align-items: center; justify-content: center;
  transition: border-color 0.15s, color 0.15s;
  z-index: 1;
}
.sidebar-close-btn:hover { border-color: var(--error); color: var(--error); }

/* ── Hamburger button (mobile only) ──────────────────── */
.hamburger-btn {
  display: none;
  position: fixed;
  top: 14px; left: 14px;
  z-index: 300;
  width: 42px; height: 42px;
  background: var(--bg1);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  cursor: pointer;
  flex-direction: column;
  align-items: center; justify-content: center;
  gap: 5px;
  padding: 0;
  transition: border-color 0.2s;
}
.hamburger-btn:hover { border-color: var(--accent); }
.hamburger-btn span {
  display: block;
  width: 20px; height: 2px;
  background: var(--text1);
  border-radius: 2px;
}
.hamburger-btn.hidden { display: none !important; }

/* ── Mobile overlay ──────────────────────────────────── */
.sidebar-overlay {
  display: none;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 190;
  backdrop-filter: blur(2px);
}
.sidebar-overlay.active { display: block; }

/* ── Main content ────────────────────────────────────── */
.main-content {
  flex: 1;
  margin-left: 240px;
  min-height: 100vh;
  overflow-y: auto;
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar.open {
    transform: translateX(0);
    box-shadow: 6px 0 28px rgba(0,0,0,0.6);
  }

  .hamburger-btn    { display: flex; }
  .sidebar-close-btn { display: flex; }

  .main-content {
    margin-left: 0;
    padding-top: 0;
  }
}
</style>
