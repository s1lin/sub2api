<template>
  <div class="brand-page">
    <PublicHeader />
    <main class="not-found brand-container">
      <pre aria-hidden="true">{{ artwork }}</pre>
      <p class="font-mono text-sm text-[var(--brand-muted)]">404</p>
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
const artwork = String.raw`  / /   .----.    / /
 / /   / /\ /|  / /
/ /_  / / // | / /_
\__ / |/ // /  \__ /
  / / | // /     / /
 /_/  '----'    /_/`
</script>

<style scoped>
.not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100dvh - 80px); padding-block: 56px 96px; text-align: center; }
.not-found pre { margin-bottom: 40px; font: 500 clamp(14px, 3vw, 24px)/1.25 var(--brand-mono); letter-spacing: 0; color: var(--brand-accent); }
.not-found h1 { margin-top: 16px; font-size: clamp(28px, 4vw, 44px); font-weight: 600; letter-spacing: -.04em; }
.not-found-description { max-width: 420px; margin: 16px 0 28px; color: var(--brand-muted); line-height: 1.7; }
</style>
