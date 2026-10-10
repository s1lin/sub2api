import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'
const root = fileURLToPath(new URL('../src/', import.meta.url))
let count = 0
function visitFolder(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (['__tests__', 'kumo'].includes(entry.name)) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) { visitFolder(path); continue }
    if (!path.endsWith('.vue')) continue
    const source = fs.readFileSync(path, 'utf8')
    const { descriptor } = parse(source)
    if (!descriptor.template || !descriptor.scriptSetup) continue
    const edits = [], imports = new Set()
    const offset = descriptor.template.loc.start.offset
    function visit(node) {
      if (node.type === 1) {
        const staticClass = node.props.find(prop => prop.name === 'class')?.value?.content ?? ''
        if (node.tag === 'KumoButton' && node.loc.source.includes('translate-x-') && node.loc.source.includes('rounded-full')) {
          const click = node.props.find(prop => prop.type === 7 && prop.name === 'on' && prop.arg?.content === 'click')
          const model = click?.exp?.content.trim().match(/^([\w.]+)\s*=\s*!\1$/)?.[1]
          if (model) {
            let attrs = node.props.filter(prop => prop !== click && prop.name !== 'class' && prop.arg?.content !== 'class' && prop.name !== 'type').map(prop => prop.loc.source).join(' ')
            edits.push([offset + node.loc.start.offset, offset + node.loc.end.offset, `<KumoSwitch v-model="${model}" ${attrs} />`])
            imports.add('KumoSwitch'); count++; return
          }
          const manual = {
            "emit('update:enabled', !enabled)": [':checked="!!enabled"', "emit('update:enabled', $event)"],
            'toggleEnabled(rule)': [':checked="rule.enabled"', 'toggleEnabled(rule)'],
            'handleToggleSchedulable(row)': [':checked="row.schedulable"', 'handleToggleSchedulable(row)'],
            'toggleForSale(row)': [':checked="!!value"', 'toggleForSale(row)'],
          }[click?.exp?.content.trim()]
          if (manual) {
            const attrs = node.props.filter(prop => prop !== click && prop.name !== 'class' && prop.arg?.content !== 'class' && prop.name !== 'type').map(prop => prop.loc.source).join(' ')
            edits.push([offset + node.loc.start.offset, offset + node.loc.end.offset, `<KumoSwitch ${manual[0]} @update:model-value="${manual[1]}" ${attrs} />`])
            imports.add('KumoSwitch'); count++; return
          }
          console.log('Review switch:', path, click?.exp?.content)
        }
        if (node.tag === 'svg' && staticClass.split(/\s+/).includes('animate-spin')) {
          const attrs = node.props.filter(prop => prop.type === 7 || ['class', 'aria-label', 'role'].includes(prop.name)).map(prop => prop.loc.source).join(' ')
          edits.push([offset + node.loc.start.offset, offset + node.loc.end.offset, `<KumoLoader ${attrs} />`])
          imports.add('KumoLoader'); return
        }
      }
      for (const child of node.children ?? []) visit(child)
    }
    visit(parseTemplate(descriptor.template.content))
    if (!edits.length) continue
    let next = source
    for (const [start,end,value] of edits.sort((a,b)=>b[0]-a[0])) next = next.slice(0,start) + value + next.slice(end)
    const existing = next.match(/import \{ ([^}]+) \} from '@\/components\/kumo'/)
    if (existing) {
      for (const name of existing[1].split(',').map(name=>name.trim())) imports.add(name)
      next = next.replace(existing[0], `import { ${[...imports].sort().join(', ')} } from '@/components/kumo'`)
    } else next = next.replace(/<script setup[^>]*>/, value => value + `\nimport { ${[...imports].sort().join(', ')} } from '@/components/kumo'\n`)
    fs.writeFileSync(path, next)
  }
}
visitFolder(root)
console.log('Migrated switches:', count)
