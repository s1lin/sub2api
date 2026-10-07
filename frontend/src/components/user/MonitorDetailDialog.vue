<template>
  <BaseDialog
    :show="show"
    :title="title"
    width="wide"
    @close="$emit('close')"
  >
    <div v-if="loading" class="py-8 text-center text-sm text-gray-500">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="!detail" class="py-8 text-center text-sm text-gray-500">
      {{ t('channelStatus.detailLoadError') }}
    </div>
    <div v-else class="overflow-x-auto">
      <KumoTable class="w-full text-left text-sm">
        <KumoTableHeader class="border-b border-gray-200 dark:border-dark-700">
          <KumoTableRow class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.model') }}</KumoTableHead>
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.latestStatus') }}</KumoTableHead>
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.latestLatency') }}</KumoTableHead>
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.availability7d') }}</KumoTableHead>
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.availability15d') }}</KumoTableHead>
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.availability30d') }}</KumoTableHead>
            <KumoTableHead class="py-2 pr-3">{{ t('channelStatus.detailColumns.avgLatency7d') }}</KumoTableHead>
          </KumoTableRow>
        </KumoTableHeader>
        <KumoTableBody>
          <KumoTableRow
            v-for="m in detail.models"
            :key="m.model"
            class="border-b border-gray-100 dark:border-dark-800"
          >
            <KumoTableCell class="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{{ formatMonitorModel(m.model) }}</KumoTableCell>
            <KumoTableCell class="py-2 pr-3">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
                :class="statusBadgeClass(m.latest_status)"
              >
                {{ statusLabel(m.latest_status) }}
              </span>
            </KumoTableCell>
            <KumoTableCell class="py-2 pr-3 text-gray-700 dark:text-gray-300">{{ formatLatency(m.latest_latency_ms) }}</KumoTableCell>
            <KumoTableCell class="py-2 pr-3 text-gray-700 dark:text-gray-300">{{ formatPercent(m.availability_7d) }}</KumoTableCell>
            <KumoTableCell class="py-2 pr-3 text-gray-700 dark:text-gray-300">{{ formatPercent(m.availability_15d) }}</KumoTableCell>
            <KumoTableCell class="py-2 pr-3 text-gray-700 dark:text-gray-300">{{ formatPercent(m.availability_30d) }}</KumoTableCell>
            <KumoTableCell class="py-2 pr-3 text-gray-700 dark:text-gray-300">{{ formatLatency(m.avg_latency_7d_ms) }}</KumoTableCell>
          </KumoTableRow>
        </KumoTableBody>
      </KumoTable>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <KumoButton @click="$emit('close')" class="btn btn-secondary">
          {{ t('channelStatus.closeDetail') }}
        </KumoButton>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { KumoButton, KumoTable, KumoTableBody, KumoTableCell, KumoTableHead, KumoTableHeader, KumoTableRow } from '@/components/kumo'

import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'
import {
  status as fetchChannelMonitorDetail,
  type UserMonitorDetail,
} from '@/api/channelMonitor'
import BaseDialog from '@/components/common/BaseDialog.vue'
import { useChannelMonitorFormat } from '@/composables/useChannelMonitorFormat'

const props = defineProps<{
  show: boolean
  monitorId: number | null
  title: string
}>()

defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
const appStore = useAppStore()
const { statusLabel, statusBadgeClass, formatLatency, formatPercent, formatMonitorModel } = useChannelMonitorFormat()

const detail = ref<UserMonitorDetail | null>(null)
const loading = ref(false)
let requestVersion = 0

async function load(id: number) {
  const version = ++requestVersion
  detail.value = null
  loading.value = true
  try {
    const result = await fetchChannelMonitorDetail(id)
    if (version === requestVersion) detail.value = result
  } catch (err: unknown) {
    if (version !== requestVersion) return
    appStore.showError(extractApiErrorMessage(err, t('channelStatus.detailLoadError')))
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(
  () => [props.show, props.monitorId] as const,
  ([show, id], _, onCleanup) => {
    onCleanup(() => { requestVersion++ })
    if (!show) {
      detail.value = null
      return
    }
    if (id != null) void load(id)
  },
  { immediate: true },
)
</script>
