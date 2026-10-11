<template>
  <div class="table-page-layout" :class="{ 'mobile-mode': isMobile }">
    <!-- 固定区域：操作按钮 -->
    <PageHeader v-if="!hidePageHeader" class="layout-section-fixed platform-table-toolbar" :title="title" :description="description">
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </PageHeader>

    <!-- 固定区域：搜索和过滤器 -->
    <div v-if="$slots.filters" class="layout-section-fixed platform-table-toolbar">
      <slot name="filters" />
    </div>

    <!-- 滚动区域：表格 -->
    <div class="layout-section-scrollable">
      <div class="table-scroll-container">
        <slot name="table" />
      </div>
    </div>

    <!-- 固定区域：分页器 -->
    <div v-if="$slots.pagination" class="layout-section-fixed">
      <slot name="pagination" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from './PageHeader.vue'
import { usePageHeading } from '@/composables/usePageHeading'

const { title, description } = usePageHeading()
defineProps<{ hidePageHeader?: boolean }>()

import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
/* 桌面端：Flexbox 布局 */
.table-page-layout {
  @apply flex flex-col;
  gap: var(--platform-section-gap);
  height: calc(100dvh - 64px - 2 * var(--platform-page-padding));
}

.layout-section-fixed {
  @apply flex-shrink-0;
}

.layout-section-scrollable {
  @apply flex-1 min-h-0 flex flex-col;
}

/* 表格滚动容器 - 增强版表体滚动方案 */
.table-scroll-container {
  @apply flex flex-col overflow-hidden h-full;
  background: var(--brand-panel);
  border: 1px solid var(--brand-line);
  border-radius: var(--brand-panel-radius);
}

.table-scroll-container :deep(.table-wrapper) {
  @apply flex-1 overflow-x-auto overflow-y-auto;
  /* 确保横向滚动条显示在最底部 */
  scrollbar-gutter: stable;
}

.table-scroll-container :deep(table) {
  @apply w-full;
  min-width: max-content; /* 关键：确保表格宽度根据内容撑开，从而触发横向滚动 */
  display: table; /* 使用标准 table 布局以支持 sticky 列 */
}

.table-scroll-container :deep(thead) {
  background: var(--brand-panel);
}

.table-scroll-container :deep(tbody) {
  /* 保持默认 table-row-group 显示，不使用 block */
}

.table-scroll-container :deep(th) {
  @apply text-gray-600 dark:text-dark-300 border-b;
  border-color: var(--brand-line);
}

.table-scroll-container :deep(td) {
  @apply text-gray-700 dark:text-gray-300 border-b;
  border-color: var(--brand-line);
}

/* 移动端：恢复正常滚动 */
.table-page-layout.mobile-mode { height: auto; }
.table-page-layout.mobile-mode .table-scroll-container {
  @apply h-auto overflow-visible border-none  bg-transparent;
}

.table-page-layout.mobile-mode .layout-section-scrollable {
  @apply flex-none min-h-fit;
}

.table-page-layout.mobile-mode .table-scroll-container :deep(table) {
  @apply flex-none;
  display: table;
  min-width: 100%;
}
</style>
