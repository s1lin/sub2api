import { describe, expect, it } from 'vitest'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom'
import en from '@/i18n/locales/en'
import zh from '@/i18n/locales/zh'

const templates = import.meta.glob([
  '/src/views/admin/ops/**/*.vue',
  '/src/components/common/{Input,TextArea,SearchInput,GroupSelector,ProxySelector,ImageUpload,DataTable}.vue',
  '/src/components/user/profile/*.vue',
  '/src/components/admin/{BackupArchiveSettings,settings/RechargeBonusTierEditor}.vue',
  '/src/components/payment/AmountInput.vue',
  '/src/views/admin/{SettingsView,BackupView,UsersView,AccountsView,SubscriptionsView}.vue',
  '/src/views/user/{KeysView,RedeemView,BatchImageGuideView}.vue',
], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function controls(children: TemplateChildNode[]): ElementNode[] {
  return children.flatMap(node => node.type === NodeTypes.ELEMENT
    ? [/^Kumo(Input|Textarea|Checkbox)$/.test(node.tag) ? node : [], controls(node.children)].flat()
    : [])
}

describe('accessible names in platform forms', () => {
  for (const [file, source] of Object.entries(templates)) {
    it(`names controls and resolves label translations in ${file}`, () => {
      const template = parse(source).descriptor.template
      if (!template) return
      for (const node of controls(parseTemplate(template.content).children)) {
        const label = node.props.find(prop => ['label', 'aria-label', 'aria-labelledby'].includes(
          prop.type === NodeTypes.ATTRIBUTE ? prop.name : prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION ? prop.arg.content : '',
        ))
        expect(label, `${file}:${node.loc.start.line} ${node.tag}`).toBeDefined()
        const expression = label?.type === NodeTypes.DIRECTIVE && label.exp?.type === NodeTypes.SIMPLE_EXPRESSION ? label.exp.content : ''
        for (const [, key] of expression.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
          for (const locale of [en, zh]) {
            const value = key!.split('.').reduce<unknown>((object, part) => (object as Record<string, unknown>)?.[part], locale)
            expect(typeof value, `${file}: ${key}`).toBe('string')
          }
        }
      }
    })
  }
})
