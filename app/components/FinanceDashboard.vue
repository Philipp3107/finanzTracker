<script setup lang="ts">
import { Check, Eye, EyeOff, Plus, RefreshCw, Settings2, Wallet, X, Trash2 } from '@lucide/vue'
import type { BookingEntry, FinanceSettings } from '../composables/useFinance'
import ShortcutSettings from './ShortcutSettings.vue'

const props = defineProps<{ accessToken: string }>()
const { state, loading, saving, error, refresh, save } = useFinance(() => props.accessToken)
const tab = ref<'overview' | 'budgets' | 'recurring' | 'settings'>('overview')
const hidden = ref(false)
const dialog = ref<HTMLDialogElement>()
const deleteDialog = ref<HTMLDialogElement>()
const deleting = ref<BookingEntry | null>(null)
const draft = reactive({ label: '', amount: '', direction: 'expense', budgetId: '', timestamp: '' })
const plan = ref<FinanceSettings>({ startDay: 1, budgets: [], recurring: [] })
const planVersion = ref(0)
const entry = reactive({ label: '', amount: '', direction: 'expense', day: 1 })
const formError = ref('')
const notice = ref('')
let pendingBooking: { signature: string; payload: Record<string, unknown> } | undefined
const confirmations = new Map<string, string>()
const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const dates = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', timeZone: 'Europe/Berlin' })
const tabs = [{ id: 'overview', label: 'Uebersicht' }, { id: 'budgets', label: 'Budgets' }, { id: 'recurring', label: 'Fixposten' }, { id: 'settings', label: 'Plan' }] as const
const inputClass = 'min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-base text-foreground focus:outline-2 focus:outline-accent'
const buttonClass = 'min-h-11 rounded-md bg-accent px-4 py-3 text-sm font-bold text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

