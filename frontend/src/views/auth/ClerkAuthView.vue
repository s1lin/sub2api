<template>
  <AuthLayout>
    <div v-if="!isLoaded" role="status" class="clerk-state">
      <KumoLoader class="clerk-state-spinner animate-spin" aria-hidden="true" />
      <p class="clerk-state-hint">{{ t('clerkAuth.loading') }}</p>
    </div>
    <div v-else-if="session && auth.clerkError" role="alert" class="clerk-state">
      <span class="clerk-state-icon clerk-state-icon-error" aria-hidden="true">!</span>
      <h2 class="clerk-state-title">{{ t('clerkAuth.failedTitle') }}</h2>
      <p class="clerk-state-hint">{{ auth.clerkError }}</p>
      <div class="clerk-state-actions">
        <KumoButton class="btn btn-primary" :disabled="retrying" @click="retry">{{ t('clerkAuth.retry') }}</KumoButton>
        <KumoButton class="btn btn-secondary" @click="auth.logout">{{ t('clerkAuth.signOut') }}</KumoButton>
      </div>
    </div>
    <div v-else-if="session" role="status" class="clerk-state">
      <KumoLoader class="clerk-state-spinner animate-spin" aria-hidden="true" />
      <h2 class="clerk-state-title">{{ t('clerkAuth.connecting') }}</h2>
      <p class="clerk-state-hint">
        {{ sessionEmail ? t('clerkAuth.signedInAs', { email: sessionEmail }) : t('clerkAuth.connectingHint') }}
      </p>
      <div v-if="slow" class="clerk-state-slow">
        <span>{{ t('clerkAuth.slowHint') }}</span>
        <div class="clerk-state-actions">
          <KumoButton class="btn btn-secondary btn-sm" :disabled="retrying" @click="retry">{{ t('clerkAuth.retry') }}</KumoButton>
          <KumoButton class="btn btn-secondary btn-sm" @click="auth.logout">{{ t('clerkAuth.signOut') }}</KumoButton>
        </div>
      </div>
    </div>
    <SignUp v-else-if="signUp" routing="hash" :sign-in-url="signInURL" :force-redirect-url="returnURL" :appearance="appearance" />
    <SignIn v-else routing="hash" :sign-up-url="signUpURL" :force-redirect-url="returnURL" :sign-up-force-redirect-url="returnURL" :appearance="appearance" />
    <template #footer>
      <router-link to="/pricing" class="text-primary-600 hover:underline dark:text-primary-400">{{ t('storefront.backToCredits') }}</router-link>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { KumoButton, KumoLoader } from '@/components/kumo'

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SignIn, SignUp, useClerk, useSession, updateClerkOptions } from '@clerk/vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { authRedirect } from '@/utils/authRedirect'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const clerk = useClerk()
const { isLoaded, session } = useSession()
const auth = useAuthStore()
const appStore = useAppStore()
const { isDark } = useTheme()
// Use the public site identity instead of the Clerk instance's internal name.
// Keep Clerk's verification and recovery step headings intact.
watch([isLoaded, locale, () => appStore.siteName], () => {
  if (!isLoaded.value) return
  const name = appStore.siteName
  updateClerkOptions({
    localization: {
      signIn: { start: { title: t('clerkAuth.signInTitle', { name }), titleCombined: t('clerkAuth.signInTitle', { name }) } },
      signUp: { start: { title: t('clerkAuth.signUpTitle', { name }) } },
    },
  })
}, { immediate: true })
const signUp = computed(() => route.path === '/register')
const destination = computed(() => authRedirect(route.query.redirect, auth.isAdmin ? '/admin/dashboard' : '/dashboard'))
// Both Clerk's OAuth return and email/MFA steps return through this route;
// the bridge verifies the backend identity before navigating to checkout.
const returnURL = computed(() => `/login?redirect=${encodeURIComponent(destination.value)}`)
const signInURL = computed(() => `/login?redirect=${encodeURIComponent(destination.value)}`)
const signUpURL = computed(() => `/register?redirect=${encodeURIComponent(destination.value)}`)
const appearance = computed(() => ({
  variables: {
    colorPrimary: isDark.value ? '#3fd1b5' : '#0f7a6c',
    colorPrimaryForeground: isDark.value ? '#141816' : '#fafbf8',
    colorBackground: isDark.value ? '#1c221e' : '#fafbf8',
    colorForeground: isDark.value ? '#eef0ec' : '#202522',
    colorMutedForeground: isDark.value ? '#b0b9af' : '#59615b',
    colorInputBackground: isDark.value ? '#141816' : '#f4f5f3',
    colorInputForeground: isDark.value ? '#eef0ec' : '#202522',
    borderRadius: '0.625rem',
    fontFamily: 'Geist, PingFang SC, Microsoft YaHei, system-ui, sans-serif',
  },
  elements: { rootBox: 'w-full', cardBox: 'w-full shadow-none', card: 'p-0 shadow-none bg-transparent', footer: 'bg-transparent' },
}))

const sessionEmail = computed(() => session.value?.user?.primaryEmailAddress?.emailAddress || '')

// Offer retry/sign-out only when connecting stalls, so the normal path stays a calm spinner.
const SLOW_CONNECT_MS = 8000
const slow = ref(false)
let slowTimer: ReturnType<typeof setTimeout> | undefined
watch(() => session.value?.id, sessionId => {
  clearTimeout(slowTimer)
  slow.value = false
  if (sessionId) slowTimer = setTimeout(() => { slow.value = true }, SLOW_CONNECT_MS)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(slowTimer))

// Leave this page as soon as the backend session exists, even if the bridge's own redirect was skipped.
watch(() => auth.isAuthenticated, authenticated => {
  if (authenticated && session.value) void router.replace(destination.value)
}, { immediate: true })

const retrying = ref(false)
async function retry() {
  if (!clerk.value?.session || retrying.value) return
  retrying.value = true
  try {
    await auth.authenticateWithClerk(clerk.value.session.id)
    if (auth.isAuthenticated) await router.replace(destination.value)
  } catch (error) {
    auth.clerkError = (error as { message?: string }).message || t('clerkAuth.failed')
  } finally {
    retrying.value = false
  }
}
</script>

<style scoped>
.clerk-state { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; }
.clerk-state-spinner { width: 28px; height: 28px; color: var(--brand-accent); }
.clerk-state-icon { display: inline-flex; width: 40px; height: 40px; align-items: center; justify-content: center; border-radius: 9999px; font-size: 18px; font-weight: 600; }
.clerk-state-icon-error { background: rgb(220 38 38 / .1); color: rgb(220 38 38); }
:global(.dark) .clerk-state-icon-error { background: rgb(248 113 113 / .15); color: rgb(248 113 113); }
.clerk-state-title { margin-top: 4px; font-size: 16px; font-weight: 600; line-height: 1.4; color: var(--brand-ink); }
.clerk-state-hint { max-width: 320px; font-size: 14px; line-height: 1.5; color: var(--brand-muted); overflow-wrap: anywhere; }
.clerk-state-actions { display: flex; width: 100%; max-width: 320px; gap: 12px; margin-top: 8px; }
.clerk-state-actions > * { flex: 1 1 0; justify-content: center; }
.clerk-state-slow { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 4px; margin-top: 12px; padding-top: 16px; border-top: 1px solid var(--brand-line); font-size: 13px; color: var(--brand-muted); }
</style>
