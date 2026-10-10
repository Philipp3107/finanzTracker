<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Eye, EyeOff, House, ShoppingBag, Utensils, Wallet, Landmark, CreditCard } from '@lucide/vue'

type Booking = { id: number; date: string; label: string; category: string; cents: number }
const demo = ref(true)
const hidden = ref(false)
const monthIndex = ref(2)
const months = ['2026-08', '2026-09', '2026-10']
const sampleBookings: Booking[] = [
    { id: 1, date: '2026-08-01', label: 'Gehalt', category: 'Einkommen', cents: 285000 },
    { id: 2, date: '2026-08-03', label: 'Miete', category: 'Wohnen', cents: -89000 },
    { id: 3, date: '2026-08-18', label: 'Alltag & Einkaufen', category: 'Einkaufen', cents: -64200 },
    { id: 4, date: '2026-09-01', label: 'Gehalt', category: 'Einkommen', cents: 285000 },
    { id: 5, date: '2026-09-03', label: 'Miete', category: 'Wohnen', cents: -89000 },
    { id: 6, date: '2026-09-22', label: 'Alltag & Einkaufen', category: 'Einkaufen', cents: -71800 },
    { id: 7, date: '2026-10-01', label: 'Gehalt', category: 'Einkommen', cents: 285000 },
    { id: 8, date: '2026-10-02', label: 'Miete', category: 'Wohnen', cents: -89000 },
    { id: 9, date: '2026-10-05', label: 'REWE', category: 'Einkaufen', cents: -6842 },
    { id: 10, date: '2026-10-07', label: 'Spotify', category: 'Abonnements', cents: -1099 },
    { id: 11, date: '2026-10-09', label: 'Cafe am Markt', category: 'Essen & Trinken', cents: -1850 },
    { id: 12, date: '2026-10-10', label: 'dm', category: 'Einkaufen', cents: -2435 },
]
const currency = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const selectedMonth = computed(() => months[monthIndex.value]!)
const bookings = computed(() => demo.value ? sampleBookings : [])
const monthlyBookings = computed(() => bookings.value.filter(booking => booking.date.startsWith(selectedMonth.value)))
const income = computed(() => monthlyBookings.value.reduce((total, booking) => total + Math.max(booking.cents, 0), 0))
const expenses = computed(() => monthlyBookings.value.reduce((total, booking) => total + Math.max(-booking.cents, 0), 0))
const balance = computed(() => bookings.value.filter(booking => booking.date.slice(0, 7) <= selectedMonth.value).reduce((total, booking) => total + booking.cents, 0))
const recent = computed(() => [...monthlyBookings.value].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 5))
const categories = computed(() => {
    const totals = new Map<string, number>()
    for (const booking of monthlyBookings.value) {
        if (booking.cents < 0) totals.set(booking.category, (totals.get(booking.category) ?? 0) - booking.cents)
    }
    return [...totals].map(([name, cents]) => ({ name, cents, share: expenses.value ? cents / expenses.value * 100 : 0 })).sort((first, second) => second.cents - first.cents)
})
const cashflow = computed(() => months.map(month => {
    const entries = bookings.value.filter(booking => booking.date.startsWith(month))
    return { month, income: entries.reduce((total, booking) => total + Math.max(booking.cents, 0), 0), expenses: entries.reduce((total, booking) => total + Math.max(-booking.cents, 0), 0) }
}))
const chartMax = computed(() => Math.max(1, ...cashflow.value.flatMap(month => [month.income, month.expenses])))
const categoryColors = ['bg-accent', 'bg-[#e7c58b]', 'bg-[#9ebee8]', 'bg-[#c7afd9]']

function money(cents: number) {
    return hidden.value ? '\u2022\u2022\u2022\u2022' : currency.format(cents / 100)
}

function monthLabel(month: string) {
    return monthFormat.format(new Date(`${month}-01T00:00:00Z`))
}

