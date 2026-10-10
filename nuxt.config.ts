import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      cognitoAuthority: process.env.NUXT_PUBLIC_COGNITO_AUTHORITY || '',
      cognitoClientId: process.env.NUXT_PUBLIC_COGNITO_CLIENT_ID || '',
      cognitoDomain: process.env.NUXT_PUBLIC_COGNITO_DOMAIN || '',
      accountApiUrl: process.env.NUXT_PUBLIC_ACCOUNT_API_URL || '',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'de', class: 'scheme-dark bg-background font-sans text-foreground tracking-normal selection:bg-accent selection:text-accent-ink' },
      title: 'Finanz Tracker',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#111413' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Finanzen' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
})
