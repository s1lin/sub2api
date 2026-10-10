/**
 * Structure contracts: channel-monitor-v2 + studio shells must use project
 * shared interior components, while keeping filters and charts accessible.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

function read(rel: string) {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('channel-monitor-v2 design system structure', () => {
  it('user ChannelStatus V2 shell uses a plain heading and metric strip', () => {
    // Route wrapper may switch V1/V2; design chrome lives on the V2 implementation.
    const src = read('views/user/ChannelStatusV2View.vue')
    expect(src).toContain('<PageHeader')
    expect(src).toContain('<MetricStrip')
    expect(src).toContain('btn btn-secondary')
    expect(src).toContain('class="tab')
    expect(src).toContain('<KumoTabs')
    expect(src).toContain('badge badge-warning')
    // Compact single-row toolbar
    expect(src).toContain('monitor-toolbar')
    expect(src).toContain('clearFilters')
    expect(src).toContain('healthModeOptions')
    expect(src).toContain("'cache'")
    expect(src).not.toMatch(/rounded-(2xl|3xl)|shadow-(sm|lg)/)
    // Overview-first KPI strip before primary viz
    expect(src.indexOf('summaryAria')).toBeLessThan(src.indexOf('MonitorTrendChart'))
    // No page-level fixed min-width that forces viewport horizontal scroll
    expect(src).not.toMatch(/min-width:\s*980px/)
    expect(src).not.toMatch(/min-w-\[980px\]/)
    // Dense tables scroll internally
    expect(src).toMatch(/max-h-\[min\(52vh/)
    expect(src).toContain('overflow-auto')
    // Trend view toggle (pulse matrix / line chart) + default platform/group dimension
    expect(src).toContain("trendView")
    expect(src).toContain("'platform_group'")
    expect(src).toContain('MonitorTrendChart')
  })

  it('RelayPulseMatrix uses card chrome, matrix scroll, and hover tooltips (no click modal)', () => {
    const src = read('features/channel-monitor-v2/RelayPulseMatrix.vue')
    expect(src).toContain('class="card')
    expect(src).toContain('card-header')
    expect(src).toContain('card-body')
    expect(src).toContain('matrix-scroll')
    expect(src).toMatch(/max-h-\[min\(42vh/)
    expect(src).toContain('overflow-auto')
    expect(src).toContain('<KumoTooltip')
    expect(src).toContain('<Panel')
    expect(src).not.toMatch(/rounded-(2xl|3xl)|shadow-(sm|lg)/)
    expect(src).not.toContain('modal-overlay')
    expect(src).not.toContain('modal-content')
  })

  it('MetricCell uses stat-card utility', () => {
    const src = read('features/channel-monitor-v2/MetricCell.vue')
    expect(src).toContain('stat-card')
    expect(src).toContain('stat-label')
    expect(src).toContain('stat-value')
    expect(src).not.toContain('<Panel')
    expect(src).not.toMatch(/rounded-(2xl|3xl)|shadow-(sm|lg)/)
  })

  it('MonitorTrendChart uses Ops chart shell tokens', () => {
    const src = read('features/channel-monitor-v2/MonitorTrendChart.vue')
    expect(src).toContain('class="card')
    expect(src).toContain('<Panel')
    expect(src).not.toMatch(/rounded-(2xl|3xl)|shadow-(sm|lg)/)
    expect(src).toContain('EmptyState')
    expect(src).toContain('min-h-[360px]')
  })

  it('FilterMultiSelect uses rounded-xl input chrome and dropdown utility', () => {
    const src = read('features/channel-monitor-v2/FilterMultiSelect.vue')
    expect(src).toContain('<KumoMultiSelect')
    expect(src).toContain(':options="options"')
    expect(src).toContain(':all-label="allLabel"')
  })

  it('MonitorSettingsPanel uses page-header, card, btn-primary, tabs', () => {
    const src = read('features/channel-monitor-v2/MonitorSettingsPanel.vue')
    expect(src).toContain('<PageHeader')
    expect(src).toContain('btn btn-primary')
    expect(src).toContain('class="card')
    expect(src).toContain('<KumoTabs')
    expect(src).toMatch(/max-h-\[min\(40vh/)
  })

  it('admin ChannelMonitorView V2 tab chrome uses project tabs', () => {
    const src = read('views/admin/ChannelMonitorView.vue')
    expect(src).toContain('<PageHeader')
    expect(src).toContain('<KumoTabs')
    expect(src).toContain('MonitorSettingsPanel')
  })
})
