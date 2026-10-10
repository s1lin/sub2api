import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'
const root = fileURLToPath(new URL('../src/', import.meta.url))
const definitions = {
  'views/admin/SettingsView.vue': [
    `<KumoTabs v-model="activeTab" variant="underline" :activate-on-focus="true" :tabs="settingsTabs.map(tab => ({ ...tab, value: tab.key, id: 'settings-tab-' + tab.key, label: t('admin.settings.tabs.' + tab.key) }))">
      <template #tab="{ tab }"><Icon :name="tab.icon" size="sm" /><span>{{ tab.label }}</span></template>
    </KumoTabs>`,
  ],
  'components/user/monitor/MonitorHero.vue': [
    `<KumoTabs :model-value="window" :tabs="windowOptions" size="sm" @update:model-value="emit('update:window', $event)" />`,
  ],
  'features/prompt-audit/PromptAuditView.vue': [
    `<KumoTabs v-model="activeTab" class="mb-4" :tabs="pageTabs.map(tab => ({ value: tab.id, label: tab.label, dataTest: 'tab-' + tab.id }))" />`,
  ],
  'features/prompt-audit/components/EventDetailDialog.vue': [
    `<KumoTabs v-model="activeTab" variant="underline" :tabs="tabs.map(tab => ({ value: tab, label: t('admin.promptAudit.events.tabs.' + tab) }))" />`,
  ],
  'views/admin/ChannelMonitorView.vue': [
    `<KumoTabs v-model="adminMonitorTab" :tabs="[{ value: 'v2', label: t('channelMonitorV2.admin.tabV2') }, { value: 'legacy', label: isV1Mode ? t('channelMonitorV2.admin.tabV1Active') : t('channelMonitorV2.admin.tabV1History') }]" />`,
  ],
  'components/admin/monitor/MonitorTemplateManagerDialog.vue': [
    `<KumoTabs v-model="activeProvider" variant="underline" :tabs="providerTabs">
      <template #tab="{ tab }"><span>{{ tab.label }}</span><KumoBadge v-if="countByProvider[tab.value as Provider] > 0">{{ countByProvider[tab.value as Provider] }}</KumoBadge></template>
    </KumoTabs>`,
  ],
  'views/user/ChannelStatusV2View.vue': [
    `<KumoTabs :model-value="filter.range" :tabs="ranges" size="sm" @update:model-value="setRange($event)" />`,
    `<KumoTabs v-model="trendView" size="sm" :tabs="[{ value: 'pulse', label: t('channelMonitorV2.trendView.pulse') }, { value: 'line', label: t('channelMonitorV2.trendView.line') }]" />`,
    `<KumoTabs v-if="trendView === 'pulse'" v-model="healthMode" size="sm" :tabs="healthModeOptions" />`,
    `<KumoTabs v-model="activeTab" :tabs="tabs" variant="underline" />`,
  ],
  'features/channel-monitor-v2/MonitorSettingsPanel.vue': [
    `<KumoTabs v-model="draft.refresh_interval_seconds" :tabs="[{ value: 60, label: '1 min' }, { value: 300, label: '5 min' }]" />`,
  ],
}
for (const [file, replacements] of Object.entries(definitions)) {
  const path = root + file
  let source = fs.readFileSync(path, 'utf8')
  const { descriptor } = parse(source)
  const edits = []
  let index = 0
  function visit(node) {
    if (node.type === 1) {
      const attribute = name => node.props.find(prop => prop.type === 6 && prop.name === name)?.value?.content
      if (attribute('role') === 'tablist' || (attribute('class') ?? '').split(/\s+/).includes('tabs')) {
        if (!replacements[index]) throw new Error(`Missing tab mapping ${file} ${index}`)
        edits.push([descriptor.template.loc.start.offset + node.loc.start.offset, descriptor.template.loc.start.offset + node.loc.end.offset, replacements[index++]])
        return
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(parseTemplate(descriptor.template.content))
  if (index !== replacements.length) throw new Error(`Tab count changed ${file}: ${index}`)
  for (const [start, end, value] of edits.sort((a,b) => b[0] - a[0])) source = source.slice(0,start) + value + source.slice(end)
  source = source.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/, (_, names) => `import { ${[...new Set([...names.split(',').map(name=>name.trim()), 'KumoTabs', ...(file.includes('TemplateManager') ? ['KumoBadge'] : [])])].join(', ')} } from '@/components/kumo'`)
  if (file.endsWith('SettingsView.vue')) source = source.replace(/const settingsTabKeyboardActions =[\s\S]*?(?=const \{ copyToClipboard \})/, '')
  if (file.includes('TemplateManager')) source = source.replace(/function tabClass\(value: Provider\): string \{[\s\S]*?\n\}/, '')
  fs.writeFileSync(path, source)
}
console.log('Migrated tab groups in', Object.keys(definitions).length, 'files')
