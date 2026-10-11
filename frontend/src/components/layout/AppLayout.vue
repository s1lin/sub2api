<template>
  <div class="brand-page app-shell">

    <a class="skip-link" href="#main-content">{{ t('common.skipToContent') }}</a>
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Content Area -->
    <div
      class="relative min-h-dvh transition-all duration-300"
      :class="[sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-52']"
    >
      <!-- Header -->
      <AppHeader />

      <!-- Main Content -->
      <main id="main-content" tabindex="-1" class="platform-content platform-sheet min-w-0">
        <PageHeader v-if="!hidePageHeader" :title="title" :description="description">
          <template v-if="$slots.actions" #actions><slot name="actions" /></template>
        </PageHeader>
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import PageHeader from './PageHeader.vue'
import { usePageHeading } from '@/composables/usePageHeading'

defineProps<{ hidePageHeader?: boolean }>()
const { title, description } = usePageHeading()

const { t } = useI18n()
const appStore = useAppStore()
const sidebarCollapsed = computed(() => appStore.sidebarCollapsed)
</script>
