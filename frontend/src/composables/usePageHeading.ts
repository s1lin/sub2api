import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore, useAdminSettingsStore } from '@/stores'
import { resolveRouteMetaKeys } from '@/router/title'
import { resolveSiteBillingMode } from '@/utils/siteBillingMode'

/** Share the route's translated heading between the breadcrumb and content. */
export function usePageHeading() {
  const route = useRoute()
  const { t } = useI18n()
  const app = useAppStore()
  const auth = useAuthStore()
  const admin = useAdminSettingsStore()
  const keys = computed(() => resolveRouteMetaKeys(route, {
    billingMode: resolveSiteBillingMode(app.cachedPublicSettings),
  }))
  const title = computed(() => {
    if (route.name === 'CustomPage') {
      const id = route.params.id as string
      const item = app.cachedPublicSettings?.custom_menu_items?.find(item => item.id === id)
        ?? (auth.isAdmin ? admin.customMenuItems.find(item => item.id === id) : undefined)
      if (item?.label) return item.label
    }
    return keys.value.titleKey ? t(keys.value.titleKey) : String(route.meta.title || '')
  })
  const description = computed(() => keys.value.descriptionKey
    ? t(keys.value.descriptionKey) : String(route.meta.description || ''))
  return { title, description }
}
