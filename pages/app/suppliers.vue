<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Suppliers</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="showCreate = true"><ion-icon name="add-outline" slot="icon-only" /></ion-button>
          <ion-button fill="clear" @click="resetAndLoad"><ion-icon name="refresh-outline" slot="icon-only" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <ion-grid class="stats-grid">
        <ion-row>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">{{ data?.summary?.total ?? '—' }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--warning)">{{ data?.summary?.pending ?? '—' }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Approved</div><div class="stat-value" style="color:var(--success)">{{ data?.summary?.approved ?? '—' }}</div></div></ion-col>
          <ion-col size="6"><div class="stat-card"><div class="stat-label">Verified</div><div class="stat-value" style="color:var(--info)">{{ data?.summary?.verified ?? '—' }}</div></div></ion-col>
        </ion-row>
      </ion-grid>

      <div class="filter-row">
        <ion-select v-model="filters.status" interface="action-sheet" placeholder="All Status" @ionChange="resetAndLoad" class="filter-select">
          <ion-select-option value="">All</ion-select-option>
          <ion-select-option value="pending">Pending</ion-select-option>
          <ion-select-option value="approved">Approved</ion-select-option>
          <ion-select-option value="rejected">Rejected</ion-select-option>
        </ion-select>
        <ion-searchbar v-model="filters.search" placeholder="Search supplier…" :debounce="400" @ionInput="resetAndLoad" class="filter-search" />
      </div>

      <div v-if="pending && !data?.suppliers?.length" class="loading-text">Loading suppliers…</div>
      <div v-else-if="!data?.suppliers?.length" class="empty-text">No suppliers found.</div>
      <div v-else class="content-card">
        <div v-for="s in data?.suppliers" :key="s.id" class="list-item" @click="openDetail(s)">
          <div class="list-item-top">
            <div><div class="list-item-name">{{ s.name }}</div><div class="list-item-meta">{{ s.phone }} · {{ s.location }}</div></div>
            <span :class="['badge', statusBadgeClass(s.status)]">{{ s.status }}</span>
          </div>
          <div class="list-item-bot">
            <span class="mono" style="color:var(--info);font-size:11px">{{ s.onboarding_ref }}</span>
            <span>{{ formatDate(s.created_at) }}</span>
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
      <ion-header><ion-toolbar>
        <ion-title>{{ selected?.name }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="selected = null">Close</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content v-if="selected" class="modal-content">
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">Status</span><span :class="['badge', statusBadgeClass(selected.status)]">{{ selected.status }}</span></div>
          <div class="detail-row"><span class="detail-label">Phone</span><span class="mono">{{ selected.phone }}</span></div>
          <div class="detail-row"><span class="detail-label">Email</span><span>{{ selected.email || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">Location</span><span>{{ selected.location || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">Verified</span><span>{{ selected.verified ? '✅ Yes' : '❌ No' }}</span></div>
          <div class="detail-row"><span class="detail-label">Joined</span><span>{{ formatDate(selected.created_at) }}</span></div>
        </div>
        <div class="modal-action-section">
          <h3>Change Status</h3>
          <div class="action-btn-row">
            <ion-button v-for="st in ['pending','approved','rejected']" :key="st" fill="outline" size="small"
              :color="st==='approved'?'success':st==='rejected'?'danger':'medium'"
              :disabled="updating || selected.status===st" @click="updateSupplierStatus(st)">{{ st }}</ion-button>
          </div>
          <div class="verify-row">
            <ion-toggle :checked="selected.verified" @ionChange="(e: CustomEvent) => updateVerified(e.detail.checked)" />
            <span>Mark as Verified</span>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Create modal -->
    <ion-modal :is-open="showCreate" @didDismiss="showCreate = false">
      <ion-header><ion-toolbar>
        <ion-title>Add Supplier</ion-title>
        <ion-buttons slot="end"><ion-button @click="showCreate = false">Cancel</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="modal-content">
        <div class="form-section">
          <div class="field-group"><label class="field-label">Business Name *</label><ion-input v-model="form.name" placeholder="Nairobi Gas Ltd" class="field-input" /></div>
          <div class="field-group"><label class="field-label">Phone *</label><ion-input v-model="form.phone" type="tel" placeholder="0712345678" class="field-input" /></div>
          <div class="field-group"><label class="field-label">Email</label><ion-input v-model="form.email" type="email" placeholder="supplier@example.com" class="field-input" /></div>
          <div class="field-group"><label class="field-label">Location / Area</label><ion-input v-model="form.location" placeholder="Westlands" class="field-input" /></div>
          <div class="field-group"><label class="field-label">PIN *</label><ion-input v-model="form.pin" type="password" placeholder="Min 4 digits" class="field-input" /></div>
          <div v-if="formError" class="error-banner">{{ formError }}</div>
          <ion-button expand="block" class="action-btn" :disabled="saving" @click="createSupplier">
            <ion-spinner v-if="saving" name="crescent" slot="start" />{{ saving ? 'Creating…' : 'Create Supplier' }}
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
  IonModal, IonRefresher, IonRefresherContent, IonInput, IonToggle, IonSpinner, toastController,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { apiGet, apiPost, apiPut } = useApi()
const PAGE_SIZE = 15

const filters    = ref({ status: '', search: '' })
const page       = ref(1)
const selected   = ref<Record<string,unknown> | null>(null)
const updating   = ref(false)
const showCreate = ref(false)
const saving     = ref(false)
const formError  = ref('')
const form       = ref({ name: '', phone: '', email: '', location: '', pin: '' })

const queryParams = computed(() => ({ ...filters.value, page: page.value, limit: PAGE_SIZE }))

const { data, pending, refresh } = await useLazyAsyncData(
  'suppliers',
  () => apiGet<{ suppliers: unknown[]; total: number; summary: Record<string,number> }>('/api/admin/suppliers', queryParams.value),
  { watch: [queryParams] }
)

const totalPages = computed(() => Math.ceil((data.value?.total ?? 0) / PAGE_SIZE))

function resetAndLoad() { page.value = 1; refresh() }
function changePage(d: number) { page.value += d; refresh() }
async function onRefresh(e: CustomEvent) { await refresh(); (e.target as HTMLIonRefresherElement).complete() }
function openDetail(s: unknown) { selected.value = { ...(s as Record<string,unknown>) } }

async function toast(message: string, color = 'success') {
  const t = await toastController.create({ message, duration: 2500, color, position: 'top' })
  await t.present()
}

async function updateSupplierStatus(status: string) {
  if (!selected.value) return
  updating.value = true
  try {
    await apiPut('/api/admin/suppliers', { supplierId: selected.value.id, status })
    selected.value.status = status
    await toast('Status updated.')
    refresh()
  } catch (e: unknown) { await toast((e as Error).message || 'Failed.', 'danger') }
  finally { updating.value = false }
}

async function updateVerified(verified: boolean) {
  if (!selected.value) return
  updating.value = true
  try {
    await apiPut('/api/admin/suppliers', { supplierId: selected.value.id, verified })
    selected.value.verified = verified
    await toast('Verification updated.')
    refresh()
  } catch (e: unknown) { await toast((e as Error).message || 'Failed.', 'danger') }
  finally { updating.value = false }
}

async function createSupplier() {
  formError.value = ''
  if (!form.value.name || !form.value.phone || !form.value.pin) {
    formError.value = 'Name, phone and PIN are required.'; return
  }
  saving.value = true
  try {
    await apiPost('/api/admin/suppliers', form.value)
    showCreate.value = false
    await toast('Supplier created successfully.')
    refresh()
  } catch (e: unknown) { formError.value = (e as { data?: { message?: string } })?.data?.message || 'Failed to create supplier.' }
  finally { saving.value = false }
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.stats-grid { padding: 0; margin-bottom: 4px; }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-select { --background: var(--bg1); --color: var(--text1); border-radius: 10px; border: 1px solid var(--border); flex: 0 0 120px; font-size: 13px; }
.filter-search { --background: var(--bg1); flex: 1; padding: 0; height: 40px; }
.list-item { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; }
.list-item:last-child { border-bottom: none; }
.list-item-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.list-item-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
.list-item-meta { font-size: 12px; color: var(--text2); }
.list-item-bot { display: flex; justify-content: space-between; font-size: 12px; color: var(--text3); }
.modal-content { --background: var(--bg0); }
.detail-section { padding: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--text2); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.modal-action-section { padding: 16px; background: var(--bg1); border-top: 1px solid var(--border); }
.modal-action-section h3 { font-size: 14px; margin-bottom: 12px; color: var(--text2); }
.action-btn-row { display: flex; gap: 8px; margin-bottom: 16px; }
.verify-row { display: flex; align-items: center; gap: 12px; font-size: 14px; }
.error-banner { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
.form-section { padding: 16px; }
.field-group { margin-bottom: 16px; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
.field-input { --background: var(--bg2); --color: var(--text1); --placeholder-color: var(--text3); --border-radius: 12px; --padding-start: 14px; --padding-end: 14px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; }
.action-btn { --background: var(--accent); --border-radius: 10px; margin-top: 4px; }
</style>
