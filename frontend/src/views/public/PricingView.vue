<template>
  <div class="brand-page storefront">
    <PublicHeader />
    <main>
      <section class="brand-container storefront-hero" aria-labelledby="storefront-headline">
        <div class="hero-copy">
          <h1 id="storefront-headline">
            <span>{{ t('storefront.headlineIntro') }}</span>
            <span>{{ t('storefront.headlineCreative') }}</span>
          </h1>
          <p>{{ t('storefront.heroDescription') }}</p>
          <KumoButton href="#capabilities" class="brand-button">
            {{ t('storefront.explorePlatform') }}
            <Icon name="arrowRight" size="sm" />
          </KumoButton>
        </div>
        <div class="hero-art" aria-hidden="true">
          <AsciiOrbit />
        </div>
      </section>

      <section id="capabilities" class="brand-container capabilities-section" aria-labelledby="capabilities-title">
        <div class="section-intro">
          <h2 id="capabilities-title">{{ t('storefront.capabilitiesTitle') }}</h2>
          <p>{{ t('storefront.capabilitiesDescription') }}</p>
        </div>
        <div class="capabilities-layout">
          <article class="model-capability">
            <div class="capability-copy">
              <h3>{{ t('storefront.modelsTitle') }}</h3>
              <p>{{ t('storefront.modelsDescription') }}</p>
              <a href="#pricing" class="capability-link">{{ t('storefront.modelsLink') }} <Icon name="arrowRight" size="sm" /></a>
            </div>
          </article>
          <article class="video-capability">
            <div class="capability-copy">
              <h3>{{ t('storefront.videoTitle') }}</h3>
              <p>{{ t('storefront.videoDescription') }}</p>
              <p class="video-note">{{ t('storefront.videoFootnote') }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="brand-container integration-section" aria-labelledby="integration-title">
        <div class="section-intro">
          <h2 id="integration-title">{{ t('storefront.integrationTitle') }}</h2>
          <p>{{ t('storefront.integrationDescription') }}</p>
        </div>
        <ol class="integration-flow">
          <li><span aria-hidden="true">{ }</span><p>{{ t('storefront.integrationInput') }}</p></li>
          <li class="integration-core"><span class="integration-wordmark">tokensbeat</span><p>{{ t('storefront.integrationPlatform') }}</p></li>
          <li><span aria-hidden="true">[*]</span><p>{{ t('storefront.integrationOutput') }}</p></li>
        </ol>
      </section>

      <section id="pricing" class="brand-container storefront-pricing" aria-labelledby="pricing-title">
        <div class="section-intro">
          <h2 id="pricing-title">{{ t('storefront.accessTitle') }}</h2>
          <p>{{ t(subscriptionsEnabled && balanceEnabled ? 'storefront.accessDescription' : balanceEnabled ? 'storefront.creditsDescription' : 'storefront.subscriptionsDescription') }}</p>
        </div>
        <div v-if="authStore.isAuthenticated" class="account-shortcuts">
          <router-link v-if="subscriptionsEnabled" to="/subscriptions" class="brand-text-link">{{ t('storefront.manageSubscriptions') }} <span aria-hidden="true">↗</span></router-link>
          <router-link v-if="paymentEnabled" to="/orders" class="brand-text-link">{{ t('storefront.manageOrders') }} <span aria-hidden="true">↗</span></router-link>
        </div>
        <div v-if="loading" class="pricing-skeleton" role="status" :aria-label="t('storefront.loading')">
          <span class="sr-only">{{ t('storefront.loading') }}</span>
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-button"></div>
        </div>
        <div v-else-if="loadError" class="pricing-message" role="alert">
          <p>{{ t('storefront.loadError') }}</p>
          <KumoButton type="button" class="brand-button" @click="loadPlans">{{ t('storefront.retry') }}</KumoButton>
        </div>
        <template v-else>
          <article v-if="balanceEnabled" class="credits-panel" aria-labelledby="credits-title">
            <div class="credits-copy">
              <p class="credits-label">{{ t('storefront.creditsLabel') }}</p>
              <h3 id="credits-title">{{ t('storefront.creditsTitle') }}</h3>
              <p>{{ t('storefront.creditsPanelDescription') }}</p>
            </div>
            <KumoLink v-if="paymentEnabled" :to="checkoutDestination('/purchase?tab=recharge')" class="brand-button">
              {{ t('storefront.creditsAction') }} <Icon name="arrowRight" size="sm" />
            </KumoLink>
            <p v-else role="status" class="purchase-unavailable">{{ t('storefront.paymentDisabled') }}</p>
          </article>
          <div v-if="!paymentEnabled && !balanceEnabled" class="pricing-message" role="status">
            <p>{{ t('storefront.paymentDisabled') }}</p>
          </div>
          <div v-if="paymentEnabled && subscriptionsEnabled" class="subscription-section">
            <div class="plans-heading">
              <h3>{{ t('storefront.subscriptionsTitle') }}</h3>
              <KumoLabel v-if="platforms.length > 1" class="platform-filter">
                <span class="sr-only">{{ t('storefront.allPlatforms') }}</span>
                <KumoNativeSelect v-model="selectedPlatform">
                  <option value="">{{ t('storefront.allPlatforms') }}</option>
                  <option v-for="platform in platforms" :key="platform" :value="platform">{{ platformLabel(platform) }}</option>
                </KumoNativeSelect>
              </KumoLabel>
            </div>
            <div v-if="plans.length === 0" class="pricing-message" role="status">{{ t('storefront.noPlans') }}</div>
            <div v-else-if="filteredPlans.length === 0" class="pricing-message" role="status">{{ t('storefront.noMatchingPlans') }}</div>
            <div v-else class="storefront-plans">
              <SubscriptionPlanCard v-for="plan in filteredPlans" :key="plan.id" :plan="plan" @select="selectPlan" />
            </div>
            <p v-if="plans.length" class="purchase-note">{{ t('storefront.oneTime') }}</p>
          </div>
        </template>
      </section>

      <section class="brand-container getting-started" aria-labelledby="getting-started-title">
        <div class="section-intro">
          <h2 id="getting-started-title">{{ t('storefront.setupTitle') }}</h2>
          <p>{{ t('storefront.setupDescription') }}</p>
        </div>
        <div class="setup-layout">
          <ol class="setup-sequence">
            <li v-for="step in steps" :key="step.title">
              <h3>{{ t(step.title) }}</h3>
              <p>{{ t(step.body) }}</p>
            </li>
          </ol>
        </div>
      </section>

      <section class="brand-container storefront-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">{{ t('storefront.faqTitle') }}</h2>
        <div class="faq-list">
          <KumoCollapsible v-for="faq in faqs" :key="faq.question">
            <KumoCollapsibleTrigger>{{ t(faq.question) }}<Icon name="plus" size="sm" class="faq-plus" /></KumoCollapsibleTrigger>
            <KumoCollapsiblePanel>
            <p>{{ t(faq.answer) }}</p>
          </KumoCollapsiblePanel>
          </KumoCollapsible>
        </div>
      </section>
    </main>
    <footer class="brand-container brand-footer">
      <span>© {{ new Date().getFullYear() }} {{ appStore.siteName }}</span>
      <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="brand-text-link">{{ t('home.viewDocs') }}</a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { KumoCollapsible, KumoCollapsibleTrigger, KumoCollapsiblePanel, KumoButton, KumoLabel, KumoLink, KumoNativeSelect } from '@/components/kumo'

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { paymentAPI } from '@/api/payment'
import type { SubscriptionPlan } from '@/types/payment'
import SubscriptionPlanCard from '@/components/payment/SubscriptionPlanCard.vue'
import PublicHeader from '@/components/layout/PublicHeader.vue'
import AsciiOrbit from '@/components/brand/AsciiOrbit.vue'
import Icon from '@/components/icons/Icon.vue'
import { platformLabel } from '@/utils/platformColors'
import { sanitizeUrl } from '@/utils/url'

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const loading = ref(true)
const loadError = ref(false)
const plans = ref<SubscriptionPlan[]>([])
const selectedPlatform = ref('')
const paymentEnabled = computed(() => appStore.cachedPublicSettings?.payment_enabled === true)
const subscriptionsEnabled = computed(() => appStore.cachedPublicSettings?.subscription_enabled !== false)
const balanceEnabled = computed(() => appStore.cachedPublicSettings?.payment_balance_disabled !== true)
const docUrl = computed(() => sanitizeUrl(appStore.docUrl || ''))
const platforms = computed(() => [...new Set(plans.value.map(plan => plan.group_platform || '').filter(Boolean))])
const filteredPlans = computed(() => plans.value.filter(plan => !selectedPlatform.value || plan.group_platform === selectedPlatform.value))
const steps = computed(() => [
  { title: 'storefront.stepAccount', body: 'storefront.stepAccountBody' },
  { title: 'storefront.stepPay', body: subscriptionsEnabled.value ? 'storefront.stepPayBody' : 'storefront.stepCreditsBody' },
  { title: 'storefront.stepBuild', body: 'storefront.stepBuildBody' },
])
const faqs = computed(() => [
  ...(subscriptionsEnabled.value ? [
    { question: 'storefront.faqCredits', answer: 'storefront.faqCreditsAnswer' },
    { question: 'storefront.faqRenewal', answer: 'storefront.faqRenewalAnswer' },
  ] : [
    { question: 'storefront.faqCreditUsage', answer: 'storefront.faqCreditUsageAnswer' },
  ]),
  { question: 'storefront.faqPayment', answer: 'storefront.faqPaymentAnswer' },
  { question: 'storefront.faqCurrency', answer: 'storefront.faqCurrencyAnswer' },
])

function checkoutDestination(path: string) {
  return authStore.isAuthenticated ? path : { path: '/login', query: { redirect: path } }
}

function selectPlan(plan: SubscriptionPlan) {
  router.push(checkoutDestination(`/purchase?tab=subscription&plan=${plan.id}`))
}

async function loadPlans() {
  loading.value = true
  loadError.value = false
  try {
    const settings = await appStore.fetchPublicSettings(true)
    if (!settings) throw new Error('Public settings unavailable')
    if (paymentEnabled.value && subscriptionsEnabled.value) {
      const response = await paymentAPI.getPublicPlans()
      plans.value = (response.data || []).map(plan => ({
        ...plan,
        features: typeof plan.features === 'string'
          ? (plan.features as string).split('\n').map(feature => feature.trim()).filter(Boolean)
          : plan.features || [],
      }))
    } else {
      plans.value = []
    }
    selectedPlatform.value = ''
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadPlans)
</script>

<style scoped>
.storefront-hero { display: grid; grid-template-columns: 1.12fr 1fr; align-items: center; min-height: min(650px, calc(100svh - 80px)); padding-block: 48px 64px; }
.hero-copy { position: relative; z-index: 1; }
.hero-copy h1 { font-size: clamp(38px, 4.35vw, 62px); font-weight: 650; letter-spacing: -.06em; line-height: 1.12; }
.hero-copy h1 span { display: block; }
.hero-copy p { max-width: 460px; margin-top: 25px; color: var(--brand-muted); font-size: 18px; line-height: 1.65; }
.hero-copy .brand-button { margin-top: 32px; }
.hero-art { width: 114%; margin-left: -6%; }
.capabilities-section { padding-block: 56px 80px; border-top: 1px solid var(--brand-line); scroll-margin-top: 24px; }
.capabilities-layout { display: grid; grid-template-columns: 1.05fr 1fr; gap: 24px; }
.model-capability, .video-capability { display: flex; flex-direction: column; justify-content: flex-end; min-width: 0; min-height: 280px; padding: 32px; border-radius: 16px; }
.model-capability { background: var(--brand-surface); border: 1px solid var(--brand-line); }
.video-capability { background: var(--brand-accent-soft); }
.capability-copy h3 { font-size: 27px; font-weight: 550; line-height: 1.2; letter-spacing: -.04em; }
.capability-copy > p { margin-top: 16px; max-width: 450px; color: var(--brand-muted); font-size: 16px; line-height: 1.7; }
.capability-link { display: inline-flex; align-items: center; gap: 12px; margin-top: 24px; color: var(--brand-accent); font-size: 14px; font-weight: 600; }
.capability-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.capability-copy .video-note { margin-top: 24px; color: var(--brand-accent); font-size: 14px; }
.integration-section { padding-block: 8px 88px; }
.integration-flow { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 64px; padding-block: 32px; align-items: center; }
.integration-flow li { position: relative; text-align: center; }
.integration-flow li:not(:last-child)::after { content: '-->'; position: absolute; right: -50px; top: 50%; transform: translateY(-50%); color: var(--brand-muted); font: 18px var(--brand-mono); letter-spacing: 3px; }
.integration-flow span { display: block; font: 32px var(--brand-mono); color: var(--brand-accent); }
.integration-flow p { margin-top: 16px; color: var(--brand-muted); font-size: 14px; }
.integration-core { padding: 32px 16px; border: 1px solid var(--brand-line); border-radius: 16px; background: var(--brand-surface); }
.integration-flow .integration-wordmark { color: var(--brand-ink); font-family: var(--brand-font); font-weight: 650; letter-spacing: -.06em; }
.storefront-pricing { padding-block: 48px 88px; border-top: 1px solid var(--brand-line); scroll-margin-top: 32px; }
.section-intro { max-width: 640px; margin-bottom: 32px; }
.section-intro h2, .storefront-faq h2 { font-size: clamp(28px, 3vw, 38px); font-weight: 600; letter-spacing: -.045em; line-height: 1.2; }
.section-intro > p { margin-top: 14px; color: var(--brand-muted); font-size: 16px; line-height: 1.7; }
.account-shortcuts { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 24px; font-size: 14px; color: var(--brand-accent); }
.credits-panel { display: flex; align-items: center; justify-content: space-between; gap: 40px; padding: 36px 40px; border: 1px solid var(--brand-line); border-radius: 16px; background: var(--brand-surface); }
.credits-copy { max-width: 570px; }
.credits-label { margin-bottom: 12px; font-family: var(--brand-mono); color: var(--brand-accent); font-size: 12px; letter-spacing: .04em; }
.credits-copy h3 { font-size: 28px; font-weight: 550; letter-spacing: -.035em; }
.credits-copy > p:last-child { margin-top: 10px; color: var(--brand-muted); font-size: 15px; line-height: 1.7; }
.purchase-unavailable { max-width: 240px; padding-left: 24px; border-left: 1px solid var(--brand-line); color: var(--brand-muted); font-size: 14px; line-height: 1.7; }
.subscription-section { margin-top: 44px; }
.plans-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.plans-heading h3 { font-size: 25px; font-weight: 550; letter-spacing: -.035em; }
.platform-filter select { padding: 10px 36px 10px 14px; border: 1px solid var(--brand-line); border-radius: 10px; background: var(--brand-surface); color: var(--brand-ink); font-size: 14px; }
.storefront-plans { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.purchase-note { margin-top: 24px; color: var(--brand-muted); font-size: 13px; }
.pricing-message { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 20px; min-height: 200px; padding: 32px; border: 1px solid var(--brand-line); border-radius: 16px; color: var(--brand-muted); }
.pricing-skeleton { min-height: 200px; padding: 36px 40px; border: 1px solid var(--brand-line); border-radius: 16px; }
.skeleton-line { width: 70%; height: 14px; margin-bottom: 16px; border-radius: 6px; background: var(--brand-inset); }
.skeleton-title { width: 35%; height: 28px; }
.skeleton-button { width: 140px; height: 40px; margin-top: 24px; }
.getting-started { padding-block: 8px 88px; }
.setup-sequence { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; }
.setup-sequence li { padding-left: 22px; border-left: 2px solid var(--brand-line); }
.setup-sequence li:first-child { border-color: var(--brand-accent); }
.setup-sequence h3 { font-size: 18px; font-weight: 600; letter-spacing: -.02em; }
.setup-sequence p { max-width: 410px; margin-top: 8px; color: var(--brand-muted); font-size: 15px; line-height: 1.7; }
.storefront-faq { padding-block: 56px 88px; border-top: 1px solid var(--brand-line); }
.faq-list { margin-top: 32px; max-width: 860px; }
.faq-list :deep([data-platform-collapsible]) { border-bottom: 1px solid var(--brand-line); }
.faq-list :deep([data-platform-collapse-trigger]) { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 24px; padding-block: 22px; text-align: left; font-size: 16px; font-weight: 550; cursor: pointer; list-style: none; }

.faq-plus { flex-shrink: 0; color: var(--brand-muted); transition: transform 180ms ease; }
.faq-list :deep([data-panel-open]) .faq-plus { transform: rotate(45deg); }
.faq-list :deep([data-platform-collapsible] p) { max-width: 700px; padding-bottom: 24px; color: var(--brand-muted); font-size: 15px; line-height: 1.8; }
@media (prefers-reduced-motion: no-preference) {
  .hero-copy { animation: hero-enter 550ms ease-out both; }
  .hero-art { animation: hero-enter 700ms 100ms ease-out both; }
  .skeleton-line { animation: skeleton-pulse 1.6s ease-in-out infinite alternate; }
}
@keyframes hero-enter { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes skeleton-pulse { from { opacity: .5; } to { opacity: 1; } }
@media (max-width: 1023px) and (min-width: 768px) {
  .hero-copy h1 { font-size: 38px; }
  .hero-copy p { font-size: 16px; }
  .storefront-hero { min-height: 480px; }
  .model-capability, .video-capability { padding: 24px; }
  .capability-copy h3 { font-size: 24px; }
  .capability-copy > p { font-size: 15px; }
}
@media (max-width: 767px) {
  .storefront-hero { grid-template-columns: minmax(0, 1fr); min-height: auto; padding-block: 44px 28px; }
  .hero-copy h1 { font-size: clamp(32px, 7.8vw, 52px); letter-spacing: -.055em; }
  .hero-copy p { margin-top: 20px; font-size: 16px; max-width: 400px; }
  .hero-copy .brand-button { margin-top: 26px; }
  .hero-art { width: 100%; margin: 8px auto -12px; }
  /* Zoom into the central 100 columns so the glyphs stay legible on phones. */
  .hero-art :deep(.ascii-artwork) { overflow: hidden; }
  .hero-art :deep(pre) { font-size: 1.633cqw; margin-left: -20ch; }
  .capabilities-section { padding-block: 36px 56px; }
  .capabilities-layout { grid-template-columns: minmax(0, 1fr); }
  .model-capability, .video-capability { min-height: 0; padding: 24px; }
  .capability-copy h3 { font-size: 25px; }
  .integration-section { padding-bottom: 56px; }
  .integration-flow { grid-template-columns: 1fr; gap: 52px; padding-block: 8px 0; }
  .integration-flow li:not(:last-child)::after { content: 'v'; right: 50%; top: auto; bottom: -38px; transform: none; font-size: 16px; letter-spacing: 0; }
  .storefront-pricing { padding-block: 36px 56px; }
  .credits-panel { flex-direction: column; align-items: flex-start; padding: 26px; gap: 24px; }
  .purchase-unavailable { padding-left: 0; border-left: 0; max-width: none; }
  .storefront-plans { grid-template-columns: minmax(0, 1fr); }
  .getting-started { padding-bottom: 56px; }
  .setup-sequence { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .storefront-faq { padding-block: 36px 56px; }
}
</style>
