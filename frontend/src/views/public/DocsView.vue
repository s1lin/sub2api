<template>
  <div class="brand-page docs-page">
    <PublicHeader />
    <div class="docs-topbar">
      <div class="brand-container docs-topbar-inner">
        <RouterLink to="/docs" class="docs-brand"><Icon name="book" size="sm" />{{ text(docsUi.title) }}</RouterLink>
        <RouterLink to="/keys" class="docs-key-link">{{ text(docsUi.keys) }}<Icon name="arrowRight" size="sm" /></RouterLink>
      </div>
    </div>
    <div class="brand-container docs-layout">
      <aside class="docs-sidebar" :aria-label="text(docsUi.navigation)">
        <KumoButton class="docs-mobile-menu" type="button" :aria-expanded="menuOpen" aria-controls="docs-navigation" @click="menuOpen = !menuOpen">
          <Icon name="menu" size="sm" />{{ text(docsUi.navigation) }}
        </KumoButton>
        <div id="docs-navigation" class="docs-navigation" :class="{ 'is-open': menuOpen }">
          <div class="docs-search">
            <Icon name="search" size="sm" class="docs-search-icon" aria-hidden="true" />
            <KumoInput v-model="query" type="search" :placeholder="text(docsUi.search)" :aria-label="text(docsUi.search)" />
          </div>
          <nav :aria-label="text(docsUi.navigation)">
            <div v-for="group in filteredGroups" :key="group.id" class="docs-nav-group">
              <h2>{{ text(group.title) }}</h2>
              <RouterLink v-for="item in group.articles" :key="item.slug" :to="docPath(item.slug)" :class="{ 'is-active': article?.slug === item.slug }" :aria-current="article?.slug === item.slug ? 'page' : undefined" @click="menuOpen = false">
                {{ text(item.title) }}
              </RouterLink>
            </div>
            <p v-if="!filteredGroups.length" class="docs-no-results" role="status">{{ text(docsUi.noResults) }}</p>
          </nav>
        </div>
      </aside>
      <main id="docs-content" class="docs-main">
        <article v-if="article" :key="article.slug">
          <header class="docs-article-header">
            <p class="docs-breadcrumb">{{ text(docGroups.find(group => group.id === article?.group)!.title) }}</p>
            <h1 ref="titleElement" tabindex="-1">{{ text(article.title) }}</h1>
            <p class="docs-description">{{ text(article.description) }}</p>
          </header>
          <section v-for="section in article.sections" :id="section.id" :key="section.id" class="docs-section">
            <h2><a :href="`#${section.id}`">{{ text(section.title) }}<span aria-hidden="true">#</span></a></h2>
            <template v-for="(block, index) in section.blocks" :key="index">
              <p v-if="block.type === 'text'">{{ text(block.text) }}</p>
              <aside v-else-if="block.type === 'note'" class="docs-note">{{ text(block.text) }}</aside>
              <ol v-else-if="block.type === 'steps'" class="docs-steps"><li v-for="(item, i) in block.items" :key="i">{{ text(item) }}</li></ol>
              <ul v-else-if="block.type === 'list'" class="docs-list"><li v-for="(item, i) in block.items" :key="i">{{ text(item) }}</li></ul>
              <DocsCodeBlock v-else-if="block.type === 'code'" :label="block.label" :code="block.code" />
              <div v-else-if="block.type === 'table'" class="docs-table-wrap" role="region" :aria-label="text(section.title)" tabindex="0">
                <KumoTable><KumoTableHeader><KumoTableRow><KumoTableHead v-for="(heading, i) in block.headings" :key="i" scope="col">{{ text(heading) }}</KumoTableHead></KumoTableRow></KumoTableHeader>
                  <KumoTableBody><KumoTableRow v-for="(row, i) in block.rows" :key="i"><KumoTableCell v-for="(cell, j) in row" :key="j">{{ text(cell) }}</KumoTableCell></KumoTableRow></KumoTableBody>
                </KumoTable>
              </div>
              <div v-else-if="block.type === 'links'" class="docs-related-links">
                <template v-for="link in block.items" :key="link.href">
                  <RouterLink v-if="link.href.startsWith('/')" :to="link.href">{{ text(link.label) }}<Icon name="arrowRight" size="sm" /></RouterLink>
                  <a v-else :href="link.href" target="_blank" rel="noopener noreferrer">{{ text(link.label) }}<span aria-hidden="true">↗</span></a>
                </template>
              </div>
            </template>
          </section>
          <nav class="docs-pagination" :aria-label="text(docsUi.navigation)">
            <RouterLink v-if="previous" :to="docPath(previous.slug)"><span>{{ text(docsUi.previous) }}</span>{{ text(previous.title) }}</RouterLink>
            <RouterLink v-if="next" class="docs-next" :to="docPath(next.slug)"><span>{{ text(docsUi.next) }}</span>{{ text(next.title) }}<Icon name="arrowRight" size="sm" /></RouterLink>
          </nav>
        </article>
        <article v-else class="docs-article-header">
          <h1>{{ text(docsUi.notFound) }}</h1>
          <p>{{ text(docsUi.notFoundBody) }}</p>
          <KumoLink to="/docs" class="brand-button">{{ text(docsUi.quickstart) }}</KumoLink>
        </article>
      </main>
      <aside v-if="article" class="docs-toc">
        <nav :aria-label="text(docsUi.onThisPage)">
          <h2>{{ text(docsUi.onThisPage) }}</h2>
          <a v-for="section in article.sections" :key="section.id" :href="`#${section.id}`">{{ text(section.title) }}</a>
        </nav>
      </aside>
    </div>
    <footer class="brand-container brand-footer">
      <span>© {{ new Date().getFullYear() }} {{ appStore.siteName }}</span>
      <RouterLink to="/" class="brand-text-link">{{ text(docsUi.home) }}</RouterLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { KumoButton, KumoInput, KumoLink, KumoTable, KumoTableBody, KumoTableCell, KumoTableHead, KumoTableHeader, KumoTableRow } from '@/components/kumo'

