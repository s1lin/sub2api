import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { mount, settleControls } from '@/__tests__/render'
import Input from '../Input.vue'
import TextArea from '../TextArea.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

describe('field labels', () => {
  for (const Component of [Input, TextArea]) {
    it(`associates ${Component.__name} labels with unique native controls and updates their names`, async () => {
      const warn = vi.spyOn(console, 'warn')
      const wrapper = mount(defineComponent({
        components: { Field: Component },
        setup: () => ({ label: ref('Workspace name') }),
        template: '<Field :label="label" model-value="" /><Field label="Project name" model-value="" />',
      }), { attachTo: document.body })
      await settleControls()
      const fields = wrapper.findAll('input, textarea')
      const field = fields[0]!
      const label = wrapper.get('label')
      expect(field.attributes('id')).toBeTruthy()
      expect(label.attributes('for')).toBe(field.attributes('id'))
      expect(fields[1]!.attributes('id')).not.toBe(field.attributes('id'))
      expect(Array.from((field.element as HTMLInputElement).labels || [])).toContain(label.element)
      expect(field.attributes('aria-label')).toBe('Workspace name')
      wrapper.vm.label = '工作区名称'
      await settleControls()
      expect(field.attributes('aria-label')).toBe('工作区名称')
      expect(warn.mock.calls.flat().some(message => String(message).includes('must have an accessible name'))).toBe(false)
      warn.mockRestore()
    })

    it(`forwards an external label association to ${Component.__name}`, async () => {
      const wrapper = mount(Component, { props: { modelValue: '' }, attrs: { 'aria-labelledby': 'external-label' } })
      await settleControls()
      expect(wrapper.get('input, textarea').attributes('aria-labelledby')).toBe('external-label')
    })
  }
})
