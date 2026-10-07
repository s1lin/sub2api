<template>
  <KumoHelp v-bind="props" :label="t('common.help')" :close-label="t('common.close')">
    <template v-if="$slots.trigger" #triggerContent><slot name="trigger" /></template>
    <slot>{{ content }}</slot>
  </KumoHelp>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { KumoHelp } from '@/components/kumo'
const props = withDefaults(defineProps<{ content?: string; trigger?: 'hover' | 'click'; widthClass?: string }>(), { trigger: 'hover', widthClass: 'w-64' })
const { t } = useI18n()
</script>
