import fs from 'node:fs'
const dir = new URL('../src/components/common/__tests__/', import.meta.url)
function edit(file, fn) { const path=new URL(file,dir);fs.writeFileSync(path,fn(fs.readFileSync(path,'utf8'))) }
for(const file of ['DateRangePicker.spec.ts','DateRangePicker.dismiss.spec.ts','DateRangePicker.midnight.spec.ts']) edit(file,s=>{
  s=s.replace("import { mount } from '@/__tests__/render'", "import { mount, portal, settleControls, clickOutside, pressKey } from '@/__tests__/render'")
  s=s.replace(/(wrapper|w)\.findAll(?:<HTMLInputElement>)?\(('(?:\.date-picker-preset|input\[type="date"\])')\)/g, 'portal().findAll<HTMLInputElement>($2)')
    .replace(/(wrapper|w)\.(find|get)\('\.date-picker-apply'\)/g, "portal().get('.date-picker-apply')")
    .replace('document.body.click()', 'await clickOutside()')
    .replace("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))", "await pressKey('Escape')")
    .replace(/await nextTick\(\)/g,'await settleControls()')
  if(!s.includes('await settleControls()'))s=s.replace(', settleControls','')
  if(!s.includes('await clickOutside()'))s=s.replace(', clickOutside','')
  if(!s.includes('await pressKey('))s=s.replace(', pressKey','')
  s=s.replace('nextTick, ref','ref')
  return s
})
edit('DataTable.spec.ts',s=>s.replace(/\.setValue\((true|false)\)/g,".trigger('click')").replace('checkbox.element.checked',"checkbox.attributes('aria-checked') === 'true'"))
edit('ProxySelector.testing.spec.ts',s=>s.replace("import { mount } from '@/__tests__/render'", "import { mount, settleControls } from '@/__tests__/render'").replace(', flushPromises','').replace(/await flushPromises\(\)/g,'await settleControls()'))
for(const file of ['BaseDialog.ids.spec.ts','BaseDialog.scrollLock.spec.ts','BaseDialog.spec.ts'])edit(file,s=>{
  s=s.replace("import { mount } from '@/__tests__/render'", "import { mount, settleControls } from '@/__tests__/render'").replace("import { nextTick } from 'vue'\n",'').replace(/await nextTick\(\)/g,'await settleControls()')
  if(file.includes('scrollLock'))s=s.replace("document.body.classList.contains('modal-open')", "[document.body, document.documentElement].some(node => node.style.overflow === 'hidden')")
    .replace('function dialog(show = true)', 'async function dialog(show = true)').replace('  return mount(BaseDialog,', '  const wrapper = mount(BaseDialog,').replace("global: { stubs: { Icon: true } } })\n}", "global: { stubs: { Icon: true } } })\n  await settleControls()\n  return wrapper\n}")
    .replace(/, \(\) => \{/g, ', async () => {').replace(/(?<!function |async function )\bdialog\((true|false)?\)/g, 'await dialog($1)')
  return s
})
edit('Select.searchHighlight.spec.ts',s=>s.replace("import { mount } from '@/__tests__/render'", "import { mount, settleControls, typeText } from '@/__tests__/render'").replace("import { DOMWrapper } from '@vue/test-utils'\n",'').replace("import { nextTick } from 'vue'\n",'').replace(/await nextTick\(\)/g,'await settleControls()').replace('await new DOMWrapper(input).setValue(query)', 'await typeText(input, query)'))
edit('Select.keyboard.spec.ts',s=>s.replace("import { mount } from '@/__tests__/render'", "import { mount, settleControls } from '@/__tests__/render'").replace("import { nextTick } from 'vue'\n",'').replace(/await nextTick\(\)/g,'await settleControls()').replace("expect(document.activeElement).toBe(document.querySelector('[role=\"listbox\"]'))", "expect(document.querySelector('[role=\"listbox\"]')?.contains(document.activeElement)).toBe(true)"))
