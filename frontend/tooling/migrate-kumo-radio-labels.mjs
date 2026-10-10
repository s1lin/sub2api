import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'
const root = fileURLToPath(new URL('../src/', import.meta.url))
let count = 0
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) { if (!['kumo', '__tests__'].includes(entry.name)) walk(path); continue }
    if (!path.endsWith('.vue')) continue
    const source = readFileSync(path, 'utf8')
    if (!source.includes('<KumoRadio')) continue
    const { descriptor } = parse(source), offset = descriptor.template.loc.start.offset, edits = []
    function visit(node) {
      const radio = node.tag === 'KumoLabel' && node.children?.find(child => child.tag === 'KumoRadio')
      if (radio) {
        const hidden = radio.props.some(prop => prop.name === 'class' && prop.value?.content.includes('sr-only'))
        const attributes = radio.props.filter(prop => !['class', 'type', 'name'].includes(prop.name)).map(prop => prop.loc.source).join(' ')
        const openEnd = source.indexOf('>', offset + node.loc.start.offset)
        edits.push([offset + node.loc.start.offset, offset + node.loc.start.offset + '<KumoLabel'.length, `<KumoRadio ${attributes}${hidden ? ' appearance="card"' : ''}`])
        edits.push([offset + radio.loc.start.offset, offset + radio.loc.end.offset, ''])
        edits.push([offset + node.loc.end.offset - '</KumoLabel>'.length, offset + node.loc.end.offset, '</KumoRadio>'])
        // Selection and focus styles now belong to Kumo's choice container.
        const bodyStart = openEnd + 1
        for (const match of source.slice(bodyStart, offset + node.loc.end.offset).matchAll(/(?:dark:)?peer-(?:checked|focus-visible|disabled):[^\s"']+/g)) {
          edits.push([bodyStart + match.index, bodyStart + match.index + match[0].length, ''])
        }
        count++
        return
      }
      for (const child of node.children ?? []) visit(child)
    }
    visit(parseTemplate(descriptor.template.content))
    if (!edits.length) continue
    let next = source
    for (const [start, end, value] of edits.sort((a,b) => b[0] - a[0])) next = next.slice(0,start) + value + next.slice(end)
    writeFileSync(path, next)
  }
}
walk(root)
console.log(`Converted ${count} labeled choices to Kumo Radio.Item labels`)
