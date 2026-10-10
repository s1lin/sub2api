import fs from 'node:fs'
const dir=new URL('../src/components/common/__tests__/',import.meta.url)
for(const file of fs.readdirSync(dir)) {
  const path=new URL(file,dir)
  let source=fs.readFileSync(path,'utf8')
  source=source.replaceAll('vi.useFakeTimers()', "vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })")
  if(file==='SubscriptionProgressMini.spec.ts')source=source.replace("import { mount }", "import { mount, portal }").replace("expect(w.text()).toContain('subscriptionProgress.' + label)", "expect(portal().get('[role=dialog]').text()).toContain('subscriptionProgress.' + label)")
  fs.writeFileSync(path,source)
}
