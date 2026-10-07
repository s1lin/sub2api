import { mount, portal, settleControls, clickOutside, pressKey } from '@/__tests__/render'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import DateRangePicker from '../DateRangePicker.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key, locale: ref('en') }) }))
let wrapper: ReturnType<typeof mount<typeof DateRangePicker>>
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(new Date(2026, 8, 13, 12)) })
afterEach(() => { wrapper?.unmount(); vi.useRealTimers() })

async function chooseDraft() {
  wrapper = mount(DateRangePicker, {
    props: {
      startDate: '2026-09-13', endDate: '2026-09-13',
      'onUpdate:startDate': (startDate: string) => { void wrapper.setProps({ startDate }) },
      'onUpdate:endDate': (endDate: string) => { void wrapper.setProps({ endDate }) },
    },
  })
  await wrapper.get('.date-picker-trigger').trigger('click')
  await portal().findAll<HTMLInputElement>('.date-picker-preset').find(node => node.text() === 'dates.last7Days')!.trigger('click')
}

describe('DateRangePicker unapplied changes', () => {
  it.each(['outside', 'escape', 'toggle'])('discards draft dates when dismissed with %s', async (method) => {
    await chooseDraft()
    if (method === 'outside') await clickOutside()
    else if (method === 'escape') await pressKey('Escape')
    else await wrapper.get('.date-picker-trigger').trigger('click')
    await settleControls()
    expect(wrapper.emitted('change')).toBeUndefined()
    expect(wrapper.get('.date-picker-trigger').text()).toContain('dates.today')
    await wrapper.get('.date-picker-trigger').trigger('click')
    expect(portal().findAll<HTMLInputElement>('input[type="date"]').map(input => input.element.value))
      .toEqual(['2026-09-13', '2026-09-13'])
  })

  it('retains a newly applied range after the parent accepts both updates', async () => {
    await chooseDraft()
    await portal().get('.date-picker-apply').trigger('click')
    await settleControls()
    expect(wrapper.emitted('change')).toEqual([[{ startDate: '2026-09-07', endDate: '2026-09-13', preset: '7days' }]])
    expect(wrapper.get('.date-picker-trigger').text()).toContain('dates.last7Days')
    await wrapper.get('.date-picker-trigger').trigger('click')
    expect(portal().findAll<HTMLInputElement>('input[type="date"]').map(input => input.element.value))
      .toEqual(['2026-09-07', '2026-09-13'])
  })
})
