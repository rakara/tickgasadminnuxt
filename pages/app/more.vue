<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>More</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="admin-card" @click="navigateTo('/app/profile')">
        <div class="admin-avatar">{{ adminInitial }}</div>
        <div class="admin-info">
          <div class="admin-name">{{ adminHandle }}</div>
          <div class="admin-role">Administrator</div>
        </div>
        <ion-icon name="chevron-forward-outline" class="admin-chevron" />
      </div>

      <div class="menu-section">
        <div class="menu-label">Platform</div>
        <div class="content-card">
          <div class="menu-item" @click="navigateTo('/app/analytics')">
            <div class="menu-icon" style="background:rgba(77,166,255,.15);color:var(--info)">📈</div>
            <div class="menu-text">Analytics</div>
            <ion-icon name="chevron-forward-outline" class="menu-chevron" />
          </div>
          <div class="menu-item" @click="navigateTo('/app/locations')">
            <div class="menu-icon" style="background:rgba(0,232,122,.12);color:var(--success)">📍</div>
            <div class="menu-text">Service Locations</div>
            <ion-icon name="chevron-forward-outline" class="menu-chevron" />
          </div>
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-label">Account</div>
        <div class="content-card">
          <div class="menu-item" @click="navigateTo('/app/profile')">
            <div class="menu-icon" style="background:rgba(255,107,53,.12);color:var(--accent)">👤</div>
            <div class="menu-text">Profile & Password</div>
            <ion-icon name="chevron-forward-outline" class="menu-chevron" />
          </div>
          <div class="menu-item" @click="confirmLogout">
            <div class="menu-icon" style="background:rgba(255,68,68,.12);color:var(--error)">🚪</div>
            <div class="menu-text" style="color:var(--error)">Log Out</div>
          </div>
        </div>
      </div>

      <p class="app-version">TickGas Admin · Nuxt 3 · v1.0.0</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, alertController } from '@ionic/vue'

definePageMeta({ layout: false })

const { adminInitial, adminHandle, clearSession } = useAuth()
const router = useRouter()

async function confirmLogout() {
  const alert = await alertController.create({
    header: 'Log Out',
    message: 'Are you sure you want to log out?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Log Out', role: 'destructive', handler: () => { clearSession(); router.replace('/login') } },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
ion-toolbar { --background: var(--bg1); }
.admin-card { display: flex; align-items: center; gap: 14px; background: var(--bg1); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 24px; cursor: pointer; }
.admin-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg,var(--accent),var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; }
.admin-info { flex: 1; }
.admin-name { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
.admin-role { font-size: 12px; color: var(--text2); }
.admin-chevron { color: var(--text3); font-size: 18px; }
.menu-section { margin-bottom: 20px; }
.menu-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--text3); margin-bottom: 8px; padding-left: 4px; }
.menu-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-bottom: 1px solid var(--border); cursor: pointer; }
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: rgba(255,255,255,.03); }
.menu-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.menu-text { flex: 1; font-size: 15px; font-weight: 500; }
.menu-chevron { color: var(--text3); font-size: 16px; }
.app-version { text-align: center; font-size: 12px; color: var(--text3); margin-top: 8px; }
</style>
