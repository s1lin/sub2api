<template>
  <div>
    <!-- Multi-select Dropdown -->
    <KumoPopoverRoot v-model="showDropdown">
      <div class="mb-3 rounded-lg border border-[var(--brand-line)] bg-white p-2 dark:bg-dark-700">
        <div class="grid grid-cols-2 gap-1.5">
          <span
            v-for="model in modelValue"
            :key="model"
            class="inline-flex items-center justify-between gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-dark-600 dark:text-gray-300"
          >
            <span class="flex items-center gap-1 truncate">
              <ModelIcon :model="model" size="14px" />
              <span class="truncate">{{ model }}</span>
            </span>
            <KumoButton
              type="button"
              @click.stop="removeModel(model)"
              :aria-label="`${t('common.delete')} ${model}`"
              class="shrink-0 rounded-full hover:bg-[var(--brand-hover)]"
            >
              <Icon name="x" size="xs" class="h-3.5 w-3.5" :stroke-width="2" />
            </KumoButton>
          </span>
        </div>
        <KumoPopoverTrigger class="mt-2 flex w-full items-center justify-between border-t border-[var(--brand-line)] pt-2" :aria-label="t('admin.accounts.searchModels')">
          <span class="text-xs text-gray-400">{{ t('admin.accounts.modelCount', { count: modelValue.length }) }}</span>
          <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </KumoPopoverTrigger>
      </div>
      <!-- Dropdown List -->
      <KumoPopoverContent align="start" class="w-[min(28rem,calc(100vw-2rem))] p-0">
        <div class="sticky top-0 border-b border-[var(--brand-line)] bg-white p-2 dark:bg-dark-700">
          <KumoInput
            v-model="searchQuery"
            type="text"
            class="input w-full text-sm"
            :placeholder="t('admin.accounts.searchModels')"
            @click.stop
          />
        </div>
        <div class="max-h-52 overflow-auto">
          <div
            v-for="model in filteredModels"
            :key="model.value"
            data-testid="model-option"
            class="group flex items-center hover:bg-[var(--brand-hover)]"
          >
            <KumoLabel class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <KumoCheckbox
                data-testid="select-model"
                :checked="modelValue.includes(model.value)"
                :aria-label="model.value"
                @change="toggleModel(model.value)"
              />
              <ModelIcon :model="model.value" size="18px" />
              <span class="truncate text-gray-900 dark:text-white">{{ model.value }}</span>
            </KumoLabel>
            <KumoButton
              type="button"
              data-testid="copy-model-id"
              class="mr-2 rounded p-1.5 text-gray-400 opacity-70 transition-colors hover:bg-[var(--brand-hover)] hover:text-primary-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 group-hover:opacity-100 dark:text-gray-500 dark:hover:text-primary-400"
              :title="`${t('common.copy')} ${model.value}`"
              :aria-label="`${t('common.copy')} ${model.value}`"
              @click="copyModelId(model.value)"
            >
              <Icon name="copy" size="sm" />
            </KumoButton>
          </div>
          <div v-if="filteredModels.length === 0" class="px-3 py-4 text-center text-sm text-gray-500">
            {{ t('admin.accounts.noMatchingModels') }}
          </div>
        </div>
      </KumoPopoverContent>
    </KumoPopoverRoot>

    <!-- Quick Actions -->
    <div class="mb-4 flex flex-wrap gap-2">
      <KumoButton
        type="button"
        @click="fillRelated"
        class="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
      >
        {{ t('admin.accounts.fillRelatedModels') }}
      </KumoButton>
      <KumoButton
        v-if="canSyncUpstream"
        type="button"
        @click="syncUpstreamModels"
        :disabled="isSyncingUpstream"
        class="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
      >
        {{ isSyncingUpstream ? t('admin.accounts.syncUpstreamModelsLoading') : t('admin.accounts.syncUpstreamModels') }}
      </KumoButton>
      <KumoButton
        type="button"
        @click="clearAll"
        class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
      >
        {{ t('admin.accounts.clearAllModels') }}
      </KumoButton>
    </div>

    <!-- Custom Model Input -->
    <div class="mb-3">
      <KumoLabel class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('admin.accounts.customModelName') }}</KumoLabel>
      <div class="flex gap-2">
        <KumoInput
          v-model="customModel"
          type="text"
          class="input flex-1"
          :placeholder="t('admin.accounts.enterCustomModelName')"
          @keydown.enter.prevent="handleEnter"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
        />
        <KumoButton
          type="button"
          @click="addCustom"
          class="btn btn-secondary"
        >
          {{ t('admin.accounts.addModel') }}
        </KumoButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { KumoButton, KumoCheckbox, KumoInput, KumoLabel, KumoPopoverContent, KumoPopoverRoot, KumoPopoverTrigger } from '@/components/kumo'

import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { accountsAPI } from '@/api/admin/accounts'
import type { SyncUpstreamPreviewParams } from '@/api/admin/accounts'
import { useClipboard } from '@/composables/useClipboard'
import ModelIcon from '@/components/common/ModelIcon.vue'
import Icon from '@/components/icons/Icon.vue'
import { allModels, getModelsByPlatform } from '@/composables/useModelWhitelist'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string[]
  modelMappings?: { from: string; to: string }[]
  platform?: string
  platforms?: string[]
  accountId?: number
  syncCredentials?: {
    platform: string
    type: string
    base_url?: string
    api_key: string
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'upstream-synced': []
}>()

