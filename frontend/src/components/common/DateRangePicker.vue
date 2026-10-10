<template>
  <KumoPopover v-model="isOpen" :label="displayValue" trigger-class="date-picker-trigger" class="platform-date-picker">
    <template #trigger>
      <Icon name="calendar" size="sm" />
      <span>{{ displayValue }}</span>
      <Icon name="chevronDown" size="sm" />
    </template>
    <div class="grid grid-cols-2 gap-1 p-2">
      <KumoButton v-for="preset in presets" :key="preset.value" size="sm" variant="ghost"
        :aria-pressed="isPresetActive(preset)"
        class="date-picker-preset platform-menu-item" @click="selectPreset(preset)">
        {{ t(preset.labelKey) }}
      </KumoButton>
    </div>
    <KumoDatePicker :locale="locale" :start-date="localStartDate" :end-date="localEndDate" :max="tomorrow()"
      @range-change="onCalendarChange" class="mx-auto" />
    <div class="flex gap-2 p-3">
      <KumoLabel class="date-picker-field min-w-0 flex-1 text-xs">{{ t('dates.startDate') }}
        <KumoInput type="date" v-model="localStartDate" :max="localEndDate || tomorrow()"
          :aria-label="t('dates.startDate')" class="w-full" @change="onDateChange" />
      </KumoLabel>
      <KumoLabel class="date-picker-field min-w-0 flex-1 text-xs">{{ t('dates.endDate') }}
        <KumoInput type="date" v-model="localEndDate" :min="localStartDate" :max="tomorrow()"
          :aria-label="t('dates.endDate')" class="w-full" @change="onDateChange" />
      </KumoLabel>
    </div>
    <div class="flex justify-end px-3 pb-3">
      <KumoButton variant="primary" class="date-picker-apply" :disabled="!localStartDate || !localEndDate || localStartDate > localEndDate" @click="apply">{{ t('dates.apply') }}</KumoButton>
    </div>
  </KumoPopover>
</template>

<script setup lang="ts">
import { KumoButton, KumoDatePicker, KumoInput, KumoLabel, KumoPopover } from '@/components/kumo'

import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'

interface DatePreset {
  labelKey: string
  value: string
  getRange: () => { start: string; end: string }
}

interface Props {
  startDate: string
  endDate: string
}

interface Emits {
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
  (e: 'change', range: { startDate: string; endDate: string; preset: string | null }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t, locale } = useI18n()

const isOpen = ref(false)
const localStartDate = ref(props.startDate)
const localEndDate = ref(props.endDate)
const activePreset = ref<string | null>('last24Hours')

const today = () => formatDateToString(new Date())

// Tomorrow's date - used for max date to handle timezone differences
// When user is in a timezone behind the server, "today" on server might be "tomorrow" locally
const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDateToString(d)
}

// Helper function to format date to YYYY-MM-DD using local timezone
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const presets: DatePreset[] = [
  {
    labelKey: 'dates.today',
    value: 'today',
    getRange: () => {
      const t = today()
      return { start: t, end: t }
    }
  },
  {
    labelKey: 'dates.yesterday',
    value: 'yesterday',
    getRange: () => {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      const yesterday = formatDateToString(d)
      return { start: yesterday, end: yesterday }
    }
  },
  {
    labelKey: 'dates.last24Hours',
    value: 'last24Hours',
    getRange: () => {
      const end = new Date()
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
      return {
        start: formatDateToString(start),
        end: formatDateToString(end)
      }
    }
  },
  {
    labelKey: 'dates.last7Days',
    value: '7days',
    getRange: () => {
      const end = today()
      const d = new Date()
      d.setDate(d.getDate() - 6)
      const start = formatDateToString(d)
      return { start, end }
    }
  },
  {
    labelKey: 'dates.last14Days',
    value: '14days',
    getRange: () => {
      const end = today()
      const d = new Date()
      d.setDate(d.getDate() - 13)
      const start = formatDateToString(d)
      return { start, end }
    }
  },
  {
    labelKey: 'dates.last30Days',
    value: '30days',
    getRange: () => {
      const end = today()
      const d = new Date()
      d.setDate(d.getDate() - 29)
      const start = formatDateToString(d)
      return { start, end }
    }
  },
  {
    labelKey: 'dates.thisMonth',
    value: 'thisMonth',
    getRange: () => {
      const now = new Date()
      const start = formatDateToString(new Date(now.getFullYear(), now.getMonth(), 1))
      return { start, end: today() }
    }
  },
  {
    labelKey: 'dates.lastMonth',
    value: 'lastMonth',
    getRange: () => {
      const now = new Date()
      const start = formatDateToString(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      const end = formatDateToString(new Date(now.getFullYear(), now.getMonth(), 0))
      return { start, end }
    }
  }
]

const displayValue = computed(() => {
  if (activePreset.value) {
    const preset = presets.find((p) => p.value === activePreset.value)
    if (preset) return t(preset.labelKey)
  }

  if (localStartDate.value && localEndDate.value) {
    if (localStartDate.value === localEndDate.value) {
      return formatDate(localStartDate.value)
    }
    return `${formatDate(localStartDate.value)} - ${formatDate(localEndDate.value)}`
  }

  return t('dates.selectDateRange')
})

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  const dateLocale = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  return date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
}

const isPresetActive = (preset: DatePreset): boolean => {
  return activePreset.value === preset.value
}

const selectPreset = (preset: DatePreset) => {
  const range = preset.getRange()
  localStartDate.value = range.start
  localEndDate.value = range.end
  activePreset.value = preset.value
}

const onDateChange = () => {
  // Check if current dates match any preset
  activePreset.value = null
  for (const preset of presets) {
    const range = preset.getRange()
    if (range.start === localStartDate.value && range.end === localEndDate.value) {
      activePreset.value = preset.value
      break
    }
  }
}

const onCalendarChange = (range: { start: string; end: string }) => {
  localStartDate.value = range.start
  localEndDate.value = range.end
  onDateChange()
}

const apply = () => {
  emit('update:startDate', localStartDate.value)
  emit('update:endDate', localEndDate.value)
  emit('change', {
    startDate: localStartDate.value,
    endDate: localEndDate.value,
    preset: activePreset.value
  })
  isOpen.value = false
}

// Restore the applied range after dismissal, including parent updates from Apply.
watch(isOpen, (open) => {
  if (open) return
  localStartDate.value = props.startDate
  localEndDate.value = props.endDate
  onDateChange()
}, { flush: 'post' })

// Sync local state with props
watch(
  () => props.startDate,
  (val) => {
    localStartDate.value = val
    onDateChange()
  }
)

watch(
  () => props.endDate,
  (val) => {
    localEndDate.value = val
    onDateChange()
  }
)

onMounted(() => {
  // Initialize active preset detection
  onDateChange()
})


</script>
