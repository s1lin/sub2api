<template>
  <AppLayout>
    <div class="space-y-6">
      <div v-if="loading" class="flex justify-center py-12">
        <KumoLoader
          class="h-8 w-8"
         />
      </div>

      <template v-else-if="detail">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel flush class="card p-5">
            <div class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-dark-400">
              <Icon name="dollar" size="sm" class="text-primary-500" />
              {{ t('affiliate.stats.rebateRate') }}
            </div>
            <p class="mt-2 platform-metric-value text-primary-600 dark:text-primary-400">
              {{ formattedRebateRate }}<span class="ml-0.5 text-base font-medium">%</span>
            </p>
            <p class="mt-1 text-xs text-gray-400 dark:text-dark-500">
              {{ t('affiliate.stats.rebateRateHint') }}
            </p>
          </Panel>
          <Panel flush class="card p-5">
            <p class="text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.stats.invitedUsers') }}</p>
            <p class="mt-2 platform-metric-value text-gray-900 dark:text-white">
              {{ formatCount(detail.aff_count) }}
            </p>
          </Panel>
          <Panel flush class="card p-5">
            <p class="text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.stats.availableQuota') }}</p>
            <p class="mt-2 platform-metric-value text-emerald-600 dark:text-emerald-400">
              {{ formatCurrency(detail.aff_quota) }}
            </p>
          </Panel>
          <Panel flush class="card p-5">
            <p class="text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.stats.totalQuota') }}</p>
            <p class="mt-2 platform-metric-value text-gray-900 dark:text-white">
              {{ formatCurrency(detail.aff_history_quota) }}
            </p>
            <p v-if="detail.aff_frozen_quota > 0" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {{ t('affiliate.stats.frozenQuota') }}: {{ formatCurrency(detail.aff_frozen_quota) }}
            </p>
          </Panel>
        </div>

        <Panel flush class="card p-6">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('affiliate.title') }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.description') }}</p>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('affiliate.yourCode') }}</p>
              <div class="flex flex-col items-stretch gap-2 px-3 py-2 sm:flex-row sm:items-center panel-section">
                <code class="min-w-0 break-all text-sm font-semibold text-gray-900 dark:text-white sm:flex-1 sm:truncate">{{ detail.aff_code }}</code>
                <KumoButton class="btn btn-secondary btn-sm w-full sm:w-auto sm:shrink-0" @click="copyCode">
                  <Icon name="copy" size="sm" />
                  <span>{{ t('affiliate.copyCode') }}</span>
                </KumoButton>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('affiliate.inviteLink') }}</p>
              <div class="flex flex-col items-stretch gap-2 px-3 py-2 sm:flex-row sm:items-center panel-section">
                <code class="min-w-0 break-all text-sm text-gray-700 dark:text-gray-300 sm:flex-1 sm:truncate">{{ inviteLink }}</code>
                <KumoButton class="btn btn-secondary btn-sm w-full sm:w-auto sm:shrink-0" @click="copyInviteLink">
                  <Icon name="copy" size="sm" />
                  <span>{{ t('affiliate.copyLink') }}</span>
                </KumoButton>
              </div>
            </div>
          </div>

          <div class="mt-5 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-900/40 dark:bg-primary-900/20">
            <p class="text-sm font-medium text-primary-800 dark:text-primary-200">{{ t('affiliate.tips.title') }}</p>
            <ul class="mt-2 space-y-1 text-sm text-primary-700 dark:text-primary-300">
              <li>1. {{ t('affiliate.tips.line1') }}</li>
              <li>2. {{ t('affiliate.tips.line2', { rate: `${formattedRebateRate}%` }) }}</li>
              <li>3. {{ t('affiliate.tips.line3') }}</li>
              <li v-if="detail.aff_frozen_quota > 0">4. {{ t('affiliate.tips.line4') }}</li>
            </ul>
          </div>
        </Panel>

        <Panel flush class="card p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('affiliate.transfer.title') }}</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('affiliate.transfer.description') }}</p>
            </div>
            <KumoButton
              class="btn btn-primary"
              :disabled="transferring || detail.aff_quota <= 0"
              @click="transferQuota"
            >
              <Icon v-if="transferring" name="refresh" size="sm" class="animate-spin" />
              <Icon v-else name="dollar" size="sm" />
              <span>{{ transferring ? t('affiliate.transfer.transferring') : t('affiliate.transfer.button') }}</span>
            </KumoButton>
          </div>
          <p v-if="detail.aff_quota <= 0" class="mt-3 text-sm text-amber-600 dark:text-amber-400">
            {{ t('affiliate.transfer.empty') }}
          </p>
        </Panel>

        <Panel flush class="card p-6">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('affiliate.invitees.title') }}</h3>
          <div v-if="detail.invitees.length === 0" class="mt-4 p-6 text-center text-sm text-gray-500 dark:text-dark-400 panel-section">
            {{ t('affiliate.invitees.empty') }}
          </div>
          <div v-else class="mt-4 overflow-x-auto">
            <KumoTable class="w-full min-w-[560px] text-left text-sm">
              <KumoTableHeader>
                <KumoTableRow class="border-b border-[var(--brand-line)] text-gray-500 dark:text-dark-400">
                  <KumoTableHead class="px-3 py-2 font-medium">{{ t('affiliate.invitees.columns.email') }}</KumoTableHead>
                  <KumoTableHead class="px-3 py-2 font-medium">{{ t('affiliate.invitees.columns.username') }}</KumoTableHead>
                  <KumoTableHead class="px-3 py-2 font-medium text-right">{{ t('affiliate.invitees.columns.rebate') }}</KumoTableHead>
                  <KumoTableHead class="px-3 py-2 font-medium">{{ t('affiliate.invitees.columns.joinedAt') }}</KumoTableHead>
                </KumoTableRow>
              </KumoTableHeader>
              <KumoTableBody>
                <KumoTableRow
                  v-for="item in detail.invitees"
                  :key="item.user_id"
                  class="border-b border-[var(--brand-line)] last:border-b-0"
                >
                  <KumoTableCell class="px-3 py-3 text-gray-900 dark:text-white">{{ item.email || '-' }}</KumoTableCell>
                  <KumoTableCell class="px-3 py-3 text-gray-700 dark:text-gray-300">{{ item.username || '-' }}</KumoTableCell>
                  <KumoTableCell class="px-3 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{{ formatCurrency(item.total_rebate) }}</KumoTableCell>
                  <KumoTableCell class="px-3 py-3 text-gray-700 dark:text-gray-300">{{ formatDateTime(item.created_at) || '-' }}</KumoTableCell>
                </KumoTableRow>
              </KumoTableBody>
            </KumoTable>
          </div>
        </Panel>
      </template>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import Panel from '@/components/common/Panel.vue'
