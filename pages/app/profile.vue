<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/app/more" /></ion-buttons>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="profile-header">
        <div class="profile-avatar">{{ adminInitial }}</div>
        <div class="profile-name">{{ adminHandle }}</div>
        <div class="profile-role">Administrator</div>
        <div class="profile-email">{{ admin?.email }}</div>
      </div>

      <div class="content-card" style="padding:20px">
        <h2 style="margin-bottom:20px;font-size:16px">Change Password</h2>

        <div v-if="successMsg" class="success-banner">✅ {{ successMsg }}</div>
        <div v-if="errorMsg"   class="error-banner">⚠️ {{ errorMsg }}</div>

        <div class="field-group">
          <label class="field-label">Current Password</label>
          <ion-input v-model="form.current" type="password" placeholder="Current password" class="field-input" />
        </div>
        <div class="field-group">
          <label class="field-label">New Password</label>
          <ion-input v-model="form.newPw" type="password" placeholder="Min 8 characters" class="field-input" />
        </div>
        <div class="field-group">
          <label class="field-label">Confirm New Password</label>
          <ion-input v-model="form.confirm" type="password" placeholder="Repeat new password" class="field-input" />
        </div>

        <ion-button expand="block" class="save-btn" :disabled="saving" @click="changePassword">
          <ion-spinner v-if="saving" name="crescent" slot="start" />
          {{ saving ? 'Saving…' : 'Update Password' }}
        </ion-button>
      </div>

      <ion-button expand="block" fill="outline" color="danger" class="logout-btn" @click="confirmLogout">
        Log Out
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonBackButton, IonInput, IonSpinner,
  alertController,
} from '@ionic/vue'

definePageMeta({ layout: false })

const { admin, adminInitial, adminHandle, clearSession } = useAuth()
const { apiFetch } = useApi()
const router = useRouter()

const form       = ref({ current: '', newPw: '', confirm: '' })
const saving     = ref(false)
const successMsg = ref('')
const errorMsg   = ref('')

async function changePassword() {
  successMsg.value = ''
  errorMsg.value   = ''

  if (!form.value.current || !form.value.newPw) {
    errorMsg.value = 'Please fill in all fields.'; return
  }
  if (form.value.newPw !== form.value.confirm) {
    errorMsg.value = 'New passwords do not match.'; return
  }
  if (form.value.newPw.length < 8) {
    errorMsg.value = 'Password must be at least 8 characters.'; return
  }

  saving.value = true
  try {
    await apiFetch('/api/admin/profile/password', {
      method: 'POST',
      body: { currentPassword: form.value.current, newPassword: form.value.newPw },
    })
    successMsg.value = 'Password updated successfully.'
    form.value = { current: '', newPw: '', confirm: '' }
  } catch (e: unknown) {
    errorMsg.value = (e as { data?: { message?: string } })?.data?.message || 'Failed to update password.'
  } finally {
    saving.value = false
  }
}

async function confirmLogout() {
  const alert = await alertController.create({
    header: 'Log Out',
    message: 'Are you sure?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Log Out',
        role: 'destructive',
        handler: () => { clearSession(); router.replace('/login') },
      },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.profile-header { text-align: center; padding: 28px 16px 24px; }
.profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg,var(--accent),var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; margin: 0 auto 14px; }
.profile-name  { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.profile-role  { font-size: 12px; color: var(--accent); text-transform: uppercase; letter-spacing: .1em; font-weight: 600; margin-bottom: 4px; }
.profile-email { font-size: 13px; color: var(--text2); }
.success-banner { background: rgba(0,232,122,.1); border: 1px solid rgba(0,232,122,.3); color: var(--success); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
.error-banner   { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
.field-group { margin-bottom: 16px; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
.field-input { --background: var(--bg2); --color: var(--text1); --placeholder-color: var(--text3); --border-radius: 12px; --padding-start: 14px; --padding-end: 14px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; }
.save-btn   { --background: linear-gradient(135deg,var(--accent),var(--accent2)); --border-radius: 12px; --color: #fff; font-weight: 700; }
.logout-btn { --border-radius: 12px; margin: 16px 0 8px; }
</style>
