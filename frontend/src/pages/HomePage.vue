<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import { stats, aboutText } from '../data/about'
import { stories } from '../data/stories'
import { heroSlides } from '../data/banners'
import { api } from '../api'

import HeroLux from '../components/home/HeroLux.vue'
import CollectionTrio from '../components/home/CollectionTrio.vue'
import ProductRail from '../components/home/ProductRail.vue'
import StoryBlocks from '../components/home/StoryBlocks.vue'
import CraftMosaic from '../components/home/CraftMosaic.vue'
import ProcessStack from '../components/home/ProcessStack.vue'
import AnimatedNumber from '../components/home/AnimatedNumber.vue'
import HeroSlider from '../components/HeroSlider.vue'
import ProductModal from '../components/ProductModal.vue'
import ZaloLink from '../components/ZaloLink.vue'
import DealerList from '../components/DealerList.vue'

/*
 * Home page – luxury scroll story (layout & transitions from the client's demo):
 * loader → sticky hero → product lines → lookbook slider → pinned product rail → brand stories
 * → craft details → technology stack → numbers → dealers.
 */
const { products, collections, loaded } = useCatalog()
const selected = ref(null)
const story = Object.fromEntries(stories.map((s) => [s.id, s]))

// Rail: products flagged "Nổi bật" in admin (or the first ones), max 16
const railProducts = computed(() => {
  const f = products.value.filter((p) => p.is_featured)
  return (f.length >= 6 ? f : [...f, ...products.value.filter((p) => !p.is_featured)]).slice(0, 16)
})

// Partner dealers (admin → Đại lý)
const dealers = ref([])
const dealersLoading = ref(true)
onMounted(async () => {
  document.title = 'YEIN · Kính không viền cắt cạnh kim cương'
  try {
    dealers.value = await api('/api/dealers')
  } catch {
    dealers.value = []
  } finally {
    dealersLoading.value = false
  }
})
</script>

<template>
  <HeroLux />

  <CollectionTrio :collections="collections" />

  <!-- Lookbook: sliding banner photos -->
  <section class="lookbook">
    <div class="lookbook__head">
      <p class="eyebrow" v-reveal>Lookbook</p>
      <h2 class="lux-display lux-display--sm" v-reveal="100">Phong cách <em>YEIN</em></h2>
    </div>
    <div v-reveal="150"><HeroSlider :slides="heroSlides" /></div>
  </section>

  <ProductRail :products="railProducts" :total="products.length" :loaded="loaded" @open="selected = $event" />
  <StoryBlocks :story="story['limited']" />
  <StoryBlocks :story="story['series-h']" />
  <StoryBlocks :story="story['series-y']" />
  <StoryBlocks :story="story['long-linh']" />
  <StoryBlocks :story="story['series-f']" />

  <CraftMosaic />

  <ProcessStack />

  <!-- Numbers + short brand story (full story on /ve-yein) -->
  <section class="lux-band">
    <div class="lux-band__media"><img v-parallax="0.1" src="/img/cover.webp" alt="" loading="lazy" /></div>
    <div class="lux-band__inner">
      <p class="eyebrow" v-reveal>Về YEIN</p>
      <h2 class="lux-display" v-reveal="100">Chế tác bằng<br /><em>tâm huyết</em></h2>
      <p class="lux-band__text" v-reveal="200">{{ aboutText[0] }}</p>
      <RouterLink v-reveal="260" class="lux-link" to="/ve-yein">Câu chuyện, nhà thiết kế & giải thưởng <span>→</span></RouterLink>
      <div class="lux-band__stats">
        <div v-for="(s, i) in stats" :key="s.label" v-reveal="i * 100">
          <strong><AnimatedNumber :value="s.value" />{{ s.suffix }}</strong>
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
          <p class="eyebrow" v-reveal>Hệ thống đại lý</p>
          <h2 class="lux-display lux-display--sm" v-reveal="100">Đại lý đối tác YEIN</h2>
        </div>
        <p class="lead" style="margin: 0" v-reveal="200">Mua kính và đo mắt tại các cửa hàng đối tác chính thức của YEIN gần bạn.</p>
      </div>

      <DealerList :dealers="dealers" :loading="dealersLoading" />

      <div class="join-box" v-reveal>
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

  <ProductModal :product="selected" :show-collection-link="true" @close="selected = null" />
</template>
