import { mount, settleControls, typeText } from '@/__tests__/render'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Select from '../Select.vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
afterEach(() => { vi.useRealTimers() })
async function open(props: Record<string, unknown> = {}) {
  const wrapper = mount(Select, { attachTo: document.body, props: {
    modelValue: null, remote: true,
    options: [{ value: 'alpha', label: 'Alpha account' }, { value: 'beta', label: 'Beta account' }], ...props,
  } })
  await wrapper.get('button').trigger('click')
  return wrapper
}
const labels = () => [...document.querySelectorAll('[role="option"]')].map(node => node.textContent)
async function search(value: string) { await typeText(document.querySelector<HTMLInputElement>('.select-search-input')!, value) }
describe('Select remote search', () => {
  it('debounces requests while keeping server results visible', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const wrapper = await open()
    await search('zzz')
    expect(wrapper.emitted('search')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.emitted('search')).toEqual([['zzz']])
    expect(labels()).toEqual(['Alpha account', 'Beta account'])
  })
  it('cancels queued search on close without searching the reset query', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const wrapper = await open()
    await search('hidden')
    await wrapper.get('button').trigger('click')
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.emitted('search')).toBeUndefined()
  })
  it('distinguishes loading from an empty server result', async () => {
    const wrapper = await open({ options: [], loading: true })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('common.loading')
    await wrapper.setProps({ loading: false })
    expect(document.querySelector('[role="status"]')?.textContent).toContain('common.noOptionsFound')
  })
  it('filters local results without issuing remote searches', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const wrapper = await open({ remote: false, searchable: true })
    await search('alpha')
    await vi.advanceTimersByTimeAsync(300)
    await settleControls()
    expect(wrapper.emitted('search')).toBeUndefined()
    expect(labels()).toEqual(['Alpha account'])
  })
  it('clears a selected value without choosing another option', async () => {
    const wrapper = mount(Select, { props: { modelValue: 'alpha', options: [{ value: 'alpha', label: 'Alpha' }], clearable: true } })
    await wrapper.get('[aria-label="common.clear"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
    expect(wrapper.emitted('change')).toEqual([[null, null]])
  })
})
