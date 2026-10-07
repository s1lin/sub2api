import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, settleControls } from '@/__tests__/render'
import { enableAutoUnmount } from '@vue/test-utils'
import BaseDialog from '../BaseDialog.vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

enableAutoUnmount(afterEach)

async function dialog(show = true) {
  const wrapper = mount(BaseDialog, { props: { show, title: 'Details' }, global: { stubs: { Icon: true } } })
  await settleControls()
  return wrapper
}

const locked = () => [document.body, document.documentElement].some(node => node.style.overflow === 'hidden' || node.style.overflowY === 'hidden')

describe('dialog body scroll lock', () => {
  it('keeps the body locked when a hidden sibling mounts or unmounts', async () => {
    await dialog()
    const hidden = await dialog(false)
    expect(locked()).toBe(true)
    hidden.unmount()
    await settleControls()
    expect(locked()).toBe(true)
  })

  it('keeps the lock until the last visible dialog closes', async () => {
    const first = await dialog()
    const second = await dialog()
    await second.setProps({ show: false })
    expect(locked()).toBe(true)
    await first.setProps({ show: false })
    expect(locked()).toBe(false)
  })

  it('keeps the lock until the last visible dialog unmounts', async () => {
    const first = await dialog()
    const second = await dialog()
    second.unmount()
    await settleControls()
    expect(locked()).toBe(true)
    first.unmount()
    await settleControls()
    expect(locked()).toBe(false)
  })

  it('releases the lock after repeated open and close cycles', async () => {
    const wrapper = await dialog(false)
    expect(locked()).toBe(false)
    await wrapper.setProps({ show: true })
    expect(locked()).toBe(true)
    await wrapper.setProps({ show: false })
    expect(locked()).toBe(false)
    await wrapper.setProps({ show: true })
    wrapper.unmount()
    await settleControls()
    expect(locked()).toBe(false)
  })
})
