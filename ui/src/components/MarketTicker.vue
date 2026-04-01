<template>
  <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
        <h2 class="text-sm font-semibold text-slate-100">Live Market Prices</h2>
        <span class="bg-slate-800 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
          {{ tickerList.length }} pairs
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Search -->
        <div class="relative">
          <MagnifyingGlassIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            v-model="search"
            type="text"
            placeholder="Filter pairs…"
            class="w-36 pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-slate-300 placeholder-slate-600 text-xs rounded-xl outline-none transition-colors"
          />
        </div>
        <!-- Sort toggle -->
        <button
          @click="toggleSort"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition-all duration-200"
        >
          <ArrowsUpDownIcon class="w-3.5 h-3.5" />
          {{ sortLabel }}
        </button>
      </div>
    </div>

    <!-- No data yet -->
    <div v-if="tickerList.length === 0" class="py-12 text-center">
      <SignalIcon class="w-8 h-8 text-slate-700 mx-auto mb-3 animate-pulse" />
      <p class="text-sm text-slate-500 font-medium">Waiting for market data…</p>
      <p class="text-xs text-slate-600 mt-1">Prices will appear once the bot connects</p>
    </div>

    <!-- Ticker Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-slate-800">
            <th class="px-6 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pair</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Bid</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ask</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Spread %</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Bid Qty</th>
            <th class="px-6 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Updated</th>
          </tr>
        </thead>
        <tbody>
          <TransitionGroup name="ticker-row">
            <tr
              v-for="ticker in filteredAndSorted"
              :key="ticker.symbol"
              :class="['border-b border-slate-800/50 transition-colors duration-150 group',
                flashMap.has(ticker.symbol)
                  ? (flashMap.get(ticker.symbol) === 'up' ? 'bg-emerald-500/5' : 'bg-red-500/5')
                  : 'hover:bg-slate-800/20'
              ]"
            >
              <!-- Symbol -->
              <td class="px-6 py-3">
                <div class="flex items-center gap-2">
                  <div :class="['w-1.5 h-1.5 rounded-full flex-shrink-0',
                    flashMap.get(ticker.symbol) === 'up' ? 'bg-emerald-400' :
                    flashMap.get(ticker.symbol) === 'down' ? 'bg-red-400' : 'bg-slate-600'
                  ]"></div>
                  <span class="text-sm font-bold text-slate-200 font-mono">{{ ticker.symbol }}</span>
                </div>
              </td>
              <!-- Bid -->
              <td class="px-4 py-3 text-right">
                <span class="text-sm font-semibold text-emerald-400 font-mono tabular-nums">
                  {{ formatPrice(ticker.bid) }}
                </span>
              </td>
              <!-- Ask -->
              <td class="px-4 py-3 text-right">
                <span class="text-sm font-semibold text-red-400 font-mono tabular-nums">
                  {{ formatPrice(ticker.ask) }}
                </span>
              </td>
              <!-- Spread % -->
              <td class="px-4 py-3 text-right">
                <span :class="['text-xs font-semibold tabular-nums',
                  spread(ticker) < 0.05 ? 'text-emerald-400' :
                  spread(ticker) < 0.15 ? 'text-amber-400' : 'text-red-400'
                ]">
                  {{ spread(ticker).toFixed(4) }}%
                </span>
              </td>
              <!-- Bid Qty -->
              <td class="px-4 py-3 text-right hidden md:table-cell">
                <span class="text-xs text-slate-500 font-mono tabular-nums">{{ formatQty(ticker.bidQty || 0) }}</span>
              </td>
              <!-- Updated -->
              <td class="px-6 py-3 text-right hidden md:table-cell">
                <span class="text-[10px] text-slate-600">{{ timeAgo(ticker.timestamp) }}</span>
              </td>
            </tr>
          </TransitionGroup>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MagnifyingGlassIcon, ArrowsUpDownIcon, SignalIcon } from '@heroicons/vue/24/outline'
import { useTradingStore } from '../stores/trading'
import type { TickerPrice } from '../types/api'

const tradingStore = useTradingStore()

const search = ref('')
type SortMode = 'symbol' | 'spread-asc' | 'spread-desc'
const sortMode = ref<SortMode>('symbol')

const sortModes: SortMode[] = ['symbol', 'spread-asc', 'spread-desc']
const sortLabels: Record<SortMode, string> = {
  symbol: 'A–Z',
  'spread-asc': 'Tightest',
  'spread-desc': 'Widest',
}
const sortLabel = computed(() => sortLabels[sortMode.value])

function toggleSort() {
  const idx = sortModes.indexOf(sortMode.value)
  sortMode.value = sortModes[(idx + 1) % sortModes.length] as SortMode
}

const tickerList = computed<TickerPrice[]>(() => Array.from(tradingStore.tickers.values()))

const filteredAndSorted = computed(() => {
  let list = tickerList.value
  const q = search.value.trim().toUpperCase()
  if (q) list = list.filter((t) => t.symbol.includes(q))

  return [...list].sort((a, b) => {
    if (sortMode.value === 'symbol') return a.symbol.localeCompare(b.symbol)
    const sa = spread(a)
    const sb = spread(b)
    return sortMode.value === 'spread-asc' ? sa - sb : sb - sa
  })
})

// Flash detection: track previous bid to show up/down color
const flashMap = ref<Map<string, 'up' | 'down'>>(new Map())
const prevBids = new Map<string, number>()

watch(
  () => tradingStore.tickers,
  (newTickers) => {
    const nextFlash = new Map<string, 'up' | 'down'>()
    for (const [symbol, ticker] of newTickers) {
      const prev = prevBids.get(symbol)
      if (prev !== undefined && prev !== ticker.bid) {
        nextFlash.set(symbol, ticker.bid > prev ? 'up' : 'down')
      }
      prevBids.set(symbol, ticker.bid)
    }
    flashMap.value = nextFlash
    // Clear flash after 800ms
    if (nextFlash.size > 0) {
      setTimeout(() => { flashMap.value = new Map() }, 800)
    }
  },
  { deep: false },
)

function spread(t: TickerPrice): number {
  if (t.bid === 0) return 0
  return ((t.ask - t.bid) / t.bid) * 100
}

function formatPrice(v: number): string {
  if (v === 0) return '—'
  if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (v >= 1) return v.toFixed(4)
  return v.toFixed(8)
}

function formatQty(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(2) + 'K'
  return v.toFixed(4)
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 2) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}
</script>

<style scoped>
.ticker-row-move {
  transition: transform 0.3s ease;
}
</style>
