import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, portal, settleControls } from '@/__tests__/render'
import DateRangePicker from '../DateRangePicker.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: ref('en') }) }))
let wrapper: ReturnType<typeof mount<typeof DateRangePicker>>
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date(2026, 9, 8, 12))
})
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })

describe('DateRangePicker calendar interactions', () => {
  it('starts a fresh range and applies both clicked dates', async () => {
    wrapper = mount(DateRangePicker, { props: { startDate: '2026-10-01', endDate: '2026-10-08' } })
    await wrapper.get('.date-picker-trigger').trigger('click')
    await portal().get('[data-day="2026-10-03"] button').trigger('click')
    await settleControls()
    expect(portal().get<HTMLButtonElement>('.date-picker-apply').element.disabled).toBe(true)
    await portal().get('[data-day="2026-10-06"] button').trigger('click')
    await portal().get('.date-picker-apply').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[{ startDate: '2026-10-03', endDate: '2026-10-06', preset: null }]])
  })

  it('moves the displayed month with a preset and preserves month navigation', async () => {
    wrapper = mount(DateRangePicker, { props: { startDate: '2026-10-01', endDate: '2026-10-08' } })
    await wrapper.get('.date-picker-trigger').trigger('click')
    await portal().findAll('.date-picker-preset').find(button => button.text() === 'dates.lastMonth')!.trigger('click')
    await settleControls()
    expect(portal().get('.rdp-caption_label').text()).toBe('September 2026')
    expect(portal().findAll<HTMLInputElement>('input[type="date"]').map(input => input.element.value)).toEqual(['2026-09-01', '2026-09-30'])
    await portal().get('.rdp-button_previous').trigger('click')
    expect(portal().get('.rdp-caption_label').text()).toBe('August 2026')
    await portal().get('.rdp-button_next').trigger('click')
    expect(portal().get('.rdp-caption_label').text()).toBe('September 2026')
  })
})
