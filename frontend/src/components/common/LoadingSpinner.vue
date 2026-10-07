<template>
  <KumoLoader :size="pixels" :class="colorClass" :aria-label="t('common.loading')" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { KumoLoader } from '@/components/kumo'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'
type SpinnerColor = 'primary' | 'secondary' | 'white' | 'gray'

interface Props {
  size?: SpinnerSize
  color?: SpinnerColor
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary'
})

const pixels = computed(() => ({ sm: 16, md: 32, lg: 48, xl: 64 })[props.size])

const colorClass = computed(() => {
  const colors: Record<SpinnerColor, string> = {
    primary: 'text-primary-500',
    secondary: 'text-gray-500 dark:text-dark-400',
    white: 'text-white',
    gray: 'text-gray-400 dark:text-dark-500'
  }
  return colors[props.color]
})
</script>
