import { mount as vueMount, flushPromises as flushVuePromises, config, DOMWrapper } from '@vue/test-utils'
import { flushSync } from 'react-dom'
import { nextTick } from 'vue'
import { setTimeout as waitForRender } from 'node:timers/promises'
import { vi } from 'vitest'

config.plugins.DOMWrapper.install(wrapper => {
  const trigger = wrapper.trigger.bind(wrapper)
  const setValue = wrapper.setValue.bind(wrapper)
  return { async setValue(value: unknown) {
    await nextTick()
    await flushVuePromises()
    const element = wrapper.element as HTMLElement
    // Base UI checkboxes expose a visible ARIA control and a hidden form input.
    // Drive the visible control, just as a user would, for either query shape.
    const control = element.matches('[role="checkbox"], [role="switch"]') ? element
      : element.matches('input[type="checkbox"][tabindex="-1"]') ? element.parentElement?.querySelector<HTMLElement>('[role="checkbox"], [role="switch"]') : null
    if (control) {
      if ((control.getAttribute('aria-checked') === 'true') !== Boolean(value)) control.click()
      await settleControls()
      return
    }
    if (element.matches('[role="radio"]')) {
      if (value !== false) element.click()
      await settleControls()
      return
    }
    if (element.matches('input[type="radio"][tabindex="-1"]')) {
      const radio = element.parentElement?.querySelector<HTMLElement>('[role="radio"]')
      if (radio && value !== false) radio.click()
      await settleControls()
      return
    }
    if (element instanceof HTMLInputElement && !['checkbox', 'radio', 'file'].includes(element.type) || element instanceof HTMLTextAreaElement) {
      // VTU calls trigger after assigning value. Our asynchronous trigger drain
      // can let React restore a controlled value before that input event fires.
      // Set and dispatch together, as the browser does for a user edit.
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, String(value ?? ''))
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: value ? 'insertText' : 'deleteContentBackward', data: String(value ?? '') }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      await settleControls()
      return
    }
    await setValue(value)
    await settleControls()
  }, async trigger(...args: Parameters<typeof trigger>) {
    await nextTick()
    await flushVuePromises()
    let pending: ReturnType<typeof trigger>
    flushSync(() => { pending = trigger(...args) })
    await pending!
    await settleControls()
  } }
})
config.plugins.VueWrapper.install(wrapper => {
  const setProps = wrapper.setProps.bind(wrapper)
  return { async setProps(...args: Parameters<typeof setProps>) {
    await settleControls()
    await setProps(...args)
    await settleControls()
  } }
})

/** Flush both renderers when exercising Vue screens containing real Kumo controls. */
export const mount: typeof vueMount = ((...args: Parameters<typeof vueMount>) => {
  let wrapper: ReturnType<typeof vueMount>
  flushSync(() => { wrapper = vueMount(...args) })
  return wrapper!
}) as typeof vueMount

export async function settleControls() {
  // Slots can cross Vue -> React -> Vue. Drain each renderer after the other
  // has committed so assertions observe the complete component tree.
  for (let pass = 0; pass < 4; pass++) {
    await nextTick()
    await flushVuePromises()
    if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0)
    flushSync(() => {})
    await waitForRender(10)
  }
  // Popup focus settles on the next animation frame. A real timer lets tests
  // control business debounce/clock timers independently of the renderers.
  await nextTick()
}

export const flushPromises = settleControls

export const portal = () => new DOMWrapper(document.body)
export async function showTooltip(trigger: DOMWrapper<Element>) {
  const element = trigger.element as HTMLElement
  element.blur()
  element.focus()
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(200)
  else await waitForRender(200)
  await settleControls()
  return portal().get('[role="tooltip"]')
}
export async function selectOption(trigger: DOMWrapper<Element>, label: string) {
  await settleControls()
  await trigger.trigger('click')
  const option = await vi.waitFor(() => {
    const found = portal().findAll('[role="option"]').find(item => item.text() === label)
    if (!found) throw new Error(`Option not found: ${label}`)
    return found
  })
  const element = option.element as HTMLElement
  element.focus()
  await pressKey('Enter')
}
export async function typeText(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: value ? 'insertText' : 'deleteContentBackward', data: value }))
  await settleControls()
}
export async function pressKey(key: string) {
  const target = document.activeElement!
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
  await settleControls()
}
export async function clickOutside() {
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
  document.body.click()
  await settleControls()
}
