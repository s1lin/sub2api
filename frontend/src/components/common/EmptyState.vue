<template>
  <KumoEmpty :title="displayTitle" :description="description" class="empty-state">
    <template #icon>
      <slot name="icon">
        <component v-if="icon" :is="icon" class="empty-state-icon h-10 w-10" aria-hidden="true" />
        <Icon v-else name="inbox" size="xl" class="empty-state-icon" aria-hidden="true" />
      </slot>
    </template>
    <slot v-if="actionText || $slots.action" name="action">
      <RouterLink v-if="actionTo" :to="actionTo" custom v-slot="{ href, navigate }">
        <KumoButton :href="href" variant="primary" @click="navigate">
          <Icon v-if="actionIcon" name="plus" size="md" />{{ actionText }}
        </KumoButton>
      </RouterLink>
      <KumoButton v-else variant="primary" @click="$emit('action')">
        <Icon v-if="actionIcon" name="plus" size="md" />{{ actionText }}
      </KumoButton>
    </slot>
  </KumoEmpty>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { KumoButton, KumoEmpty } from '@/components/kumo'
import { useI18n } from 'vue-i18n'
import type { Component } from 'vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()

interface Props {
  icon?: Component | string
  title?: string
  description?: string
  actionText?: string
  actionTo?: string | object
  actionIcon?: boolean
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  actionIcon: true
})

const displayTitle = computed(() => props.title || t('common.noData'))

defineEmits(['action'])
</script>
