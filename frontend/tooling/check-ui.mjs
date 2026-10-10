import { readFile, readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isUiExempt } from './ui-allowlist.mjs'

const rules = [
  ['shadow', /(?<![\w-])(?:[\w-]+:)*!?(?:drop-)?shadow-(?:sm|md|lg|xl|2xl)(?![\w-])/g],
  ['radius', /(?<![\w-])(?:[\w-]+:)*!?rounded(?:-[tblr]{1,2})?-(?:xl|2xl|3xl|4xl)(?![\w-])/g],
  ['gradient', /\bbg-gradient[\w-]*|(?:linear|radial)-gradient\s*\(/g],
  ['glass', /\bbackdrop-blur[\w-]*|backdrop-filter\s*:\s*blur\(/g],
]

export function findUiViolations(source) {
  const violations = []
  for (const [rule, expression] of rules) {
    for (const match of source.matchAll(expression)) {
      violations.push({ rule, line: source.slice(0, match.index).split('\n').length, value: match[0] })
    }
  }
  return violations.sort((a, b) => a.line - b.line)
}

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path)
    return /\.(vue|[jt]sx?)$/.test(entry.name) && !/\.(spec|test)\./.test(entry.name) ? [path] : []
  }))
  return nested.flat()
}

export async function checkUi(root = fileURLToPath(new URL('../src/', import.meta.url))) {
  const files = (await Promise.all(['views', 'components', 'features'].map(dir => sourceFiles(resolve(root, dir))))).flat()
  const failures = []
  let checked = 0
  for (const file of files) {
    const path = relative(root, file).replaceAll('\\', '/')
    if (isUiExempt(path)) continue
    checked++
    for (const violation of findUiViolations(await readFile(file, 'utf8'))) failures.push({ path, ...violation })
  }
  return { checked, failures }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { checked, failures } = await checkUi()
  for (const failure of failures) console.error(`${failure.path}:${failure.line} [${failure.rule}] ${failure.value}`)
  console.log(`UI rules: ${checked} interior files checked; ${failures.length} violations.`)
  process.exitCode = failures.length ? 1 : 0
}
