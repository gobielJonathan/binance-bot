<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <!-- Ambient blobs -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute -top-60 -right-60 w-125 h-125 bg-cyan-500/5 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 -left-60 w-100 h-100 bg-indigo-500/5 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-60 right-1/3 w-100 h-100 bg-violet-500/5 rounded-full blur-3xl"></div>
    </div>

    <!-- Sticky Header -->
    <header class="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div class="max-w-400 mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-linear-to-br from-cyan-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BoltIcon class="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-white leading-none tracking-tight">Binance Bot</h1>
              <p class="text-[11px] text-slate-500 leading-none mt-0.5 font-medium">Triangle Arbitrage Engine</p>
            </div>
          </div>

          <!-- Status + Refresh -->
          <div class="flex items-center gap-3">

            <StatusBadge :status="tradingStore.currentMode" :is-running="tradingStore.isRunning" />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <!-- KPI Cards -->
      <StatsOverview />

      <!-- Performance Charts -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold text-slate-100">Performance Overview</h2>
            <p class="text-xs text-slate-500 mt-0.5">Profit & trade activity over time</p>
          </div>
          <!-- Period Switcher -->
          <div class="flex items-center gap-1 bg-slate-900/70 border border-slate-800 rounded-xl p-1">
            <button
              v-for="period in periods"
              :key="period.value"
              @click="activePeriod = period.value"
              :class="[
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200',
                activePeriod === period.value
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              ]"
            >
              {{ period.label }}
            </button>
          </div>
        </div>
        <PerformanceCharts :active-period="activePeriod" />
      </section>

      <!-- Open Trades + Opportunities -->
      <section class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Open Trades -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <h2 class="text-sm font-semibold text-slate-100">Open Trades</h2>
              <span class="bg-slate-800 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {{ tradingStore.openTrades.length }}
              </span>
            </div>
            <span class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Live</span>
          </div>
          <OpenTrades />
        </div>

        <!-- Recent Opportunities -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-indigo-400"></div>
              <h2 class="text-sm font-semibold text-slate-100">Recent Opportunities</h2>
              <span class="bg-slate-800 text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {{ tradingStore.opportunities.length }}
              </span>
            </div>
            <span class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Scanned</span>
          </div>
          <OpportunitiesList />
        </div>
      </section>

      <!-- Trade History -->
      <section>
        <TradeHistory />
      </section>

      <!-- Live Market Ticker -->
      <section>
        <MarketTicker />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowPathIcon, BoltIcon } from '@heroicons/vue/24/outline'
import { useTradingStore } from '../stores/trading'

import StatusBadge from '../components/StatusBadge.vue'
import StatsOverview from '../components/StatsOverview.vue'
import PerformanceCharts from '../components/PerformanceCharts.vue'
import OpenTrades from '../components/OpenTrades.vue'
import OpportunitiesList from '../components/OpportunitiesList.vue'
import TradeHistory from '../components/TradeHistory.vue'
import MarketTicker from '../components/MarketTicker.vue'

const tradingStore = useTradingStore()
const activePeriod = ref<'daily' | 'weekly' | 'monthly'>('daily')

const periods = [
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'monthly' as const, label: 'Monthly' },
]

onMounted(() => {
  tradingStore.initSocket()
  tradingStore.refreshAll()
})

onUnmounted(() => {
  tradingStore.destroySocket()
})
</script>
