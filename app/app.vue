<script setup lang="ts">
import { ArrowRight, LoaderCircle, LogOut, Wallet } from '@lucide/vue'

import FinanceDashboard from './components/FinanceDashboard.vue'

import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'

const { user, status, busy, error, signIn, signOut } = useAuth()
const { accountStatus, accountError, initializeAccount } = useAccountInitialization(user)
</script>

<template>
  <main class="my-5 flex min-h-dvh flex-col bg-[linear-gradient(90deg,rgb(255_255_255_/_1.5%)_1px,transparent_1px)] bg-size-[120px_100%] pt-[max(32px,env(safe-area-inset-top))] pr-[max(32px,env(safe-area-inset-right))] pb-[max(24px,env(safe-area-inset-bottom))] pl-[max(32px,env(safe-area-inset-left))] max-[480px]:pt-[max(24px,env(safe-area-inset-top))] max-[480px]:pr-[max(24px,env(safe-area-inset-right))] max-[480px]:pl-[max(24px,env(safe-area-inset-left))]">
    <header class="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 border-b border-line pb-6 max-[480px]:gap-3 max-[480px]:pb-5">
      <div class="flex items-center gap-3 text-[17px] font-extrabold max-[480px]:gap-2.5 max-[480px]:text-[15px]">
        <img src="/icon-192.png" width="32" height="32" alt="" class="block size-8 shrink-0 rounded-md">
        <span>Finanz Tracker</span>
      </div>
      <button v-if="user" type="button" aria-label="Abmelden" title="Abmelden" :disabled="busy" class="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50" @click="signOut"><LogOut :size="18" /></button>
      <span v-else class="text-xs whitespace-nowrap text-muted max-[480px]:text-[11px] max-[350px]:hidden">Mein Konto</span>
    </header>
    <section class="w-full animate-enter motion-reduce:animate-none" :class="user ? 'mx-auto max-w-[480px] py-7' : 'm-auto max-w-[400px] py-14 max-[480px]:py-10 [&_h1]:mt-2.5 [&_h1]:mb-4 [&_h1]:text-[40px] [&_h1]:leading-[1.2] [&_h1]:font-extrabold [&_h1]:[overflow-wrap:anywhere] max-[480px]:[&_h1]:text-4xl max-[350px]:[&_h1]:text-[32px] [&_p]:text-sm [&_p]:leading-[1.7] [&_p]:[overflow-wrap:anywhere]'" :aria-labelledby="user && accountStatus === 'ready' ? 'dashboard-title' : 'account-title'" :aria-busy="status === 'loading' || busy || accountStatus === 'initializing'">
      <div class="mb-8 grid size-14 place-items-center rounded-lg border border-line bg-surface text-accent" aria-hidden="true" v-if="status === 'loading' || status === 'unconfigured'">
        <Wallet :size="28" :stroke-width="1.5" />
      </div>
      <template v-if="status === 'loading'">
        <h1 id="account-title">Einen Moment bitte.</h1>
        <p class="text-muted" role="status">Anmeldung wird gepr&uuml;ft.</p>
      </template>
      <template v-else-if="status === 'unconfigured'">
        <h1 id="account-title">Bald geht es los.</h1>
        <p class="text-muted">Die Anmeldung ist noch nicht verf&uuml;gbar.</p>
      </template>
      <template v-else-if="user">
        <FinanceDashboard v-if="accountStatus === 'ready'" :access-token="user.access_token" />
        <div v-else-if="accountStatus === 'error'" class="py-12">
          <h1 id="account-title" class="mb-4 text-2xl font-bold">Einrichtung pausiert.</h1>
          <p class="text-sm leading-relaxed text-error" role="alert">{{ accountError }}</p>
          <button type="button" class="mt-6 min-h-11 w-full cursor-pointer rounded-md bg-accent px-5 py-3 text-sm font-bold text-accent-ink hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" @click="initializeAccount">Erneut versuchen</button>
        </div>
        <div v-else class="py-12">
          <LoaderCircle class="mb-6 animate-spin text-accent motion-reduce:animate-none" :size="28" aria-hidden="true" />
          <h1 id="account-title" class="mb-4 text-2xl font-bold">Dein Konto wird eingerichtet.</h1>
          <p class="text-sm leading-relaxed text-muted" role="status">Dein pers&ouml;nlicher Buchungsspeicher wird vorbereitet.</p>
        </div>
      </template>
      <template v-else>
        <span class="text-xs font-semibold text-accent">Deine Finanzen</span>
        <h1 id="account-title">Willkommen.</h1>
        <p class="text-muted">Melde dich an oder erstelle ein Konto.</p>
        <button class="mt-8 flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-md border border-transparent bg-accent px-5 py-4 text-left text-sm font-extrabold text-accent-ink transition-colors duration-150 enabled:hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-5 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none" type="button" :disabled="busy || status !== 'ready'" @click="signIn">
          <span>{{ busy ? 'Weiterleitung...' : 'Anmelden / Registrieren' }}</span>
          <LoaderCircle v-if="busy" class="shrink-0 animate-spin [animation-duration:900ms] motion-reduce:animate-none" :size="20" aria-hidden="true" />
          <ArrowRight v-else class="shrink-0" :size="20" aria-hidden="true" />
        </button>
      </template>
      <p v-if="error" class="mt-5 text-error" role="alert">{{ error }}</p>
    </section>
    <footer class="text-center text-[11px] text-muted">Dein pers&ouml;nlicher Finanz Tracker.</footer>
  </main>
</template>
