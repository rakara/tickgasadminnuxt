<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title><span class="title-logo">🔥</span> Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="load"><ion-icon name="refresh-outline" slot="icon-only" /></ion-button>
          <ion-button fill="clear" @click="navigateTo('/app/profile')">
            <div class="avatar-btn">{{ adminInitial }}</div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <div class="period-row">
        <ion-segment v-model="period" @ionChange="load" class="period-seg">
          <ion-segment-button value="week"><ion-label>7 Days</ion-label></ion-segment-button>
          <ion-segment-button value="month"><ion-label>Month</ion-label></ion-segment-button>
          <ion-segment-button value="year"><ion-label>Year</ion-label></ion-segment-button>
        </ion-segment>
      </div>

      <div v-if="error" class="error-banner">⚠️ {{ error }}</div>

      <!-- KPIs -->
      <ion-grid class="stats-grid">
        <ion-row>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Total Revenue</div>
              <div class="stat-value" style="color:var(--accent)">{{ pending ? '—' : formatKES(data?.stats?.totalRevenue) }}</div>
              <div class="stat-change" :class="growthClass(data?.stats?.revenueGrowth)">{{ growthLabel(data?.stats?.revenueGrowth) }}</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Total Orders</div>
              <div class="stat-value">{{ pending ? '—' : data?.stats?.totalOrders?.toLocaleString() }}</div>
              <div class="stat-change" :class="growthClass(data?.stats?.ordersGrowth)">{{ growthLabel(data?.stats?.ordersGrowth) }}</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Active Suppliers</div>
              <div class="stat-value">{{ pending ? '—' : data?.stats?.activeSuppliers }}</div>
              <div class="stat-change positive">+{{ data?.stats?.newSuppliers ?? 0 }} this period</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Pending Approvals</div>
              <div class="stat-value" style="color:var(--warning)">{{ pending ? '—' : data?.stats?.pendingApprovals }}</div>
              <div class="stat-change">Needs review</div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Revenue bar chart -->
      <div class="content-card chart-card">
        <div class="section-header" style="padding:16px 16px 0"><h2>Revenue Overview</h2></div>
        <div v-if="pending" class="loading-text">Loading chart…</div>
        <div v-else class="chart-wrap">
          <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="bar-chart">
            <g v-for="(v, i) in (data?.revenueData ?? [])" :key="i">
              <rect :x="barX(i)" :y="barY(v)" :width="barW" :height="barH(v)"
                :fill="v === maxBar ? 'var(--accent)' : 'var(--bg3)'" rx="4" />
              <text :x="barX(i) + barW / 2" :y="chartH - 4" text-anchor="middle" class="chart-label">
                {{ data?.labels?.[i] }}
              </text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Status breakdown -->
      <div class="content-card" style="padding:16px">
        <h2 style="margin-bottom:12px">Order Status</h2>
        <div v-if="pending" class="loading-text" style="padding:8px 0">Loading…</div>
        <div v-else v-for="(count, status) in (data?.statusCounts ?? {})" :key="status" class="status-row">
          <div><span :class="['badge', `badge-${status}`]">{{ String(status).replace('_',' ') }}</span></div>
          <div class="status-count">{{ count }}</div>
          <div class="status-bar-track">
            <div class="status-bar-fill" :style="`width:${barPct(count as number)}%;background:${statusColor(String(status))}`" />
          </div>
        </div>
      </div>

      <!-- Recent orders -->
      <div class="content-card">
        <div class="section-header" style="padding:16px 16px 12px">
          <h2>Recent Orders</h2>
          <NuxtLink to="/app/orders" class="view-all">View All →</NuxtLink>
        </div>
        <div v-if="pending" class="loading-text">Loading…</div>
        <div v-else-if="!data?.recentOrders?.length" class="empty-text">No orders yet.</div>
        <div v-else v-for="order in data?.recentOrders" :key="order.id" class="order-row">
          <div class="order-row-main">
            <span class="order-id mono">#{{ order.order_number }}</span>
            <span :class="['badge', statusBadgeClass(order.status)]">{{ order.status }}</span>
          </div>
          <div class="order-row-sub">
            <span>{{ order.users?.name || order.users?.phone || '—' }}</span>
            <span class="order-amount mono">{{ formatKES(order.total_amount) }}</span>
          </div>
          <div class="order-row-date">{{ formatDate(order.created_at) }}</div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonGrid, IonRow, IonCol,
  IonSegment, IonSegmentButton, IonLabel,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { adminInitial } = useAuth()
