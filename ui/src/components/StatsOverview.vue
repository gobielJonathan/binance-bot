<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

    <!-- Balance (USDT) -->
    <div class="relative group bg-slate-900/60 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-sky-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      <div class="relative">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</p>
          <div class="w-8 h-8 bg-sky-500/10 rounded-xl flex items-center justify-center">
            <WalletIcon class="w-4 h-4 text-sky-400" />
          </div>
        </div>
        <div class="text-2xl font-bold tracking-tight text-sky-400">
          {{ formatUSDT(tradingStore.balance?.totalUSDT || 0) }}
        </div>
        <p class="text-xs text-slate-600 mt-1.5 font-medium">
          {{ formatUSDT(tradingStore.balance?.freeUSDT || 0) }} available
        </p>
        <div class="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-1000"
            :style="{ width: tradingStore.balance ? `${Math.min((tradingStore.balance.freeUSDT / (tradingStore.balance.totalUSDT || 1)) * 100, 100).toFixed(0)}%` : '0%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Total Profit -->
    <div class="relative group bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      <div class="relative">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Profit</p>
          <div class="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <CurrencyDollarIcon class="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div
          :class="[
            'text-2xl font-bold tracking-tight',
            totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
          ]"
        >
          {{ formatCurrency(totalProfit) }}
        </div>
        <p class="text-xs text-slate-600 mt-1.5 font-medium">All-time earnings</p>
        <div class="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            :class="['h-full rounded-full transition-all duration-1000', totalProfit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-rose-400']"
            style="width: 65%"
          ></div>
        </div>
      </div>
    </div>

    <!-- Win Rate -->
    <div class="relative group bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      <div class="relative">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Win Rate</p>
          <div class="w-8 h-8 bg-cyan-500/10 rounded-xl flex items-center justify-center">
            <TrophyIcon class="w-4 h-4 text-cyan-400" />
          </div>
        </div>
        <div class="text-2xl font-bold tracking-tight text-cyan-400">
          {{ formatPercentage(tradingStore.tradeStats?.winRate || 0) }}
        </div>
        <p class="text-xs text-slate-600 mt-1.5 font-medium">
          {{ tradingStore.tradeStats?.profitableTrades || 0 }} /
          {{ tradingStore.tradeStats?.totalTrades || 0 }} trades won
        </p>
        <div class="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-1000"
            :style="{ width: `${tradingStore.tradeStats?.winRate || 0}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Today's Performance -->
    <div class="relative group bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 backdrop-blur-sm transition-all duration-300 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      <div class="relative">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today</p>
          <div class="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <CalendarDaysIcon class="w-4 h-4 text-indigo-400" />
          </div>
        </div>
        <div
          :class="[
            'text-2xl font-bold tracking-tight',
            (tradingStore.profitSummary?.today.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          ]"
        >
          {{ formatCurrency(tradingStore.profitSummary?.today.profit || 0) }}
        </div>
        <p class="text-xs text-slate-600 mt-1.5 font-medium">
          {{ tradingStore.profitSummary?.today.trades || 0 }} trades today
        </p>
        <div class="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full" style="width: 45%"></div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CurrencyDollarIcon,
  TrophyIcon,
  CalendarDaysIcon,
  WalletIcon,
} from '@heroicons/vue/24/outline'
import { useTradingStore } from '../stores/trading'

const tradingStore = useTradingStore()
const totalProfit = computed(() => tradingStore.totalProfit)

function formatCurrency(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return (
    sign +
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  )
}

function formatUSDT(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
</script>
