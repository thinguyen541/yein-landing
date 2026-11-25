<script setup>
import { computed } from 'vue'
import { money, thumb } from '../../utils'

// The three product lines as tall image cards (id "bo-suu-tap" is the menu target)
const props = defineProps({ collections: { type: Array, default: () => [] } })

const FALLBACK = ['/img/h-pink-wide.webp', '/img/f-woman.webp', '/img/y-woman.webp']
const letterOf = (c) => {
  const n = String(c.name || '').replace(/^Dòng\s+/i, '').trim()
  return (n[0] || 'Y').toUpperCase()
}
const items = computed(() =>
  props.collections.map((c, i) => ({
    ...c,
    letter: letterOf(c),
    img: c.cover_image ? thumb(c.cover_image) : FALLBACK[i % FALLBACK.length],
    price:
      c.min_price == null ? '' : c.min_price === c.max_price ? money(c.min_price) : `Từ ${money(c.min_price)}`,
  }))
)
</script>

<template>
  <section id="bo-suu-tap" class="trio">
    <div class="trio__head">
      <div>
        <p class="eyebrow" v-reveal>Craftsmanship creates the beauty of art</p>
        <h2 class="lux-display lux-display--sm" v-reveal="100">Tâm huyết nghệ nhân,<br />kiến tạo vẻ đẹp nghệ thuật</h2>
      </div>
      <p class="trio__lead" v-reveal="200">
        Tuyển chọn vật liệu quý, trau chuốt từng chiếc kính – sang trọng, thanh lịch mà vẫn kín đáo, đĩnh đạc.
        Mỗi dòng sản phẩm mang một định vị và phong cách riêng.
      </p>
    </div>

    <div class="trio__grid">
      <RouterLink
        v-for="(c, i) in items"
        :key="c.id"
        class="trio__card"
        :to="{ name: 'collection', params: { slug: c.slug } }"
      >
        <div class="trio__media reveal-mask" v-reveal="i * 140">
          <img v-parallax="0.08" :src="c.img" :alt="c.name" loading="lazy" />
        </div>
        <div class="trio__hex" aria-hidden="true">
          <svg viewBox="0 0 60 80"><path d="M30 2 L58 20 L58 60 L30 78 L2 60 L2 20 Z" /></svg>
          <span>{{ c.letter }}</span>
        </div>
        <div class="trio__info">
          <span class="trio__num">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3>{{ c.name }}</h3>
          <p v-if="c.tagline">{{ c.tagline }}</p>
          <div class="trio__meta">
            <span v-if="c.price" class="trio__price">{{ c.price }}</span>
            <span class="trio__go">{{ c.product_count }} mẫu <i>→</i></span>
          </div>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.trio { padding: var(--section-pad); padding-bottom: clamp(40px, 4vw, 64px); background: #fff; }
.trio__head { display: grid; grid-template-columns: 1.2fr 1fr; gap: clamp(28px, 6vw, 100px); align-items: end; margin-bottom: clamp(32px, 4vw, 56px); }
.trio__head .lux-display { margin: 0; }
.trio__lead { margin: 0; font-size: 15px; line-height: 1.9; color: var(--ink-soft); max-width: 520px; }
.trio__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2vw, 32px); }
.trio__card { position: relative; display: block; color: inherit; }
.trio__card:nth-child(2) { margin-top: clamp(24px, 4vw, 60px); }
.trio__card:nth-child(1), .trio__card:nth-child(3) { margin-bottom: clamp(24px, 4vw, 60px); }
.trio__media { position: relative; aspect-ratio: 3 / 4; overflow: hidden; background: var(--card); }
.trio__media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: filter 0.8s; }
.trio__card:hover .trio__media img { filter: brightness(1.06); }
.trio__hex { position: absolute; top: 18px; right: 18px; width: 54px; color: #fff; }
.trio__hex svg { width: 100%; fill: rgba(6, 35, 31, 0.25); stroke: rgba(255, 255, 255, 0.9); stroke-width: 1; transition: transform 0.8s var(--ease-out), fill 0.5s; }
.trio__card:hover .trio__hex svg { transform: rotate(180deg); fill: var(--green); }
.trio__hex span { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--serif); font-size: 26px; }
.trio__info { padding: 22px 4px 0; }
.trio__num { font-size: 11px; letter-spacing: 0.2em; color: var(--gold); }
.trio__info h3 { margin: 8px 0 6px; font-family: var(--serif); font-weight: 400; font-size: clamp(26px, 2.2vw, 36px); line-height: 1.1; color: var(--ink); }
.trio__info p { margin: 0 0 16px; font-size: 14px; color: var(--ink-soft); }
.trio__meta { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(29, 36, 34, 0.12); padding-top: 14px; }
.trio__price { font-size: 14px; font-weight: 600; color: var(--green); }
.trio__go { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
.trio__go i { font-style: normal; display: inline-block; transition: transform 0.4s var(--ease-out); }
.trio__card:hover .trio__go i { transform: translateX(6px); }
@media (max-width: 900px) {
  .trio__head { grid-template-columns: 1fr; }
  .trio__grid { grid-template-columns: 1fr; gap: 48px; }
  .trio__card:nth-child(n) { margin: 0; }
  .trio__media { aspect-ratio: 4 / 5; }
}
</style>
