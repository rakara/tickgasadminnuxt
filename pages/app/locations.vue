<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/app/more" /></ion-buttons>
        <ion-title>Locations</ion-title>
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
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Total</div>
              <div class="stat-value">{{ data?.summary?.total ?? '—' }}</div>
            </div>
          </ion-col>
          <ion-col size="6">
            <div class="stat-card">
              <div class="stat-label">Active</div>
              <div class="stat-value" style="color:var(--success)">{{ data?.summary?.active ?? '—' }}</div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <div class="filter-row">
        <ion-select
          v-model="filters.active"
          interface="action-sheet"
          placeholder="All"
          @ionChange="resetAndLoad"
          class="filter-select"
        >
          <ion-select-option value="">All</ion-select-option>
          <ion-select-option value="true">Active</ion-select-option>
          <ion-select-option value="false">Inactive</ion-select-option>
        </ion-select>
        <ion-searchbar
          v-model="filters.search"
          placeholder="Search location…"
          :debounce="400"
          @ionInput="resetAndLoad"
          class="filter-search"
        />
      </div>

      <div v-if="pending && !data?.locations?.length" class="loading-text">Loading locations…</div>
      <div v-else-if="!data?.locations?.length" class="empty-text">No locations found.</div>
      <div v-else class="content-card">
        <div
          v-for="loc in data?.locations"
          :key="loc.id"
          class="loc-item"
          @click="openDetail(loc)"
        >
          <div class="loc-row-top">
            <div>
              <div class="loc-name">{{ loc.name }}</div>
              <div class="loc-area">{{ loc.area }}</div>
            </div>
            <span :class="['badge', loc.active ? 'badge-active' : 'badge-cancelled']">
              {{ loc.active ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div v-if="loc.latitude && loc.longitude" class="loc-coords mono">
            {{ Number(loc.latitude).toFixed(4) }}, {{ Number(loc.longitude).toFixed(4) }}
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
          <ion-title>{{ selected?.name }}</ion-title>
          <ion-buttons slot="end"><ion-button @click="selected = null">Close</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content v-if="selected" class="modal-content">
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">Name</span><span>{{ selected.name }}</span></div>
          <div class="detail-row"><span class="detail-label">Area</span><span>{{ selected.area || '—' }}</span></div>
          <div class="detail-row">
            <span class="detail-label">Latitude</span>
            <span class="mono">{{ selected.latitude ?? '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Longitude</span>
            <span class="mono">{{ selected.longitude ?? '—' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span :class="['badge', selected.active ? 'badge-active' : 'badge-cancelled']">
              {{ selected.active ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
        <div class="modal-action-section">
          <ion-toggle
            :checked="!!selected.active"
            @ionChange="(e: CustomEvent) => toggleActive(e.detail.checked)"
          />
          <span class="verify-label">{{ selected.active ? 'Active' : 'Inactive' }}</span>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Create modal -->
    <ion-modal :is-open="showCreate" @didDismiss="showCreate = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Add Location</ion-title>
          <ion-buttons slot="end"><ion-button @click="showCreate = false">Cancel</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="form-section">
          <div class="field-group">
            <label class="field-label">Name *</label>
            <ion-input v-model="form.name" placeholder="e.g. Westlands" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Area</label>
            <ion-input v-model="form.area" placeholder="e.g. Nairobi West" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Latitude</label>
            <ion-input v-model="form.latitude" type="number" placeholder="-1.2921" class="field-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Longitude</label>
            <ion-input v-model="form.longitude" type="number" placeholder="36.8219" class="field-input" />
          </div>
          <div v-if="formError" class="error-banner">{{ formError }}</div>
          <ion-button expand="block" class="action-btn" :disabled="saving" @click="createLocation">
            <ion-spinner v-if="saving" name="crescent" slot="start" />
            {{ saving ? 'Creating…' : 'Add Location' }}
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonBackButton,
  IonGrid, IonRow, IonCol,
  IonSelect, IonSelectOption, IonSearchbar,
  IonModal, IonRefresher, IonRefresherContent,
  IonInput, IonToggle, IonSpinner,
  toastController,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { apiGet, apiPost, apiPatch } = useApi()
const PAGE_SIZE = 20

const filters    = ref({ active: '', search: '' })
const page       = ref(1)
const selected   = ref<Record<string, unknown> | null>(null)
const updating   = ref(false)
const showCreate = ref(false)
const saving     = ref(false)
const formError  = ref('')
const form       = ref({ name: '', area: '', latitude: '', longitude: '' })

const queryParams = computed(() => ({ ...filters.value, page: page.value, limit: PAGE_SIZE }))

const { data, pending, refresh } = await useLazyAsyncData(
  'locations',
  () => apiGet<{
    locations: Array<{ id: string; name: string; area?: string; latitude?: number; longitude?: number; active: boolean; created_at: string }>
    total: number
    summary: { total: number; active: number }
  }>('/api/admin/locations', queryParams.value),
  { watch: [queryParams] }
)

const totalPages = computed(() => Math.ceil((data.value?.total ?? 0) / PAGE_SIZE))

function resetAndLoad() { page.value = 1; refresh() }
function changePage(d: number) { page.value += d; refresh() }
async function onRefresh(e: CustomEvent) { await refresh(); (e.target as HTMLIonRefresherElement).complete() }
function openDetail(loc: unknown) { selected.value = { ...(loc as Record<string, unknown>) } }

async function showToast(message: string, color = 'success') {
  const t = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await t.present()
}

async function toggleActive(active: boolean) {
  if (!selected.value) return
  updating.value = true
  try {
    await apiPatch(`/api/admin/locations/${selected.value.id}`, { active })
    selected.value.active = active
    await showToast('Location updated.')
    refresh()
  } catch (e: unknown) {
    await showToast((e as { data?: { message?: string } })?.data?.message || 'Failed.', 'danger')
  } finally {
    updating.value = false
  }
}

async function createLocation() {
  formError.value = ''
  if (!form.value.name) { formError.value = 'Name is required.'; return }
  saving.value = true
  try {
    await apiPost('/api/admin/locations', form.value)
    showCreate.value = false
    await showToast('Location added.')
    refresh()
  } catch (e: unknown) {
    formError.value = (e as { data?: { message?: string } })?.data?.message || 'Failed to add location.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.stats-grid { padding: 0; margin-bottom: 4px; }
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-select { --background: var(--bg1); --color: var(--text1); border-radius: 10px; border: 1px solid var(--border); flex: 0 0 100px; font-size: 13px; }
.filter-search { --background: var(--bg1); flex: 1; padding: 0; height: 40px; }
.loc-item { padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; }
.loc-item:last-child { border-bottom: none; }
.loc-row-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.loc-name { font-size: 15px; font-weight: 700; }
.loc-area { font-size: 12px; color: var(--text2); margin-top: 2px; }
.loc-coords { font-size: 11px; color: var(--text3); margin-top: 4px; }
.modal-content { --background: var(--bg0); }
.detail-section { padding: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--text2); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.modal-action-section { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg1); border-top: 1px solid var(--border); }
.verify-label { font-size: 14px; }
.error-banner { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
.form-section { padding: 16px; }
.field-group { margin-bottom: 16px; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
.field-input { --background: var(--bg2); --color: var(--text1); --placeholder-color: var(--text3); --border-radius: 12px; --padding-start: 14px; --padding-end: 14px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; }
.action-btn { --background: var(--accent); --border-radius: 10px; margin-top: 4px; }
</style>
