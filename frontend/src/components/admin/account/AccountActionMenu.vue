<template><KumoDropdown :model-value="show && !!anchorRect" @update:model-value="!$event && emit('close')">
    <KumoDropdownContent v-if="anchorRect" :anchor="{ getBoundingClientRect: () => anchorRect! }" class="action-menu-content w-52 min-w-0 max-w-[calc(100vw-1rem)] max-h-[min(calc(100dvh-1rem),var(--available-height))] overflow-y-auto overscroll-contain"><div class="py-1">
          <template v-if="account">
            <KumoDropdownItem @click="$emit('test', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--brand-hover)]">
              <Icon name="play" size="sm" class="text-green-500" :stroke-width="2" />
              {{ t('admin.accounts.testConnection') }}
            </KumoDropdownItem>
            <KumoDropdownItem @click="$emit('stats', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--brand-hover)]">
              <Icon name="chart" size="sm" class="text-indigo-500" />
              {{ t('admin.accounts.viewStats') }}
            </KumoDropdownItem>
            <KumoDropdownItem @click="$emit('schedule', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--brand-hover)]">
              <Icon name="clock" size="sm" class="text-orange-500" />
              {{ t('admin.scheduledTests.schedule') }}
            </KumoDropdownItem>
            <KumoDropdownItem v-if="canDuplicate" @click="$emit('duplicate', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--brand-hover)]">
              <Icon name="copy" size="sm" class="text-sky-500" />
              {{ t('admin.accounts.duplicateAccount') }}
            </KumoDropdownItem>
            <!-- 影子账号不持凭据:重授权/刷新 token 对其无效(后端拒绝),故隐藏(外审 G4)。 -->
            <template v-if="(account.type === 'oauth' || account.type === 'setup-token') && !isShadow">
              <KumoDropdownItem @click="$emit('reauth', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-[var(--brand-hover)]">
                <Icon name="link" size="sm" />
                {{ t('admin.accounts.reAuthorize') }}
              </KumoDropdownItem>
              <KumoDropdownItem @click="$emit('refresh-token', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-[var(--brand-hover)]">
                <Icon name="refresh" size="sm" />
                {{ t('admin.accounts.refreshToken') }}
              </KumoDropdownItem>
            </template>
            <KumoDropdownItem v-if="isOpenAIOAuthParent" @click="$emit('create-spark-shadow', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-[var(--brand-hover)]">
              <Icon name="sparkles" size="sm" />
              {{ t('admin.accounts.createSparkShadow') }}
            </KumoDropdownItem>
            <KumoDropdownItem v-if="supportsPrivacy" @click="$emit('set-privacy', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-[var(--brand-hover)]">
              <Icon name="shield" size="sm" />
              {{ t('admin.accounts.setPrivacy') }}
            </KumoDropdownItem>
            <div v-if="hasRecoverableState" class="my-1 border-t border-[var(--brand-line)]"></div>
            <KumoDropdownItem v-if="hasRecoverableState" @click="$emit('recover-state', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-[var(--brand-hover)]">
              <Icon name="sync" size="sm" />
              {{ t('admin.accounts.recoverState') }}
            </KumoDropdownItem>
            <KumoDropdownItem v-if="hasQuotaLimit" @click="$emit('reset-quota', account)" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-teal-600 hover:bg-[var(--brand-hover)]">
              <Icon name="refresh" size="sm" />
              {{ t('admin.accounts.resetQuota') }}
            </KumoDropdownItem>
          </template>
        </div></KumoDropdownContent>
  </KumoDropdown></template>

<script setup lang="ts">
import { KumoDropdown, KumoDropdownContent, KumoDropdownItem } from '@/components/kumo'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@/components/icons'
import type { Account } from '@/types'

const props = defineProps<{ show: boolean; account: Account | null; anchorRect: DOMRect | null }>()
const emit = defineEmits(['close', 'test', 'stats', 'schedule', 'duplicate', 'reauth', 'refresh-token', 'recover-state', 'reset-quota', 'set-privacy', 'create-spark-shadow'])
const { t } = useI18n()
const canDuplicate = computed(() => {
  if (!props.account || props.account.parent_account_id != null) return false
  return ['apikey', 'upstream', 'bedrock', 'service_account'].includes(props.account.type)
})
const isRateLimited = computed(() => {
  if (props.account?.rate_limit_reset_at && new Date(props.account.rate_limit_reset_at) > new Date()) {
    return true
  }
  const modelLimits = (props.account?.extra as Record<string, unknown> | undefined)?.model_rate_limits as
    | Record<string, { rate_limit_reset_at: string }>
    | undefined
  if (modelLimits) {
    const now = new Date()
    return Object.values(modelLimits).some(info => new Date(info.rate_limit_reset_at) > now)
  }
  return false
})
const isOverloaded = computed(() => props.account?.overload_until && new Date(props.account.overload_until) > new Date())
const isTempUnschedulable = computed(() => props.account?.temp_unschedulable_until && new Date(props.account.temp_unschedulable_until) > new Date())
const hasRecoverableState = computed(() => {
  return props.account?.status === 'error' || Boolean(isRateLimited.value) || Boolean(isOverloaded.value) || Boolean(isTempUnschedulable.value)
})
const isAntigravityOAuth = computed(() => props.account?.platform === 'antigravity' && props.account?.type === 'oauth')
const isOpenAIOAuth = computed(() => props.account?.platform === 'openai' && props.account?.type === 'oauth')
// 影子账号(链接型,持 parent_account_id)不持凭据、type 不可变,凭据/隐私类操作对其无效。
const isShadow = computed(() => props.account?.parent_account_id != null)
// A "parent" OpenAI OAuth account is one that is NOT itself a shadow (parent_account_id == null)
const isOpenAIOAuthParent = computed(() => isOpenAIOAuth.value && !isShadow.value)
const supportsPrivacy = computed(() => (isAntigravityOAuth.value || isOpenAIOAuth.value) && !isShadow.value)
const hasQuotaLimit = computed(() => {
  return (props.account?.type === 'apikey' || props.account?.type === 'bedrock') && (
    (props.account?.quota_limit ?? 0) > 0 ||
    (props.account?.quota_daily_limit ?? 0) > 0 ||
    (props.account?.quota_weekly_limit ?? 0) > 0
  )
})

</script>
