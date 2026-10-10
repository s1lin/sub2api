import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import { parse as template } from '@vue/compiler-dom'
const file=fileURLToPath(new URL('../src/components/channels/SupportedModelChip.vue',import.meta.url))
let source=fs.readFileSync(file,'utf8')
const {descriptor}=parse(source),elements=node=>(node.children??[]).filter(n=>n.type===1)
const container=elements(template(descriptor.template.content))[0],trigger=elements(container)[0],popup=elements(elements(container)[1])[0]
const chip=trigger.loc.source.replace(/^<span/,'<KumoBadge').replace(/<\/span>$/,'</KumoBadge>')
 .replace(/\s+(ref="triggerEl"|@(?:mouseenter|mouseleave|focusin|focusout)="[^"]*"|tabindex="0")/g,'')
const content=popup.loc.source.replace(/\s+(v-show="show"|ref="popoverEl"|role="tooltip"|:style="popoverStyle")/g,'').replace('pointer-events-none fixed z-[99999] ','')
source=source.slice(0,descriptor.template.loc.start.offset)+`<KumoTooltip :label="model.name" trigger-class="h-auto p-0" class="max-w-[calc(100vw-1rem)] p-0"><template #trigger>${chip}</template>${content}</KumoTooltip>`+source.slice(descriptor.template.loc.end.offset)
source=source.replace('<script setup lang="ts">', '<script setup lang="ts">\nimport { KumoTooltip, KumoBadge } from \'@/components/kumo\'')
 .replace(/import \{[^}]+\} from 'vue'/,"import { computed } from 'vue'")
 .replace(/\/\/ ── Popover positioning[\s\S]*?(?=<\/script>)/,'')
fs.writeFileSync(file,source)
