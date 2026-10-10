import fs from 'node:fs'
const dir = new URL('../src/', import.meta.url)
for (const name of fs.readdirSync(dir, { recursive: true })) {
  if (!/\.(spec|test)\.ts$/.test(name)) continue
  const file = new URL(name.replaceAll('\\', '/'), dir)
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes("from '@/__tests__/render'")) continue
  source = source.replace(/import \{([^}]+)\} from '@vue\/test-utils'/g, (line, names) => {
    const list = names.split(',').map(n => n.trim())
    if (!list.includes('mount')) return line
    const rest = list.filter(n => n !== 'mount')
    return `import { mount } from '@/__tests__/render'${rest.length ? `\nimport { ${rest.join(', ')} } from '@vue/test-utils'` : ''}`
  })
  fs.writeFileSync(file,source)
}