import { KumoButton, KumoLoader, KumoTable, KumoTableBody, KumoTableCell, KumoTableHead, KumoTableHeader, KumoTableRow } from '@/components/kumo'

import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import userAPI from '@/api/user'
import type { UserAffiliateDetail } from '@/types'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useClipboard } from '@/composables/useClipboard'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { extractApiErrorMessage } from '@/utils/apiError'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const { copyToClipboard } = useClipboard()

const loading = ref(true)
const transferring = ref(false)
const detail = ref<UserAffiliateDetail | null>(null)

const inviteLink = computed(() => {
  if (!detail.value) return ''
  if (typeof window === 'undefined') return `/register?aff=${encodeURIComponent(detail.value.aff_code)}`
  return `${window.location.origin}/register?aff=${encodeURIComponent(detail.value.aff_code)}`
})

// Rebate rate is a percentage in the range [0, 100]; backend already clamps it.
// We trim trailing zeros (e.g. 20.00 → "20", 12.50 → "12.5") for a cleaner UI.
const formattedRebateRate = computed(() => {
  const v = detail.value?.effective_rebate_rate_percent ?? 0
  const rounded = Math.round(v * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toString()
})

function formatCount(value: number): string {
  return value.toLocaleString()
}

async function loadAffiliateDetail(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true
  }
  try {
    detail.value = await userAPI.getAffiliateDetail()
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('affiliate.loadFailed')))
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function copyCode(): Promise<void> {
  if (!detail.value?.aff_code) return
  await copyToClipboard(detail.value.aff_code, t('affiliate.codeCopied'))
}

async function copyInviteLink(): Promise<void> {
  if (!inviteLink.value) return
  await copyToClipboard(inviteLink.value, t('affiliate.linkCopied'))
}

async function transferQuota(): Promise<void> {
  if (!detail.value || detail.value.aff_quota <= 0 || transferring.value) return
  transferring.value = true
  try {
    const resp = await userAPI.transferAffiliateQuota()
    appStore.showSuccess(t('affiliate.transfer.success', { amount: formatCurrency(resp.transferred_quota) }))
    await Promise.all([
      loadAffiliateDetail(true),
      authStore.refreshUser().catch(() => undefined),
    ])
  } catch (error) {
    appStore.showError(extractApiErrorMessage(error, t('affiliate.transferFailed')))
  } finally {
    transferring.value = false
  }
}

onMounted(() => {
  void loadAffiliateDetail()
})
</script>
