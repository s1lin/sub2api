<template>
  <header class="page-heading">
    <div class="page-heading-copy">
      <component :is="headingTag || 'h1'">{{ title }}</component>
      <p v-if="description">{{ description }}</p>
      <slot />
    </div>
    <div v-if="$slots.actions" class="page-heading-actions"><slot name="actions" /></div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string; headingTag?: 'h1' | 'h2' }>()
</script>
