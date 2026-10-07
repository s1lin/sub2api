<template>
  <KumoDialog v-bind="props" :close-label="t('common.close')" @close="emit('close')">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </KumoDialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { KumoDialog } from '@/components/kumo'

type DialogWidth = 'narrow' | 'normal' | 'wide' | 'extra-wide' | 'full'
const props = withDefaults(defineProps<{
  show: boolean
  title: string
  width?: DialogWidth
  closeOnEscape?: boolean
  closeOnClickOutside?: boolean
  showCloseButton?: boolean
  zIndex?: number
}>(), { width: 'normal', closeOnEscape: true, closeOnClickOutside: false, showCloseButton: true, zIndex: 50 })
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>
