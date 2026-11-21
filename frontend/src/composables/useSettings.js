import { ref, computed } from 'vue'
import { api } from '../api'

// Contact settings, loaded once and shared by every component
export const DEFAULT_ZALO = '0869809594'

const settings = ref({})
let loading = null

export function loadSettings(force = false) {
  if (!loading || force) {
    loading = api('/api/settings')
      .then((s) => (settings.value = s))
      .catch(() => {})
  }
  return loading
}

export function useSettings() {
  loadSettings()

  // Zalo can be stored as a phone number or a full link (admin → Cài đặt); default number below
  const zaloUrl = computed(() => {
    const z = String(settings.value.zalo || DEFAULT_ZALO).trim()
    if (!z) return null
    if (/^https?:\/\//.test(z)) return z
    return 'https://zalo.me/' + z.replace(/\D/g, '')
  })

  return { settings, zaloUrl }
}
