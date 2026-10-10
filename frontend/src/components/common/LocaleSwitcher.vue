<template>
  <KumoDropdown v-model="isOpen">
    <KumoDropdownTrigger
      :disabled="switching"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-label="currentLocale?.name"
      @keydown.esc="isOpen = false"
      class="platform-nav-control flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-gray-600 transition-colors hover:bg-[var(--brand-hover)] dark:text-gray-300"
      :title="currentLocale?.name"
    >
      <span v-if="!textOnly" class="text-base">{{ currentLocale?.flag }}</span>
      <span :class="textOnly ? '' : 'hidden sm:inline'">{{ textOnly ? currentLocale?.name : currentLocale?.code.toUpperCase() }}</span>
      <Icon
        name="chevronDown"
        size="xs"
        class="platform-nav-chevron text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </KumoDropdownTrigger>


      <KumoDropdownContent
        @keydown.esc="isOpen = false"
        class="platform-nav-menu w-32 overflow-hidden rounded-lg border border-[var(--brand-line)] bg-white dark:bg-dark-800"
      >
        <KumoDropdownItem
          v-for="locale in availableLocales"
          :key="locale.code"
          :disabled="switching"
          @click="selectLocale(locale.code)"
          class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-[var(--brand-hover)] dark:text-gray-200"
          :class="{
            'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400':
              locale.code === currentLocaleCode
          }"
        >
          <span v-if="!textOnly" class="text-base">{{ locale.flag }}</span>
          <span>{{ locale.name }}</span>
          <Icon v-if="locale.code === currentLocaleCode" name="check" size="sm" class="ml-auto text-primary-500" />
        </KumoDropdownItem>
      </KumoDropdownContent>

  </KumoDropdown>
</template>

<script setup lang="ts">
import { KumoDropdown, KumoDropdownContent, KumoDropdownItem, KumoDropdownTrigger } from '@/components/kumo'

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { setLocale, availableLocales } from '@/i18n'

withDefaults(defineProps<{ textOnly?: boolean }>(), { textOnly: false })

const { locale } = useI18n()

const isOpen = ref(false)
const switching = ref(false)

const currentLocaleCode = computed(() => locale.value)
const currentLocale = computed(() => availableLocales.find((l) => l.code === locale.value))


async function selectLocale(code: string) {
  if (switching.value || code === currentLocaleCode.value) {
    isOpen.value = false
    return
  }
  switching.value = true
  try {
    await setLocale(code)
    isOpen.value = false
  } finally {
    switching.value = false
  }
}

</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
