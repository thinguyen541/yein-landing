<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ZaloLink from './ZaloLink.vue'
import { onFrame, scrollTo } from '../composables/smooth'
import { useCatalog } from '../composables/useCatalog'
import { money, thumb, onSale } from '../utils'

// overlay: transparent header on top of the home hero, turns solid once you scroll
const props = defineProps({ overlay: { type: Boolean, default: false } })
const scrolled = ref(false)
let off
onMounted(() => (off = onFrame((y) => (scrolled.value = y > window.innerHeight * 0.75))))
onBeforeUnmount(() => off?.())

const route = useRoute()
const router = useRouter()
const open = ref(false)

// to: route path; hash: section on that page
const links = [
  { label: 'Về YEIN', path: '/ve-yein' },
  { label: 'Bộ sưu tập', path: '/bo-suu-tap', mega: 'collections' },
  { label: 'Sản phẩm', path: '/san-pham', mega: 'products' },
  { label: 'Công nghệ', path: '/', hash: '#cong-nghe' },
  { label: 'Đại lý', path: '/', hash: '#dai-ly' },
  { label: 'Liên hệ', hash: '#lien-he' }, // footer, present on every page
]

const isActive = (l) =>
  (l.path === '/san-pham' && route.name === 'products') ||
  (l.path === '/ve-yein' && !l.hash && route.name === 'about') ||
  (l.path === '/bo-suu-tap' && (route.name === 'collections' || route.name === 'collection'))

// ---- Mega menu (hover "Bộ sưu tập" / "Sản phẩm") ----
const { products, collections } = useCatalog()
const mega = ref('') // '' | 'collections' | 'products'
let closeTimer = null
let openTimer = null
const isDesktop = () => window.matchMedia('(min-width: 921px)').matches
function openMega(key) {
  if (!isDesktop()) return
  clearTimeout(closeTimer)
  clearTimeout(openTimer)
  // small delay so passing the mouse over the menu doesn't flash the panel
  openTimer = setTimeout(() => (mega.value = key), mega.value ? 0 : 90)
}
function closeMega(delay = 160) {
  clearTimeout(openTimer)
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => (mega.value = ''), delay)
}
const keepMega = () => clearTimeout(closeTimer)
watch(() => route.fullPath, () => (mega.value = ''))
const onKey = (e) => e.key === 'Escape' && (mega.value = '')
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

const priceOf = (c) =>
  c.min_price == null ? '' : c.min_price === c.max_price ? money(c.min_price) : `Từ ${money(c.min_price)}`
const featuredCollections = computed(() => collections.value.filter((c) => c.cover_image).slice(0, 3))
const productGroups = computed(() => {
  const all = products.value
  return [
    { tag: 'hot', label: 'Mẫu hot', count: all.filter((p) => p.is_hot).length },
    { tag: 'best', label: 'Bán chạy', count: all.filter((p) => p.is_featured).length },
    { tag: 'new', label: 'Hàng mới cập nhật', count: all.filter((p) => p.is_new).length, always: true },
    { tag: 'sale', label: 'Đang ưu đãi', count: all.filter((p) => onSale(p)).length },
  ].filter((g) => g.count || g.always)
})
const PRICE_LINKS = [
  { price: 'under-10', label: 'Dưới 10 triệu' },
  { price: '10-20', label: '10 – 20 triệu' },
  { price: 'over-20', label: 'Trên 20 triệu' },
]

function go(l) {
  open.value = false
  mega.value = ''
  const samePage = !l.path || l.path === route.path
  if (samePage && l.hash) {
    scrollTo(l.hash)
    history.replaceState(history.state, '', l.hash)
  } else if (samePage) {
    scrollTo(0, { offset: 0 })
  } else {
    router.push({ path: l.path, hash: l.hash })
  }
}
</script>

