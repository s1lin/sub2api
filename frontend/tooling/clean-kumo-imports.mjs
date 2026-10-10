import fs from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name)
    if (entry.isDirectory()) { walk(path); continue }
    if (!path.endsWith('.vue')) continue
    const source = fs.readFileSync(path, 'utf8')
    const next = source.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/g, (line, names) => {
      const body = source.replace(line, '')
      const used = [...new Set(names.split(',').map(name=>name.trim()))].filter(name => new RegExp('\\b' + name + '\\b').test(body)).sort()
      return used.length ? `import { ${used.join(', ')} } from '@/components/kumo'` : ''
    })
    if (source !== next) fs.writeFileSync(path, next)
  }
}
walk(fileURLToPath(new URL('../src/', import.meta.url)))
