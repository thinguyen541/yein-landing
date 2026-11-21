import { ref } from 'vue'
import { api } from '../api'

// Public catalogue (all active products + collections), loaded once and shared by every page
const products = ref([])
const collections = ref([])
const loaded = ref(false)
const error = ref('')
let loading = null

export function loadCatalog(force = false) {
  if (!loading || force) {
    loading = Promise.all([api('/api/products'), api('/api/collections')])
      .then(([p, c]) => {
        products.value = p
        collections.value = c
        error.value = ''
      })
      .catch(() => {
        error.value = 'Không tải được sản phẩm.'
      })
      .finally(() => {
        loaded.value = true
      })
  }
  return loading
}

export function useCatalog() {
  loadCatalog()
  return { products, collections, loaded, error }
}
