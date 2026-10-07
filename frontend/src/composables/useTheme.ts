import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Share the existing persisted theme across public, auth, and account surfaces. */
export function useTheme() {
  const isDark = ref(document.documentElement.classList.contains('dark'))
  let observer: MutationObserver | undefined
  let media: MediaQueryList | undefined

  function syncSystemTheme() {
    if (!localStorage.getItem('theme') && media) {
      document.documentElement.classList.toggle('dark', media.matches)
    }
  }

  function toggleTheme() {
    isDark.value = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  onMounted(() => {
    observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener?.('change', syncSystemTheme)
    syncSystemTheme()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    media?.removeEventListener?.('change', syncSystemTheme)
  })

  return { isDark, toggleTheme }
}