<template>
  <header
    class="site-header"
    :class="{ 'is-overlay': props.overlay && !scrolled && !open && !mega, 'has-mega': !!mega }"
    @mouseleave="closeMega()"
  >
    <div class="wrap">
      <RouterLink to="/" class="logo">YEIN</RouterLink>
      <nav class="main-nav" :class="{ open }">
        <a
          v-for="l in links"
          :key="l.label"
          :href="(l.path || '') + (l.hash || '')"
          :class="{ active: isActive(l), 'is-mega-open': mega && mega === l.mega }"
          :aria-haspopup="l.mega ? 'true' : undefined"
          :aria-expanded="l.mega ? String(mega === l.mega) : undefined"
          @mouseenter="l.mega ? openMega(l.mega) : closeMega(120)"
          @focus="l.mega && openMega(l.mega)"
          @click.prevent="go(l)"
        >{{ l.label }}<svg v-if="l.mega" class="nav-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.3" /></svg></a>
        <ZaloLink class="btn btn-dark" @click="open = false">Nhắn Zalo</ZaloLink>
      </nav>
      <button class="nav-toggle" aria-label="Menu" @click="open = !open">
        <span></span><span></span><span></span>
      </button>
    </div>

    <!-- Mega menu panels -->
    <Transition name="mega">
      <div v-if="mega" class="mega" @mouseenter="keepMega" @mouseleave="closeMega()">
        <div class="mega__inner">
          <!-- Bộ sưu tập -->
          <template v-if="mega === 'collections'">
            <div class="mega__cols">
              <div class="mega__col">
                <p class="mega__title">Bộ sưu tập</p>
                <RouterLink
                  v-for="c in collections"
                  :key="c.id"
                  class="mega__link"
                  :to="{ name: 'collection', params: { slug: c.slug } }"
                >{{ c.name }} <small>{{ c.product_count }}</small></RouterLink>
              </div>
              <div class="mega__cards">
                <RouterLink
                  v-for="c in featuredCollections"
                  :key="c.id"
                  class="mega__card"
                  :to="{ name: 'collection', params: { slug: c.slug } }"
                >
                  <span class="mega__card-img"><img :src="thumb(c.cover_image)" :alt="c.name" /></span>
                  <b>{{ c.name }}</b>
                  <em v-if="priceOf(c)">{{ priceOf(c) }}</em>
                </RouterLink>
              </div>
            </div>
            <div class="mega__foot">
              <RouterLink class="mega__all" :to="{ name: 'collections' }">Xem tất cả Bộ sưu tập <span>→</span></RouterLink>
            </div>
          </template>

          <!-- Sản phẩm -->
          <template v-else-if="mega === 'products'">
            <div class="mega__cols">
              <div class="mega__col">
                <p class="mega__title">Nổi bật</p>
                <RouterLink
                  v-for="g in productGroups"
                  :key="g.tag"
                  class="mega__link"
                  :to="{ name: 'products', query: { tag: g.tag } }"
                >{{ g.label }} <small v-if="g.count">{{ g.count }}</small></RouterLink>
              </div>
              <div class="mega__col">
                <p class="mega__title">Theo bộ sưu tập</p>
                <RouterLink
                  v-for="c in collections"
                  :key="c.id"
                  class="mega__link"
                  :to="{ name: 'collection', params: { slug: c.slug } }"
                >{{ c.name }}</RouterLink>
              </div>
              <div class="mega__col">
                <p class="mega__title">Khoảng giá</p>
                <RouterLink
                  v-for="p in PRICE_LINKS"
                  :key="p.price"
                  class="mega__link"
                  :to="{ name: 'products', query: { price: p.price } }"
                >{{ p.label }}</RouterLink>
              </div>
              <RouterLink class="mega__promo" :to="{ name: 'products', query: { tag: productGroups[0]?.tag || 'new' } }">
                <img src="/img/banners/banner-beige.webp" alt="" />
                <span>
                  <em>YEIN · {{ productGroups[0]?.label || 'Hàng mới' }}</em>
                  <b>Mẫu được yêu thích nhất</b>
                </span>
              </RouterLink>
            </div>
            <div class="mega__foot">
              <RouterLink class="mega__all" :to="{ name: 'products' }">Xem tất cả Sản phẩm <span>→</span></RouterLink>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </header>
</template>
