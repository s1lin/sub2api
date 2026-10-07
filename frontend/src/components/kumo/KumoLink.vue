<template>
  <RouterLink v-bind="props" custom v-slot="{ href, navigate, isActive, isExactActive }">
    <KumoButton v-bind="$attrs" :href="href"
      :class="[isActive && activeClass, isExactActive && exactActiveClass]" @click="navigate">
      <slot />
    </KumoButton>
  </RouterLink>
</template>
<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { KumoButton } from './controls'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  to: RouteLocationRaw
  replace?: boolean
  activeClass?: string
  exactActiveClass?: string
}>(), { activeClass: 'router-link-active', exactActiveClass: 'router-link-exact-active' })
</script>
