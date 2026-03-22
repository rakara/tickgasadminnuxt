<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Payments</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="resetAndLoad"><ion-icon name="refresh-outline" slot="icon-only" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <ion-grid class="stats-grid">
        <ion-row>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value" style="color:var(--accent)">{{ formatKES(data?.summary?.totalRevenue) }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">This Month</div><div class="stat-value">{{ formatKES(data?.summary?.monthlyRevenue) }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Commission 5%</div><div class="stat-value">{{ formatKES(data?.summary?.commission) }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Transactions</div><div class="stat-value">{{ data?.total ?? '—' }}</div></div></ion-col>
        </ion-row>
      </ion-grid>

      <div class="filter-row">
        <ion-select v-model="filters.status" interface="action-sheet" placeholder="All" @ionChange="resetAndLoad" class="filter-select">
          <ion-select-option value="">All</ion-select-option>
          <ion-select-option value="completed">Completed</ion-select-option>
          <ion-select-option value="pending">Pending</ion-select-option>
          <ion-select-option value="failed">Failed</ion-select-option>
        </ion-select>
        <ion-input v-model="filters.startDate" type="date" class="date-input" @ionChange="resetAndLoad" />
      </div>

      <div v-if="pending && !data?.transactions?.length" class="loading-text">Loading transactions…</div>
      <div v-else-if="!data?.transactions?.length" class="empty-text">No transactions found.</div>
      <div v-else class="content-card">
        <div v-for="tx in data?.transactions" :key="tx.id" class="tx-item">
          <div class="tx-row-top">
            <span class="mono" style="color:var(--info);font-size:12px">{{ tx.mpesa_reference || tx.checkout_request_id || '—' }}</span>
            <span :class="['badge', statusBadgeClass(tx.status)]">{{ tx.status }}</span>
          </div>
          <div class="tx-row-mid">
            <span>{{ tx.phone || '—' }}</span>
            <span class="mono" style="font-weight:700;font-size:14px">{{ formatKES(tx.amount) }}</span>
          </div>
          <div class="tx-row-bot">
            <span>Order #{{ tx.order_id?.slice(0, 8) || '—' }}</span>
            <span>{{ formatDateTime(tx.created_at) }}</span>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <ion-button fill="outline" size="small" :disabled="page <= 1" @click="changePage(-1)">‹</ion-button>
        <span class="pagination-info">{{ page }} / {{ totalPages }}</span>
        <ion-button fill="outline" size="small" :disabled="page >= totalPages" @click="changePage(1)">›</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonGrid, IonRow, IonCol, IonSelect, IonSelectOption, IonInput,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { apiGet } = useApi()
const PAGE_SIZE  = 15
const filters    = ref({ status: '', startDate: '' })
const page       = ref(1)

const queryParams = computed(() => ({ ...filters.value, page: page.value, limit: PAGE_SIZE }))

const { data, pending, refresh } = await useLazyAsyncData(
  'payments',
  () => apiGet<{ transactions: unknown[]; total: number; summary: Record<string,number> }>('/api/admin/payments', queryParams.value),
  { watch: [queryParams] }
)

const totalPages = computed(() => Math.ceil((data.value?.total ?? 0) / PAGE_SIZE))
function resetAndLoad() { page.value = 1; refresh() }
function changePage(d: number) { page.value += d; refresh() }
async function onRefresh(e: CustomEvent) { await refresh(); (e.target as HTMLIonRefresherElement).complete() }
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.stats-grid { padding: 0; margin-bottom: 4px; }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-select { --background: var(--bg1); --color: var(--text1); border-radius: 10px; border: 1px solid var(--border); flex: 0 0 120px; font-size: 13px; }
.date-input { --background: var(--bg1); --color: var(--text1); border: 1px solid var(--border); border-radius: 10px; --padding-start: 10px; font-size: 13px; flex: 1; height: 42px; }
.tx-item { padding: 13px 16px; border-bottom: 1px solid var(--border); }
.tx-item:last-child { border-bottom: none; }
.tx-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.tx-row-mid { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
.tx-row-bot { display: flex; justify-content: space-between; font-size: 11px; color: var(--text3); }
</style>
