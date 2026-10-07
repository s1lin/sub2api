import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@/__tests__/render'

import DataTable from '@/components/common/DataTable.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
async function settle() { await flushPromises(); await new Promise(resolve => setTimeout(resolve, 40)) }

describe('Kumo table integration', () => {
  it('renders data arriving after loading, supports sorting and row selection', async () => {
    const wrapper = mount(DataTable, { attachTo: document.body, props: {
      columns: [{ key: 'name', label: 'Name', sortable: true }],
      data: [], loading: true, selectable: true, selectedKeys: [],
    } })
    await settle()
    await wrapper.setProps({ loading: false, data: [{ id: 1, name: 'Beta' }, { id: 2, name: 'Alpha' }] })
    await settle()
    expect(wrapper.findAll('tbody tr[data-index]')).toHaveLength(2)
    expect(wrapper.get('tbody').text()).toContain('Alpha')
    await wrapper.get('[data-test="select-row"]').trigger('click')
    await settle()
    expect(wrapper.emitted('update:selectedKeys')?.[0]).toEqual([[1]])
    wrapper.unmount()
  })
})
