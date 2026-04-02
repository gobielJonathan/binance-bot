<template>
  <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-800">
      <div>
        <h2 class="text-sm font-semibold text-slate-100">Trade History</h2>
        <p class="text-xs text-slate-500 mt-0.5">All executed triangle arbitrage trades</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="filters.status"
          @change="loadTrades"
          class="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="partial">Partial</option>
        </select>
        <button
          @click="loadTrades"
          :disabled="tradingStore.loading.tradeHistory"
          class="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium px-3 py-2 rounded-xl transition-all duration-200 disabled:opacity-40"
        >
          <ArrowPathIcon :class="['w-3.5 h-3.5', tradingStore.loading.tradeHistory && 'animate-spin']" />
          {{ tradingStore.loading.tradeHistory ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-if="tradingStore.loading.tradeHistory && tradingStore.tradeHistory.length === 0" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-7 h-7 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
        <p class="text-xs text-slate-500">Loading trades...</p>
      </div>
    </div>

    <div v-else-if="tradingStore.errors.tradeHistory" class="py-12 text-center px-6">
      <ExclamationTriangleIcon class="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p class="text-sm text-red-400 font-medium">Failed to load trades</p>
      <p class="text-xs text-slate-600 mt-1">{{ tradingStore.errors.tradeHistory }}</p>
    </div>

    <div v-else-if="tradingStore.loading.tradeHistory && tradingStore.tradeHistory.length === 0" class="py-16 text-center">
      <ChartBarIcon class="w-10 h-10 text-slate-800 mx-auto mb-3" />
      <p class="text-sm text-slate-500 font-medium">No trades found</p>
      <p class="text-xs text-slate-600 mt-1">Executed trades will appear here</p>
    </div>

    <div v-else>
      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-800">
              <th class="px-6 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Triangle</th>
              <th class="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Expected</th>
              <th class="px-4 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actual P&L</th>
              <th class="px-6 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="trade in tradingStore.tradeHistory"
              :key="trade.id"
              class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors duration-150 group"
            >
              <td class="px-6 py-4">
                <div class="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{{ trade.triangle_name }}</div>
                <div class="text-xs text-slate-600 mt-0.5 font-mono">
                  {{ trade.leg1_pair }} → {{ trade.leg2_pair }} → {{ trade.leg3_pair }}
                </div>
              </td>
              <td class="px-4 py-4"><TradeStatusBadge :status="trade.status" /></td>
              <td class="px-4 py-4 text-right">
                <span :class="['text-sm font-semibold', trade.expected_profit_percent >= 0 ? 'text-emerald-400' : 'text-red-400']">
                  +{{ trade.expected_profit_percent?.toFixed(4) }}%
                </span>
              </td>
              <td class="px-4 py-4 text-right">
                <div v-if="trade.actual_profit_usdt !== undefined">
                  <div :class="['text-sm font-bold', trade.actual_profit_usdt >= 0 ? 'text-emerald-400' : 'text-red-400']">
                    {{ formatCurrency(trade.actual_profit_usdt) }}
                  </div>
                  <div v-if="trade.actual_profit_percent !== undefined" class="text-[10px] text-slate-600">
                    {{ trade.actual_profit_percent?.toFixed(4) }}%
                  </div>
                </div>
                <span v-else class="text-slate-600 text-sm">—</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="text-xs text-slate-400 font-medium">{{ formatDate(trade.created_at) }}</div>
                <div v-if="trade.completed_at" class="text-[10px] text-slate-600 mt-0.5">
                  Done {{ formatDate(trade.completed_at) }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination" class="flex items-center justify-between px-6 py-4 border-t border-slate-800">
        <p class="text-xs text-slate-500">
          Showing
          <span class="text-slate-300 font-medium">{{ (pagination.page - 1) * pagination.limit + 1 }}–{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
          of <span class="text-slate-300 font-medium">{{ pagination.total }}</span>
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="prevPage"
            :disabled="pagination.page <= 1"
            class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span class="text-xs text-slate-500 px-2">{{ pagination.page }} / {{ pagination.totalPages }}</span>
          <button
            @click="nextPage"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { format } from 'date-fns'
import { ArrowPathIcon, ExclamationTriangleIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import { useTradingStore } from '../stores/trading'
import TradeStatusBadge from './TradeStatusBadge.vue'
import type { PaginatedTradeResponse } from '../types/api'

const tradingStore = useTradingStore()
const pagination = ref<PaginatedTradeResponse | null>(null)
const filters = reactive({ status: '', page: 1, limit: 15 })

async function loadTrades() {
  await tradingStore.fetchTradeHistory({
    page: filters.page,
    limit: filters.limit,
    status: filters.status || undefined,
  })
}

function prevPage() {
  if (pagination.value && filters.page > 1) { filters.page--; loadTrades() }
}
function nextPage() {
  if (pagination.value && filters.page < pagination.value.totalPages) { filters.page++; loadTrades() }
}

function formatCurrency(v: number): string {
  const sign = v > 0 ? '+' : ''
  return sign + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}
function formatDate(d: string): string {
  return format(new Date(d), 'MMM dd, HH:mm')
}

onMounted(loadTrades)
</script>
