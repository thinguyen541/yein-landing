<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onFrame, scrollTo } from '../../composables/smooth'
import { siteReady } from '../../composables/useSiteReady'
import ZaloLink from '../ZaloLink.vue'

// Sticky hero: the photo slowly zooms out and the copy drifts up while you scroll (like the demo)
const root = ref(null)
const media = ref(null)
const content = ref(null)
const veil = ref(null)
let off

const line1 = 'Chạm khắc ánh sáng'.split(' ')
const line2 = 'YEIN đồng hành'.split(' ')

onMounted(() => {
  off = onFrame((y) => {
    const el = root.value
    if (!el || !media.value) return
    const total = el.offsetHeight - window.innerHeight
    const p = Math.min(1, Math.max(0, y / (total || 1)))
    media.value.style.transform = `scale(${1.18 - p * 0.18}) translate3d(0, ${p * 6}%, 0)`
    content.value.style.transform = `translate3d(0, ${-p * 120}px, 0)`
    content.value.style.opacity = String(Math.max(0, 1 - p * 1.4))
    veil.value.style.opacity = String(0.25 + p * 0.55)
  })
})
onBeforeUnmount(() => off?.())
</script>

<template>
  <section ref="root" class="lux-hero" :class="{ 'is-ready': siteReady }">
    <div class="lux-hero__sticky">
      <div class="lux-hero__media">
        <img ref="media" src="/img/hero.webp" alt="Kính không viền YEIN đính đá trên nền xanh lục bảo" fetchpriority="high" />
      </div>
      <div ref="veil" class="lux-hero__veil"></div>

      <div ref="content" class="lux-hero__content">
        <p class="lux-hero__brand">
          <span>Y E I N</span>
          <em>Kính không viền · Cắt cạnh kim cương</em>
        </p>
        <h1 class="lux-hero__title">
          <span class="line">
            <span v-for="(w, i) in line1" :key="'a' + i" class="word"><span :style="{ '--d': i * 0.08 + 0.2 + 's' }">{{ w }}</span></span>
          </span>
          <span class="line line--em">
            <span v-for="(w, i) in line2" :key="'b' + i" class="word"><span :style="{ '--d': i * 0.08 + 0.55 + 's' }">{{ w }}</span></span>
          </span>
        </h1>
        <p class="lux-hero__sub">Chế tác vẻ sang trọng, cùng bạn trau chuốt từng khoảnh khắc tinh tế.</p>
        <div class="lux-hero__actions">
          <button class="lux-hero__cta" type="button" @click="scrollTo('#bo-suu-tap')">
            Khám phá
            <span class="lux-hero__cta-line"></span>
          </button>
          <RouterLink class="lux-hero__btn" :to="{ name: 'products' }">Xem sản phẩm</RouterLink>
          <ZaloLink class="lux-hero__btn lux-hero__btn--ghost">Nhắn Zalo</ZaloLink>
        </div>
      </div>

      <div class="lux-hero__scroll" aria-hidden="true">
        <span>Cuộn xuống</span>
        <i></i>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lux-hero { position: relative; height: 170vh; background: var(--green-deep); }
