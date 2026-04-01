<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1.5">
      <div :class="['w-2 h-2 rounded-full', isRunning ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : 'bg-red-500']"></div>
      <span class="text-xs font-medium text-slate-400">{{ isRunning ? 'Running' : 'Stopped' }}</span>
    </div>
    <span :class="['inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider',
      status === 'testnet'
        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20']">
      {{ status.toUpperCase() }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props { status: string; isRunning: boolean }
defineProps<Props>()
</script>
