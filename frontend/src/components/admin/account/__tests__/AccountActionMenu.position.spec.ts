import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, portal, pressKey, clickOutside } from '@/__tests__/render'
import { enableAutoUnmount } from '@vue/test-utils'
import AccountActionMenu from '../AccountActionMenu.vue'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)

const account = { id: 1, platform: 'openai', type: 'oauth', status: 'error' } as Account
async function mountMenu() {
  const wrapper = mount(AccountActionMenu, {
    props: { show: true, account, anchorRect: new DOMRect(950, 720, 32, 24) },
    attachTo: document.body,
    global: { stubs: { Icon: true } },
  })
  await flushPromises()
  return wrapper
}

// Real viewport placement, collision handling and narrow-screen scrolling are
// exercised in the browser harness; jsdom does not calculate menu geometry.
describe('AccountActionMenu interaction', () => {
  it.each([
    ['test', 'admin.accounts.testConnection'],
    ['stats', 'admin.accounts.viewStats'],
    ['schedule', 'admin.scheduledTests.schedule'],
    ['reauth', 'admin.accounts.reAuthorize'],
    ['refresh-token', 'admin.accounts.refreshToken'],
    ['create-spark-shadow', 'admin.accounts.createSparkShadow'],
    ['set-privacy', 'admin.accounts.setPrivacy'],
    ['recover-state', 'admin.accounts.recoverState'],
  ])('dispatches %s with the account and closes once', async (event, label) => {
    const wrapper = await mountMenu()
    const item = portal().findAll('[role="menuitem"]').find(item => item.text() === label)!
    await item.trigger('click')
    expect(wrapper.emitted(event)).toEqual([[account]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('dismisses with Escape and can reopen for a different account', async () => {
    const wrapper = await mountMenu()
    ;(portal().get('[role="menu"]').element as HTMLElement).focus()
    await pressKey('Escape')
    expect(wrapper.emitted('close')).toHaveLength(1)
    await wrapper.setProps({ show: false })
    await wrapper.setProps({ show: true, account: { ...account, parent_account_id: 42 }, anchorRect: new DOMRect(5, 10, 24, 24) })
    expect(portal().find('[role="menu"]').exists()).toBe(true)
    expect(portal().get('[role="menu"]').text()).not.toContain('admin.accounts.reAuthorize')
    expect(portal().get('[role="menu"]').text()).not.toContain('admin.accounts.createSparkShadow')
  })

  it('dismisses when the user presses outside the menu', async () => {
    const wrapper = await mountMenu()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    await flushPromises()
    await wrapper.setProps({ show: false })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
