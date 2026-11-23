<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import { money, thumb, imgFallback } from '../utils'
import { stats, aboutText } from '../data/about'
import ProductCard from '../components/ProductCard.vue'
import ProductModal from '../components/ProductModal.vue'
import ZaloLink from '../components/ZaloLink.vue'
import DealerList from '../components/DealerList.vue'
import { api } from '../api'

const { products, collections, loaded, error } = useCatalog()
const selected = ref(null)

// Featured block: "Nổi bật" = products flagged in admin, or 8 models of one collection
const tab = ref('featured')
const shown = computed(() => {
  if (tab.value === 'featured') {
    const f = products.value.filter((p) => p.is_featured)
    return (f.length ? f : products.value).slice(0, 8)
  }
  return products.value.filter((p) => p.collection_slug === tab.value).slice(0, 8)
})

// A few models per collection for the collection rows (featured first)
const previewOf = (slug) =>
  [...products.value.filter((p) => p.collection_slug === slug)]
    .sort((a, b) => b.is_featured - a.is_featured)
    .slice(0, 4)

// Partner dealers (managed in admin → Đại lý)
const dealers = ref([])
const dealersLoading = ref(true)
onMounted(async () => {
  try {
    dealers.value = await api('/api/dealers')
  } catch {
    dealers.value = []
  } finally {
    dealersLoading.value = false
  }
})

const formatStat = (s) => new Intl.NumberFormat('vi-VN').format(s.value) + s.suffix
</script>

<template>
  <!-- Hero: full green, short enough that products show up right after -->
  <section class="hero">
    <div class="hero-text">
      <span class="logo logo--lg">YEIN</span>
      <h1>Kính không viền<br />cắt cạnh <em>kim cương</em></h1>
      <p>Hơn {{ products.length || 300 }} mẫu gọng thanh mảnh từ ba dòng Hạ Lang Ảnh, Dòng F và Dòng Y — chế tác bằng tâm huyết.</p>
      <div class="hero-actions">
        <a href="#san-pham" class="btn btn-light">Xem sản phẩm</a>
        <ZaloLink class="btn btn-outline">Nhắn Zalo tư vấn</ZaloLink>
      </div>
    </div>
    <div class="hero-media">
      <img :src="'/img/hero.webp'" alt="Kính không viền YEIN đính đá trên nền xanh lục bảo" fetchpriority="high" />
    </div>
  </section>

  <!-- Products in the middle of the page -->
  <section id="san-pham" class="section">
    <div class="wrap">
      <div class="section-head section-head--center">
        <p class="eyebrow">Sản phẩm</p>
        <h2 class="display">Mẫu kính nổi bật</h2>
        <p class="lead">Giá bán lẻ hiển thị ngay dưới mỗi mẫu. Bấm vào mẫu để xem chi tiết và giá nâng cấp tròng.</p>
      </div>
      <div class="chips" style="justify-content: center; margin-bottom: 36px">
        <button class="chip" :class="{ active: tab === 'featured' }" @click="tab = 'featured'">Nổi bật</button>
        <button
          v-for="c in collections"
          :key="c.id"
          class="chip"
          :class="{ active: tab === c.slug }"
          @click="tab = c.slug"
        >{{ c.name }}</button>
      </div>

      <p v-if="!loaded" class="empty center">Đang tải sản phẩm…</p>
      <p v-else-if="error" class="empty center">{{ error }}</p>
      <div v-else class="grid">
        <ProductCard v-for="p in shown" :key="p.id" :product="p" @open="selected = $event" />
      </div>

      <div class="more">
        <RouterLink
          class="btn btn-dark"
          :to="tab === 'featured' ? { name: 'products' } : { name: 'collection', params: { slug: tab } }"
        >Xem toàn bộ {{ tab === 'featured' ? products.length : products.filter((p) => p.collection_slug === tab).length }} mẫu →</RouterLink>
      </div>
    </div>
  </section>

  <!-- Collections: product lines + their models -->
  <section id="bo-suu-tap" class="section section--paper">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Bộ sưu tập</p>
          <h2 class="display">Ba dòng sản phẩm chủ đạo</h2>
        </div>
        <RouterLink class="link-arrow" :to="{ name: 'products' }">Tất cả sản phẩm →</RouterLink>
      </div>

      <div class="col-rows">
        <div v-for="(c, i) in collections" :key="c.id" class="col-row" :class="{ reverse: i % 2 === 1 }">
          <RouterLink class="col-media" :to="{ name: 'collection', params: { slug: c.slug } }">
            <img :src="thumb(c.cover_image)" :alt="c.name" loading="lazy" />
            <span class="col-num">{{ String(i + 1).padStart(2, '0') }}</span>
          </RouterLink>
          <div class="col-info">
            <h3>{{ c.name }}</h3>
            <p v-if="c.tagline" class="col-tagline">{{ c.tagline }}</p>
            <p v-if="c.description" class="col-desc">{{ c.description }}</p>
            <p v-if="c.min_price != null" class="col-price">
              <template v-if="c.min_price === c.max_price">Giá <strong>{{ money(c.min_price) }}</strong></template>
              <template v-else>Từ <strong>{{ money(c.min_price) }}</strong> – {{ money(c.max_price) }}</template>
            </p>
            <div class="col-thumbs">
              <button v-for="p in previewOf(c.slug)" :key="p.id" class="col-thumb" type="button" @click="selected = p">
                <img :src="thumb(p.image_url)" :alt="p.name" loading="lazy" @error="imgFallback($event, p.code)" />
                <span>{{ p.code }}</span>
              </button>
            </div>
            <RouterLink class="btn btn-ghost" :to="{ name: 'collection', params: { slug: c.slug } }">
              Xem {{ c.product_count }} mẫu {{ c.name }} →
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Short brand teaser; full story lives on /ve-yein -->
  <section class="band">
    <img class="band-bg" :src="'/img/cover.webp'" alt="" loading="lazy" />
    <div class="wrap">
      <p class="eyebrow">Về YEIN</p>
      <h2 class="display display--lg">Chế tác bằng tâm huyết</h2>
      <p class="text">{{ aboutText[0] }}</p>
      <RouterLink class="link-arrow" to="/ve-yein">Câu chuyện, giải thưởng & công nghệ →</RouterLink>
      <div class="stats">
        <div v-for="s in stats" :key="s.label" class="stat">
          <strong>{{ formatStat(s) }}</strong>
          <span>{{ s.label }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Partner dealers + become a dealer -->
  <section id="dai-ly" class="section section--paper">
    <div class="wrap">
      <div class="dealers-head">
        <div>
          <p class="eyebrow">Hệ thống đại lý</p>
          <h2 class="display">Đại lý đối tác YEIN</h2>
        </div>
        <p class="lead" style="margin: 0">Mua kính và đo mắt tại các cửa hàng đối tác chính thức của YEIN gần bạn.</p>
      </div>

      <DealerList :dealers="dealers" :loading="dealersLoading" />

      <div class="join-box">
        <div>
          <h3>Trở thành đại lý YEIN</h3>
          <ul>
            <li>Nhận bảng giá đại lý theo từng dòng sản phẩm</li>
            <li>Bộ hình ảnh và catalogue sản phẩm</li>
            <li>Tư vấn chọn mẫu phù hợp với khách hàng của bạn</li>
          </ul>
        </div>
        <ZaloLink class="btn btn-light">Đăng ký qua Zalo</ZaloLink>
      </div>
    </div>
  </section>

  <ProductModal :product="selected" @close="selected = null" />
</template>
