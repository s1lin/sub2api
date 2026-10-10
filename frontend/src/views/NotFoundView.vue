<template>
  <div class="brand-page">
    <PublicHeader />
    <main class="not-found brand-container">
      <p class="not-found-code" aria-hidden="true">404</p>
      <h1>{{ t('errors.pageNotFound') }}</h1>
      <p class="not-found-description">{{ t('errors.notFoundDescription') }}</p>
      <KumoLink to="/" class="brand-button">
        <Icon name="arrowLeft" size="md" />
        {{ t('errors.backHome') }}
      </KumoLink>
    </main>
  </div>
</template>

<script setup lang="ts">
import { KumoLink } from '@/components/kumo'

import { useI18n } from 'vue-i18n'
import PublicHeader from '@/components/layout/PublicHeader.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
</script>

<style scoped>
.not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100dvh - 80px); padding-block: 56px 96px; text-align: center; }
.not-found-code { font: 600 clamp(88px, 16vw, 160px)/1 var(--brand-mono); letter-spacing: -.06em; color: var(--brand-accent); }
.not-found h1 { margin-top: 16px; font-size: clamp(28px, 4vw, 44px); font-weight: 600; letter-spacing: -.04em; }
.not-found-description { max-width: 420px; margin: 16px 0 28px; color: var(--brand-muted); line-height: 1.7; }
</style>