import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import PublicHeader from '@/components/layout/PublicHeader.vue'
import DocsCodeBlock from '@/components/docs/DocsCodeBlock.vue'

import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'
import { docArticles, docGroups, docsUi, type DocText } from '@/content/docs'

const route = useRoute()
const appStore = useAppStore()
const { locale } = useI18n()
const text = (value: DocText) => value[locale.value === 'zh' ? 'zh' : 'en']
const query = ref('')
const menuOpen = ref(false)
const titleElement = ref<HTMLElement>()
const slug = computed(() => String(route.params.page || 'quickstart'))
const articleIndex = computed(() => docArticles.findIndex(item => item.slug === slug.value))
const article = computed(() => docArticles[articleIndex.value])
const previous = computed(() => docArticles[articleIndex.value - 1])
const next = computed(() => docArticles[articleIndex.value + 1])
const docPath = (value: string) => value === 'quickstart' ? '/docs' : `/docs/${value}`
const filteredGroups = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  return docGroups.map(group => ({ ...group, articles: docArticles.filter(item => item.group === group.id && (!term || JSON.stringify(item).toLocaleLowerCase().includes(term))) })).filter(group => group.articles.length)
})
watch([slug, locale], async () => {
  document.title = `${text(article.value?.title || docsUi.notFound)} · ${text(docsUi.title)} - ${appStore.siteName}`
  menuOpen.value = false
  query.value = ''
  await nextTick()
  titleElement.value?.focus({ preventScroll: true })
}, { immediate: true })
</script>

