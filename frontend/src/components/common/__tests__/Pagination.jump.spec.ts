import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, typeText } from '@/__tests__/render'
import { enableAutoUnmount } from '@vue/test-utils'
import Pagination from '../Pagination.vue'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
enableAutoUnmount(afterEach)
function mountPagination() {
  return mount(Pagination, { props: { total: 200, page: 1, pageSize: 20, showJump: true, showPageSizeSelector: false } })
}
describe('pagination jump input', () => {
  it.each(['focusout', 'keydown'])('jumps to the entered page using %s', async event => {
    const wrapper = mountPagination()
    const input = wrapper.get<HTMLInputElement>('input')
    await typeText(input.element, '3')
    await input.trigger(event, { key: 'Enter' })
    expect(wrapper.emitted('update:page')).toEqual([[3]])
    expect(input.element.value).toBe('3')
  })
  it('clamps an entered page to the last page', async () => {
    const wrapper = mountPagination()
    const input = wrapper.get<HTMLInputElement>('input')
    await typeText(input.element, '99')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:page')).toEqual([[10]])
  })
  it('does not emit a redundant update when an empty entry restores page one', async () => {
    const wrapper = mountPagination()
    const input = wrapper.get<HTMLInputElement>('input')
    await typeText(input.element, '')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:page')).toBeUndefined()
    expect(input.element.value).toBe('1')
  })
})