.lux-hero__sticky { position: sticky; top: 0; height: 100vh; min-height: 560px; overflow: hidden; }
.lux-hero__media { position: absolute; inset: 0; overflow: hidden; }
.lux-hero__media img {
  width: 100%; height: 100%; object-fit: cover; object-position: 20% center;
  transform: scale(1.18); transform-origin: 30% 50%; will-change: transform;
  opacity: 0; filter: blur(12px);
}
.is-ready .lux-hero__media img { animation: heroImgIn 2.4s var(--ease-out) both; }
@keyframes heroImgIn { from { opacity: 0; filter: blur(12px); } to { opacity: 1; filter: blur(0); } }
.lux-hero__veil {
  position: absolute; inset: 0; opacity: 0.25; mix-blend-mode: multiply;
  background: linear-gradient(90deg, rgba(4, 22, 19, 0) 30%, rgba(4, 22, 19, 0.75) 100%), #041613;
}
.lux-hero__content {
  position: absolute; right: clamp(24px, 8vw, 140px); top: 50%; margin-top: -210px;
  max-width: 580px; color: #f3efe7; text-align: right; will-change: transform, opacity;
}
.lux-hero__brand { display: flex; flex-direction: column; gap: 10px; margin: 0 0 28px; opacity: 0; }
.lux-hero__brand span { font-family: var(--serif); font-size: 28px; letter-spacing: 0.32em; }
.lux-hero__brand em { font-style: normal; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--gold-light); }
.lux-hero__title { font-family: var(--serif); font-weight: 300; font-size: clamp(44px, 6.2vw, 96px); line-height: 1.02; margin: 0; }
.line { display: block; }
.line--em { font-style: italic; color: var(--gold-light); }
.word { display: inline-block; overflow: hidden; padding: 0.06em 0.12em 0.12em; margin: -0.06em -0.02em -0.12em; vertical-align: top; }
.word > span { display: inline-block; transform: translateY(110%) rotate(4deg); }
.is-ready .word > span { animation: wordUp 1.3s var(--d) var(--ease-out) both; }
.lux-hero__sub { margin: 28px 0 40px auto; max-width: 380px; font-size: 15px; line-height: 1.8; font-weight: 300; color: rgba(243, 239, 231, 0.82); opacity: 0; }
.lux-hero__actions { display: flex; justify-content: flex-end; align-items: center; gap: 22px; flex-wrap: wrap; opacity: 0; }
.is-ready .lux-hero__brand { animation: fadeUp 1.2s 0.05s var(--ease-out) both; }
.is-ready .lux-hero__sub { animation: fadeUp 1.2s 0.9s var(--ease-out) both; }
.is-ready .lux-hero__actions { animation: fadeUp 1.2s 1.1s var(--ease-out) both; }
.lux-hero__cta {
  display: inline-flex; align-items: center; gap: 16px; background: none; border: 0; padding: 0;
  color: #f3efe7; font: inherit; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; cursor: pointer;
}
.lux-hero__cta-line { width: 60px; height: 1px; background: currentColor; transition: width 0.5s var(--ease-out); }
.lux-hero__cta:hover .lux-hero__cta-line { width: 100px; }
.lux-hero__btn {
  display: inline-flex; align-items: center; padding: 13px 24px; border-radius: 999px;
  background: #f3efe7; color: var(--green-deep); font-size: 13px; font-weight: 500; letter-spacing: 0.06em;
  transition: background 0.4s, color 0.4s, transform 0.4s var(--ease-out);
}
.lux-hero__btn:hover { background: var(--gold-light); transform: translateY(-2px); }
.lux-hero__btn--ghost { background: transparent; color: #f3efe7; border: 1px solid rgba(243, 239, 231, 0.5); }
.lux-hero__btn--ghost:hover { background: rgba(243, 239, 231, 0.1); color: #fff; }
.lux-hero__btn:focus-visible, .lux-hero__cta:focus-visible { outline: 2px solid var(--gold-light); outline-offset: 4px; }
.lux-hero__scroll {
  position: absolute; left: 50%; bottom: 32px; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  color: rgba(243, 239, 231, 0.7); font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;
}
.lux-hero__scroll i { width: 1px; height: 56px; background: linear-gradient(rgba(243, 239, 231, 0.8), transparent); animation: scrollLine 2.2s infinite var(--ease-out); transform-origin: top; }
@keyframes scrollLine { 0% { transform: scaleY(0); } 50% { transform: scaleY(1); } 100% { transform: scaleY(1); opacity: 0; } }
@keyframes wordUp { from { transform: translateY(110%) rotate(4deg); } to { transform: none; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@media (max-width: 768px) {
  .lux-hero__content { right: 24px; left: 24px; top: auto; bottom: 110px; margin: 0; }
  .lux-hero__media img { object-position: 15% center; }
  .lux-hero__sub { margin-bottom: 28px; }
  .lux-hero__actions { gap: 14px; }
  .lux-hero__cta { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lux-hero__media img, .word > span, .lux-hero__brand, .lux-hero__sub, .lux-hero__actions { opacity: 1; filter: none; transform: none; }
}
</style>
