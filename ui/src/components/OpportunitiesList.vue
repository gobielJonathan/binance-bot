<template>
  <div class="max-h-96 overflow-y-auto">
    <div v-if="tradingStore.loading.opportunities" class="flex items-center justify-center py-12">
      <div class="w-7 h-7 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
    <div v-else-if="tradingStore.errors.opportunities" class="py-8 text-center">
      <ExclamationTriangleIcon class="w-6 h-6 text-red-400 mx-auto mb-2" />
      <p class="text-sm text-red-400">{{ tradingStore.errors.opportunities }}</p>
    </div>
    <div v-else-if="tradingStore.opportunities.length === 0" class="py-12 text-center">
      <MagnifyingGlassIcon class="w-8 h-8 text-slate-700 mx-auto mb-3" />
      <p class="text-sm text-slate-500 font-medium">No recent opportunities</p>
      <p class="text-xs text-slate-600 mt-1">Scanner is looking for arbitrage</p>
    </div>
    <div v-else class="divide-y divide-slate-800/60">
      <div
        v-for="opp in displayedOpps"
        :key="opp.id"
        class="px-6 py-3.5 hover:bg-slate-800/30 transition-colors duration-150"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-semibold text-slate-200 truncate">{{ opp.triangle_name }}</span>
              <span :class="['inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold', opp.executed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500']">
                {{ opp.executed ? 'Executed' : 'Missed' }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
              <span>{{ opp.leg1_pair }}</span>
              <span class="text-slate-700">›</span>
              <span>{{ opp.leg2_pair }}</span>
              <span class="text-slate-700">›</span>
              <span>{{ opp.leg3_pair }}</span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <div :class="['text-sm font-bold', opp.spread_percent >= 0.5 ? 'text-emerald-400' : 'text-amber-400']">
              +{{ opp.spread_percent.toFixed(4) }}%
            </div>
            <div class="text-[10px] text-slate-600 mt-0.5">{{ formatTimeAgo(opp.created_at) }}</div>
          </div>
        </div>
      </div>
      <div v-if="tradingStore.opportunities.length > 10" class="px-6 py-3 text-center">
        <button @click="showAll = !showAll" class="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors">
          {{ showAll ? 'Show less' : `View all ${tradingStore.opportunities.length} opportunities` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { useTradingStore } from '../stores/trading'

const tradingStore = useTradingStore()
const showAll = ref(false)

const displayedOpps = computed(() =>
  showAll.value ? tradingStore.opportunities : tradingStore.opportunities.slice(0, 10)
)

function formatTimeAgo(d: string): string {
  return formatDistanceToNow(new Date(d), { addSuffix: true })
}
</script>
