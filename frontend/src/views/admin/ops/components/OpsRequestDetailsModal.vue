<script setup lang="ts">
import { KumoButton, KumoLoader, KumoTable, KumoTableBody, KumoTableCell, KumoTableHead, KumoTableHeader, KumoTableRow } from '@/components/kumo'

import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useAppStore } from '@/stores'
import { opsAPI, type OpsRequestDetailsParams, type OpsRequestDetail } from '@/api/admin/ops'
import { parseTimeRangeMinutes, formatDateTime } from '../utils/opsFormatters'

export interface OpsRequestDetailsPreset {
  title: string
  kind?: OpsRequestDetailsParams['kind']
  sort?: OpsRequestDetailsParams['sort']
  min_duration_ms?: number
  max_duration_ms?: number
}

interface Props {
  modelValue: boolean
  timeRange: string
  preset: OpsRequestDetailsPreset
  platform?: string
  groupId?: number | null
  resumeState?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'openErrorDetail', errorId: number): void
}>()

const { t } = useI18n()
const appStore = useAppStore()
const { copyToClipboard } = useClipboard()

// 与 DataTable 一致：< 768px 切换为卡片视图，避免宽表在移动端被截断。
const isDesktopViewport = useMediaQuery('(min-width: 768px)')

const loading = ref(false)
const items = ref<OpsRequestDetail[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const close = () => emit('update:modelValue', false)

const showTTFT = computed(() => props.preset.sort === 'ttft_desc')
const latencyLabel = computed(() => t(showTTFT.value ? 'admin.ops.ttftLabel' : 'admin.ops.requestDetails.table.duration'))

function formatLatency(row: OpsRequestDetail): string {
  const value = showTTFT.value ? row.first_token_ms : row.duration_ms
  return typeof value === 'number' ? `${value} ms` : '-'
}

const rangeLabel = computed(() => {
  const minutes = parseTimeRangeMinutes(props.timeRange)
  if (minutes >= 60) return t('admin.ops.requestDetails.rangeHours', { n: Math.round(minutes / 60) })
  return t('admin.ops.requestDetails.rangeMinutes', { n: minutes })
})

function buildTimeParams(): Pick<OpsRequestDetailsParams, 'start_time' | 'end_time'> {
  const minutes = parseTimeRangeMinutes(props.timeRange)
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - minutes * 60 * 1000)
  return {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString()
  }
}

const fetchData = async () => {
  if (!props.modelValue) return
  loading.value = true
  try {
    const params: OpsRequestDetailsParams = {
      ...buildTimeParams(),
      page: page.value,
      page_size: pageSize.value,
      kind: props.preset.kind ?? 'all',
      sort: props.preset.sort ?? 'created_at_desc'
    }

    const platform = (props.platform || '').trim()
    if (platform) params.platform = platform
    if (typeof props.groupId === 'number' && props.groupId > 0) params.group_id = props.groupId

    if (typeof props.preset.min_duration_ms === 'number') params.min_duration_ms = props.preset.min_duration_ms
    if (typeof props.preset.max_duration_ms === 'number') params.max_duration_ms = props.preset.max_duration_ms

    const res = await opsAPI.listRequestDetails(params)
    items.value = res.items || []
    total.value = res.total || 0
  } catch (e: any) {
    console.error('[OpsRequestDetailsModal] Failed to fetch request details', e)
    appStore.showError(e?.message || t('admin.ops.requestDetails.failedToLoad'))
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.resumeState) return
      page.value = 1
      pageSize.value = 10
      fetchData()
    }
  }
)

watch(
  () => [
    props.timeRange,
    props.platform,
    props.groupId,
    props.preset.kind,
    props.preset.sort,
    props.preset.min_duration_ms,
    props.preset.max_duration_ms
  ],
  () => {
    if (!props.modelValue) return
    page.value = 1
    fetchData()
  }
)

function handlePageChange(next: number) {
  page.value = next
  fetchData()
}

function handlePageSizeChange(next: number) {
  pageSize.value = next
  page.value = 1
  fetchData()
}

async function handleCopyRequestId(requestId: string) {
  const ok = await copyToClipboard(requestId, t('admin.ops.requestDetails.requestIdCopied'))
  if (ok) return
  // `useClipboard` already shows toast on failure; this keeps UX consistent with older ops modal.
  appStore.showWarning(t('admin.ops.requestDetails.copyFailed'))
}

function openErrorDetail(errorId: number | null | undefined) {
  if (!errorId) return
  emit('openErrorDetail', errorId)
}

const kindBadgeClass = (kind: string) => {
  if (kind === 'error') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
}
</script>