<style scoped>
.docs-topbar { border-block: 1px solid var(--brand-line); }
.docs-topbar-inner { display: flex; justify-content: space-between; align-items: center; min-height: 54px; gap: 20px; font-size: 13px; }
.docs-brand, .docs-key-link { display: inline-flex; align-items: center; gap: 10px; font-weight: 550; }
.docs-key-link { color: var(--brand-accent); }
.docs-layout { display: grid; grid-template-columns: 210px minmax(0, 1fr) 160px; gap: 48px; align-items: start; padding-block: 40px 64px; }
.docs-sidebar { position: sticky; top: 24px; max-height: calc(100dvh - 48px); overflow-y: auto; }
.docs-mobile-menu { display: none; }
/* KumoInput is rendered by React, so its <input> is only reachable through :deep(); Kumo draws the field box itself. */
.docs-search { position: relative; }
.docs-search-icon { position: absolute; top: 50%; left: 11px; z-index: 1; transform: translateY(-50%); color: var(--brand-muted); pointer-events: none; }
.docs-search :deep(input) { width: 100%; min-width: 0; padding-left: 32px; font-size: 13px; }
.docs-search :deep(input::placeholder) { color: var(--brand-muted); }
.docs-search :deep(input::-webkit-search-cancel-button) { -webkit-appearance: none; appearance: none; }
.docs-nav-group { margin-top: 26px; }
.docs-nav-group h2, .docs-toc h2 { margin: 0 0 10px; font-size: 12px; font-weight: 650; }
.docs-nav-group a { display: block; padding: 8px 12px; margin: 2px 0; border-radius: 6px; font-size: 13px; line-height: 1.5; color: var(--brand-muted); }
.docs-nav-group a:hover { color: var(--brand-ink); background: var(--brand-inset); }
.docs-nav-group a.is-active { background: var(--brand-accent-soft); color: var(--brand-accent); font-weight: 600; }
.docs-no-results { margin-top: 20px; color: var(--brand-muted); font-size: 13px; line-height: 1.7; }
.docs-main { min-width: 0; }
.docs-article-header { padding: 0 0 32px; border-bottom: 1px solid var(--brand-line); }
.docs-breadcrumb { margin-bottom: 14px; color: var(--brand-accent); font-size: 12px; font-weight: 550; }
.docs-article-header h1 { font-size: clamp(28px, 3.2vw, 40px); line-height: 1.2; font-weight: 600; letter-spacing: -.04em; }
.docs-article-header h1:focus { outline: none; }
.docs-description { margin-top: 16px; color: var(--brand-muted); font-size: 16px; line-height: 1.7; }
.docs-section { margin-top: 36px; scroll-margin-top: 24px; }
.docs-section h2 { margin-bottom: 16px; font-size: 21px; line-height: 1.4; letter-spacing: -.025em; font-weight: 600; }
.docs-section h2 a { display: inline-flex; gap: 10px; }
.docs-section h2 a span { color: var(--brand-muted); opacity: 0; }
.docs-section h2 a:hover span, .docs-section h2 a:focus-visible span { opacity: 1; }
.docs-section p, .docs-section li, .docs-note { font-size: 14px; line-height: 1.85; overflow-wrap: anywhere; }
.docs-section p + p { margin-top: 14px; }
.docs-section p, .docs-section li { color: var(--brand-muted); }
.docs-steps, .docs-list { display: grid; gap: 12px; padding-left: 22px; }
.docs-steps { list-style: decimal; }
.docs-list { list-style: disc; }
.docs-section li::marker { color: var(--brand-accent); font-weight: 600; }
.docs-note { margin-block: 22px; padding: 16px 20px; border-left: 3px solid var(--brand-accent); background: var(--brand-accent-soft); border-radius: 0 6px 6px 0; }
.docs-table-wrap { max-width: 100%; overflow-x: auto; margin-block: 20px; border: 1px solid var(--brand-line); border-radius: 8px; }
.docs-table-wrap table { width: 100%; text-align: left; font-size: 13px; line-height: 1.75; }
.docs-table-wrap th { background: var(--brand-inset); font-weight: 600; }
.docs-table-wrap th, .docs-table-wrap td { padding: 12px 16px; vertical-align: top; min-width: 90px; }
.docs-table-wrap td { border-top: 1px solid var(--brand-line); overflow-wrap: anywhere; }
.docs-related-links { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 20px; }
.docs-related-links a { display: inline-flex; align-items: center; gap: 7px; color: var(--brand-accent); font-size: 13px; font-weight: 550; }
.docs-related-links a:hover { text-decoration: underline; text-underline-offset: 4px; }
.docs-toc { position: sticky; top: 24px; border-left: 1px solid var(--brand-line); padding-left: 20px; }
.docs-toc a { display: block; margin-top: 12px; color: var(--brand-muted); font-size: 12px; line-height: 1.6; }
.docs-toc a:hover { color: var(--brand-accent); }
.docs-pagination { display: flex; justify-content: space-between; gap: 24px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--brand-line); font-size: 14px; font-weight: 550; }
.docs-pagination a { position: relative; }
.docs-pagination span { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 400; color: var(--brand-muted); }
.docs-next { margin-left: auto; padding-right: 22px; text-align: right; }
.docs-next :deep(svg) { position: absolute; right: 0; bottom: 2px; }
@media (max-width: 1150px) {
  .docs-layout { grid-template-columns: 195px minmax(0, 1fr); gap: 36px; }
  .docs-toc { display: none; }
}
@media (max-width: 767px) {
  .docs-layout { grid-template-columns: minmax(0, 1fr); gap: 26px; padding-block: 16px 40px; }
  .docs-sidebar { position: static; max-height: none; overflow: visible; }
  .docs-mobile-menu { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding-inline: 0; }
  .docs-navigation { display: none; padding: 16px 0 22px; border-bottom: 1px solid var(--brand-line); }
  .docs-navigation.is-open { display: block; }
  .docs-nav-group { margin-top: 20px; }
  .docs-article-header { padding-bottom: 24px; }
  .docs-section { margin-top: 28px; }
  .docs-topbar-inner { gap: 12px; font-size: 12px; }
  .docs-description { font-size: 15px; }
}
</style>
