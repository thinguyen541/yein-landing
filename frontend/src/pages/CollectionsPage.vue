<script setup>
import { onMounted } from 'vue'
import { useCatalog } from '../composables/useCatalog'
import CollectionTrio from '../components/home/CollectionTrio.vue'

// All collections, same card style as the home page
const { collections, loaded } = useCatalog()
onMounted(() => (document.title = 'Bộ sưu tập – YEIN'))
</script>

<template>
  <section class="cols-hero">
    <div class="cols-hero__media"><img v-parallax="0.12" src="/img/banners/banner-pearl.webp" alt="" style="object-position: 30% center" /></div>
    <div class="cols-hero__veil"></div>
    <div class="cols-hero__text">
      <div class="crumbs" v-reveal><RouterLink to="/">Trang chủ</RouterLink> / <span>Bộ sưu tập</span></div>
      <p class="eyebrow" v-reveal="80">YEIN Collections</p>
      <h1 class="lux-display" v-reveal="160">Bộ sưu tập <em>YEIN</em></h1>
      <p class="cols-hero__lead" v-reveal="240">
        {{ collections.length || '' }} dòng sản phẩm – mỗi dòng một định vị, phong cách và chất liệu riêng. Chọn một bộ sưu tập để xem toàn bộ mẫu và giá.
      </p>
    </div>
  </section>

  <p v-if="!loaded" class="empty center" style="padding: 80px 0">Đang tải bộ sưu tập…</p>
  <CollectionTrio v-else :collections="collections" :show-head="false" section-id="" />
</template>

<style scoped>
.cols-hero { position: relative; height: clamp(380px, 52vh, 560px); overflow: hidden; display: flex; align-items: center; justify-content: flex-end; background: var(--paper); }
.cols-hero__media { position: absolute; inset: 0; overflow: hidden; }
.cols-hero__media img { width: 100%; height: 100%; object-fit: cover; }
.cols-hero__veil { position: absolute; inset: 0; background: linear-gradient(270deg, rgba(247, 245, 241, 0.92) 0%, rgba(247, 245, 241, 0.6) 35%, rgba(247, 245, 241, 0) 65%); }
.cols-hero__text { position: relative; max-width: 560px; margin-right: clamp(24px, 8vw, 140px); }
.cols-hero__text .lux-display { margin-bottom: 18px; }
.cols-hero__lead { margin: 0; font-size: 15px; line-height: 1.85; color: var(--ink-soft); }
.crumbs { font-size: 12.5px; color: var(--muted); margin-bottom: 22px; }
.crumbs a:hover { color: var(--green); }
@media (max-width: 768px) {
  .cols-hero { height: auto; flex-direction: column; align-items: stretch; }
  .cols-hero__media { position: relative; height: 62vw; }
  .cols-hero__veil { display: none; }
  .cols-hero__text { margin: 0; padding: 28px 24px 8px; }
}
</style>