<template>
  <BaseDialog :show="modelValue" :title="props.preset.title || t('admin.ops.requestDetails.title')" width="full" @close="close">
    <template #default>
      <div class="flex h-full min-h-0 flex-col">
        <div class="mb-4 flex flex-shrink-0 items-center justify-between">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('admin.ops.requestDetails.rangeLabel', { range: rangeLabel }) }}
          </div>
          <KumoButton
            type="button"
            class="btn btn-secondary btn-sm"
            @click="fetchData"
          >
            {{ t('common.refresh') }}
          </KumoButton>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-1 items-center justify-center py-16">
          <div class="flex flex-col items-center gap-3">
            <KumoLoader class="h-8 w-8 animate-spin text-blue-500" />
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</span>
          </div>
        </div>

        <!-- Table -->
        <div v-else class="flex min-h-0 flex-1 flex-col">
          <div v-if="items.length === 0" class="p-10 text-center panel-section">
            <div class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ t('admin.ops.requestDetails.empty') }}</div>
            <div class="mt-1 text-xs text-gray-400">{{ t('admin.ops.requestDetails.emptyHint') }}</div>
          </div>

          <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden panel-section">
            <div class="min-h-0 flex-1 overflow-auto">
              <div v-if="!isDesktopViewport" class="divide-y divide-gray-100 dark:divide-dark-800">
                <div v-for="(row, idx) in items" :key="idx" class="space-y-2 p-4">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full px-2 py-1 text-[10px] font-bold" :class="kindBadgeClass(row.kind)">
                      {{ row.kind === 'error' ? t('admin.ops.requestDetails.kind.error') : t('admin.ops.requestDetails.kind.success') }}
                    </span>
                    <span class="text-xs font-medium text-gray-700 dark:text-gray-200">{{ (row.platform || 'unknown').toUpperCase() }}</span>
                    <span class="ml-auto text-[11px] text-gray-500 dark:text-gray-400">{{ formatDateTime(row.created_at) }}</span>
                  </div>
                  <div class="break-all text-xs text-gray-600 dark:text-gray-300">{{ row.model || '-' }}</div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <span>{{ latencyLabel }}: {{ formatLatency(row) }}</span>
                    <span>{{ row.status_code ?? '-' }}</span>
                  </div>
                  <div v-if="row.request_id" class="flex items-center gap-2">
                    <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-gray-700 dark:text-gray-200" :title="row.request_id">
                      {{ row.request_id }}
                    </span>
                    <KumoButton
                      class="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-[var(--brand-hover)] dark:bg-dark-700 dark:text-gray-300"
                      @click="handleCopyRequestId(row.request_id)"
                    >
                      {{ t('admin.ops.requestDetails.copy') }}
                    </KumoButton>
                  </div>
                  <KumoButton
                    v-if="row.kind === 'error' && row.error_id"
                    class="btn btn-secondary btn-sm w-full text-red-600 dark:text-red-400"
                    @click="openErrorDetail(row.error_id)"
                  >
                    {{ t('admin.ops.requestDetails.viewError') }}
                  </KumoButton>
                </div>
              </div>
              <KumoTable v-else class="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
                <KumoTableHeader class="sticky top-0 z-10 bg-gray-50 dark:bg-dark-900">
                <KumoTableRow>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.time') }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.kind') }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.platform') }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.model') }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ latencyLabel }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.status') }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.requestId') }}
                  </KumoTableHead>
                  <KumoTableHead class="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {{ t('admin.ops.requestDetails.table.actions') }}
                  </KumoTableHead>
                </KumoTableRow>
              </KumoTableHeader>
              <KumoTableBody class="divide-y divide-gray-200 bg-white dark:divide-dark-700 dark:bg-dark-800">
                <KumoTableRow v-for="(row, idx) in items" :key="idx" class="hover:bg-[var(--brand-hover)]">
                  <KumoTableCell class="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {{ formatDateTime(row.created_at) }}
                  </KumoTableCell>
                  <KumoTableCell class="whitespace-nowrap px-4 py-3">
                    <span class="rounded-full px-2 py-1 text-[10px] font-bold" :class="kindBadgeClass(row.kind)">
                      {{ row.kind === 'error' ? t('admin.ops.requestDetails.kind.error') : t('admin.ops.requestDetails.kind.success') }}
                    </span>
                  </KumoTableCell>
                  <KumoTableCell class="whitespace-nowrap px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-200">
                    {{ (row.platform || 'unknown').toUpperCase() }}
                  </KumoTableCell>
                  <KumoTableCell class="max-w-[240px] truncate px-4 py-3 text-xs text-gray-600 dark:text-gray-300" :title="row.model || ''">
                    {{ row.model || '-' }}
                  </KumoTableCell>
                  <KumoTableCell class="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {{ formatLatency(row) }}
                  </KumoTableCell>
                  <KumoTableCell class="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                    {{ row.status_code ?? '-' }}
                  </KumoTableCell>
                  <KumoTableCell class="px-4 py-3">
                    <div v-if="row.request_id" class="flex items-center gap-2">
                      <span class="max-w-[220px] truncate font-mono text-[11px] text-gray-700 dark:text-gray-200" :title="row.request_id">
                        {{ row.request_id }}
                      </span>
                      <KumoButton
                        class="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 hover:bg-[var(--brand-hover)] dark:bg-dark-700 dark:text-gray-300"
                        @click="handleCopyRequestId(row.request_id)"
                      >
                        {{ t('admin.ops.requestDetails.copy') }}
                      </KumoButton>
                    </div>
                    <span v-else class="text-xs text-gray-400">-</span>
                  </KumoTableCell>
                  <KumoTableCell class="whitespace-nowrap px-4 py-3 text-right">
                    <KumoButton
                      v-if="row.kind === 'error' && row.error_id"
                      class="btn btn-secondary btn-sm text-red-600 dark:text-red-400"
                      @click="openErrorDetail(row.error_id)"
                    >
                      {{ t('admin.ops.requestDetails.viewError') }}
                    </KumoButton>
                    <span v-else class="text-xs text-gray-400">-</span>
                  </KumoTableCell>
                </KumoTableRow>
              </KumoTableBody>
            </KumoTable>
            </div>

            <Pagination
              :total="total"
              :page="page"
              :page-size="pageSize"
              @update:page="handlePageChange"
              @update:pageSize="handlePageSizeChange"
            />
          </div>
        </div>
      </div>
    </template>
  </BaseDialog>
</template>
