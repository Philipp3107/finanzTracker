<script setup lang="ts">
import { Copy, RefreshCw, ShieldOff } from '@lucide/vue'

const props = defineProps<{ accessToken: string }>()
const config = useRuntimeConfig().public
const active = ref(false)
const expiresAt = ref(0)
const token = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const endpoint = `${config.accountApiUrl.replace(/\/$/, '')}/shortcut/bookings`
let controller: AbortController | undefined
let stopped = false

async function access(method = 'GET') {
  if (busy.value) return
  if (method === 'POST' && active.value && !window.confirm('Den bisherigen Shortcut-Zugang ersetzen? Bestehende Kurzbefehle muessen danach den neuen Schluessel verwenden.')) return
  if (method === 'DELETE' && !window.confirm('Shortcut-Zugang widerrufen? Automatische Buchungen werden danach abgewiesen.')) return
  busy.value = true
  error.value = ''
  notice.value = ''
  if (method !== 'GET') token.value = ''
  controller = new AbortController()
  const timeout = setTimeout(() => controller?.abort(), 20000)
  try {
    const response = await fetch(`${config.accountApiUrl.replace(/\/$/, '')}/finance/shortcut`, {
      method, headers: { Authorization: `Bearer ${props.accessToken}` },
      signal: controller.signal, cache: 'no-store', credentials: 'omit', redirect: 'error',
    })
    if (!response.ok) throw new Error('Shortcut-Zugang konnte nicht verwaltet werden. Bitte erneut versuchen oder neu anmelden.')
    const result = await response.json()
    if (stopped) return
    active.value = result.active === true
    expiresAt.value = Number(result.expiresAt ?? 0)
    token.value = typeof result.token === 'string' ? result.token : ''
    if (method === 'POST') notice.value = 'Neuer Schluessel erstellt. Er wird nur jetzt angezeigt.'
    if (method === 'DELETE') notice.value = 'Zugang widerrufen.'
  } catch (failure) {
    if (!stopped) error.value = failure instanceof Error ? failure.message : 'Anfrage fehlgeschlagen.'
  } finally { clearTimeout(timeout); busy.value = false }
}
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); notice.value = 'Kopiert.' }
  catch { error.value = 'Kopieren nicht verfuegbar. Bitte den Text manuell markieren.' }
}
onMounted(() => { void access() })
onBeforeUnmount(() => { stopped = true; controller?.abort(); token.value = '' })
</script>

<template>
  <section aria-labelledby="shortcut-title" class="space-y-4 border-t border-line pt-6">
    <div class="flex items-center justify-between"><h2 id="shortcut-title" class="text-sm font-bold">iPhone-Kurzbefehl</h2><button type="button" aria-label="Shortcut-Status aktualisieren" title="Shortcut-Status aktualisieren" :disabled="busy" class="grid size-11 place-items-center rounded-md text-muted hover:bg-surface disabled:opacity-50" @click="access()"><RefreshCw :size="17" /></button></div>
    <p class="text-xs text-muted">{{ active ? `Aktiv bis ${new Date(expiresAt * 1000).toLocaleDateString('de-DE')}` : 'Kein aktiver Zugang' }}</p>
    <p class="text-xs leading-relaxed text-muted">Nur automatische Ausgaben. Der Schl&uuml;ssel ist 90 Tage g&uuml;ltig. Nicht teilen oder in eine URL schreiben.</p>
    <div><label for="shortcut-endpoint" class="text-xs text-muted">Buchungs-Endpunkt</label><div class="mt-1 flex gap-2"><input id="shortcut-endpoint" :value="endpoint" readonly class="min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-base"><button type="button" aria-label="Endpunkt kopieren" title="Endpunkt kopieren" class="grid size-11 shrink-0 place-items-center rounded-md border border-line" @click="copy(endpoint)"><Copy :size="17" /></button></div></div>
    <div v-if="token"><label for="shortcut-token" class="text-xs text-muted">Pers&ouml;nlicher Schl&uuml;ssel &middot; einmalige Anzeige</label><div class="mt-1 flex gap-2"><input id="shortcut-token" :value="token" readonly autocomplete="off" autocapitalize="off" spellcheck="false" class="min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 font-mono text-base"><button type="button" aria-label="Schluessel kopieren" title="Schluessel kopieren" class="grid size-11 shrink-0 place-items-center rounded-md border border-line" @click="copy(token)"><Copy :size="17" /></button></div></div>
    <p v-if="notice" role="status" class="text-xs text-accent">{{ notice }}</p>
    <p v-if="error" role="alert" class="text-xs text-error">{{ error }}</p>
    <div class="flex flex-wrap gap-3"><button type="button" :disabled="busy" class="min-h-11 flex-1 rounded-md bg-accent px-3 text-xs font-bold text-accent-ink disabled:opacity-50" @click="access('POST')">{{ active ? 'Schluessel ersetzen' : 'Zugang erstellen' }}</button><button v-if="active" type="button" :disabled="busy" class="flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-3 text-xs text-error disabled:opacity-50" @click="access('DELETE')"><ShieldOff :size="17" />Widerrufen</button></div>
  </section>
</template>
