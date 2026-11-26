<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalog } from '../composables/useCatalog'
import { money, effectivePrice, onSale } from '../utils'
import ProductCard from '../components/ProductCard.vue'
import ProductModal from '../components/ProductModal.vue'

// Used for both /san-pham (all products) and /bo-suu-tap/:slug (one collection)
const route = useRoute()
const router = useRouter()
const { products, collections, loaded, error } = useCatalog()

const PAGE = 24
const search = ref('')
const sort = ref('')
const series = ref('')
const limit = ref(PAGE)
const selected = ref(null)

const slug = computed(() => route.params.slug || '')
const current = computed(() => collections.value.find((c) => c.slug === slug.value) || null)
const notFound = computed(() => loaded.value && slug.value && !current.value)

const inScope = computed(() => (slug.value ? products.value.filter((p) => p.collection_slug === slug.value) : products.value))

// Sub-series chips (e.g. Kinh Điển / Mộc Quang / Lệ Titan)
const seriesList = computed(() => {
  const m = new Map()
  for (const p of inScope.value) if (p.series) m.set(p.series, (m.get(p.series) || 0) + 1)
  return [...m.entries()].map(([name, count]) => ({ name, count }))
})

// Label + price filters live in the URL (?tag=hot|best|new|sale&price=under-10|10-20|over-20),
// so the header mega menu can link straight to them
const TAGS = [
  { key: 'hot', label: 'Mẫu hot', test: (p) => !!p.is_hot },
  { key: 'best', label: 'Bán chạy', test: (p) => !!p.is_featured },
  { key: 'new', label: 'Hàng mới', test: (p) => !!p.is_new },
  { key: 'sale', label: 'Ưu đãi', test: (p) => onSale(p) },
]
const PRICES = {
  'under-10': { label: 'Dưới 10 triệu', test: (v) => v < 10e6 },
  '10-20': { label: '10 – 20 triệu', test: (v) => v >= 10e6 && v <= 20e6 },
  'over-20': { label: 'Trên 20 triệu', test: (v) => v > 20e6 },
}
const tag = computed(() => String(route.query.tag || ''))
const price = computed(() => String(route.query.price || ''))
const tagCounts = computed(() => Object.fromEntries(TAGS.map((t) => [t.key, inScope.value.filter(t.test).length])))
// "Hàng mới" with nothing flagged yet -> newest models first
const newFallback = computed(() => tag.value === 'new' && !tagCounts.value.new)
function setQuery(patch) {
  const q = { ...route.query, ...patch }
  for (const k of Object.keys(q)) if (!q[k]) delete q[k]
  router.replace({ query: q })
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = TAGS.find((x) => x.key === tag.value)
  const pr = PRICES[price.value]
  let list = inScope.value.filter(
    (p) =>
      (!series.value || p.series === series.value) &&
      (!t || newFallback.value || t.test(p)) &&
      (!pr || (effectivePrice(p) != null && pr.test(Number(effectivePrice(p))))) &&
      (!q || `${p.code || ''} ${p.name} ${p.series || ''}`.toLowerCase().includes(q))
  )
  if (newFallback.value || sort.value === 'newest') list = [...list].sort((a, b) => b.id - a.id)
  if (sort.value === 'price-asc') list = [...list].sort((a, b) => (effectivePrice(a) ?? Infinity) - (effectivePrice(b) ?? Infinity))
  if (sort.value === 'price-desc') list = [...list].sort((a, b) => (effectivePrice(b) ?? -1) - (effectivePrice(a) ?? -1))
  return list
})
const visible = computed(() => filtered.value.slice(0, limit.value))

const priceRange = computed(() => {
  const prices = inScope.value.map((p) => p.price).filter((x) => x != null)
  if (!prices.length) return null
  return { min: Math.min(...prices), max: Math.max(...prices) }
})

// Reset filters when switching collection
watch(slug, () => {
  series.value = ''
  search.value = ''
  limit.value = PAGE
})
watch([search, sort, series, tag, price], () => (limit.value = PAGE))
watch(
  current,
  (c) => (document.title = c ? `${c.name} – YEIN` : 'Sản phẩm – YEIN'),
  { immediate: true }
)
</script>