function money(cents: number) { return hidden.value ? '\u2022\u2022\u2022\u2022' : formatter.format(cents / 100) }
function source(booking: BookingEntry) {
  return booking.source ?? (booking.bookingId.startsWith('RECURRING#') ? 'recurring' : 'manual')
}
function requestDelete(booking: BookingEntry) {
  if (source(booking) !== 'manual') return
  deleting.value = booking
  deleteDialog.value?.showModal()
}
async function deleteBooking() {
  if (!deleting.value || source(deleting.value) !== 'manual') return
  if (await save(`/bookings/${encodeURIComponent(deleting.value.bookingId.replace(/^BOOKING#/, ''))}`, {}, 'DELETE')) {
    deleteDialog.value?.close()
    deleting.value = null
    notice.value = 'Manuelle Buchung geloescht. Salden wurden aktualisiert.'
  }
}
function cents(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) throw new Error('Bitte einen positiven Betrag mit maximal zwei Nachkommastellen eingeben.')
  const [whole, fraction = ''] = normalized.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (amount <= 0 || amount > 100000000) throw new Error('Betrag muss zwischen 0,01 und 1.000.000 Euro liegen.')
  return amount
}
function dateOnly(value: string) { return dates.format(new Date(`${value}T12:00:00+02:00`)) }
function localTime() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function editPlan() {
  if (!state.value) return
  plan.value = structuredClone(state.value.settings)
  planVersion.value = state.value.version
  tab.value = 'settings'
  formError.value = ''
}
function openBooking() {
  draft.timestamp ||= localTime()
  formError.value = ''
  dialog.value?.showModal()
}
async function createBooking() {
  try {
    formError.value = ''
    const amount = cents(draft.amount)
    const signature = JSON.stringify(draft)
    if (pendingBooking?.signature !== signature) pendingBooking = {
      signature,
      payload: { id: crypto.randomUUID(), label: draft.label.trim(), cents: draft.direction === 'income' ? amount : -amount,
        timestamp: new Date(draft.timestamp).toISOString(), ...(draft.direction === 'expense' && draft.budgetId ? { budgetId: draft.budgetId } : {}) },
    }
    if (await save('/bookings', pendingBooking.payload)) {
      pendingBooking = undefined
      Object.assign(draft, { label: '', amount: '', budgetId: '', timestamp: '' })
      dialog.value?.close()
      notice.value = 'Buchung gespeichert.'
    }
  } catch (failure) { formError.value = failure instanceof Error ? failure.message : 'Bitte Eingaben pruefen.' }
}
function addEntry(kind: 'budgets' | 'recurring') {
  try {
    formError.value = ''
    const amount = cents(entry.amount)
    if (!entry.label.trim()) throw new Error('Bitte eine Bezeichnung eingeben.')
    if (kind === 'budgets') plan.value.budgets.push({ id: crypto.randomUUID(), label: entry.label.trim(), cents: amount })
    else plan.value.recurring.push({ id: crypto.randomUUID(), label: entry.label.trim(), cents: entry.direction === 'income' ? amount : -amount, day: Number(entry.day) })
    Object.assign(entry, { label: '', amount: '' })
  } catch (failure) { formError.value = failure instanceof Error ? failure.message : 'Bitte Eingaben pruefen.' }
}
function changePlanAmount(item: { cents: number }, event: Event) {
  try {
    item.cents = cents((event.target as HTMLInputElement).value) * (item.cents < 0 ? -1 : 1)
    formError.value = ''
  } catch (failure) { formError.value = failure instanceof Error ? failure.message : 'Bitte Betrag pruefen.' }
}
async function savePlan() {
  if (formError.value) return
  if (await save('/settings', { ...plan.value, startDay: Number(plan.value.startDay), version: planVersion.value }, 'PUT')) {
    notice.value = 'Plan gespeichert. Starttag-Aenderungen gelten ab dem naechsten Zeitraum; beim ersten Plan sofort.'
    editPlan()
  }
}
async function confirm(occurrenceId: string) {
  const timestamp = confirmations.get(occurrenceId) ?? new Date().toISOString()
  confirmations.set(occurrenceId, timestamp)
  if (await save('/confirm', { occurrenceId, timestamp })) notice.value = 'Zahlung bestaetigt und gebucht.'
}
onMounted(() => {
  let params = new URLSearchParams(location.search)
  try {
    const stored = sessionStorage.getItem('finance-shortcut-draft')
    sessionStorage.removeItem('finance-shortcut-draft')
    if (stored) {
      const saved = JSON.parse(stored)
      if (typeof saved.query === 'string' && Date.now() - saved.createdAt < 600000) params = new URLSearchParams(saved.query)
    }
  } catch {}
  if (params.get('action') === 'booking') {
    draft.amount = (params.get('amount') ?? '').slice(0, 16)
    draft.label = (params.get('description') ?? '').slice(0, 100)
    draft.direction = params.get('type') === 'income' ? 'income' : 'expense'
    const timestamp = params.get('timestamp')
    if (timestamp && !Number.isNaN(Date.parse(timestamp))) {
      const date = new Date(timestamp)
      draft.timestamp = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    history.replaceState({}, '', '/')
    openBooking()
  }
})
</script>

<template>
  <div>
    <div class="mb-5 flex items-center justify-between gap-3">
      <h1 id="dashboard-title" class="text-2xl font-bold">Deine Finanzen</h1>
      <div class="flex gap-1">
        <button type="button" aria-label="Aktualisieren" title="Aktualisieren" :disabled="loading || saving" class="grid size-11 place-items-center rounded-md text-muted hover:bg-surface disabled:opacity-50" @click="refresh"><RefreshCw :size="18" :class="loading ? 'animate-spin' : ''" /></button>
        <button type="button" aria-label="Plan bearbeiten" title="Plan bearbeiten" :disabled="!state || loading || saving" class="grid size-11 place-items-center rounded-md text-muted hover:bg-surface disabled:opacity-50" @click="editPlan"><Settings2 :size="18" /></button>
      </div>
    </div>
    <p v-if="error" role="alert" class="mb-4 break-words text-sm text-error">{{ error }}</p>
    <p v-if="notice" role="status" class="mb-4 text-xs leading-relaxed text-accent">{{ notice }}</p>
    <p v-if="loading && !state" role="status" class="py-12 text-center text-sm text-muted">Finanzdaten werden geladen.</p>
    <template v-if="state">
      <p class="mb-4 text-xs text-muted">{{ dateOnly(state.period.start) }} bis {{ dates.format(new Date(new Date(`${state.period.end}T12:00:00Z`).getTime() - 86400000)) }} &middot; Europe/Berlin</p>
      <section class="border-b border-line pb-6" aria-labelledby="available-title">
        <div class="flex items-center justify-between"><h2 id="available-title" class="text-sm text-muted">Noch verf&uuml;gbar</h2><button type="button" :aria-label="hidden ? 'Betraege anzeigen' : 'Betraege ausblenden'" :title="hidden ? 'Betraege anzeigen' : 'Betraege ausblenden'" :aria-pressed="hidden" class="grid size-11 place-items-center rounded-md text-muted hover:bg-surface" @click="hidden = !hidden"><EyeOff v-if="hidden" :size="19" /><Eye v-else :size="19" /></button></div>
        <p data-testid="available" class="mt-2 break-words text-[34px] leading-tight font-semibold tabular-nums min-[390px]:text-[40px]" :class="state.availableCents < 0 ? 'text-error' : 'text-accent'">{{ money(state.availableCents) }}</p>
        <p v-if="state.expectedIncomeCents" class="mt-3 text-xs text-muted">inkl. {{ money(state.expectedIncomeCents) }} erwarteter Einnahmen</p>
        <div class="mt-6 grid grid-cols-2 gap-3"><div class="min-w-0"><h2 class="text-xs text-muted">Aktuell</h2><p data-testid="current" class="mt-2 break-words text-lg font-semibold tabular-nums">{{ money(state.currentCents) }}</p></div><div class="min-w-0 border-l border-line pl-4"><h2 class="text-xs text-muted">Verplant</h2><p data-testid="reserved" class="mt-2 break-words text-lg font-semibold tabular-nums">{{ money(state.reservedCents) }}</p></div></div>
      </section>
      <button type="button" :class="[buttonClass, 'my-5 flex w-full items-center justify-between']" :disabled="saving || loading" @click="openBooking"><span>Buchung erfassen</span><Plus :size="20" /></button>
      <nav aria-label="Finanzansichten" class="mb-6 grid grid-cols-4 border-b border-line" role="tablist"><button v-for="item in tabs" :id="`tab-${item.id}`" :key="item.id" type="button" role="tab" :aria-selected="tab === item.id" :aria-controls="`panel-${item.id}`" :disabled="saving" class="min-h-11 border-b-2 px-1 text-xs font-semibold" :class="tab === item.id ? 'border-accent text-accent' : 'border-transparent text-muted'" @click="item.id === 'settings' ? editPlan() : tab = item.id">{{ item.id === 'overview' ? '\u00dcbersicht' : item.label }}</button></nav>

      <section v-if="tab === 'overview'" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
        <div class="mb-7 grid grid-cols-2 gap-4 text-xs"><div><p class="text-muted">Einnahmen</p><p class="mt-2 font-semibold text-accent">{{ money(state.incomeCents) }}</p></div><div><p class="text-muted">Ausgaben</p><p class="mt-2 font-semibold">{{ money(state.expenseCents) }}</p></div></div>
        <h2 class="mb-3 text-sm font-bold">Buchungen im Zeitraum</h2>
        <ul v-if="state.bookings.length" class="divide-y divide-line"><li v-for="booking in state.bookings" :key="booking.bookingId" class="flex items-center gap-2 py-4"><span class="grid size-8 shrink-0 place-items-center rounded-md bg-surface text-muted"><Wallet :size="16" /></span><div class="min-w-0 flex-1"><p class="break-words text-xs font-semibold">{{ booking.label }}</p><p class="mt-1 text-[11px] text-muted">{{ dates.format(new Date(booking.timestamp)) }}<span v-if="booking.budgetId"> &middot; Budget</span></p><p class="mt-1 text-[10px]" :class="source(booking) === 'shortcut' ? 'text-accent' : 'text-muted'">{{ source(booking) === 'shortcut' ? 'Automatisch · Kurzbefehl' : source(booking) === 'recurring' ? 'Fixposten' : 'Manuell' }}</p></div><div class="flex shrink-0 flex-col items-end"><span class="text-xs font-semibold tabular-nums" :class="booking.cents > 0 ? 'text-accent' : ''">{{ money(booking.cents) }}</span><button v-if="source(booking) === 'manual'" type="button" :aria-label="`${booking.label} loeschen`" :title="`${booking.label} loeschen`" :disabled="saving || loading" class="grid size-11 place-items-center rounded-md text-muted hover:bg-surface hover:text-error disabled:opacity-50" @click="requestDelete(booking)"><Trash2 :size="16" /></button></div></li></ul>
        <p v-else class="py-8 text-center text-sm text-muted">Noch keine Buchungen. Erfasse deinen Startsaldo als erste Buchung.</p>
      </section>
      <section v-else-if="tab === 'budgets'" id="panel-budgets" role="tabpanel" aria-labelledby="tab-budgets">
        <div v-for="budget in state.budgets" :key="budget.id" class="border-b border-line py-5"><div class="mb-2 flex justify-between gap-3 text-sm"><h2 class="min-w-0 break-words font-semibold">{{ budget.label }}</h2><span class="shrink-0 tabular-nums">{{ money(budget.remainingCents) }}</span></div><p class="text-xs text-muted">{{ money(budget.spentCents) }} von {{ money(budget.cents) }} verbraucht</p><progress v-if="!hidden" :value="Math.min(budget.spentCents, budget.cents)" :max="budget.cents" :aria-label="budget.label" class="mt-3 h-2 w-full accent-accent" /><p v-if="budget.spentCents > budget.cents" class="mt-2 text-xs text-error">Budget &uuml;berschritten</p></div>
        <p v-if="!state.budgets.length" class="py-8 text-center text-sm text-muted">Noch keine Budgets im Plan.</p>
        <button type="button" :class="[buttonClass, 'mt-5 w-full']" @click="editPlan">Budgets verwalten</button>
      </section>
      <section v-else-if="tab === 'recurring'" id="panel-recurring" role="tabpanel" aria-labelledby="tab-recurring">
        <div v-for="payment in state.recurring" :key="payment.occurrenceId" class="flex items-center gap-3 border-b border-line py-4"><div class="min-w-0 flex-1"><h2 class="break-words text-sm font-semibold">{{ payment.label }}</h2><p class="mt-1 text-xs text-muted">{{ dateOnly(payment.dueDate) }} &middot; {{ money(payment.cents) }}</p></div><span v-if="payment.confirmed" class="flex items-center gap-1 text-xs text-accent"><Check :size="16" />Gebucht</span><button v-else type="button" :aria-label="`${payment.label} bestaetigen`" :disabled="saving || loading" class="min-h-11 rounded-md border border-line px-3 text-xs font-semibold disabled:opacity-50" @click="confirm(payment.occurrenceId)">Best&auml;tigen</button></div>
        <p v-if="!state.recurring.length" class="py-8 text-center text-sm text-muted">Noch keine festen Zahlungen.</p>
        <button type="button" :class="[buttonClass, 'mt-5 w-full']" @click="editPlan">Fixposten verwalten</button>
      </section>
      <section v-else id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" class="space-y-6">
        <label class="block text-sm font-semibold">Zeitraum beginnt am Tag<input v-model.number="plan.startDay" type="number" min="1" max="31" :class="[inputClass, 'mt-2']"></label>
        <p class="text-xs leading-relaxed text-muted">Starttag beim ersten Plan sofort, sp&auml;tere &Auml;nderungen ab dem n&auml;chsten Zeitraum. Budgetreste werden nicht &uuml;bertragen. Erwartete Einnahmen z&auml;hlen sofort.</p>
        <div><h2 class="mb-3 text-sm font-bold">Budgets</h2><div v-for="(budget, index) in plan.budgets" :key="budget.id" class="mb-4 space-y-2 border-b border-line pb-4"><div class="flex items-center gap-2"><input v-model="budget.label" :aria-label="`Budgetname ${index + 1}`" maxlength="100" :class="inputClass"><button type="button" :aria-label="`${budget.label} entfernen`" class="grid size-11 shrink-0 place-items-center text-muted" @click="plan.budgets.splice(index, 1)"><Trash2 :size="17" /></button></div><label class="block text-xs text-muted">Budget in Euro<input :value="(budget.cents / 100).toFixed(2)" inputmode="decimal" :class="[inputClass, 'mt-1']" @change="changePlanAmount(budget, $event)"></label></div></div>
        <div><h2 class="mb-3 text-sm font-bold">Feste Zahlungen</h2><div v-for="(payment, index) in plan.recurring" :key="payment.id" class="mb-4 space-y-2 border-b border-line pb-4"><div class="flex items-center gap-2"><input v-model="payment.label" :aria-label="`Zahlungsname ${index + 1}`" maxlength="100" :class="inputClass"><button type="button" :aria-label="`${payment.label} entfernen`" class="grid size-11 shrink-0 place-items-center text-muted" @click="plan.recurring.splice(index, 1)"><Trash2 :size="17" /></button></div><p class="text-xs text-muted">{{ payment.cents > 0 ? 'Einnahme' : 'Ausgabe' }}</p><label class="block text-xs text-muted">Betrag in Euro<input :value="(Math.abs(payment.cents) / 100).toFixed(2)" inputmode="decimal" :class="[inputClass, 'mt-1']" @change="changePlanAmount(payment, $event)"></label><label class="block text-xs text-muted">F&auml;lligkeitstag<input v-model.number="payment.day" type="number" min="1" max="31" :class="[inputClass, 'mt-1']"></label></div></div>
        <form class="space-y-3 border-y border-line py-5" @submit.prevent="addEntry('budgets')">
          <h2 class="text-sm font-bold">Planposten hinzuf&uuml;gen</h2>
          <label class="block text-xs text-muted">Bezeichnung<input v-model="entry.label" required maxlength="100" :class="[inputClass, 'mt-1']"></label>
          <label class="block text-xs text-muted">Betrag in Euro<input v-model="entry.amount" required inputmode="decimal" :class="[inputClass, 'mt-1']"></label>
          <label class="block text-xs text-muted">Zahlungsart<select v-model="entry.direction" :class="[inputClass, 'mt-1']"><option value="expense">Ausgabe</option><option value="income">Einnahme</option></select></label>
          <label class="block text-xs text-muted">F&auml;lligkeitstag f&uuml;r Fixposten<input v-model.number="entry.day" type="number" min="1" max="31" :class="[inputClass, 'mt-1']"></label>
          <div class="grid grid-cols-2 gap-3"><button type="submit" class="min-h-11 rounded-md border border-line text-xs">Als Budget</button><button type="button" class="min-h-11 rounded-md border border-line text-xs" @click="addEntry('recurring')">Als Fixposten</button></div>
        </form>
        <p v-if="formError" role="alert" class="text-sm text-error">{{ formError }}</p>
        <button type="button" :class="[buttonClass, 'w-full']" :disabled="saving || loading" @click="savePlan">{{ saving ? 'Wird gespeichert...' : 'Plan speichern' }}</button>
        <ShortcutSettings :access-token="accessToken" />
      </section>
    </template>

    <dialog ref="dialog" aria-labelledby="booking-dialog-title" class="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-[448px] overflow-y-auto rounded-lg border border-line bg-background p-5 text-foreground backdrop:bg-black/70" @close="formError = ''" @cancel="saving && $event.preventDefault()">
      <div class="mb-5 flex items-center justify-between gap-3"><h2 id="booking-dialog-title" class="text-lg font-bold">Neue Buchung</h2><button type="button" aria-label="Schliessen" title="Schliessen" :disabled="saving" class="grid size-11 place-items-center" @click="dialog?.close()"><X :size="20" /></button></div>
      <form class="space-y-4" @submit.prevent="createBooking">
        <fieldset class="grid grid-cols-2 gap-3" :disabled="saving"><legend class="sr-only">Buchungsart</legend><label class="flex min-h-11 items-center justify-center gap-2 rounded-md border border-line"><input v-model="draft.direction" type="radio" value="expense" class="accent-accent">Ausgabe</label><label class="flex min-h-11 items-center justify-center gap-2 rounded-md border border-line"><input v-model="draft.direction" type="radio" value="income" class="accent-accent">Einnahme</label></fieldset>
        <label class="block text-xs text-muted">Betrag in Euro<input v-model="draft.amount" required inputmode="decimal" autofocus :disabled="saving" :class="[inputClass, 'mt-1']"></label>
        <label class="block text-xs text-muted">Beschreibung<input v-model="draft.label" required maxlength="100" :disabled="saving" :class="[inputClass, 'mt-1']"></label>
        <label class="block text-xs text-muted">Zeitpunkt<input v-model="draft.timestamp" required type="datetime-local" :disabled="saving" :class="[inputClass, 'mt-1']"></label>
        <label v-if="draft.direction === 'expense'" class="block text-xs text-muted">Budget<select v-model="draft.budgetId" :disabled="saving" :class="[inputClass, 'mt-1']"><option value="">Ohne Budget</option><option v-for="budget in state?.budgets" :key="budget.id" :value="budget.id">{{ budget.label }}</option></select></label>
        <p v-if="formError || error" role="alert" class="text-sm text-error">{{ formError || error }}</p>
        <button type="submit" :disabled="saving || loading || !state" :class="[buttonClass, 'w-full']">{{ saving ? 'Wird gespeichert...' : 'Buchung speichern' }}</button>
      </form>
    </dialog>
    <dialog ref="deleteDialog" aria-labelledby="delete-title" class="fixed inset-0 m-auto w-[calc(100%_-_32px)] max-w-[448px] rounded-lg border border-line bg-background p-5 text-foreground backdrop:bg-black/70" @cancel="saving && $event.preventDefault()">
      <h2 id="delete-title" class="text-lg font-bold">Buchung l&ouml;schen?</h2>
      <p class="mt-3 break-words text-sm text-muted">{{ deleting?.label }} &middot; {{ money(deleting?.cents ?? 0) }}</p>
      <p class="mt-3 text-xs leading-relaxed text-muted">Der Betrag wird aus deinem Saldo und gegebenenfalls dem Budgetverbrauch entfernt.</p>
      <p v-if="error" role="alert" class="mt-3 text-sm text-error">{{ error }}</p>
      <div class="mt-6 grid grid-cols-2 gap-3"><button type="button" :disabled="saving" class="min-h-11 rounded-md border border-line text-sm disabled:opacity-50" @click="deleteDialog?.close()">Abbrechen</button><button type="button" :disabled="saving || loading" class="min-h-11 rounded-md bg-error text-sm font-bold text-background disabled:opacity-50" @click="deleteBooking">{{ saving ? 'Wird geloescht...' : 'Loeschen' }}</button></div>
    </dialog>
  </div>
</template>
