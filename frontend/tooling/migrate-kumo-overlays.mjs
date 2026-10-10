import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as template } from '@vue/compiler-dom'
const root = fileURLToPath(new URL('../src/', import.meta.url))
const attr = (node, name) => node.props?.find(p => p.type === 6 && p.name === name)?.value?.content
const dir = (node, name) => node.props?.find(p => p.type === 7 && p.name === name)?.exp?.content
const elements = node => (node.children ?? []).filter(n => n.type === 1)
const walk = (node, fn) => { if (fn(node) === false) return; for (const child of node.children ?? []) walk(child, fn) }
function imports(source, names) {
  if (/import \{ ([^}]+) \} from '@\/components\/kumo'/.test(source)) return source.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/, (_, old) => `import { ${[...new Set([...old.split(',').map(x => x.trim()), ...names])].join(', ')} } from '@/components/kumo'`)
  return source.replace('<script setup lang="ts">', `<script setup lang="ts">\nimport { ${names.join(', ')} } from '@/components/kumo'`)
}
function editFile(file, transform, cleanup = s => s) {
  let source = fs.readFileSync(root + file, 'utf8')
  const { descriptor } = parse(source)
  const edits = [], base = descriptor.template.loc.start.offset
  const replace = (node, value) => edits.push([base + node.loc.start.offset, base + node.loc.end.offset, value])
  const names = transform(template(descriptor.template.content), replace)
  for (const [a,b,value] of edits.sort((a,b) => b[0]-a[0])) source = source.slice(0,a)+value+source.slice(b)
  fs.writeFileSync(root + file, cleanup(imports(source,names)))
}
const modals = {
  'components/common/AnnouncementPopup.vue': [{ title: 'displayedAnnouncement?.title', close: 'handleDismiss', outside: false, escape: false, z: 120, width: 'wide' }],
  'components/common/AnnouncementBell.vue': [
    { title: "t('announcements.title')", close: 'closeModal', z: 100, width: 'wide' },
    { title: 'selectedAnnouncement?.title', close: 'closeDetail', z: 110, width: 'wide' },
  ],
  'components/auth/LoginAgreementPrompt.vue': [{ title: "t('legal.loginAgreementPrompt.dialogTitle')", close: "emit('reject')", outside: false, escape: false, z: 140 }],
  'views/admin/RedeemView.vue': [
    { title: "t('admin.redeem.generateCodesTitle')", close: 'showGenerateDialog = false', backdrop: true },
    { title: "t('admin.redeem.batchUpdateTitle')", close: 'closeBatchUpdateDialog', backdrop: true },
    { title: "t('admin.redeem.generateCodesTitle')", close: 'closeResultDialog', backdrop: true },
  ],
}
for (const [file, configs] of Object.entries(modals)) editFile(file, (ast, replace) => {
  let index = 0
  walk(ast, node => {
    if (node.tag !== 'Teleport') return
    const config = configs[index++]
    if (!config) throw new Error(`Unexpected modal ${file}`)
    let overlay = elements(node)[0]
    if (overlay.tag === 'Transition') overlay = elements(overlay)[0]
    const condition = dir(overlay, 'if')
    const panel = elements(overlay)[config.backdrop ? 1 : 0]
    if (!condition || !panel) throw new Error(`Modal structure changed ${file}`)
    const content = panel.loc.source.replace(/\s+@click\.stop(?=\s|>)/g, '')
    replace(node, `<KumoDialog :show="!!(${condition})" :title="${config.title} ?? ''" custom-layout :close-on-click-outside="${config.outside !== false}" :close-on-escape="${config.escape !== false}" :z-index="${config.z ?? 50}" width="${config.width ?? 'normal'}" @close="${config.close}">\n<template v-if="${condition}">${content}</template>\n</KumoDialog>`)
    return false
  })
  if (index !== configs.length) throw new Error(`Modal count changed ${file}`)
  return ['KumoDialog']
}, source => {
  if (file.includes('AnnouncementPopup')) source = source.replace('computed, onBeforeUnmount, watch', 'computed').replace(/\/\/ Manage body overflow[\s\S]*?(?=<\/script>)/, '')
  if (file.includes('AnnouncementBell')) source = source.replace('ref, computed, onMounted, onBeforeUnmount, watch', 'ref, computed').replace(/function handleEscape\([\s\S]*?(?=<\/script>)/, '')
  return source
})

const menus = [
  { file: 'components/common/LocaleSwitcher.vue', model: 'isOpen', trigger: 'toggleDropdown', popup: 'isOpen', item: true },
  { file: 'components/common/AutoRefreshButton.vue', model: 'showDropdown', trigger: 'showDropdown = !showDropdown', popup: 'showDropdown', item: true },
  { file: 'components/layout/AppHeader.vue', model: 'dropdownOpen', trigger: 'toggleDropdown', popup: 'dropdownOpen', item: true },
]
for (const config of menus) editFile(config.file, (ast, replace) => {
  let count = 0
  walk(ast, node => {
    if (attr(node,'ref') !== 'dropdownRef') return
    let content = node.loc.source
    const isUser = config.file.includes('AppHeader')
    content = content.replace(/^<div[^>]*>/, `<KumoDropdown v-model="${config.model}"${isUser ? ' v-if="user"' : ''}>`).replace(/<\/div>$/, '</KumoDropdown>')
    content = content.replace(/<\/?transition[^>]*>/gi, '')
    const childAst = template(content)
    const edits = []
    walk(childAst, child => {
      if (child.tag === 'KumoButton' && child.props.some(p => p.type === 7 && p.name === 'on' && p.arg?.content === 'click' && p.exp?.content === config.trigger)) {
        edits.push([child.loc.start.offset, child.loc.end.offset, child.loc.source.replace(/KumoButton/g, 'KumoDropdownTrigger').replace(/\s+@click="[^"]*"/, '')])
        return false
      }
      if (dir(child,'if') === config.popup) {
        let popup = child.loc.source.replace(/^<div/, '<KumoDropdownContent').replace(/<\/div>$/, '</KumoDropdownContent>').replace(/\s+v-if="[^"]*"/, '')
        popup = popup.replace(/\b(absolute|right-0|z-\d+|mt-\d+)\b/g,'').replace('class="dropdown ', 'class="')
        popup = popup.replace(/KumoButton/g, 'KumoDropdownItem')
        // Router links remain SPA navigation while the menu supplies focus and keyboard semantics.
        popup = popup.replace(/<router-link to="([^"]+)" @click="closeDropdown"/g, '<KumoDropdownItem @click="closeDropdown(); router.push(\'$1\')"').replace(/<\/router-link>/g, '</KumoDropdownItem>')
        popup = popup.replace(/<a\s/, '<KumoDropdownItem ').replace(/<\/a>/, '</KumoDropdownItem>')
        edits.push([child.loc.start.offset, child.loc.end.offset, popup])
        return false
      }
    })
    for (const [a,b,value] of edits.sort((a,b)=>b[0]-a[0])) content=content.slice(0,a)+value+content.slice(b)
    replace(node,content); count++
    return false
  })
  if (count !== 1) throw new Error(`Menu target count ${config.file}: ${count}`)
  return ['KumoDropdown','KumoDropdownTrigger','KumoDropdownContent','KumoDropdownItem']
}, source => source.replace(/, onMounted, onBeforeUnmount/g,'')
  .replace(/const dropdownRef = ref<HTMLElement \| null>\(null\)\r?\n/, '')
  .replace(/function toggleDropdown\(\) \{[\s\S]*?\r?\n\}\r?\n/, '')
  .replace(/function handleClickOutside\([\s\S]*?(?=<\/script>)/, ''))
console.log('Migrated 7 modal panels and 3 menus to Kumo')
