import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'
const root = fileURLToPath(new URL('../src/', import.meta.url))
let count = 0
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (['__tests__', 'kumo'].includes(entry.name)) continue
    const path = join(folder, entry.name)
    if (entry.isDirectory()) { walk(path); continue }
    if (!path.endsWith('.vue')) continue
    const source = readFileSync(path, 'utf8')
    if (!source.includes('<KumoRadio')) continue
    const { descriptor } = parse(source)
    const offset = descriptor.template.loc.start.offset
    const edits = [], groups = new Map()
    const find = (node, ancestors = []) => {
      if (node.tag === 'KumoRadio' && !ancestors.some(parent => parent.tag === 'KumoRadioGroup')) {
        const model = node.props.find(prop => prop.type === 7 && prop.name === 'model')
        const name = node.props.find(prop => prop.name === 'name')
        const key = model?.exp?.content ?? name?.value?.content
        if (!key) throw new Error(`Ungrouped radio in ${path}: ${node.loc.source}`)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push({ node, ancestors, model, name })
      }
      for (const child of node.children ?? []) find(child, [...ancestors, node])
    }
    find(parseTemplate(descriptor.template.content))
    for (const [key, items] of groups) {
      let ancestor = items[0].ancestors.at(-1)
      // Wrap the common container, including labels rendered by v-for.
      for (const candidate of [...items[0].ancestors].reverse()) {
        if (candidate.type !== 1 || ['label', 'KumoLabel', 'template'].includes(candidate.tag)) continue
        if (items.every(item => item.ancestors.includes(candidate))) { ancestor = candidate; break }
      }
      const modeled = items[0].model
      let binding = modeled ? `v-model="${key}"` : ''
      if (!modeled) {
        const values = []
        for (let index = 0; index < items.length; index++) {
          const item = items[index]
          const checked = item.node.props.find(prop => prop.type === 7 && prop.arg?.content === 'checked')
          const value = item.node.props.find(prop => prop.name === 'value' || prop.arg?.content === 'value')
          const expression = value?.type === 7 ? value.exp.content : value ? `'${value.value.content}'` : String(index)
          if (!value) edits.push([offset + item.node.loc.start.offset + 10, offset + item.node.loc.start.offset + 10, ` :value="${index}"`])
          if (!checked) throw new Error(`Missing checked state for ${path}: ${key}`)
          values.push(`(${checked.exp.content}) ? ${expression} : `)
        }
        binding = `:model-value="${values.join('')}null"`
      }
      const name = items[0].name?.value?.content
      edits.push([offset + ancestor.loc.start.offset, offset + ancestor.loc.start.offset, `<KumoRadioGroup ${binding}${name ? ` name="${name}"` : ''} class="contents">\n`])
      edits.push([offset + ancestor.loc.end.offset, offset + ancestor.loc.end.offset, '\n</KumoRadioGroup>'])
      for (const item of items) {
        if (item.model) edits.push([offset + item.model.loc.start.offset, offset + item.model.loc.end.offset, ''])
      }
      count++
    }
    if (!edits.length) continue
    let next = source
    for (const [start, end, value] of edits.sort((a,b) => b[0] - a[0])) next = next.slice(0,start) + value + next.slice(end)
    next = next.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/, (_, names) => `import { ${names}, KumoRadioGroup } from '@/components/kumo'`)
    writeFileSync(path, next)
  }
}
walk(root)
console.log(`Migrated ${count} radio groups`)
