<template>
  <KumoSwitch :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" />
</template>
<script setup lang="ts">
import { KumoSwitch } from '@/components/kumo'
defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>
