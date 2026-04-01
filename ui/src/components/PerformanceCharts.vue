<template>
  <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
    <div v-if="tradingStore.loading.performance" class="flex items-center justify-center h-80">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
        <p class="text-xs text-slate-500 font-medium">Loading performance data...</p>
      </div>
    </div>
    <div v-else-if="tradingStore.errors.performance" class="flex items-center justify-center h-80">
      <div class="text-center">
        <ExclamationTriangleIcon class="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p class="text-sm text-red-400">{{ tradingStore.errors.performance }}</p>
      </div>
    </div>
    <div v-else>
      <div v-if="currentStats" class="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
        <div class="px-6 py-4">
          <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Period Profit</p>
          <p :class="['text-xl font-bold', currentStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400']">
            {{ formatCurrency(currentStats.totalProfit) }}
          </p>
        </div>
        <div class="px-6 py-4">
          <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Trades</p>
          <p class="text-xl font-bold text-slate-100">{{ currentStats.totalTrades }}</p>
        </div>
        <div class="px-6 py-4">
          <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Avg / Period</p>
          <p :class="['text-xl font-bold', currentStats.avgProfitPerPeriod >= 0 ? 'text-emerald-400' : 'text-red-400']">
            {{ formatCurrency(currentStats.avgProfitPerPeriod) }}
          </p>
        </div>
      </div>
      <div v-else class="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
        <div v-for="i in 3" :key="i" class="px-6 py-4">
          <div class="h-3 bg-slate-800 rounded w-24 mb-2 animate-pulse"></div>
          <div class="h-6 bg-slate-800 rounded w-16 animate-pulse"></div>
        </div>
      </div>
      <div class="p-6">
        <div class="h-72" v-if="currentChartData">
          <Line :data="currentChartData" :options="chartOptions" />
        </div>
        <div v-else class="h-72 flex items-center justify-center">
          <p class="text-slate-600 text-sm">No data for this period</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useTradingStore } from '../stores/trading'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

interface Props { activePeriod: 'daily' | 'weekly' | 'monthly' }
const props = defineProps<Props>()
const tradingStore = useTradingStore()

const currentPerformanceData = computed(() => {
  switch (props.activePeriod) {
    case 'weekly': return tradingStore.weeklyPerformance
    case 'monthly': return tradingStore.monthlyPerformance
    default: return tradingStore.dailyPerformance
  }
})
const currentStats = computed(() => currentPerformanceData.value?.stats)

const currentChartData = computed(() => {
  const data = currentPerformanceData.value
  if (!data) return null
  const barData = data.datasets.find((d) => d.type === 'bar')?.data || []
  const lineData = data.datasets.find((d) => d.type === 'line')?.data || []
  return {
    labels: data.labels,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    datasets: [
      {
        type: 'bar', label: 'Period Profit', data: barData,
        backgroundColor: barData.map((v) => v >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'),
        borderColor: barData.map((v) => v >= 0 ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.8)'),
        borderWidth: 1, borderRadius: 4, yAxisID: 'y1',
      },
      {
        type: 'line', label: 'Cumulative Profit', data: lineData,
        borderColor: 'rgb(6,182,212)', backgroundColor: 'rgba(6,182,212,0.07)',
        pointBackgroundColor: 'rgb(6,182,212)', pointRadius: 3, pointHoverRadius: 5,
        fill: true, tension: 0.4, borderWidth: 2, yAxisID: 'y',
      },
    ] as any[],
  }
})

const GRID = 'rgba(51,65,85,0.4)'
const TICK = '#64748b'
const chartOptions = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
  plugins: {
    legend: { position: 'top' as const, labels: { color: '#94a3b8', boxWidth: 12, boxHeight: 12, padding: 16, font: { size: 11 } } },
    tooltip: {
      mode: 'index' as const, intersect: false,
      backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1,
      titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10,
      callbacks: {
        label: (ctx: any) => {
          const v = ctx.parsed.y
          return ' ' + ctx.dataset.label + ': ' + (v >= 0 ? '+' : '') + formatCurrency(v)
        },
      },
    },
  },
  scales: {
    x: { grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 }, maxRotation: 0 }, border: { color: GRID } },
    y: {
      type: 'linear' as const, position: 'left' as const,
      grid: { color: GRID }, ticks: { color: TICK, font: { size: 10 }, callback: (v: any) => fmtShort(v) },
      border: { color: GRID, dash: [3, 3] },
    },
    y1: {
      type: 'linear' as const, position: 'right' as const, grid: { drawOnChartArea: false },
      ticks: { color: TICK, font: { size: 10 }, callback: (v: any) => fmtShort(v) },
      border: { color: GRID },
    },
  },
  interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}
function fmtShort(v: number): string {
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(1) + 'k'
  return '$' + v.toFixed(0)
}
</script>
