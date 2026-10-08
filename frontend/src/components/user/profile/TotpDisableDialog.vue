<template>
  <KumoDialog :show="true" custom-layout width="narrow" :title="t('profile.totp.disableTitle')" :close-on-click-outside="true"  @close="$emit('close')">
    <div class="relative p-6">
        <!-- Header -->
        <div class="mb-6">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 class="mt-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
            {{ t('profile.totp.disableTitle') }}
          </h3>
          <p class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            {{ t('profile.totp.disableWarning') }}
          </p>
        </div>

        <!-- Loading verification method -->
        <div v-if="methodLoading" class="flex items-center justify-center py-8">
          <KumoLoader class="h-8 w-8" />
        </div>

        <form v-else @submit.prevent="handleDisable" class="space-y-4">
          <!-- Email verification -->
          <div v-if="verificationMethod === 'email'">
            <KumoLabel class="input-label">{{ t('profile.totp.emailCode') }}</KumoLabel>
            <div class="flex gap-2">
              <KumoInput :aria-label="t('profile.totp.emailCode')"
                v-model="form.emailCode"
                type="text"
                maxlength="6"
                inputmode="numeric"
                class="input flex-1"
                :placeholder="t('profile.totp.enterEmailCode')"
              />
              <KumoButton
                type="button"
                class="btn btn-secondary whitespace-nowrap"
                :disabled="sendingCode || codeCooldown > 0"
                @click="handleSendCode"
              >
                {{ codeCooldown > 0 ? `${codeCooldown}s` : (sendingCode ? t('common.sending') : t('profile.totp.sendCode')) }}
              </KumoButton>
            </div>
          </div>

          <!-- Password verification -->
          <div v-else>
            <KumoLabel for="password" class="input-label">
              {{ t('profile.currentPassword') }}
            </KumoLabel>
            <KumoInput :aria-label="t('profile.currentPassword')"
              id="password"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              class="input"
              :placeholder="t('profile.totp.enterPassword')"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <KumoButton type="button" class="btn btn-secondary" @click="$emit('close')">
              {{ t('common.cancel') }}
            </KumoButton>
            <KumoButton
              type="submit"
              class="btn btn-danger"
              :disabled="loading || !canSubmit"
            >
              {{ loading ? t('common.processing') : t('profile.totp.confirmDisable') }}
            </KumoButton>
          </div>
        </form>

    </div>
  </KumoDialog>
</template>

<script setup lang="ts">
import { KumoButton, KumoDialog, KumoInput, KumoLabel, KumoLoader } from '@/components/kumo'

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { totpAPI } from '@/api'
import { extractApiErrorMessage } from '@/utils/apiError'

const emit = defineEmits<{
  close: []
  success: []
}>()

const { t } = useI18n()
const appStore = useAppStore()

const methodLoading = ref(true)
const verificationMethod = ref<'email' | 'password'>('password')
const loading = ref(false)
const sendingCode = ref(false)
let disposed = false
const codeCooldown = ref(0)
const cooldownTimer = ref<ReturnType<typeof setInterval> | null>(null)
const form = ref({
  emailCode: '',
  password: ''
})

const canSubmit = computed(() => {
  if (verificationMethod.value === 'email') {
    return form.value.emailCode.length === 6
  }
  return form.value.password.length > 0
})

const loadVerificationMethod = async () => {
  methodLoading.value = true
  try {
    const method = await totpAPI.getVerificationMethod()
    verificationMethod.value = method.method
  } catch (err: any) {
    appStore.showError(extractApiErrorMessage(err, t('common.error')))
    emit('close')
  } finally {
    methodLoading.value = false
  }
}

const handleSendCode = async () => {
  sendingCode.value = true
  try {
    await totpAPI.sendVerifyCode()
    if (disposed) return
    appStore.showSuccess(t('profile.totp.codeSent'))
    // Start cooldown
    codeCooldown.value = 60
    if (cooldownTimer.value) {
      clearInterval(cooldownTimer.value)
      cooldownTimer.value = null
    }
    cooldownTimer.value = setInterval(() => {
      codeCooldown.value--
      if (codeCooldown.value <= 0) {
        if (cooldownTimer.value) {
          clearInterval(cooldownTimer.value)
          cooldownTimer.value = null
        }
      }
    }, 1000)
  } catch (err: any) {
    appStore.showError(extractApiErrorMessage(err, t('profile.totp.sendCodeFailed')))
  } finally {
    sendingCode.value = false
  }
}

const handleDisable = async () => {
  if (!canSubmit.value) return

  loading.value = true

  try {
    const request = verificationMethod.value === 'email'
      ? { email_code: form.value.emailCode }
      : { password: form.value.password }

    await totpAPI.disable(request)
    appStore.showSuccess(t('profile.totp.disableSuccess'))
    emit('success')
  } catch (err: any) {
    appStore.showError(extractApiErrorMessage(err, t('profile.totp.disableFailed')))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadVerificationMethod()
})

onUnmounted(() => {
  disposed = true
  if (cooldownTimer.value) {
    clearInterval(cooldownTimer.value)
    cooldownTimer.value = null
  }
})
</script>