function categoryIcon(category: string) {
    return ({ Wohnen: House, Einkaufen: ShoppingBag, 'Essen & Trinken': Utensils, Einkommen: Landmark, Abonnements: CreditCard } as Record<string, typeof Wallet>)[category] ?? Wallet
}
</script>

<template>
    <div class="w-full">
        <div class="mb-5 flex items-center justify-between gap-3">
            <h1 id="dashboard-title" class="text-2xl font-bold">&Uuml;bersicht</h1>
            <label class="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted">
                <input v-model="demo" type="checkbox" class="size-4 accent-accent">Demodaten
            </label>
        </div>
        <div class="mb-6 flex h-11 items-center justify-between rounded-md border border-line bg-surface">
            <button type="button" aria-label="Vorheriger Monat" title="Vorheriger Monat" :disabled="monthIndex === 0" class="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-line focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-30" @click="monthIndex--"><ChevronLeft :size="18" /></button>
            <span class="text-sm font-semibold">{{ monthLabel(selectedMonth) }}</span>
            <button type="button" aria-label="N&auml;chster Monat" title="N&auml;chster Monat" :disabled="monthIndex === months.length - 1" class="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-muted hover:bg-line focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-30" @click="monthIndex++"><ChevronRight :size="18" /></button>
        </div>
        <p v-if="demo" class="mb-6 border-l-2 border-accent pl-3 text-[11px] leading-relaxed text-muted" role="status">Demoansicht &middot; Beispieldaten, keine echten Kontodaten.</p>

        <section class="border-b border-line pb-7" aria-labelledby="balance-title">
            <div class="flex items-center justify-between gap-3">
                <h2 id="balance-title" class="text-sm text-muted">Gesamtbalance</h2>
                <button type="button" :aria-label="hidden ? 'Betr\u00e4ge anzeigen' : 'Betr\u00e4ge ausblenden'" :title="hidden ? 'Betr\u00e4ge anzeigen' : 'Betr\u00e4ge ausblenden'" :aria-pressed="hidden" class="grid size-11 cursor-pointer place-items-center rounded-md text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent" @click="hidden = !hidden"><EyeOff v-if="hidden" :size="19" /><Eye v-else :size="19" /></button>
            </div>
            <p data-testid="balance" class="mt-2 text-[36px] leading-tight font-semibold break-words tabular-nums min-[390px]:text-[42px]">{{ money(balance) }}</p>
            <p class="mt-3 text-xs text-muted">{{ demo ? 'Stand der Demobuchungen' : 'Noch keine Buchungen' }}</p>
        </section>

        <div class="grid grid-cols-2 border-b border-line py-6">
            <section class="min-w-0 pr-3" aria-labelledby="income-title">
                <div class="mb-3 flex items-center gap-1.5"><ArrowDownLeft class="shrink-0 text-accent" :size="16" /><h2 id="income-title" class="text-xs text-muted">Einnahmen</h2></div>
                <p data-testid="income" class="text-lg font-semibold break-words tabular-nums min-[390px]:text-xl">{{ money(income) }}</p>
            </section>
            <section class="min-w-0 border-l border-line pl-4" aria-labelledby="expenses-title">
                <div class="mb-3 flex items-center gap-1.5"><ArrowUpRight class="shrink-0 text-[#e7c58b]" :size="16" /><h2 id="expenses-title" class="text-xs text-muted">Ausgaben</h2></div>
                <p data-testid="expenses" class="text-lg font-semibold break-words tabular-nums min-[390px]:text-xl">{{ money(expenses) }}</p>
            </section>
        </div>

        <section class="border-b border-line py-7" aria-labelledby="cashflow-title">
            <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 id="cashflow-title" class="text-sm font-bold">Monatsvergleich</h2>
                <div class="flex gap-3 text-[10px] text-muted"><span class="flex items-center gap-1"><span class="size-2 rounded-full bg-accent" />Einnahmen</span><span class="flex items-center gap-1"><span class="size-2 rounded-full bg-[#e7c58b]" />Ausgaben</span></div>
            </div>
            <div v-if="!hidden && bookings.length" class="grid h-40 grid-cols-3 gap-5" role="img" aria-label="Einnahmen und Ausgaben im Monatsvergleich">
                <div v-for="month in cashflow" :key="month.month" class="flex h-full flex-col justify-end">
                    <div class="flex min-h-0 flex-1 items-end justify-center gap-2 border-b border-line pb-2">
                        <div class="w-5 rounded-t-sm bg-accent" :style="{ height: `${month.income / chartMax * 100}%` }" />
                        <div class="w-5 rounded-t-sm bg-[#e7c58b]" :style="{ height: `${month.expenses / chartMax * 100}%` }" />
                    </div>
                    <span class="pt-3 text-center text-[11px] text-muted">{{ monthLabel(month.month).split(' ')[0] }}</span>
                    <span class="sr-only">Einnahmen {{ money(month.income) }}, Ausgaben {{ money(month.expenses) }}</span>
                </div>
            </div>
            <div v-else class="flex h-40 items-center justify-center text-xs text-muted">{{ hidden ? 'Betr\u00e4ge ausgeblendet' : 'Noch keine Vergleichsdaten.' }}</div>
            <div class="mt-6 flex items-center justify-between gap-3 text-xs"><span class="text-muted">Monatlicher &Uuml;berschuss</span><span class="font-semibold tabular-nums" :class="income - expenses >= 0 ? 'text-accent' : 'text-error'">{{ money(income - expenses) }}</span></div>
        </section>

        <section class="border-b border-line py-7" aria-labelledby="categories-title">
            <h2 id="categories-title" class="mb-5 text-sm font-bold">Wohin dein Geld flie&szlig;t</h2>
            <div v-if="categories.length" class="space-y-5">
                <div v-for="(category, index) in categories" :key="category.name">
                    <div class="mb-2 flex items-center justify-between gap-3 text-xs"><span class="text-muted">{{ category.name }}</span><span class="font-medium tabular-nums">{{ money(category.cents) }}</span></div>
                    <div v-if="!hidden" class="h-1.5 overflow-hidden rounded-full bg-line"><div class="h-full rounded-full" :class="categoryColors[index % categoryColors.length]" :style="{ width: `${category.share}%` }" /></div>
                </div>
            </div>
            <p v-else class="py-6 text-center text-xs text-muted">Noch keine Ausgaben in diesem Monat.</p>
        </section>

        <section class="pt-7" aria-labelledby="bookings-title">
            <div class="mb-2 flex items-center justify-between gap-3"><h2 id="bookings-title" class="text-sm font-bold">Letzte Buchungen</h2><span class="text-[11px] text-muted">{{ monthlyBookings.length }} Buchungen</span></div>
            <ul v-if="recent.length" class="divide-y divide-line">
                <li v-for="booking in recent" :key="booking.id" class="flex items-center gap-3 py-4">
                    <span class="grid size-10 shrink-0 place-items-center rounded-md bg-surface text-muted"><component :is="categoryIcon(booking.category)" :size="18" :stroke-width="1.5" /></span>
                    <div class="min-w-0 flex-1"><p class="text-xs font-semibold break-words">{{ booking.label }}</p><p class="mt-1 text-[10px] text-muted">{{ booking.category }} &middot; {{ dateFormat.format(new Date(`${booking.date}T00:00:00Z`)) }}</p></div>
                    <span class="shrink-0 text-xs font-semibold tabular-nums" :class="booking.cents > 0 ? 'text-accent' : 'text-foreground'">{{ !hidden && booking.cents > 0 ? '+' : '' }}{{ money(booking.cents) }}</span>
                </li>
            </ul>
            <div v-else class="flex flex-col items-center gap-3 py-10 text-center text-muted"><Wallet :size="28" :stroke-width="1.5" /><p class="text-sm">Deine erste Buchung ist der Anfang.</p></div>
        </section>
    </div>
</template>
