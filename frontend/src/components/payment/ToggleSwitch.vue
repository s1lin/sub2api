<template>
  <KumoLabel class="flex flex-col items-center gap-1 cursor-pointer">
    <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{{ label }}</span>
    <KumoSwitch :model-value="checked" :aria-label="label" @update:model-value="emit('toggle')" />
  </KumoLabel>
</template>
<script setup lang="ts">
import { KumoLabel, KumoSwitch } from '@/components/kumo'
defineProps<{ label: string; checked: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>
