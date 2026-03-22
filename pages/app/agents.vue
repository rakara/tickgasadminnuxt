<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Agents</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="showCreate = true"><ion-icon name="add-outline" slot="icon-only" /></ion-button>
          <ion-button fill="clear" @click="resetAndLoad"><ion-icon name="refresh-outline" slot="icon-only" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh"><ion-refresher-content /></ion-refresher>

      <div class="filter-row">
        <ion-select v-model="filters.status" interface="action-sheet" placeholder="All Status" @ionChange="resetAndLoad" class="filter-select">
          <ion-select-option value="">All</ion-select-option>
          <ion-select-option value="active">Active</ion-select-option>
          <ion-select-option value="suspended">Suspended</ion-select-option>
          <ion-select-option value="inactive">Inactive</ion-select-option>
        </ion-select>
        <ion-searchbar v-model="filters.search" placeholder="Search agent…" :debounce="400" @ionInput="resetAndLoad" class="filter-search" />
      </div>

      <div v-if="pending && !data?.agents?.length" class="loading-text">Loading agents…</div>
      <div v-else-if="!data?.agents?.length" class="empty-text">No agents found.</div>
      <div v-else class="content-card">
        <div v-for="a in data?.agents" :key="a.id" class="list-item" @click="openDetail(a)">
          <div class="agent-row">
            <div class="agent-avatar">{{ a.name?.[0]?.toUpperCase() || '?' }}</div>
            <div class="agent-info">
              <div class="list-item-name">{{ a.name }}</div>
              <div class="list-item-meta">{{ a.phone }} · {{ a.region || '—' }}</div>
            </div>
            <span :class="['badge', statusBadgeClass(a.status)]">{{ a.status }}</span>
          </div>
          <div class="list-item-bot" style="padding-left:48px">
            <span>{{ a.email || '—' }}</span>
            <span>{{ formatDate(a.created_at) }}</span>
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
          <div class="detail-row"><span class="detail-label">Region</span><span>{{ selected.region || '—' }}</span></div>
          <div class="detail-row"><span class="detail-label">Last Login</span><span>{{ formatDateTime(selected.last_login) }}</span></div>
          <div v-if="selected.suspension_reason" class="detail-row"><span class="detail-label">Reason</span><span style="color:var(--error)">{{ selected.suspension_reason }}</span></div>
        </div>
        <div class="modal-action-section">
          <h3>Update Status</h3>
          <div class="action-btn-row">
            <ion-button fill="outline" size="small" color="success" :disabled="updating || selected.status==='active'" @click="changeStatus('active', '')">Activate</ion-button>
            <ion-button fill="outline" size="small" color="danger"  :disabled="updating || selected.status==='suspended'" @click="showSuspend = !showSuspend">Suspend</ion-button>
          </div>
          <div v-if="showSuspend" style="margin-top:12px">
            <label class="field-label">Suspension Reason *</label>
            <ion-input v-model="suspendReason" placeholder="Reason…" class="field-input" style="margin-bottom:8px" />
            <ion-button expand="block" size="small" color="danger" :disabled="!suspendReason" @click="changeStatus('suspended', suspendReason)">Confirm Suspend</ion-button>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Create modal -->
    <ion-modal :is-open="showCreate" @didDismiss="showCreate = false">
      <ion-header><ion-toolbar>
        <ion-title>Add Agent</ion-title>
        <ion-buttons slot="end"><ion-button @click="showCreate = false">Cancel</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="modal-content">
        <div class="form-section">
          <div class="field-group"><label class="field-label">Full Name *</label><ion-input v-model="form.name" placeholder="John Kamau" class="field-input" /></div>
          <div class="field-group"><label class="field-label">Phone *</label><ion-input v-model="form.phone" type="tel" placeholder="0712345678" class="field-input" /></div>
          <div class="field-group"><label class="field-label">Email</label><ion-input v-model="form.email" type="email" class="field-input" /></div>
          <div class="field-group"><label class="field-label">Region</label><ion-input v-model="form.region" placeholder="Nairobi Central" class="field-input" /></div>
          <div class="field-group"><label class="field-label">PIN *</label><ion-input v-model="form.pin" type="password" placeholder="4-digit PIN" class="field-input" /></div>
          <div v-if="formError" class="error-banner">{{ formError }}</div>
          <ion-button expand="block" class="action-btn" :disabled="saving" @click="createAgent">
            <ion-spinner v-if="saving" name="crescent" slot="start" />{{ saving ? 'Creating…' : 'Create Agent' }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonSelect, IonSelectOption, IonSearchbar, IonModal, IonRefresher, IonRefresherContent,
  IonInput, IonSpinner, toastController,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { apiGet, apiPost, apiPut } = useApi()
const PAGE_SIZE = 20

const filters     = ref({ status: '', search: '' })
const page        = ref(1)
const selected    = ref<Record<string,unknown> | null>(null)
const updating    = ref(false)
const showCreate  = ref(false)
const showSuspend = ref(false)
const suspendReason = ref('')
const saving      = ref(false)
const formError   = ref('')
const form        = ref({ name: '', phone: '', email: '', region: '', pin: '' })

const queryParams = computed(() => ({ ...filters.value, page: page.value, limit: PAGE_SIZE }))

const { data, pending, refresh } = await useLazyAsyncData(
  'agents',
  () => apiGet<{ agents: unknown[]; total: number }>('/api/admin/agents', queryParams.value),
  { watch: [queryParams] }
)

const totalPages = computed(() => Math.ceil((data.value?.total ?? 0) / PAGE_SIZE))

function resetAndLoad() { page.value = 1; refresh() }
function changePage(d: number) { page.value += d; refresh() }
async function onRefresh(e: CustomEvent) { await refresh(); (e.target as HTMLIonRefresherElement).complete() }
function openDetail(a: unknown) { selected.value = { ...(a as Record<string,unknown>) }; showSuspend.value = false; suspendReason.value = '' }

async function toast(message: string, color = 'success') {
  const t = await toastController.create({ message, duration: 2500, color, position: 'top' })
  await t.present()
}

async function changeStatus(status: string, suspension_reason: string) {
  if (!selected.value) return
  updating.value = true
  try {
    await apiPut('/api/admin/agents', { agentId: selected.value.id, status, suspension_reason })
    selected.value.status = status
    showSuspend.value = false
    await toast('Agent status updated.')
    refresh()
  } catch (e: unknown) { await toast((e as { data?: { message?: string } })?.data?.message || 'Failed.', 'danger') }
  finally { updating.value = false }
}

async function createAgent() {
  formError.value = ''
  if (!form.value.name || !form.value.phone || !form.value.pin) {
    formError.value = 'Name, phone and PIN are required.'; return
  }
  saving.value = true
  try {
    await apiPost('/api/admin/agents', form.value)
    showCreate.value = false
    await toast('Agent created.')
    refresh()
  } catch (e: unknown) { formError.value = (e as { data?: { message?: string } })?.data?.message || 'Failed.' }
  finally { saving.value = false }
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-select { --background: var(--bg1); --color: var(--text1); border-radius: 10px; border: 1px solid var(--border); flex: 0 0 120px; font-size: 13px; }
.filter-search { --background: var(--bg1); flex: 1; padding: 0; height: 40px; }
.list-item { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; }
.list-item:last-child { border-bottom: none; }
.agent-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.agent-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,var(--accent),var(--accent2)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
.agent-info { flex: 1; }
.list-item-name { font-size: 15px; font-weight: 700; }
.list-item-meta { font-size: 12px; color: var(--text2); }
.list-item-bot { display: flex; justify-content: space-between; font-size: 12px; color: var(--text3); }
.modal-content { --background: var(--bg0); }
.detail-section { padding: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--text2); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.modal-action-section { padding: 16px; background: var(--bg1); border-top: 1px solid var(--border); }
.modal-action-section h3 { font-size: 14px; margin-bottom: 12px; color: var(--text2); }
.action-btn-row { display: flex; gap: 8px; }
.error-banner { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
.form-section { padding: 16px; }
.field-group { margin-bottom: 16px; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
.field-input { --background: var(--bg2); --color: var(--text1); --placeholder-color: var(--text3); --border-radius: 12px; --padding-start: 14px; --padding-end: 14px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; }
.action-btn { --background: var(--accent); --border-radius: 10px; margin-top: 4px; }
</style>
