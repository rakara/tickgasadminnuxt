<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/app/more" /></ion-buttons>
        <ion-title>Analytics</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="refresh"><ion-icon name="refresh-outline" slot="icon-only" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <ion-grid class="stats-grid">
        <ion-row>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Total Orders</div>
              <div class="stat-value">{{ data?.analytics?.totalOrders?.toLocaleString() ?? '—' }}</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Total Revenue</div>
              <div class="stat-value" style="color:var(--accent)">{{ formatKES(data?.analytics?.totalRevenue) }}</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Active Suppliers</div>
              <div class="stat-value" style="color:var(--success)">{{ data?.analytics?.activeSuppliers ?? '—' }}</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Pending</div>
              <div class="stat-value" style="color:var(--warning)">{{ data?.analytics?.pendingApprovals ?? '—' }}</div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <div class="content-card">
        <div class="section-header" style="padding:16px 16px 12px">
          <h2>Recent Orders</h2>
        </div>
        <div v-if="pending" class="loading-text">Loading…</div>
        <div v-else-if="!data?.analytics?.recentOrders?.length" class="empty-text">No recent orders.</div>
        <template v-else>
          <div
            v-for="order in data?.analytics?.recentOrders"
            :key="order.id"
            class="order-row"
          >
            <div class="order-row-top">
              <span class="mono" style="font-size:13px;font-weight:600">#{{ order.order_number }}</span>
              <span :class="['badge', statusBadgeClass(order.status)]">{{ order.status }}</span>
            </div>
            <div class="order-row-bot">
              <span>{{ order.users?.phone || '—' }}</span>
              <span class="mono" style="font-weight:700">{{ formatKES(order.total_amount) }}</span>
            </div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">{{ formatDateTime(order.created_at) }}</div>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonBackButton,
  IonGrid, IonRow, IonCol,
  IonRefresher, IonRefresherContent,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { apiGet } = useApi()

const { data, pending, refresh } = await useLazyAsyncData(
  'analytics',
  () => apiGet<{
    analytics: {
      totalOrders: number
      totalRevenue: number
      activeSuppliers: number
      pendingApprovals: number
      recentOrders: Array<{
        id: string
        order_number: string
        status: string
        total_amount: number
        created_at: string
        users?: { phone?: string }
      }>
    }
  }>('/api/admin/analytics')
)

async function onRefresh(e: CustomEvent) {
  await refresh()
  ;(e.target as HTMLIonRefresherElement).complete()
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.stats-grid { padding: 0; margin-bottom: 4px; }
.order-row { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.order-row:last-child { border-bottom: none; }
.order-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.order-row-bot { display: flex; justify-content: space-between; font-size: 12px; color: var(--text2); }
</style>
