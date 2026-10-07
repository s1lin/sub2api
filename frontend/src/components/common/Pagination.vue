<template>
  <KumoPagination
    :page="page" :page-size="pageSize" :total="total"
    :show-page-size-selector="showPageSizeSelector"
    :page-size-options="sizes" :per-page-label="t('pagination.perPage')"
    :info="info" :labels="labels"
    @page="goToPage" @page-size="changePageSize"
  />
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { KumoPagination } from '@/components/kumo'
import { getConfiguredTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePreferences'
import { setPersistedPageSize } from '@/composables/usePersistedPageSize'
const props = withDefaults(defineProps<{
  total: number; page: number; pageSize: number; pageSizeOptions?: number[]
  showPageSizeSelector?: boolean; showJump?: boolean
}>(), { showPageSizeSelector: true, showJump: false })
const emit = defineEmits<{ 'update:page': [page: number]; 'update:pageSize': [size: number] }>()
const { t } = useI18n()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const sizes = computed(() => [...new Set([...(props.pageSizeOptions ?? getConfiguredTablePageSizeOptions()), normalizeTablePageSize(props.pageSize)])].sort((a, b) => a - b))
const info = computed(() => {
  const from = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
  const to = Math.min(props.page * props.pageSize, props.total)
  return [t('pagination.showing'), from, t('pagination.to'), to, t('pagination.of'), props.total, t('pagination.results')].join(' ')
})
const labels = computed(() => ({
  navigation: t('pagination.pageOf', { page: props.page, total: pages.value }),
  previousPage: t('pagination.previous'), nextPage: t('pagination.next'),
  firstPage: t('pagination.goToPage', { page: 1 }), lastPage: t('pagination.goToPage', { page: pages.value }),
  pageNumber: t('pagination.jumpTo'), pageSize: t('pagination.perPage'),
}))
function goToPage(page: number) { if (page >= 1 && page <= pages.value && page !== props.page) emit('update:page', page) }
function changePageSize(size: number) {
  const value = normalizeTablePageSize(size)
  setPersistedPageSize(value)
  emit('update:pageSize', value)
}
</script>
