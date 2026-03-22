// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false, // SPA mode — required for Ionic + Capacitor

  devtools: { enabled: false },

  css: [
    '@ionic/vue/css/core.css',
    '@ionic/vue/css/normalize.css',
    '@ionic/vue/css/structure.css',
    '@ionic/vue/css/typography.css',
    '@ionic/vue/css/padding.css',
    '@ionic/vue/css/float-elements.css',
    '@ionic/vue/css/text-alignment.css',
    '@ionic/vue/css/text-transformation.css',
    '@ionic/vue/css/flex-utils.css',
    '@ionic/vue/css/display.css',
    '~/assets/css/variables.css',
    '~/assets/css/global.css',
  ],

  plugins: [
    '~/plugins/ionic.client.ts',
  ],

  runtimeConfig: {
    // Server-only (never exposed to client)
    jwtSecret:          '',
    supabaseServiceKey: '',
    adminEmail:         '',
    adminPasswordHash:  '',

    // Public (exposed to client via useRuntimeConfig().public)
    public: {
      supabaseUrl:     '',
      supabaseAnonKey: '',
    },
  },

  nitro: {
    preset: 'vercel',
  },

  vite: {
    optimizeDeps: {
      include: ['@ionic/vue', '@ionic/vue-router'],
    },
  },

  app: {
    head: {
      title: 'TickGas Admin',
      meta: [
        { name: 'viewport',     content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        { name: 'theme-color',  content: '#0a0a0a' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon',             type: 'image/png', href: '/icons/favicon.png' },
        { rel: 'manifest',         href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'preconnect',       href: 'https://fonts.googleapis.com' },
        {
          rel:  'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
