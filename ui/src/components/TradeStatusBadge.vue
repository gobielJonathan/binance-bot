<template>
  <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border', statusConfig[status].classes]">
    <span :class="['w-1.5 h-1.5 rounded-full', statusConfig[status].dot]"></span>
    {{ statusConfig[status].label }}
  </span>
</template>

<script setup lang="ts">
interface Props { status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial' }
defineProps<Props>()

const statusConfig = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',   classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_progress: { label: 'In Progress', dot: 'bg-cyan-400 animate-pulse', classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  completed:   { label: 'Completed',   dot: 'bg-emerald-400', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  failed:      { label: 'Failed',      dot: 'bg-red-400',     classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  partial:     { label: 'Partial',     dot: 'bg-orange-400',  classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
}
</script>