const appStore = useAppStore()
const { copyToClipboard } = useClipboard()

const showDropdown = ref(false)
const searchQuery = ref('')
const customModel = ref('')
const isComposing = ref(false)
const isSyncingUpstream = ref(false)
const normalizedPlatforms = computed(() => {
  const rawPlatforms =
    props.platforms && props.platforms.length > 0
      ? props.platforms
      : props.platform
        ? [props.platform]
        : []

  return Array.from(
    new Set(
      rawPlatforms
        .map(platform => platform?.trim())
        .filter((platform): platform is string => Boolean(platform))
    )
  )
})

const upstreamSyncPlatforms = new Set([
  'anthropic',
  'openai',
  'gemini',
  'antigravity',
  'grok',
  'kimi',
  'zhipu',
  'deepseek',
  'minimax',
  'opencode_go'
])
const canSyncUpstream = computed(() => {
  if (props.accountId) {
    if (normalizedPlatforms.value.length === 0) return true
    return normalizedPlatforms.value.some(platform => upstreamSyncPlatforms.has(platform.toLowerCase()))
  }
  if (props.syncCredentials) {
    return upstreamSyncPlatforms.has(props.syncCredentials.platform.toLowerCase())
  }
  return false
})

const availableOptions = computed(() => {
  if (normalizedPlatforms.value.length === 0) {
    return allModels
  }

  const allowedModels = new Set<string>()
  for (const platform of normalizedPlatforms.value) {
    for (const model of getModelsByPlatform(platform)) {
      allowedModels.add(model)
    }
  }

  return allModels.filter(model => allowedModels.has(model.value))
})

const filteredModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return availableOptions.value
  return availableOptions.value.filter(
    m => m.value.toLowerCase().includes(query) || m.label.toLowerCase().includes(query)
  )
})

watch(showDropdown, open => { if (!open) searchQuery.value = '' })

const removeModel = (model: string) => {
  emit('update:modelValue', props.modelValue.filter(m => m !== model))
}

const toggleModel = (model: string) => {
  if (props.modelValue.includes(model)) {
    removeModel(model)
  } else {
    emit('update:modelValue', [...props.modelValue, model])
  }
}

const copyModelId = async (model: string) => {
  await copyToClipboard(model)
}

const addCustom = () => {
  const model = customModel.value.trim()
  if (!model) return
  if (props.modelValue.includes(model)) {
    appStore.showInfo(t('admin.accounts.modelExists'))
    return
  }
  const conflict = props.modelMappings?.find(mapping => mapping.from.trim() === model && mapping.to.trim() && mapping.to.trim() !== model)
  if (conflict) {
    appStore.showInfo(t('admin.accounts.modelMappingConflict', { from: model, to: conflict.to.trim() }))
    return
  }
  emit('update:modelValue', [...props.modelValue, model])
  customModel.value = ''
}

const handleEnter = () => {
  if (!isComposing.value) addCustom()
}

const fillRelated = () => {
  const newModels = [...props.modelValue]
  for (const platform of normalizedPlatforms.value) {
    for (const model of getModelsByPlatform(platform)) {
      if (!newModels.includes(model)) {
        newModels.push(model)
      }
    }
  }
  emit('update:modelValue', newModels)
}

const syncUpstreamModels = async () => {
  if (isSyncingUpstream.value) return
  if (!props.accountId && !props.syncCredentials) return

  isSyncingUpstream.value = true
  try {
    let result
    if (props.accountId) {
      result = await accountsAPI.syncUpstreamModels(props.accountId)
    } else if (props.syncCredentials) {
      result = await accountsAPI.syncUpstreamModelsPreview(props.syncCredentials as SyncUpstreamPreviewParams)
    } else {
      return
    }

    const upstreamModels = result.models.map(model => model.trim()).filter(Boolean)
    if (upstreamModels.length === 0) {
      appStore.showInfo(t('admin.accounts.syncUpstreamModelsEmpty'))
      return
    }

    if (!props.accountId) {
      emit('upstream-synced')
    }

    const newModels = [...props.modelValue]
    let addedCount = 0
    for (const model of upstreamModels) {
      if (!newModels.includes(model)) {
        newModels.push(model)
        addedCount += 1
      }
    }

    emit('update:modelValue', newModels)
    const warnings = result.warnings ?? []
    const hasPartialMetadata = warnings.some(
      warning => warning.code === 'upstream_model_metadata_partial'
    )
    const hasIncompleteMetadata = warnings.some(
      warning => warning.code === 'upstream_model_metadata_incomplete'
    )
    if (hasIncompleteMetadata) {
      appStore.showWarning(t('admin.accounts.syncUpstreamModelsMetadataIncomplete'))
      return
    }
    if (addedCount > 0) {
      appStore.showSuccess(t('admin.accounts.syncUpstreamModelsSuccess', { count: addedCount, total: upstreamModels.length }))
    } else {
      appStore.showInfo(t('admin.accounts.syncUpstreamModelsNoChanges', { count: upstreamModels.length }))
    }
    if (hasPartialMetadata) {
      appStore.showWarning(t('admin.accounts.syncUpstreamModelsMetadataPartial'))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t('admin.accounts.syncUpstreamModelsFailed')
    appStore.showError(t('admin.accounts.syncUpstreamModelsError', { message }))
  } finally {
    isSyncingUpstream.value = false
  }
}

const clearAll = () => {
  emit('update:modelValue', [])
}

</script>
