<template>
  <Panel flush class="card">
    <div class="border-b border-[var(--brand-line)] px-6 py-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('dashboard.quickActions') }}</h2>
    </div>
    <div class="space-y-1 p-2">
      <KumoButton @click="router.push('/keys')" class="group flex w-full items-center gap-3 rounded-md p-3 text-left transition-all duration-200 hover:bg-[var(--brand-hover)] dark:bg-dark-800/50">
        <div class="quick-action-icon">
          <Icon name="key" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('dashboard.createApiKey') }}</p>
          <p class="text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.generateNewKey') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="text-gray-400 transition-colors group-hover:text-primary-500 dark:text-dark-500"
        />
      </KumoButton>

      <KumoButton @click="router.push('/usage')" class="group flex w-full items-center gap-3 rounded-md p-3 text-left transition-all duration-200 hover:bg-[var(--brand-hover)] dark:bg-dark-800/50">
        <div class="quick-action-icon">
          <Icon name="chart" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('dashboard.viewUsage') }}</p>
          <p class="text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.checkDetailedLogs') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="text-gray-400 transition-colors group-hover:text-primary-500 dark:text-dark-500"
        />
      </KumoButton>

      <KumoButton v-if="canUseBatchImage" @click="router.push('/batch-image')" class="group flex w-full items-center gap-3 rounded-md p-3 text-left transition-all duration-200 hover:bg-[var(--brand-hover)] dark:bg-dark-800/50">
        <div class="quick-action-icon">
          <Icon name="sparkles" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('dashboard.batchImageAgent') }}</p>
          <p class="text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.batchImageAgentDesc') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="text-gray-400 transition-colors group-hover:text-primary-500 dark:text-dark-500"
        />
      </KumoButton>

      <KumoButton @click="router.push('/redeem')" class="group flex w-full items-center gap-3 rounded-md p-3 text-left transition-all duration-200 hover:bg-[var(--brand-hover)] dark:bg-dark-800/50">
        <div class="quick-action-icon">
          <Icon name="gift" size="md" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('dashboard.redeemCode') }}</p>
          <p class="text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.addBalanceWithCode') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="text-gray-400 transition-colors group-hover:text-primary-500 dark:text-dark-500"
        />
      </KumoButton>
    </div>
  </Panel>
</template>

<script setup lang="ts">
import Panel from '@/components/common/Panel.vue'
import { KumoButton } from '@/components/kumo'

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'
const router = useRouter()
const { t } = useI18n()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()

onMounted(() => {
  void refreshBatchImageAccess()
})
</script>