const { apiGet }       = useApi()
const period           = ref('week')
const error            = ref('')

interface DashboardData {
  stats: { totalRevenue: number; totalOrders: number; activeSuppliers: number; pendingApprovals: number; revenueGrowth: number; ordersGrowth: number; newSuppliers: number }
  revenueData: number[]; labels: string[]
  statusCounts: Record<string, number>
  recentOrders: Array<{ id: string; order_number: string; status: string; total_amount: number; created_at: string; users?: { name?: string; phone?: string } }>
}

const { data, pending, refresh } = await useLazyAsyncData<DashboardData>(
  'dashboard',
  () => apiGet<DashboardData>('/api/admin/dashboard', { period: period.value }),
  { watch: [period] }
)

async function load() { error.value = ''; await refresh() }
async function onRefresh(e: CustomEvent) { await refresh(); (e.target as HTMLIonRefresherElement).complete() }

// Chart
const chartW = 320, chartH = 110
const maxBar = computed(() => Math.max(...(data.value?.revenueData ?? [0]), 1))
const barCount = computed(() => data.value?.revenueData?.length || 1)
const barW = computed(() => (chartW / barCount.value) - 6)
const barX = (i: number) => i * (chartW / barCount.value) + 3
const barY = (v: number) => chartH - 20 - barH(v)
const barH = (v: number) => Math.max(4, (v / maxBar.value) * (chartH - 24))

// Status
const totalStatus = computed(() => Object.values(data.value?.statusCounts ?? {}).reduce((a, b) => a + b, 0) || 1)
const barPct = (count: number) => Math.round((count / totalStatus.value) * 100)
const statusColor = (s: string) => ({ pending: 'var(--warning)', confirmed: 'var(--info)', out_for_delivery: 'var(--accent)', delivered: 'var(--success)', cancelled: 'var(--error)' }[s] ?? 'var(--text3)')

function growthLabel(g: number | undefined) {
  if (g == null) return '—'
  const n = Number(g)
  return n === 0 ? 'No change' : `${n > 0 ? '+' : ''}${n}% vs prev`
}
function growthClass(g: number | undefined) {
  const n = Number(g ?? 0)
  return n > 0 ? 'positive' : n < 0 ? 'negative' : ''
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.title-logo { font-size: 18px; }
.avatar-btn { width: 32px; height: 32px; background: linear-gradient(135deg,var(--accent),var(--accent2)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
.period-row { padding: 8px 0 4px; }
.period-seg { --background: var(--bg1); border-radius: 10px; }
.error-banner { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
.stats-grid { padding: 0; margin-bottom: 4px; }
.chart-card { padding-bottom: 16px; }
.chart-wrap { padding: 8px 12px 0; overflow: hidden; }
.bar-chart { width: 100%; display: block; }
.chart-label { font-size: 9px; fill: var(--text3); }
.status-row { display: grid; grid-template-columns: 140px 40px 1fr; align-items: center; gap: 10px; margin-bottom: 10px; }
.status-count { font-family: var(--mono); font-size: 13px; font-weight: 700; text-align: right; }
.status-bar-track { height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; }
.status-bar-fill { height: 100%; border-radius: 3px; transition: width .4s; }
.order-row { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.order-row:last-child { border-bottom: none; }
.order-row-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.order-id { font-size: 13px; font-weight: 600; }
.order-row-sub { display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); }
.order-amount { color: var(--text1); font-weight: 600; }
.order-row-date { font-size: 11px; color: var(--text3); margin-top: 2px; }
.view-all { font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 600; }
</style>