<template>
  <div v-if="notFound" class="wrap not-found">
    <h1>Không tìm thấy bộ sưu tập</h1>
    <RouterLink class="link-arrow" :to="{ name: 'products' }">← Xem tất cả sản phẩm</RouterLink>
  </div>

  <template v-else>
    <section class="banner banner--fixed">
      <div class="banner-text">
        <div class="crumbs">
          <RouterLink to="/">Trang chủ</RouterLink> /
          <RouterLink :to="{ name: 'products' }">Sản phẩm</RouterLink>
          <template v-if="current"> / <span>{{ current.name }}</span></template>
        </div>
        <h1>{{ current ? current.name : 'Tất cả sản phẩm' }}</h1>
        <p class="tagline">{{ current ? current.tagline : 'Hạ Lang Ảnh · Dòng F · Dòng Y' }}</p>
        <p class="desc">
          {{ current ? current.description : 'Toàn bộ mẫu gọng kính không viền YEIN kèm giá bán lẻ kiến nghị. Lọc theo dòng, tìm theo mã kính.' }}
        </p>
        <div class="meta-row">
          <div><strong>{{ inScope.length }}</strong>mẫu</div>
          <div v-if="priceRange">
            <strong>{{ money(priceRange.min) }}</strong>
            {{ priceRange.min === priceRange.max ? 'giá bán lẻ' : 'giá từ' }}
          </div>
        </div>
      </div>
      <!-- Same image for every collection, so switching tabs never changes the layout -->
      <div class="banner-media">
        <img :src="'/img/hero.webp'" alt="Kính không viền YEIN" />
      </div>
    </section>

    <div class="cat-toolbar">
      <div class="wrap">
        <div class="toolbar-row">
          <nav class="chips">
            <RouterLink :to="{ name: 'products' }" class="chip" :class="{ active: !slug }">
              Tất cả <small>{{ products.length }}</small>
            </RouterLink>
            <RouterLink
              v-for="c in collections"
              :key="c.id"
              :to="{ name: 'collection', params: { slug: c.slug } }"
              class="chip"
              :class="{ active: c.slug === slug }"
            >{{ c.name }} <small>{{ c.product_count }}</small></RouterLink>
          </nav>
          <div class="tools">
            <input v-model="search" type="search" placeholder="Tìm mã kính…" />
            <select v-model="sort">
              <option value="">Mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="newest">Mới nhất</option>
            </select>
          </div>
        </div>
        <div class="chips sub-chips tag-chips">
          <button class="chip" :class="{ active: !tag }" @click="setQuery({ tag: '' })">Tất cả mẫu</button>
          <template v-for="t in TAGS" :key="t.key">
            <button
              v-if="tagCounts[t.key] || t.key === 'new'"
              class="chip"
              :class="[`chip--${t.key}`, { active: tag === t.key }]"
              @click="setQuery({ tag: tag === t.key ? '' : t.key })"
            >{{ t.label }} <small v-if="tagCounts[t.key]">{{ tagCounts[t.key] }}</small></button>
          </template>
          <button v-if="PRICES[price]" class="chip active" title="Bỏ lọc giá" @click="setQuery({ price: '' })">
            {{ PRICES[price].label }} ×
          </button>
        </div>
        <div v-if="seriesList.length > 1" class="chips sub-chips">
          <button class="chip" :class="{ active: !series }" @click="series = ''">Tất cả dòng</button>
          <button
            v-for="s in seriesList"
            :key="s.name"
            class="chip"
            :class="{ active: series === s.name }"
            @click="series = s.name"
          >{{ s.name }} <small>{{ s.count }}</small></button>
        </div>
      </div>
    </div>

    <section class="section" style="padding-top: 32px">
      <div class="wrap">
        <p v-if="!loaded" class="empty">Đang tải…</p>
        <p v-else-if="error" class="empty">{{ error }}</p>
        <template v-else>
          <p class="result-count">{{ filtered.length }} mẫu</p>
          <p v-if="!filtered.length" class="empty">Không tìm thấy mẫu phù hợp.</p>
          <div class="grid">
            <ProductCard v-for="p in visible" :key="p.id" :product="p" :show-collection="!slug" @open="selected = $event" />
          </div>
          <div v-if="visible.length < filtered.length" class="more">
            <button class="btn btn-ghost" @click="limit += PAGE">Xem thêm ({{ filtered.length - visible.length }} mẫu)</button>
          </div>
        </template>
      </div>
    </section>
  </template>

  <ProductModal :product="selected" :show-collection-link="!slug" @close="selected = null" />
</template>
