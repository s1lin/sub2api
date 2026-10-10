import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as template } from '@vue/compiler-dom'
const root=fileURLToPath(new URL('../src/',import.meta.url))
const elements=node=>(node.children??[]).filter(n=>n.type===1)
function write(file, change, clean) {
  let source=fs.readFileSync(root+file,'utf8')
  const {descriptor}=parse(source), block=descriptor.template
  const result=change(template(block.content),block.content)
  source=source.slice(0,block.loc.start.offset)+result+source.slice(block.loc.end.offset)
  fs.writeFileSync(root+file,clean(source))
}
write('components/admin/account/AccountActionMenu.vue',(ast)=>{
  const teleport=elements(ast)[0],overlay=elements(teleport)[0],panel=elements(overlay)[1]
  const body=panel.children.map(n=>n.loc.source).join('').replace(/KumoButton/g,'KumoDropdownItem')
  return `<KumoDropdown :model-value="show && !!anchorRect" @update:model-value="!$event && emit('close')">
    <KumoDropdownContent v-if="anchorRect" :anchor="{ getBoundingClientRect: () => anchorRect! }" class="action-menu-content w-52 max-h-[calc(100dvh-1rem)] overflow-y-auto">${body}</KumoDropdownContent>
  </KumoDropdown>`
},s=>s.replace("import { KumoButton }", "import { KumoDropdown, KumoDropdownContent, KumoDropdownItem }")
  .replace('computed, ref, watch, onUnmounted','computed').replace(/import \{ useResizeObserver, useWindowSize \}[^\n]*\n/,'')
  .replace(/const menuRef =[\s\S]*?(?=const canDuplicate)/,'')
  .replace(/const handleKeydown =[\s\S]*?(?=<\/script>)/,''))

write('components/common/SubscriptionProgressMini.vue',(ast,content)=>{
  const container=elements(ast)[0],trigger=elements(container)[0],transition=elements(container)[1],popup=elements(transition)[0]
  let inner=content.slice(container.loc.start.offset,container.loc.end.offset)
  const replace=(node,text)=>{inner=inner.slice(0,node.loc.start.offset-container.loc.start.offset)+text+inner.slice(node.loc.end.offset-container.loc.start.offset)}
  replace(transition,popup.loc.source.replace(/^<div/,'<KumoPopoverContent').replace(/<\/div>$/,'</KumoPopoverContent>').replace(/\s+v-if="tooltipOpen"/,'').replace(/\b(absolute|right-0|z-50|mt-2)\b/g,''))
  replace(trigger,trigger.loc.source.replace(/KumoButton/g,'KumoPopoverTrigger').replace(/\s+@click="toggleTooltip"/,''))
  return inner.replace(/^<div[^>]*>/,'<KumoPopoverRoot v-if="subscriptionFeatureEnabled && hasActiveSubscriptions" v-model="tooltipOpen">').replace(/<\/div>$/,'</KumoPopoverRoot>')
},s=>s.replace(/import \{ ([^}]+) \} from '@\/components\/kumo'/,"import { $1, KumoPopoverRoot, KumoPopoverTrigger, KumoPopoverContent } from '@/components/kumo'")
 .replace('onMounted, onBeforeUnmount','onMounted').replace(/const containerRef[^\n]*\n/,'')
 .replace(/function toggleTooltip\(\)[\s\S]*?\n\}/,'')
 .replace(/function handleClickOutside\([\s\S]*?\n\}/,'')
 .replace("  document.addEventListener('click', handleClickOutside)\n",'')
 .replace(/onBeforeUnmount\([\s\S]*?\n\}\)\n/,''))

write('components/account/AccountGroupsCell.vue',(ast,content)=>{
 const container=elements(ast)[0],row=elements(container)[0],trigger=elements(row).find(n=>n.tag==='KumoButton'),teleport=elements(container).find(n=>n.tag==='Teleport'),transition=elements(teleport)[0],popup=elements(transition)[0],backdrop=elements(container).at(-1)
 const edits=[
  [container.loc.start.offset,container.loc.start.offset+container.loc.source.indexOf('>')+1,'<KumoPopoverRoot v-if="groups && groups.length > 0" v-model="showPopover">'],
  [container.loc.end.offset-6,container.loc.end.offset,'</KumoPopoverRoot>'],
  [trigger.loc.start.offset,trigger.loc.end.offset,trigger.loc.source.replace(/KumoButton/g,'KumoPopoverTrigger').replace(/\s+ref="moreButtonRef"/,'').replace(/\s+@click.stop="[^"]*"/,'')],
  [teleport.loc.start.offset,teleport.loc.end.offset,popup.loc.source.replace(/^<div/,'<KumoPopoverContent').replace(/<\/div>$/,'</KumoPopoverContent>').replace(/\s+(v-if="showPopover"|ref="popoverRef"|:style="popoverStyle")/g,'').replace('fixed z-50 ','')],
  [backdrop.loc.start.offset,backdrop.loc.end.offset,''],
 ]
 for(const[a,b,value]of edits.sort((a,b)=>b[0]-a[0]))content=content.slice(0,a)+value+content.slice(b)
 return content
},s=>s.replace("import { KumoButton }", "import { KumoButton, KumoPopoverRoot, KumoPopoverTrigger, KumoPopoverContent }")
 .replace('ref, computed, onMounted, onUnmounted','ref, computed').replace(/const (moreButtonRef|popoverRef)[^\n]*\n/g,'')
 .replace(/\/\/ Popover 位置样式[\s\S]*?(?=<\/script>)/,''))
console.log('Migrated account actions, account group popover, and subscription details')
