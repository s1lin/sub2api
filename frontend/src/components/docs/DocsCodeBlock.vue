<template>
  <div class="docs-code">
    <div class="docs-code-toolbar">
      <span>{{ label }}</span>
      <KumoButton type="button" class="docs-copy" :aria-label="`${text(docsUi.copy)} ${label}`" @click="copy">
        <Icon :name="copied ? 'check' : 'copy'" size="sm" />
        <span>{{ text(copied ? docsUi.copied : docsUi.copy) }}</span>
      </KumoButton>
    </div>
    <pre tabindex="0" :aria-label="label"><code>{{ code }}</code></pre>
    <span class="sr-only" role="status">{{ copied ? text(docsUi.copied) : '' }}</span>
    <p v-if="failed" class="docs-copy-error" role="alert">{{ text(docsUi.copyFailed) }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { KumoButton } from '@/components/kumo'
import Icon from '@/components/icons/Icon.vue'
import { docsUi, type DocText } from '@/content/docs'

const props = defineProps<{ label: string; code: string }>()
const { locale } = useI18n()
const text = (value: DocText) => value[locale.value === 'zh' ? 'zh' : 'en']
const copied = ref(false)
const failed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  clearTimeout(timer)
  failed.value = false
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    timer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
    failed.value = true
  }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.docs-code { margin: 22px 0; overflow: hidden; border: 1px solid var(--brand-line); border-radius: 10px; background: var(--brand-surface); }
.docs-code-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 46px; padding: 5px 10px 5px 18px; border-bottom: 1px solid var(--brand-line); color: var(--brand-muted); font: 12px var(--brand-mono); }
.docs-copy { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; min-height: 32px; font: 12px var(--brand-font); }
pre { overflow-x: auto; padding: 20px; color: var(--brand-ink); font: 12.5px/1.85 var(--brand-mono); tab-size: 2; }
pre:focus-visible { outline: 2px solid var(--brand-accent); outline-offset: -3px; }
.docs-copy-error { padding: 0 20px 16px; font-size: 13px; color: var(--brand-muted); }
</style>
