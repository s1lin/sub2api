import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@/__tests__/render'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { KumoButton, KumoInput, KumoCheckbox, KumoLabel, KumoSwitch, KumoRadio, KumoRadioGroup, KumoNativeSelect, KumoSelect } from '../index'

// jsdom does not implement PointerEvent, which Base UI uses for checkbox activation.
if (!window.PointerEvent) window.PointerEvent = MouseEvent as typeof PointerEvent
enableAutoUnmount(afterEach)

async function settle() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 20))
  await nextTick()
}

describe('Kumo Vue integration', () => {
  it('updates disabled controls inside repeated labels when a parent enables them', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoCheckbox, KumoLabel, KumoButton },
      setup: () => ({ enabled: ref(false), choices: ref(['a', 'b']) }),
      template: '<KumoButton @click="enabled = true">Enable</KumoButton><KumoLabel v-for="choice in choices" :key="choice"><KumoCheckbox :disabled="!enabled" :aria-label="choice" />{{ choice }}</KumoLabel>',
    }))
    expect(wrapper.get('[role="checkbox"]').attributes('aria-disabled')).toBe('true')
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('[role="checkbox"]').every(node => node.attributes('aria-disabled') !== 'true')).toBe(true))
    wrapper.unmount()
  })
  it('changes a labeled checkbox exactly once per user activation', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoCheckbox, KumoLabel },
      setup: () => ({ checked: ref(false), changes: ref(0) }),
      template: '<KumoLabel><KumoCheckbox :checked="checked" @change="checked = !checked; changes++" />Capability</KumoLabel>',
    }), { attachTo: document.body })
    await wrapper.get('[role="checkbox"]').setValue(true)
    expect(wrapper.vm.changes).toBe(1)
    expect(wrapper.vm.checked).toBe(true)
    await wrapper.get('label').trigger('click')
    expect(wrapper.vm.changes).toBe(2)
    expect(wrapper.vm.checked).toBe(false)
    wrapper.unmount()
  })
  it('activates switches while preserving click.stop on the surrounding row', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoSwitch },
      setup: () => ({ enabled: ref(false), clicks: ref(0) }),
      template: '<div @click="clicks++"><KumoSwitch v-model="enabled" aria-label="Enabled" @click.stop /></div>',
    }))
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.vm.enabled).toBe(true)
    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.vm.clicks).toBe(0)
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.vm.enabled).toBe(false)
    wrapper.unmount()
  })
  it('preserves required fields and commits lazy numeric models before change handlers', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoInput }, setup: () => ({ value: ref<number | string>(''), observed: ref<number | string>('') }),
      template: '<form><KumoInput v-model.lazy.number="value" required aria-label="Quantity" @change="observed = value" /></form>',
    }))
    await settle()
    expect((wrapper.get('input').element as HTMLInputElement).required).toBe(true)
    const input = wrapper.get<HTMLInputElement>('input')
    input.element.value = '12'
    await input.trigger('input')
    expect(wrapper.vm.value).toBe('')
    await input.trigger('change')
    expect(wrapper.vm.value).toBe(12)
    expect(wrapper.vm.observed).toBe(12)
  })

  it('keeps click.once handlers consumed across component rerenders', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoButton }, setup: () => ({ calls: ref(0), caption: ref('One') }),
      template: '<KumoButton @click.once="calls++">{{ caption }}</KumoButton>',
    }))
    await settle()
    await wrapper.get('button').trigger('click')
    wrapper.vm.caption = 'Two'
    await settle()
    await wrapper.get('button').trigger('click')
    expect(wrapper.vm.calls).toBe(1)
  })
  it('renders a real Kumo button with a reactive Vue slot and native click', async () => {
    const wrapper = mount(defineComponent({ components: { KumoButton }, setup: () => ({ count: ref(0) }), template: '<KumoButton @click="count++">Count {{ count }}</KumoButton>' }))
    await settle()
    const button = wrapper.get('button')
    expect(button.attributes('data-kumo-component')).toBe('Button')
    await button.trigger('click')
    await settle()
    expect(button.text()).toContain('Count 1')
    wrapper.unmount()
  })

  it('keeps typing and programmatic model updates in sync and exposes a DOM focus ref', async () => {
    const wrapper = mount(defineComponent({ components: { KumoInput }, setup: () => ({ value: ref(''), input: ref<HTMLInputElement | null>(null) }), template: '<KumoInput ref="input" v-model="value" aria-label="Name" /><span>{{ value }}</span>' }), { attachTo: document.body })
    await settle()
    await wrapper.get('input').setValue('Tokensbeat')
    await settle()
    expect(wrapper.vm.value).toBe('Tokensbeat')
    wrapper.vm.value = 'Updated'
    await settle()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Updated')
    wrapper.vm.input?.focus()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    wrapper.unmount()
  })

  it('updates array checkbox models without losing other selections', async () => {
    const wrapper = mount(defineComponent({ components: { KumoCheckbox }, setup: () => ({ chosen: ref(['existing']) }), template: '<KumoCheckbox v-model="chosen" value="new" aria-label="New" />' }))
    await settle()
    await wrapper.get('[role="checkbox"]').trigger('click')
    await settle()
    expect(wrapper.vm.chosen).toEqual(['existing', 'new'])
    wrapper.unmount()
  })

  it('supports controlled row checkboxes with click.stop and native change handlers', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoCheckbox },
      setup: () => ({ checked: ref(false), rows: ref(0), changes: ref(0) }),
      template: '<div @click="rows++"><KumoCheckbox aria-label="Select row" :checked="checked" @click.stop @change="checked = $event.target.checked; changes++" /></div>',
    }))
    await settle()
    await wrapper.get('[role="checkbox"]').trigger('click')
    await settle()
    expect(wrapper.vm.checked).toBe(true)
    expect(wrapper.vm.changes).toBe(1)
    expect(wrapper.vm.rows).toBe(0)
    wrapper.unmount()
  })

  it('shares Kumo radio context across Vue labels and commits the group before change handlers', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoRadio, KumoRadioGroup },
      setup: () => ({ choice: ref('first'), observed: ref(''), clicks: ref(0) }),
      template: '<div @click="clicks++"><KumoRadioGroup v-model="choice" aria-label="Method"><KumoRadio value="first">First</KumoRadio><KumoRadio value="second" @click.stop @change="observed = choice">Second</KumoRadio></KumoRadioGroup></div>',
    }), { attachTo: document.body })
    await settle()
    expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(1)
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Method')
    expect(wrapper.find('label label').exists()).toBe(false)
    await wrapper.findAll('[role="radio"]')[1].trigger('click')
    await settle()
    expect(wrapper.vm.choice).toBe('second')
    expect(wrapper.vm.observed).toBe('second')
    expect(wrapper.vm.clicks).toBe(0)
    expect(wrapper.findAll('[role="radio"]')[0].attributes('aria-checked')).toBe('false')
    wrapper.unmount()
  })

  it('preserves numeric native-select values and native change targets', async () => {
    const wrapper = mount(defineComponent({
      components: { KumoNativeSelect },
      setup: () => ({ choice: ref(20), observed: ref('') }),
      template: '<KumoNativeSelect v-model.number="choice" aria-label="Page size" @change="observed = $event.target.value"><option :value="20">Twenty</option><option :value="50">Fifty</option></KumoNativeSelect>',
    }), { attachTo: document.body })
    await settle()
    const trigger = wrapper.get('button')
    expect(trigger.text()).toContain('Twenty')
    await trigger.trigger('mousedown', { button: 0 })
    await trigger.trigger('click')
    await settle()
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes('Fifty'))
    expect(option).toBeDefined()
    option!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
    option!.click()
    await settle()
    expect(wrapper.vm.choice).toBe(50)
    expect(wrapper.vm.observed).toBe('50')
    wrapper.unmount()
  })

  it('filters a searchable selector and returns the selected option', async () => {
    const options = [{ value: 1, label: 'Alpha' }, { value: 2, label: 'Beta', description: 'image model' }]
    const onUpdate = vi.fn()
    const onChange = vi.fn()
    const wrapper = mount(KumoSelect, { attachTo: document.body, props: {
      modelValue: null, options, searchable: true, placeholder: 'Choose model', searchPlaceholder: 'Search models',
      'onUpdate:modelValue': onUpdate, onChange,
    } })
    await settle()
    await wrapper.get('button').trigger('click')
    await settle()
    const input = document.querySelector<HTMLInputElement>('input[placeholder="Search models"]')!
    expect(input).not.toBeNull()
    // React's input value tracker expects a real browser change, not direct assignment.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'image')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    const choices = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(choices.map(node => node.textContent)).toEqual(['Beta'])
    choices[0].click()
    await settle()
    expect(onUpdate).toHaveBeenCalledWith(2)
    expect(onChange).toHaveBeenCalledWith(2, options[1])
    wrapper.unmount()
  })
})
