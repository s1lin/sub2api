<template>
  <div class="brand-page auth-page">
    <PublicHeader />
    <main class="brand-container auth-layout">
      <div class="auth-story">
        <h1>{{ t('storefront.authTitle') }}</h1>
        <p>{{ siteSubtitle }}</p>
        <AsciiOrbit class="auth-art" />
      </div>
      <div class="auth-form-column">
        <div class="auth-panel">
          <slot />
        </div>
        <div class="auth-footer-links">
          <slot name="footer" />
        </div>
      </div>
    </main>
    <footer class="brand-container brand-footer">
      <span>© {{ currentYear }} {{ siteName }}. All rights reserved.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import PublicHeader from './PublicHeader.vue'
import AsciiOrbit from '@/components/brand/AsciiOrbit.vue'

const { t } = useI18n()
const appStore = useAppStore()
const siteName = computed(() => appStore.siteName || 'tokensbeat')
const siteSubtitle = computed(() => t('storefront.platformDescription'))
const currentYear = new Date().getFullYear()

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>

<style scoped>
.auth-page { display: flex; flex-direction: column; }
.auth-layout { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 96px; align-items: center; padding-block: 48px 64px; }
.auth-story h1 { max-width: 480px; font-size: clamp(36px, 4vw, 54px); line-height: 1.12; letter-spacing: -.05em; font-weight: 600; text-wrap: balance; }
.auth-story p { max-width: 380px; margin-top: 20px; font-size: 16px; line-height: 1.7; color: var(--brand-muted); }
.auth-art { width: min(100%, 420px); margin-top: 16px; }
.auth-form-column { min-width: 0; width: 100%; max-width: 460px; justify-self: end; }
.auth-panel { padding: 32px; border: 1px solid var(--brand-line); border-radius: 16px; background: var(--brand-surface); }
.auth-footer-links { margin-top: 24px; text-align: center; font-size: 14px; color: var(--brand-muted); }
@media (max-width: 1023px) { .auth-layout { gap: 40px; } }
@media (max-width: 767px) {
  .auth-layout { display: block; max-width: 460px; padding-block: 24px 48px; }
  .auth-story { margin-bottom: 28px; }
  .auth-story h1 { font-size: 32px; }
  .auth-story p { margin-top: 12px; font-size: 14px; }
  .auth-art { display: none; }
  .auth-panel { padding: 24px; }
}
</style>
