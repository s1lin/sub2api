<template>
  <KumoButton
    :disabled="switching"
    :aria-label="label"
    :title="label"
    class="platform-nav-control btn-ghost flex items-center"
    @click="toggleLocale"
  >
    <!-- Like the theme toggle, the button shows what a click switches to. -->
    <span v-if="!textOnly" class="text-base">{{ nextLocale.flag }}</span>
    <span :class="textOnly ? '' : 'hidden sm:inline'">{{ textOnly ? nextLocale.name : nextLocale.code.toUpperCase() }}</span>
  </KumoButton>
</template>

<script setup lang="ts">
import { KumoButton } from '@/components/kumo'

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, availableLocales } from '@/i18n'

withDefaults(defineProps<{ textOnly?: boolean }>(), { textOnly: false })

const { locale } = useI18n()

const switching = ref(false)

// Cycles through every available locale; with English and Chinese it is a two-way toggle.
const nextLocale = computed(() => {
  const index = availableLocales.findIndex((l) => l.code === locale.value)
  return availableLocales[(index + 1) % availableLocales.length]
})
const label = computed(() => nextLocale.value.name)

async function toggleLocale() {
  if (switching.value) return
  switching.value = true
  try {
    await setLocale(nextLocale.value.code)
  } finally {
    switching.value = false
  }
}
</script>
