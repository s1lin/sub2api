<template><span class="hidden" aria-hidden="true"></span></template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useClerk, useSession } from '@clerk/vue'
import { useRoute, useRouter } from 'vue-router'
import { setClerkClient } from '@/auth/clerk'
import { useAuthStore } from '@/stores/auth'
import { authRedirect } from '@/utils/authRedirect'

const clerk = useClerk()
const { isLoaded, session } = useSession()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
let generation = 0

watch([isLoaded, () => session.value?.id], async ([loaded, sessionId]) => {
  if (!loaded) return
  setClerkClient(clerk.value || undefined)
  const currentGeneration = ++generation
  auth.clearAuth()
  if (!sessionId) {
    if (route.meta.requiresAuth !== false) await router.replace({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await auth.authenticateWithClerk(sessionId)
    if (currentGeneration !== generation || !auth.isAuthenticated) return
    if (route.path === '/login' || route.path === '/register') {
      await router.replace(authRedirect(route.query.redirect, auth.isAdmin ? '/admin/dashboard' : '/dashboard'))
    }
  } catch (error) {
    if (currentGeneration === generation) auth.clerkError = (error as { message?: string }).message || 'Sign-in could not be completed. Please try again.'
  }
}, { immediate: true })

function invalidSession() { auth.clearAuth() }
window.addEventListener('clerk-auth-invalid', invalidSession)
onBeforeUnmount(() => window.removeEventListener('clerk-auth-invalid', invalidSession))
</script>
