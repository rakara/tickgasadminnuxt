<template>
  <!--
    Nuxt + Ionic tab layout.

    IonTabs / IonRouterOutlet are @ionic/vue-router constructs that
    conflict with Nuxt's own router. Instead we:
      1. Render child pages via <NuxtPage> (Nuxt owns the outlet)
      2. Build a reactive tab bar manually, driven by useRoute()
      3. Navigate with useRouter().push() on tab click

    This gives us a pixel-identical tab bar with correct active-state
    highlighting without any router conflicts.
  -->
  <div class="app-shell">
    <!-- Page content — Nuxt renders the matched /app/* child here -->
    <div class="page-content">
      <NuxtPage />
    </div>

    <!-- Bottom tab bar — hidden on detail pages (analytics, locations, profile) -->
    <nav v-if="showTabBar" class="tab-bar" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key"
        @click="navigate(tab.path)"
      >
        <ion-icon :name="tab.icon" class="tab-icon" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'

definePageMeta({ layout: false })

const route  = useRoute()
const router = useRouter()

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline',                path: '/app/dashboard' },
  { key: 'orders',    label: 'Orders',    icon: 'cube-outline',                path: '/app/orders'    },
  { key: 'suppliers', label: 'Suppliers', icon: 'people-outline',              path: '/app/suppliers' },
  { key: 'agents',    label: 'Agents',    icon: 'person-outline',              path: '/app/agents'    },
  { key: 'more',      label: 'More',      icon: 'ellipsis-horizontal-outline', path: '/app/more'      },
] as const

// Pages under /app/* that are full-screen detail views, not tabs
const DETAIL_PAGES = ['/app/analytics', '/app/locations', '/app/profile']

// Hide tab bar when on a detail page
const showTabBar = computed(() => !DETAIL_PAGES.includes(route.path))

// Derive active tab from route — detail pages keep "more" highlighted
const activeTab = computed(() => {
  const path = route.path
  const exact = TABS.find(t => t.path === path)
  if (exact) return exact.key
  return 'more'
})

function navigate(path: string) {
  if (route.path !== path) router.push(path)
}
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg0);
  overflow: hidden;
}

.page-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.tab-bar {
  display: flex;
  flex-shrink: 0;
  background: var(--bg1);
  border-top: 1px solid var(--border);
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text3);
  padding: 6px 0 0;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.tab-btn:active { opacity: 0.7; }
.tab-btn.active { color: var(--accent); }
.tab-icon { font-size: 22px; }

.tab-label {
  font-size: 10px;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  line-height: 1;
}
</style>
