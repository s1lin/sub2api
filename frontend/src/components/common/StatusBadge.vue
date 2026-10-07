<template>
  <KumoBadge :variant="variantClass">{{ label }}</KumoBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { KumoBadge } from '@/components/kumo'

const props = defineProps<{
  status: string
  label: string
}>()

const variantClass = computed(() => {
  switch (props.status) {
    case 'active':
    case 'success':
      return 'success'
    case 'disabled':
    case 'inactive':
    case 'warning':
      return 'warning'
    case 'error':
    case 'danger':
      return 'error'
    default:
      return 'secondary'
  }
})
</script>
