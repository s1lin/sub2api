<template>
  <component :is="as" class="metric-strip" :style="{ '--metric-columns': columns }" :aria-label="label">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ columns?: number; label?: string; as?: 'div' | 'dl' }>(), { columns: 4, as: 'div' })
</script>
