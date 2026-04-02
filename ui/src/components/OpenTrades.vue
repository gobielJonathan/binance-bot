<template>
  <div class="max-h-96 overflow-y-auto">
    <div v-if="tradingStore.loading.openTrades" class="flex items-center justify-center py-12">
      <div class="w-7 h-7 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
    </div>
    <div v-else-if="tradingStore.errors.openTrades" class="py-8 text-center">
      <ExclamationTriangleIcon class="w-6 h-6 text-red-400 mx-auto mb-2" />
      <p class="text-sm text-red-400">{{ tradingStore.errors.openTrades }}</p>
    </div>
    <div v-else-if="tradingStore.openTrades.length === 0" class="py-12 text-center">
      <ArrowPathIcon class="w-8 h-8 text-slate-700 mx-auto mb-3" />
      <p class="text-sm text-slate-500 font-medium">No open trades</p>
      <p class="text-xs text-slate-600 mt-1">Bot is scanning for opportunities</p>
    </div>
    <div v-else class="divide-y divide-slate-800/60">
      <div
        v-for="trade in tradingStore.openTrades"
        :key="trade.id"
        class="px-6 py-4 hover:bg-slate-800/30 transition-colors duration-150"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-sm font-semibold text-slate-100 truncate">{{ trade.triangle_name }}</span>
              <TradeStatusBadge :status="trade.status" />
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <span class="font-mono text-slate-400">{{ trade.leg1_pair }}</span>
              <ArrowRightIcon class="w-3 h-3 flex-shrink-0" />
              <span class="font-mono text-slate-400">{{ trade.leg2_pair }}</span>
              <ArrowRightIcon class="w-3 h-3 flex-shrink-0" />
              <span class="font-mono text-slate-400">{{ trade.leg3_pair }}</span>
            </div>
            <!-- Progress bar -->
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  :class="[
                    'h-full rounded-full transition-all duration-500',
                    trade.status === 'completed' ? 'bg-emerald-500' :
                    trade.status === 'failed' ? 'bg-red-500' : 'bg-cyan-500'
                  ]"
                  :style="{ width: getProgress(trade) + '%' }"
                ></div>
              </div>
              <span class="text-[10px] text-slate-600 font-medium w-8 text-right">{{ getProgress(trade) }}%</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <div :class="['text-sm font-bold', trade.expected_profit_percent >= 0 ? 'text-emerald-400' : 'text-red-400']">
              +{{ trade.expected_profit_percent.toFixed(4) }}%
            </div>
            <div class="text-[10px] text-slate-600 mt-1">{{ formatDate(trade.created_at) }}</div>
          </div>
        </div>
        <div v-if="trade.error_message" class="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p class="text-xs text-red-400">{{ trade.error_message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { format } from 'date-fns'
import { useTradingStore } from '../stores/trading'
import type { Trade } from '../types/api'
import TradeStatusBadge from './TradeStatusBadge.vue'

const tradingStore = useTradingStore()

function getProgress(trade: Trade): number {
  if (trade.status === 'completed') return 100
  if (trade.status === 'failed') return 0
  let n = 0
  if (trade.leg1_filled > 0) n++
  if (trade.leg2_filled > 0) n++
  if (trade.leg3_filled > 0) n++
  return Math.round((n / 3) * 100)
}

function formatDate(d: string): string {
  return format(new Date(d), 'HH:mm:ss')
}
</script>
