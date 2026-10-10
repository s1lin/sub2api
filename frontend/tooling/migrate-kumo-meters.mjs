import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as template } from '@vue/compiler-dom'
import ts from 'typescript'
const root = fileURLToPath(new URL('../src/', import.meta.url))
const files = ['views/user/KeysView.vue', 'views/user/SubscriptionsView.vue', 'views/admin/SubscriptionsView.vue', 'components/common/SubscriptionProgressMini.vue', 'components/common/ExportProgressDialog.vue', 'components/user/dashboard/UserDashboardStats.vue']
let count = 0
for (const file of files) {
  let source=fs.readFileSync(root+file,'utf8')
  const { descriptor }=parse(source), base=descriptor.template.loc.start.offset, edits=[]
  function visit(node) {
    if(node.type===1 && node.tag==='div') {
      const children=node.children.filter(c=>c.type===1)
      const child=children.length===1 ? children[0] : null
      const style=child?.props.find(p=>p.type===7 && p.name==='bind' && p.arg?.content==='style')
      const cls=node.props.find(p=>p.type===6 && p.name==='class')?.value?.content ?? ''
      if(child?.tag==='div' && style && /rounded|overflow-hidden/.test(cls)) {
        const expr=ts.createSourceFile('value.ts',`const value = (${style.exp.content})`,ts.ScriptTarget.Latest,true)
        let width
        function inspect(n) { if(ts.isPropertyAssignment(n) && n.name.getText(expr)==='width') width=n.initializer.getText(expr); ts.forEachChild(n,inspect) }
        inspect(expr)
        if(width) {
          const childClass=child.props.find(p=>p.type===6 && p.name==='class')?.value?.content ?? ''
          const boundClass=child.props.find(p=>p.type===7 && p.name==='bind' && p.arg?.content==='class')?.exp?.content
          const attrs=node.props.filter(p=>!(p.type===6 && p.name==='class')).map(p=>p.loc.source).join(' ')
          const label=file.includes('Keys') ? "t('keys.quota')" : file.includes('Export') ? "t('common.export')" : "t('common.usage')"
          const indicator=boundClass ? `[${JSON.stringify(childClass)}, (${boundClass})]` : JSON.stringify(childClass)
          const replacement=`<KumoMeter ${attrs} compact :label="${label}" :value="Number.parseFloat(String(${width.replace(/"/g,'&quot;')})) || 0" class="${cls}" track-class-name="h-full min-h-[inherit]" :indicator-class-name="${indicator.replace(/"/g,'&quot;')}" />`
          edits.push([base+node.loc.start.offset,base+node.loc.end.offset,replacement]);count++;return
        }
      }
    }
    for(const child of node.children??[]) visit(child)
  }
  visit(template(descriptor.template.content))
  for(const [a,b,text] of edits.sort((a,b)=>b[0]-a[0])) source=source.slice(0,a)+text+source.slice(b)
  if(edits.length) source=source.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/, "import { $1, KumoMeter } from '@/components/kumo'")
  fs.writeFileSync(root+file,source)
}
for (const file of ['components/common/GroupBadge.vue','components/common/GroupCapacityBadge.vue','components/common/PlatformTypeBadge.vue']) {
  let source=fs.readFileSync(root+file,'utf8')
  const {descriptor}=parse(source),base=descriptor.template.loc.start.offset,edits=[]
  function visit(node) {
    if(node.type===1 && node.tag==='span' && node.props.some(p=>p.name==='bind' && p.arg?.content==='class' && /badgeClass|capacityClass|platformClass|typeClass|planBadgeClass|privacyBadge.class/.test(p.exp?.content??''))) {
      edits.push([base+node.loc.start.offset+1,base+node.loc.start.offset+5,'KumoBadge'])
      edits.push([base+node.loc.end.offset-5,base+node.loc.end.offset-1,'KumoBadge'])
    }
    for(const child of node.children??[])visit(child)
  }
  visit(template(descriptor.template.content))
  for(const[a,b,text]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+text+source.slice(b)
  source=source.replace('<script setup lang="ts">', '<script setup lang="ts">\nimport { KumoBadge } from \'@/components/kumo\'')
  fs.writeFileSync(root+file,source)
}
console.log(`Migrated ${count} quota/export meters and 3 badge families`)
