<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="bg-glow" />
      <div class="login-stage">

        <div class="logo-block">
          <div class="logo-mark">🔥</div>
          <div class="logo-name">TickGas</div>
          <div class="logo-sub">Admin Panel</div>
        </div>

        <div class="login-card">
          <div v-if="error" class="error-banner">⚠️ {{ error }}</div>

          <div class="field-group">
            <label class="field-label">Email</label>
            <ion-input v-model="email" type="email" placeholder="admin@tickgas.com"
              class="field-input" autocomplete="email" @keyup.enter="handleLogin" />
          </div>
          <div class="field-group">
            <label class="field-label">Password</label>
            <ion-input v-model="password" type="password" placeholder="Enter password"
              class="field-input" autocomplete="current-password" @keyup.enter="handleLogin" />
          </div>

          <ion-button expand="block" class="login-btn" :disabled="loading" @click="handleLogin">
            <ion-spinner v-if="loading" name="crescent" slot="start" />
            {{ loading ? 'Logging in…' : 'Log In' }}
          </ion-button>
        </div>

        <p class="login-footer">TickGas © {{ new Date().getFullYear() }} — Nairobi, Kenya</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonInput, IonButton, IonSpinner } from '@ionic/vue'

definePageMeta({ layout: false })

const router   = useRouter()
const { saveSession } = useAuth()
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

async function handleLogin() {
  error.value = ''
  if (!email.value.trim() || !password.value.trim()) {
    error.value = 'Please enter your email and password.'; return
  }
  loading.value = true
  try {
    const data = await $fetch<{ success: boolean; admin: { email: string; role: string }; token: string }>('/api/admin/login', {
      method: 'POST',
      body:   { email: email.value.trim(), password: password.value.trim() },
    })
    saveSession(data.admin, data.token)
    await router.replace('/app/dashboard')
  } catch (err: unknown) {
    error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Invalid credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-content { --background: var(--bg0); }
.login-stage { position: relative; z-index: 10; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
.logo-block { text-align: center; margin-bottom: 40px; animation: riseIn .55s cubic-bezier(.22,1,.36,1) forwards; }
.logo-mark { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 18px; font-size: 30px; margin-bottom: 16px; animation: brandPulse 2.8s ease-in-out infinite .8s; }
.logo-name { font-size: 28px; font-weight: 800; background: linear-gradient(135deg,#fff 30%,rgba(255,255,255,.6)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -.02em; margin-bottom: 4px; }
.logo-sub { font-size: 13px; color: var(--text2); text-transform: uppercase; letter-spacing: .1em; }
.login-card { width: 100%; max-width: 400px; background: var(--bg1); border: 1px solid var(--border); border-radius: 20px; padding: 28px 24px; }
.error-banner { background: rgba(255,68,68,.1); border: 1px solid rgba(255,68,68,.25); color: var(--error); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 20px; }
.field-group { margin-bottom: 16px; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
.field-input { --background: var(--bg2); --color: var(--text1); --placeholder-color: var(--text3); --border-radius: 12px; --padding-start: 14px; --padding-end: 14px; border: 1px solid var(--border); border-radius: 12px; font-size: 14px; }
.login-btn { --background: linear-gradient(135deg,var(--accent),var(--accent2)); --border-radius: 12px; --color: #fff; --box-shadow: 0 8px 24px rgba(255,107,53,.3); margin-top: 8px; font-weight: 700; height: 48px; }
.login-footer { margin-top: 32px; font-size: 12px; color: var(--text3); text-align: center; }
@keyframes riseIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes brandPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,.5),0 16px 48px rgba(0,0,0,.5); } 50% { box-shadow: 0 0 0 10px rgba(255,107,53,0),0 16px 48px rgba(0,0,0,.5); } }
</style>
