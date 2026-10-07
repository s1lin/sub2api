import { mount, settleControls, pressKey as press } from '@/__tests__/render'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Select from '../Select.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
let wrapper: ReturnType<typeof mount>
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })

async function open(searchable: boolean | 'auto' = 'auto') {
  wrapper = mount(Select, {
    attachTo: document.body,
    props: { modelValue: 'alpha', searchable, options: [
      { value: 'alpha', label: 'Alpha' },
      { value: 'disabled', label: 'Disabled', disabled: true },
      { value: 'beta', label: 'Beta' },
    ] },
  })
  wrapper.get<HTMLButtonElement>('button').element.focus()
  await press('ArrowDown')
  await settleControls()
}

describe('Select keyboard focus', () => {
  it.each([false, 'auto'] as const)('selects an enabled option without a search input (%s)', async (searchable) => {
    await open(searchable)
    expect(document.querySelector('[role="listbox"]')?.contains(document.activeElement)).toBe(true)
    await press('ArrowDown')
    expect(document.activeElement?.getAttribute('aria-disabled')).toBe('true')
    await press('ArrowDown')
    await press('Enter')
    expect(wrapper.emitted('update:modelValue')).toEqual([['beta']])
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(wrapper.get('button').element)
  })

  it('allows Escape to close a non-searchable dropdown and restore trigger focus', async () => {
    await open(false)
    await press('Escape')
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(wrapper.get('button').element)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps focus in the search input when search is enabled', async () => {
    await open(true)
    expect(document.activeElement).toBe(document.querySelector('.select-search-input'))
    await press('ArrowDown')
    await press('ArrowDown')
    await press('Enter')
    expect(wrapper.emitted('update:modelValue')).toEqual([['beta']])
  })
})
