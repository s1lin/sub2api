<template>
  <KumoToasts :toasts="toasts" @dismiss="appStore.hideToast($event)" />
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { KumoToasts } from '@/components/kumo'
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()
const toasts = computed(() => appStore.toasts.map(toast => ({ ...toast })))
</script>
