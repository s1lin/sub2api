<template>
  <AuthLayout>
    <div class="flex flex-col items-center gap-5">
      <p v-if="!isLoaded" role="status" class="text-sm text-gray-500 dark:text-dark-400">{{ t('clerkAuth.loading') }}</p>
      <div v-else-if="session" class="w-full space-y-4 text-center">
        <p v-if="auth.clerkError" role="alert" class="text-sm text-red-600 dark:text-red-400">{{ auth.clerkError }}</p>
        <p v-else role="status" class="text-sm text-gray-500 dark:text-dark-400">{{ t('clerkAuth.connecting') }}</p>
        <button class="btn btn-primary" @click="retry">{{ t('clerkAuth.retry') }}</button>
        <button class="btn btn-secondary ml-3" @click="auth.logout">{{ t('clerkAuth.signOut') }}</button>
      </div>
      <SignUp v-else-if="signUp" routing="hash" :sign-in-url="signInURL" :force-redirect-url="returnURL" :appearance="appearance" />
      <SignIn v-else routing="hash" :sign-up-url="signUpURL" :force-redirect-url="returnURL" :sign-up-force-redirect-url="returnURL" :appearance="appearance" />
      <router-link to="/pricing" class="text-sm text-primary-600 hover:underline dark:text-primary-400">{{ t('storefront.backToCredits') }}</router-link>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SignIn, SignUp, useClerk, useSession } from '@clerk/vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { authRedirect } from '@/utils/authRedirect'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const clerk = useClerk()
const { isLoaded, session } = useSession()
const auth = useAuthStore()
const { isDark } = useTheme()
const signUp = computed(() => route.path === '/register')
const destination = computed(() => authRedirect(route.query.redirect, auth.isAdmin ? '/admin/dashboard' : '/dashboard'))
// Both Clerk's OAuth return and email/MFA steps return through this route;
// the bridge verifies the backend identity before navigating to checkout.
const returnURL = computed(() => `/login?redirect=${encodeURIComponent(destination.value)}`)
const signInURL = computed(() => `/login?redirect=${encodeURIComponent(destination.value)}`)
const signUpURL = computed(() => `/register?redirect=${encodeURIComponent(destination.value)}`)
const appearance = computed(() => ({
  variables: {
    colorPrimary: isDark.value ? '#e89b7b' : '#a74d30',
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

async function retry() {
  if (!clerk.value?.session) return
  try {
    await auth.authenticateWithClerk(clerk.value.session.id)
    if (auth.isAuthenticated) await router.replace(destination.value)
  } catch (error) {
    auth.clerkError = (error as { message?: string }).message || t('clerkAuth.failed')
  }
}
</script>
