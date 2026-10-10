import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'
const root = fileURLToPath(new URL('../src/', import.meta.url))
const totals = {}
const tags = { thead: 'KumoTableHeader', th: 'KumoTableHead', tbody: 'KumoTableBody', tr: 'KumoTableRow', td: 'KumoTableCell', tfoot: 'KumoTableFooter', label: 'KumoLabel' }
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (['__tests__', 'kumo'].includes(entry.name)) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) { walk(path); continue }
    if (!path.endsWith('.vue')) continue
    const source = readFileSync(path, 'utf8')
    const { descriptor } = parse(source)
    if (!descriptor.template || !descriptor.scriptSetup) continue
    const offset = descriptor.template.loc.start.offset
    const edits = [], imports = new Set()
    const walkNode = node => {
      if (node.type === 1) {
        const attrs = name => node.props.find(p => p.type === 6 && p.name === name)?.value?.content
        const css = attrs('class') ?? ''
        let tag = tags[node.tag]
        if (['div', 'span'].includes(node.tag) && css.includes('animate-pulse') && !node.children.some(child => child.type !== 3)) tag = 'KumoSkeleton'
        const switchControl = node.tag === 'KumoButton' && attrs('role') === 'switch'
        if (switchControl) {
          const start = offset + node.loc.start.offset
          let opening = node.loc.source.slice(0, node.loc.source.indexOf('>') + 1)
          opening = opening.replace('<KumoButton', '<KumoSwitch').replace(/\s+(?:class|:class)="[^"]*"/g, '')
            .replace(':aria-checked=', ':checked=')
            .replace('@click=', '@update:model-value=')
            .replace(/\s+role="switch"/, '').replace(/\s+type="button"/, '').replace(/>$/, ' />')
          edits.push([start, offset + node.loc.end.offset, opening])
          imports.add('KumoSwitch')
          totals.KumoSwitch = (totals.KumoSwitch ?? 0) + 1
          return
        }
        if (tag) {
          imports.add(tag)
          totals[tag] = (totals[tag] ?? 0) + 1
          const start = offset + node.loc.start.offset
          edits.push([start + 1, start + 1 + node.tag.length, tag])
          const close = node.loc.source.lastIndexOf('</' + node.tag)
          if (close >= 0) edits.push([start + close + 2, start + close + 2 + node.tag.length, tag])
        }
      }
      for (const child of node.children ?? []) walkNode(child)
    }
    walkNode(parseTemplate(descriptor.template.content))
    if (!edits.length) continue
    let next = source
    for (const [start, end, value] of edits.sort((a,b) => b[0] - a[0])) next = next.slice(0, start) + value + next.slice(end)
    const existing = next.match(/import \{ ([^}]+) \} from '@\/components\/kumo'/)
    if (existing) {
      for (const name of existing[1].split(',').map(name => name.trim())) imports.add(name)
      next = next.replace(existing[0], `import { ${[...imports].sort().join(', ')} } from '@/components/kumo'`)
    } else next = next.replace(/<script setup[^>]*>/, value => value + `\nimport { ${[...imports].sort().join(', ')} } from '@/components/kumo'\n`)
    writeFileSync(path, next)
  }
}
walk(root)
console.log(totals)
