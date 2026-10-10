<template>
  <KumoSurface class="panel" :aria-labelledby="title ? headingId : undefined">
    <div v-if="title || $slots.header || $slots.actions" class="panel-header">
      <div>
        <slot name="header"><h2 :id="headingId">{{ title }}</h2></slot>
        <p v-if="description" class="panel-description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="panel-actions"><slot name="actions" /></div>
    </div>
    <slot v-if="flush" />
    <div v-else class="panel-body"><slot /></div>
    <div v-if="$slots.footer" class="panel-footer"><slot name="footer" /></div>
  </KumoSurface>
</template>

<script setup lang="ts">
import { useId } from 'vue'
import { KumoSurface } from '@/components/kumo'

defineProps<{ title?: string; description?: string; flush?: boolean }>()
const headingId = useId()
</script>
