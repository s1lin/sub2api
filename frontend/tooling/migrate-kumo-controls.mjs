import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { parse as parseTemplate } from '@vue/compiler-dom'

const root = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1')
const totals = {}, files = []
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'kumo') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) { walk(path); continue }
    if (!path.endsWith('.vue')) continue
    const source = readFileSync(path, 'utf8')
    const { descriptor } = parse(source)
    if (!descriptor.template || !descriptor.scriptSetup) continue
    const offset = descriptor.template.loc.start.offset
    const replacements = [], imports = new Set()
    function visit(node, insideForm = false) {
      if (node.type === 1) {
        const attribute = name => node.props.find(p => p.type === 6 && p.name === name)?.value?.content
        const classes = (attribute('class') || '').split(/\s+/)
        let component
        if (node.tag === 'button') component = 'KumoButton'
        if (node.tag === 'textarea') component = 'KumoTextarea'
        if (node.tag === 'input') {
          const type = attribute('type')
          component = type === 'checkbox' ? 'KumoCheckbox' : type === 'radio' ? 'KumoRadio' : type === 'hidden' ? null : 'KumoInput'
        }
        if (node.tag === 'select') component = 'KumoNativeSelect'
        if (['div', 'section', 'article'].includes(node.tag) && classes.includes('card')) component = 'KumoSurface'
        if (node.tag === 'span' && classes.includes('badge')) component = 'KumoBadge'
        if (node.tag === 'table') component = 'KumoTable'
        if (['RouterLink', 'router-link'].includes(node.tag) && classes.some(value => value === 'btn' || value === 'brand-button' || value.startsWith('btn-'))) component = 'KumoLink'
        if (node.tag === 'a' && classes.some(value => value === 'btn' || value === 'brand-button' || value.startsWith('btn-'))) component = 'KumoButton'
        if (component) {
          imports.add(component)
          totals[component] = (totals[component] || 0) + 1
          const begin = offset + node.loc.start.offset
          // Vue's SFC parser supplies exact source offsets, including nested templates.
          replacements.push([begin + 1, begin + 1 + node.tag.length, component])
          if (!node.isSelfClosing && !['input'].includes(node.tag)) {
            const close = node.loc.source.lastIndexOf('</' + node.tag)
            if (close >= 0) replacements.push([begin + close + 2, begin + close + 2 + node.tag.length, component])
          }
          if (node.tag === 'input' && !node.isSelfClosing) replacements.push([offset + node.loc.end.offset - 1, offset + node.loc.end.offset - 1, ' /'])
          if (node.tag === 'button' && insideForm && !node.props.some(p => p.name === 'type' || p.arg?.content === 'type')) replacements.push([begin + 1 + node.tag.length, begin + 1 + node.tag.length, ' type="submit"'])
        }
        for (const child of node.children) visit(child, insideForm || node.tag === 'form')
      } else if (node.children) for (const child of node.children) visit(child, insideForm)
    }
    visit(parseTemplate(descriptor.template.content))
    if (!replacements.length) continue
    replacements.push([descriptor.scriptSetup.loc.start.offset, descriptor.scriptSetup.loc.start.offset, `\nimport { ${[...imports].sort().join(', ')} } from '@/components/kumo'\n`])
    let next = source
    for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0])) next = next.slice(0, start) + value + next.slice(end)
    const allImports = [...next.matchAll(/import \{ ([^}]+) \} from '@\/components\/kumo'/g)]
    const merged = [...new Set(allImports.flatMap(match => match[1].split(',').map(name => name.trim())))].sort()
    let first = true
    next = next.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/g, () => {
      if (!first) return ''
      first = false
      return "import { " + merged.join(', ') + " } from '@/components/kumo'"
    })
    writeFileSync(path, next)
    files.push(relative(root, path))
  }
}
walk(root)
console.log(JSON.stringify({ files: files.length, components: totals }, null, 2))
