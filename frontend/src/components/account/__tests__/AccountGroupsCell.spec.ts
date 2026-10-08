import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { mount, settleControls } from '@/__tests__/render'
import AccountGroupsCell from '../AccountGroupsCell.vue'
import type { Group } from '@/types'

vi.mock('vue-i18n', async importOriginal => ({
  ...await importOriginal<typeof import('vue-i18n')>(),
  useI18n: () => ({ t: (key: string) => key }),
}))
enableAutoUnmount(afterEach)

describe('AccountGroupsCell', () => {
  it('renders group badges without markup text and opens the complete group list', async () => {
    const groups = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1, name: `Workspace ${index + 1}`, platform: 'gemini',
      subscription_type: 'standard', rate_multiplier: 1,
    })) as Group[]
    const wrapper = mount(AccountGroupsCell, { attachTo: document.body, props: { groups }, global: { plugins: [createPinia()] } })
    await settleControls()
    expect(wrapper.text()).toBe('Workspace 1Workspace 2Workspace 3+2')
    await wrapper.get('button').trigger('click')
    await settleControls()
    const popup = document.querySelector('[role="dialog"]')!
    expect(popup).not.toBeNull()
    for (const group of groups) expect(popup.textContent).toContain(group.name)
    const close = popup.querySelector('button[aria-label="common.close"]') as HTMLButtonElement
    close.click()
    await settleControls()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
