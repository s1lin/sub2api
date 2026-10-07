<template>
  <KumoMultiSelect
    :model-value="modelValue" :options="options" :label="label" :all-label="allLabel"
    :compact="compact" :empty-label="t('channelMonitorV2.filters.empty')"
    :summary="t('channelMonitorV2.filters.labelValue', { label, value: selectionLabel })"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #option="{ option }">
      <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
      <small v-if="option.count != null" class="text-xs text-gray-400">{{ formatCount(option.count) }}</small>
    </template>
  </KumoMultiSelect>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { KumoMultiSelect } from '@/components/kumo'
interface FilterOption {
  value: string
  label: string
  count?: number
}

const props = withDefaults(
  defineProps<{
    label: string
    allLabel: string
    modelValue: string[]
    /** Options for this picker (parent may cascade by platform). */
    options: FilterOption[]
    /** Compact trigger for single-row toolbars. */
    compact?: boolean
  }>(),
  { compact: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const { t, locale } = useI18n()


const selectionLabel = computed(() => {
  if (props.modelValue.length === 0) return props.allLabel
  if (props.modelValue.length === 1) {
    return props.options.find((item) => item.value === props.modelValue[0])?.label || props.modelValue[0]
  }
  return t('channelMonitorV2.filters.selectedCount', { count: props.modelValue.length })
})


const formatCount = (count: number) => new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US').format(count)
</script>
