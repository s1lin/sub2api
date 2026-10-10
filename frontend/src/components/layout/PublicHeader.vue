<template>
  <header class="public-header">
    <nav class="brand-container public-nav" :aria-label="t('storefront.title')">
      <router-link to="/" class="brand-wordmark" :title="appStore.siteName">
        <img :src="siteLogo || '/logo.svg'" alt="" width="32" height="32" />
        <span>{{ appStore.siteName }}</span>
      </router-link>
      <div class="public-nav-actions">
        <router-link to="/docs" class="public-docs brand-text-link">{{ t('home.docs') }}</router-link>
        <LocaleSwitcher text-only />
        <KumoButton type="button" class="brand-theme-toggle" :aria-label="t(isDark ? 'home.switchToLight' : 'home.switchToDark')" @click="toggleTheme">
          <Icon :name="isDark ? 'sun' : 'moon'" size="md" />
        </KumoButton>
        <router-link :to="authStore.isAuthenticated ? accountPath : '/login'" class="public-account-link brand-text-link">
          {{ t(authStore.isAuthenticated ? 'storefront.account' : 'home.login') }}
        </router-link>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { KumoButton } from '@/components/kumo'

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { sanitizeUrl } from '@/utils/url'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const { isDark, toggleTheme } = useTheme()
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const accountPath = computed(() => authStore.isAdmin ? '/admin/dashboard' : '/dashboard')
</script>
