import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, portal, clickOutside } from '@/__tests__/render'
import { enableAutoUnmount } from '@vue/test-utils'
import HelpTooltip from '../HelpTooltip.vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
const tooltip = () => document.querySelector('[role="tooltip"]')
async function hover() {
  const wrapper = mount(HelpTooltip, { attachTo: document.body, props: { content: 'Copyable details' } })
  const trigger = wrapper.get('button')
  await trigger.trigger('pointerover', { pointerType: 'mouse' })
  await trigger.trigger('pointermove', { pointerType: 'mouse' })
  await trigger.trigger('mouseenter')
  await trigger.trigger('mouseover')
  await trigger.trigger('mousemove')
  await vi.waitFor(() => expect(tooltip()?.textContent).toContain('Copyable details'))
  return { wrapper, trigger }
}
describe('HelpTooltip', () => {
  it('opens on hover and closes when the pointer leaves', async () => {
    const { trigger } = await hover()
    await trigger.trigger('mouseleave', { relatedTarget: document.body })
    await trigger.trigger('mouseout', { relatedTarget: document.body })
    await portal().trigger('mousemove', { clientX: 1000, clientY: 1000 })
    await vi.waitFor(() => expect(tooltip()).toBeNull())
  })
  it('keeps details accessible while the pointer moves into the popup', async () => {
    const { trigger } = await hover()
    await trigger.trigger('mouseleave', { relatedTarget: tooltip() })
    await trigger.trigger('mouseout', { relatedTarget: tooltip() })
    await portal().get('[role="tooltip"]').trigger('mouseenter', { relatedTarget: trigger.element })
    await portal().get('[role="tooltip"]').trigger('mouseover', { relatedTarget: trigger.element })
    expect(tooltip()?.textContent).toContain('Copyable details')
    await portal().get('[role="tooltip"]').trigger('mouseleave', { relatedTarget: document.body })
    await portal().get('[role="tooltip"]').trigger('mouseout', { relatedTarget: document.body })
    await portal().trigger('mousemove', { clientX: 1000, clientY: 1000 })
    await vi.waitFor(() => expect(tooltip()).toBeNull())
  })
  it('supports a persistent click popover, explicit close and outside dismissal', async () => {
    const wrapper = mount(HelpTooltip, { attachTo: document.body, props: { content: 'Click details', trigger: 'click' } })
    await wrapper.get('button').trigger('click')
    expect(portal().get('[role="dialog"]').text()).toContain('Click details')
    await portal().get('[aria-label="common.close"]').trigger('click')
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
    await wrapper.get('button').trigger('click')
    await clickOutside()
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
  })
})
