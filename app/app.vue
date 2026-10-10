<script setup lang="ts">
import { ArrowRight, LoaderCircle, LogOut, Wallet } from '@lucide/vue'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'

const { user, status, busy, error, signIn, signOut } = useAuth()
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div class="brand">
        <img src="/icon-192.png" width="32" height="32" alt="" class="brand-mark">
        <span>Finanz Tracker</span>
      </div>
      <span class="header-label">Mein Konto</span>
    </header>
    <section class="account" aria-labelledby="account-title" :aria-busy="status === 'loading' || busy">
      <div class="account-symbol" aria-hidden="true">
        <Wallet :size="28" :stroke-width="1.5" />
      </div>
      <template v-if="status === 'loading'">
        <h1 id="account-title">Einen Moment bitte.</h1>
        <p role="status">Anmeldung wird gepr&uuml;ft.</p>
      </template>
      <template v-else-if="status === 'unconfigured'">
        <h1 id="account-title">Bald geht es los.</h1>
        <p>Die Anmeldung ist noch nicht verf&uuml;gbar.</p>
      </template>
      <template v-else-if="user">
        <span class="eyebrow">Dein Konto</span>
        <h1 id="account-title">Angemeldet.</h1>
        <p class="email">{{ user.profile.email }}</p>
        <button class="action action-secondary" type="button" :disabled="busy" @click="signOut">
          <span>{{ busy ? 'Abmeldung l\u00e4uft...' : 'Abmelden' }}</span>
          <LoaderCircle v-if="busy" class="spinner" :size="20" aria-hidden="true" />
          <LogOut v-else :size="20" aria-hidden="true" />
        </button>
      </template>
      <template v-else>
        <span class="eyebrow">Deine Finanzen</span>
        <h1 id="account-title">Willkommen.</h1>
        <p>Melde dich an oder erstelle ein Konto.</p>
        <button class="action" type="button" :disabled="busy || status !== 'ready'" @click="signIn">
          <span>{{ busy ? 'Weiterleitung...' : 'Anmelden / Registrieren' }}</span>
          <LoaderCircle v-if="busy" class="spinner" :size="20" aria-hidden="true" />
          <ArrowRight v-else :size="20" aria-hidden="true" />
        </button>
      </template>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </section>
    <footer class="app-footer">Dein pers&ouml;nlicher Finanz Tracker.</footer>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
  --background: #111413;
  --surface: #1c2220;
  --text: #f2f5f3;
  --muted: #a0ada6;
  --line: #2c3530;
  --accent: #b1f2cc;
  --accent-hover: #c9f9dd;
  --accent-ink: #14271c;
  --error: #ff9eaa;
  font-family: 'Manrope', sans-serif;
  color: var(--text);
  background: var(--background);
  letter-spacing: 0;
}

* { box-sizing: border-box; }
body { margin: 0; }
::selection { color: var(--accent-ink); background: var(--accent); }

.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: max(32px, env(safe-area-inset-top)) max(32px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(32px, env(safe-area-inset-left));
  background-image: linear-gradient(90deg, rgb(255 255 255 / 1.5%) 1px, transparent 1px);
  background-size: 120px 100%;
}

.app-header {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand { display: flex; align-items: center; gap: 12px; font-size: 17px; font-weight: 800; }
.brand-mark { display: block; flex-shrink: 0; border-radius: 6px; }
.header-label { color: var(--muted); font-size: 12px; white-space: nowrap; }
.account { width: 100%; max-width: 400px; margin: auto; padding: 56px 0; animation: enter 400ms ease-out both; }
.account-symbol {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 32px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--accent);
}

.eyebrow { color: var(--accent); font-size: 12px; font-weight: 600; }
h1 { margin: 10px 0 16px; font-size: 40px; font-weight: 800; line-height: 1.2; overflow-wrap: anywhere; }
p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
.email { color: var(--text); font-weight: 500; }

.action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 56px;
  margin-top: 32px;
  padding: 16px 20px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.action svg { flex-shrink: 0; }
.action:hover:not(:disabled) { background: var(--accent-hover); }
.action:focus-visible { outline: 2px solid var(--accent); outline-offset: 5px; }
.action:disabled { opacity: 0.55; cursor: wait; }
.action-secondary { border-color: var(--line); background: var(--surface); color: var(--text); }
.action-secondary:hover:not(:disabled) { border-color: var(--accent); background: var(--surface); }
.error { margin-top: 20px; color: var(--error); }
.app-footer { color: var(--muted); font-size: 11px; text-align: center; }
.spinner { animation: spin 900ms linear infinite; }

@keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .app { padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); }
  .app-header { padding-bottom: 20px; gap: 12px; }
  .brand { gap: 10px; font-size: 15px; }
  .header-label { font-size: 11px; }
  h1 { font-size: 36px; }
  .account { padding: 40px 0; }
}

@media (max-width: 350px) {
  .header-label { display: none; }
  h1 { font-size: 32px; }
}

@media (prefers-reduced-motion: reduce) {
  .account, .spinner { animation: none; }
  .action { transition: none; }
}
</style>
