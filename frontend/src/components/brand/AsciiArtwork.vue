<template>
  <div class="ascii-artwork" :class="`ascii-artwork--${variant}`" aria-hidden="true">
    <pre>{{ artwork }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import hero from '@/assets/ascii/hero-core.txt?raw'
import network from '@/assets/ascii/model-network.txt?raw'
import reel from '@/assets/ascii/video-reel.txt?raw'

// Original artwork converted with neethanwu/ascii-art. Real text, no canvas runtime.
const sources = { hero, network, reel }
const props = withDefaults(defineProps<{ variant?: keyof typeof sources }>(), { variant: 'hero' })
const artwork = computed(() => sources[props.variant].replace(/\n$/, ''))
</script>

<style scoped>
.ascii-artwork { width: 100%; min-width: 0; container-type: inline-size; color: var(--brand-accent); user-select: none; }
/* font-size = 98cqw / (columns * 0.6em glyph advance) */
.ascii-artwork pre { margin: 0; overflow: hidden; font-family: var(--brand-mono); font-size: 1.167cqw; font-weight: 500; line-height: 1.2; letter-spacing: 0; font-variant-ligatures: none; white-space: pre; text-align: left; }
.ascii-artwork--network pre { font-size: 2.04cqw; }
.ascii-artwork--reel pre { font-size: 1.7cqw; }
</style>
