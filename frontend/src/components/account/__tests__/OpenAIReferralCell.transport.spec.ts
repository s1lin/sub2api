import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, portal } from '@/__tests__/render'

import { AxiosError } from 'axios'
import apiClient from '@/api/client'
import OpenAIReferralCell from '../OpenAIReferralCell.vue'
import type { Account } from '@/types'

vi.mock('@/i18n', () => ({ getLocale: () => 'en' }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

// Exercise the actual accounts API and shared Axios interceptor together.
const originalAdapter = apiClient.defaults.adapter
const mountCell = () => mount(OpenAIReferralCell, {
  props: { account: { id: 1, name: 'Test account', platform: 'openai', type: 'oauth' } as Account },
  attachTo: document.body,
})
let wrapper: ReturnType<typeof mountCell> | undefined
afterEach(() => {
  wrapper?.unmount()
  apiClient.defaults.adapter = originalAdapter
})

describe('invitation transport failures', () => {
  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_CANCELED', undefined])(
    'warns of an uncertain send after %s without retrying', async (code) => {
      const adapter = vi.fn(async (config) => {
        if (config.url.endsWith('/invite')) throw new AxiosError('Connection lost', code, config)
        return {
          status: 200, statusText: 'OK', headers: {}, config,
          data: { code: 0, data: { cache_persisted: true, eligibility: {
            should_show: true, available_invites: 2, requires_explicit_confirmation: true,
            program_id: 'codex_referral_consumer', fetched_at: 1770000000,
          } } },
        }
      })
      apiClient.defaults.adapter = adapter
      wrapper = mountCell()
      await wrapper.get('[data-testid="referral-open"]').trigger('click')
      await flushPromises()
      await portal().get('[data-testid="referral-email"]').setValue('friend@example.com')
      await portal().get('[data-testid="referral-consent"]').setValue(true)
      await portal().get('form').trigger('submit')
      await flushPromises()
      expect(portal().get('[role="alert"]').text()).toBe('admin.accounts.openaiReferral.sendUnknown')
      expect(portal().text()).not.toContain('Network error.')
      expect(portal().text()).not.toContain('admin.accounts.openaiReferral.sent')
      expect(portal().get('[data-testid="referral-send"]').attributes('disabled')).toBeDefined()
      await portal().get('form').trigger('submit')
      await flushPromises()
      expect(adapter.mock.calls.filter(([config]) => config.url.endsWith('/invite'))).toHaveLength(1)
    }
  )

  it('keeps a query timeout separate from an uncertain send', async () => {
    apiClient.defaults.adapter = vi.fn(async (config) => {
      throw new AxiosError('Timed out', 'ECONNABORTED', config)
    })
    wrapper = mountCell()
    await wrapper.get('[data-testid="referral-open"]').trigger('click')
    await flushPromises()
    expect(portal().get('[role="alert"]').text()).toBe('Network error. Please check your connection.')
    expect(portal().text()).not.toContain('admin.accounts.openaiReferral.sendUnknown')
    expect(portal().get('[data-testid="referral-send"]').attributes('disabled')).toBeDefined()
  })
})
