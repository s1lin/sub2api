import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { mount, portal, flushPromises, pressKey } from '@/__tests__/render'
import { KumoSearchSelect } from '../index'

enableAutoUnmount(afterEach)

function field(clearOnSelect = false) {
  const search = vi.fn()
  const wrapper = mount(defineComponent({
    components: { KumoSearchSelect },
    setup: () => ({ query: ref(''), selected: ref(0), open: ref(false), search, clearOnSelect }),
    template: `<KumoSearchSelect v-model="query" v-model:open="open" placeholder="Search users" :options="[{ id: 1, label: 'Same name' }, { id: 2, label: 'Same name' }]" @search="search" @select="option => { selected = option.id; query = clearOnSelect ? '' : option.label; open = false }" />`,
  }), { attachTo: document.body })
  return { wrapper, search }
}

describe('Kumo remote search field', () => {
  it('selects by identity and preserves the chosen label after the popup closes', async () => {
    const { wrapper, search } = field()
    const input = wrapper.get('input')
    ;(input.element as HTMLInputElement).focus()
    await input.setValue('same')
    await portal().findAll('[role="option"]')[1].trigger('click')
    await flushPromises()
    expect(wrapper.vm.selected).toBe(2)
    expect(wrapper.vm.query).toBe('Same name')
    expect((input.element as HTMLInputElement).value).toBe('Same name')
    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('same')
  })

  it('allows the owner to clear the field after adding a result', async () => {
    const { wrapper } = field(true)
    const input = wrapper.get('input')
    ;(input.element as HTMLInputElement).focus()
    await input.setValue('same')
    await pressKey('Enter')
    expect(wrapper.vm.selected).toBe(1)
    expect(wrapper.vm.query).toBe('')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('keeps an uncommitted query when the user dismisses suggestions', async () => {
    const { wrapper } = field()
    const input = wrapper.get('input')
    ;(input.element as HTMLInputElement).focus()
    await input.setValue('pending')
    await pressKey('Escape')
    expect(wrapper.vm.selected).toBe(0)
    expect(wrapper.vm.query).toBe('pending')
  })
})
