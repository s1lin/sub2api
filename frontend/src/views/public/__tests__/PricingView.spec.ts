import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@/__tests__/render'
import { RouterLinkStub } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PricingView from '../PricingView.vue'
import SubscriptionPlanCard from '@/components/payment/SubscriptionPlanCard.vue'
import en from '@/i18n/locales/en/storefront'
import zh from '@/i18n/locales/zh/storefront'

const state = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  authenticated: false,
  fetchSettings: vi.fn(),
  getPlans: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    get cachedPublicSettings() { return state.settings },
    siteName: 'tokensbeat', docUrl: '', fetchPublicSettings: state.fetchSettings,
  }),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ get isAuthenticated() { return state.authenticated } }),
}))
vi.mock('@/api/payment', () => ({ paymentAPI: { getPublicPlans: state.getPlans } }))
vi.mock('vue-router', async (original) => ({
  ...await original<typeof import('vue-router')>(),
  useRouter: () => ({ push: state.push }),
}))

const plans = [
  { id: 4, name: 'Builder', group_platform: 'openai', features: 'API access\nUsage tracking' },
  { id: 7, name: 'Studio', group_platform: 'anthropic', features: ['API access'] },
]

function render(locale = 'en') {
  return mountWithControls(PricingView, {
    global: {
      plugins: [createI18n({ legacy: false, locale, messages: { en, zh }, messageCompiler: message => () => String(message) })],
      stubs: {
        RouterLink: RouterLinkStub,
        KumoLabel: { template: '<label><slot /></label>' },
        KumoNativeSelect: {
          props: ['modelValue'], emits: ['update:modelValue'],
          template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
        },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  state.settings = { payment_enabled: true, subscription_enabled: true, payment_balance_disabled: false }
  state.authenticated = false
  state.fetchSettings.mockResolvedValue(state.settings)
  state.getPlans.mockResolvedValue({ data: plans })
})

describe('Public storefront purchase journeys', () => {
  it('keeps purchases unavailable and skips plan requests when payments are disabled', async () => {
    state.settings.payment_enabled = false
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain(en.storefront.paymentDisabled)
    expect(state.getPlans).not.toHaveBeenCalled()
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0)
    expect(wrapper.findAllComponents(SubscriptionPlanCard)).toHaveLength(0)
  })

  it('renders credits without subscription content when subscriptions are disabled', async () => {
    state.settings.subscription_enabled = false
    const wrapper = render()
    await flushPromises()
    expect(state.getPlans).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(en.storefront.faqCreditUsage)
    expect(wrapper.text()).not.toContain(en.storefront.faqRenewal)
    expect(wrapper.get('.hero-copy a').attributes('href')).toBe('#capabilities')
  })

  it('keeps the recharge destination through login', async () => {
    const wrapper = render()
    await flushPromises()
    const link = wrapper.findAllComponents(RouterLinkStub).find(item => item.text().includes(en.storefront.creditsAction))
    expect(link?.props('to')).toEqual({ path: '/login', query: { redirect: '/purchase?tab=recharge' } })
  })

  it.each([false, true])('preserves the selected plan with authenticated=%s', async (authenticated) => {
    state.authenticated = authenticated
    const wrapper = render()
    await flushPromises()
    wrapper.findAllComponents(SubscriptionPlanCard)[0]!.vm.$emit('select', plans[0])
    expect(state.push).toHaveBeenCalledWith(authenticated
      ? '/purchase?tab=subscription&plan=4'
      : { path: '/login', query: { redirect: '/purchase?tab=subscription&plan=4' } })
  })

  it('filters plans by platform and accepts legacy newline-delimited features', async () => {
    const wrapper = render()
    await flushPromises()
    expect(wrapper.findAllComponents(SubscriptionPlanCard)[0]!.props('plan').features).toEqual(['API access', 'Usage tracking'])
    await wrapper.get('select').setValue('anthropic')
    expect(wrapper.findAllComponents(SubscriptionPlanCard)).toHaveLength(1)
    expect(wrapper.findComponent(SubscriptionPlanCard).props('plan').id).toBe(7)
  })

  it('recovers a failed pricing request through the visible retry action', async () => {
    state.getPlans.mockRejectedValueOnce(new Error('Unavailable'))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain(en.storefront.loadError)
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAllComponents(SubscriptionPlanCard)).toHaveLength(2)
  })

  it('shows the empty state when no plans have been published', async () => {
    state.getPlans.mockResolvedValue({ data: [] })
    const wrapper = render()
    await flushPromises()
    expect(wrapper.text()).toContain(en.storefront.noPlans)
    expect(wrapper.findAllComponents(SubscriptionPlanCard)).toHaveLength(0)
  })

  it('keeps the broader platform identity and removes recharge when balance top-ups are disabled', async () => {
    state.settings.payment_balance_disabled = true
    const wrapper = render('zh')
    await flushPromises()
    expect(wrapper.get('h1').text()).toContain(zh.storefront.headlineCreative)
    expect(wrapper.text()).toContain(zh.storefront.videoTitle)
    expect(wrapper.find('.credits-panel').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('storefront.')
  })
})

// Isolate page dependencies while exercising the shared Kumo controls.
function mountWithControls(component: Parameters<typeof mount>[0], options: any = {}) {
  return mount(component, { ...options, global: { ...options.global, stubs: {
    PublicHeader: true, Icon: true, AsciiOrbit: true, SubscriptionPlanCard: true,
    KumoSurface: { template: '<div><slot /></div>' },
    ...options.global?.stubs,
  } } })
}
