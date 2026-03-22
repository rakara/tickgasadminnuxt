<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Orders</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="resetAndLoad"><ion-icon name="refresh-outline" slot="icon-only" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <ion-grid class="stats-grid">
        <ion-row>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">{{ data?.stats?.total ?? '—' }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Today</div><div class="stat-value" style="color:var(--accent)">{{ data?.stats?.today ?? '—' }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--warning)">{{ data?.stats?.pending ?? '—' }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value" style="color:var(--success)">{{ data?.stats?.delivered ?? '—' }}</div></div></ion-col>
        </ion-row>
      </ion-grid>

      <div class="filter-row">
        <ion-select v-model="filters.status" interface="action-sheet" placeholder="All Statuses" @ionChange="resetAndLoad" class="filter-select">
          <ion-select-option value="">All Statuses</ion-select-option>
          <ion-select-option v-for="s in ORDER_STATUSES" :key="s" :value="s">{{ s.replace(/_/g,' ') }}</ion-select-option>
        </ion-select>
        <ion-searchbar v-model="filters.search" placeholder="Search order ID…" :debounce="400" @ionInput="resetAndLoad" class="filter-search" />
      </div>

      <div v-if="error" class="error-banner">⚠️ {{ error }}</div>
      <div v-if="pending && !data?.orders?.length" class="loading-text">Loading orders…</div>
      <div v-else-if="!data?.orders?.length" class="empty-text">No orders found.</div>
      <div v-else class="content-card">
        <div v-for="order in data?.orders" :key="order.id" class="order-item" @click="openDetail(order)">
          <div class="order-item-top">
            <span class="mono">#{{ order.order_number }}</span>
            <span :class="['badge', statusBadgeClass(order.status)]">{{ order.status?.replace(/_/g,' ') }}</span>
          </div>
          <div class="order-item-mid">
            <span>{{ order.users?.name || order.users?.phone || '—' }}</span>
            <span style="color:var(--text3)">{{ order.suppliers?.name || '—' }}</span>
          </div>
          <div class="order-item-bot">
            <span class="mono" style="font-weight:700">{{ formatKES(order.total_amount) }}</span>
            <span style="font-size:11px;color:var(--text3)">{{ formatDateTime(order.created_at) }}</span>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <ion-button fill="outline" size="small" :disabled="page <= 1" @click="changePage(-1)">‹</ion-button>
        <span class="pagination-info">{{ page }} / {{ totalPages }}</span>
        <ion-button fill="outline" size="small" :disabled="page >= totalPages" @click="changePage(1)">›</ion-button>
      </div>
    </ion-content>

    <!-- Detail modal -->
    <ion-modal :is-open="!!selected" @didDismiss="selected = null">
      <ion-header>
        <ion-toolbar>
          <ion-title>Order #{{ selected?.order_number }}</ion-title>
          <ion-buttons slot="end"><ion-button @click="selected = null">Close</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content v-if="selected" class="modal-content">
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">Status</span><span :class="['badge', statusBadgeClass(selected.status)]">{{ selected.status }}</span></div>
          <div class="detail-row"><span class="detail-label">Customer</span><span>{{ selected.users?.name || selected.users?.phone || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">Supplier</span><span>{{ selected.suppliers?.name || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">Amount</span><span class="mono">{{ formatKES(selected.total_amount) }}</span></div>
          <div class="detail-row"><span class="detail-label">Payment</span><span :class="['badge', statusBadgeClass(selected.payment_status)]">{{ selected.payment_status }}</span></div>
          <div class="detail-row"><span class="detail-label">Date</span><span>{{ formatDateTime(selected.created_at) }}</span></div>
        </div>
        <div class="modal-action-section">
          <h3>Update Status</h3>
          <ion-select v-model="newStatus" interface="action-sheet" placeholder="Select status" class="field-select">
            <ion-select-option v-for="s in ORDER_STATUSES" :key="s" :value="s">{{ s.replace(/_/g,' ') }}</ion-select-option>
          </ion-select>
          <ion-button expand="block" class="action-btn" :disabled="!newStatus || updating" @click="updateStatus">
            <ion-spinner v-if="updating" name="crescent" slot="start" />
            {{ updating ? 'Updating…' : 'Update Status' }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonGrid, IonRow, IonCol, IonSelect, IonSelectOption, IonSearchbar,
  IonModal, IonRefresher, IonRefresherContent, IonSpinner, toastController,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { apiGet, apiPut } = useApi()
const ORDER_STATUSES = ['pending','confirmed','processing','out_for_delivery','delivered','cancelled']
const PAGE_SIZE = 15

const filters  = ref({ status: '', search: '' })
const page     = ref(1)
const error    = ref('')
const selected = ref<Record<string, unknown> | null>(null)
const newStatus = ref('')
const updating  = ref(false)

const queryParams = computed(() => ({
  status: filters.value.status, search: filters.value.search,
  page: page.value, limit: PAGE_SIZE,
}))

const { data, pending, refresh } = await useLazyAsyncData(
  'orders',
  () => apiGet<{ orders: unknown[]; total: number; stats: Record<string,number> }>('/api/admin/orders', queryParams.value),
  { watch: [queryParams] }
)

const totalPages = computed(() => Math.ceil((data.value?.total ?? 0) / PAGE_SIZE))

function resetAndLoad() { page.value = 1; refresh() }
function changePage(d: number) { page.value += d; refresh() }
async function onRefresh(e: CustomEvent) { await refresh(); (e.target as HTMLIonRefresherElement).complete() }
function openDetail(order: unknown) { selected.value = { ...(order as Record<string,unknown>) }; newStatus.value = (order as Record<string,unknown>).status as string }

async function updateStatus() {
  if (!newStatus.value || !selected.value) return
  updating.value = true
  try {
    await apiPut('/api/admin/orders', { orderId: selected.value.id, status: newStatus.value })
    const t = await toastController.create({ message: 'Status updated.', duration: 2000, color: 'success', position: 'top' })
    await t.present()
    selected.value = null
    refresh()
  } catch (e: unknown) {
    const t = await toastController.create({ message: (e as Error).message || 'Update failed.', duration: 2500, color: 'danger', position: 'top' })
    await t.present()
  } finally { updating.value = false }
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.stats-grid { padding: 0; margin-bottom: 4px; }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-select { --background: var(--bg1); --color: var(--text1); border-radius: 10px; border: 1px solid var(--border); flex: 0 0 145px; font-size: 13px; }
.filter-search { --background: var(--bg1); flex: 1; padding: 0; height: 40px; }
.error-banner { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
.order-item { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; }
.order-item:last-child { border-bottom: none; }
.order-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 14px; font-weight: 600; }
.order-item-mid { display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); margin-bottom: 4px; }
.order-item-bot { display: flex; justify-content: space-between; align-items: center; }
.modal-content { --background: var(--bg0); }
.detail-section { padding: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--text2); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.modal-action-section { padding: 16px; background: var(--bg1); border-top: 1px solid var(--border); }
.modal-action-section h3 { font-size: 14px; margin-bottom: 12px; color: var(--text2); }
.field-select { --background: var(--bg2); --color: var(--text1); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; }
.action-btn { --background: var(--accent); --border-radius: 10px; }
</style>
