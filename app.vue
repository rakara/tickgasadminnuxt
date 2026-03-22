<template>
  <ion-app>
    <NuxtPage />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp } from '@ionic/vue'

const { isAuthenticated } = useAuth()
const route  = useRoute()
const router = useRouter()

// Client-side route guard — redirect unauthenticated users to /login
watchEffect(() => {
  if (!import.meta.client) return
  const publicPaths = ['/login']
  if (!publicPaths.includes(route.path) && !isAuthenticated.value) {
    router.replace('/login')
  }
  if (route.path === '/login' && isAuthenticated.value) {
    router.replace('/app/dashboard')
  }
})
</script>
