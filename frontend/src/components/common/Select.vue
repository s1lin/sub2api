<template>
  <KumoSelect
    v-bind="props"
    :placeholder="placeholder ?? t('common.selectOption')"
    :search-placeholder="searchPlaceholder ?? t('common.searchPlaceholder')"
    :empty-text="emptyText ?? t('common.noOptionsFound')"
    :creatable-prefix="creatablePrefix || t('common.search')"
    :loading-label="t('common.loading')"
    :clear-label="t('common.clear')"
    @update:model-value="emit('update:modelValue', $event)"
    @change="(value: any, option: any) => emit('change', value, option)"
    @search="emit('search', $event)"
  >
    <template v-if="$slots.selected" #selected="scope"><slot name="selected" v-bind="scope" /></template>
    <template v-if="$slots.option" #option="scope"><slot name="option" v-bind="scope" /></template>
  </KumoSelect>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { KumoSelect } from '@/components/kumo'
const { t } = useI18n()
export interface SelectOption {
  value: string | number | boolean | null
  label: string
  disabled?: boolean
  [key: string]: unknown
}

interface Props {
  modelValue: string | number | boolean | null | undefined
  options: SelectOption[] | Array<Record<string, unknown>>
  placeholder?: string
  disabled?: boolean
  error?: boolean
  searchable?: boolean | 'auto'
  searchPlaceholder?: string
  emptyText?: string
  valueKey?: string
  labelKey?: string
  creatable?: boolean
  creatablePrefix?: string
  clearable?: boolean
  id?: string
  ariaLabel?: string
  ariaDescribedby?: string
  /** 远程搜索模式：输入不在本地过滤 options，而是防抖后 emit('search', query)，由父组件请求数据更新 options */
  remote?: boolean
  /** 远程搜索模式下的加载态：options 为空时下拉显示 loading 文案 */
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | number | boolean | null): void
  (e: 'change', value: string | number | boolean | null, option: SelectOption | null): void
  (e: 'search', query: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  error: false,
  searchable: 'auto',
  creatable: false,
  creatablePrefix: '',
  clearable: false,
  valueKey: 'value',
  labelKey: 'label',
  remote: false,
  loading: false
})


const emit = defineEmits<Emits>()
</script>
