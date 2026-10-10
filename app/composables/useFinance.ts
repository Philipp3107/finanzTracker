export interface BudgetPlan { id: string; label: string; cents: number }
export interface RecurringPlan extends BudgetPlan { day: number }
export interface FinanceSettings { startDay: number; budgets: BudgetPlan[]; recurring: RecurringPlan[] }
export interface BookingEntry { bookingId: string; label: string; cents: number; timestamp: string; budgetId?: string }
export interface FinanceState {
  version: number
  settings: FinanceSettings
  period: { start: string; end: string }
  currentCents: number
  availableCents: number
  reservedCents: number
  expectedIncomeCents: number
  incomeCents: number
  expenseCents: number
  budgets: (BudgetPlan & { spentCents: number; remainingCents: number })[]
  recurring: (RecurringPlan & { occurrenceId: string; dueDate: string; confirmed: boolean })[]
  bookings: BookingEntry[]
}

export function useFinance(accessToken: () => string) {
  const config = useRuntimeConfig().public
  const state = shallowRef<FinanceState | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  let stopped = false
  let generation = 0
  const controllers = new Set<AbortController>()

  async function request(path: string, method = 'GET', body?: unknown) {
    const controller = new AbortController()
    controllers.add(controller)
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const result = await fetch(`${config.accountApiUrl.replace(/\/$/, '')}/finance${path}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: 'no-store', credentials: 'omit', redirect: 'error',
      })
      if (result.status === 401 || result.status === 403) throw new Error('Bitte erneut anmelden. Deiner Sitzung fehlt die Finanzfreigabe oder sie ist abgelaufen.')
      if (result.status === 409) throw new Error('Zwischenzeitlich geaendert oder Buchungs-ID bereits verwendet. Bitte aktualisieren und pruefen, bevor du erneut speicherst.')
      if (result.status === 400) throw new Error('Die Eingaben sind ungueltig. Pruefe Betrag, Datum und Budgetzuordnung.')
      if (!result.ok) throw new Error('Die Finanzdaten sind gerade nicht erreichbar. Bitte erneut versuchen.')
      return await result.json()
    } finally {
      clearTimeout(timeout)
      controllers.delete(controller)
    }
  }

  async function refresh() {
    if (stopped || loading.value || saving.value) return
    const requestGeneration = ++generation
    loading.value = true
    error.value = ''
    try {
      const data = await request('') as FinanceState
      if (!stopped && requestGeneration === generation) state.value = data
    } catch (failure) {
      if (!stopped) error.value = failure instanceof Error ? failure.message : 'Aktualisierung fehlgeschlagen.'
    } finally { loading.value = false }
  }

  async function save(path: string, data: unknown, method = 'POST') {
    if (saving.value || loading.value || stopped) return false
    generation++
    saving.value = true
    error.value = ''
    try {
      await request(path, method, data)
    } catch (failure) {
      if (!stopped) error.value = failure instanceof Error ? failure.message : 'Speichern fehlgeschlagen.'
      return false
    } finally { saving.value = false }
    await refresh()
    return true
  }

  let timer: ReturnType<typeof setInterval> | undefined
  const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
  onMounted(() => {
    void refresh()
    timer = setInterval(onVisible, 60000)
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    stopped = true
    generation++
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    for (const controller of controllers) controller.abort()
  })
  return { state, loading, saving, error, refresh, save }
}
