<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { processes } from '../../data/about'
import { onFrame } from '../../composables/smooth'

// Stacked sticky cards: each card shrinks/dims slightly as the next one covers it
const cards = ref([])
let off

onMounted(() => {
  off = onFrame(() => {
    const vh = window.innerHeight
    cards.value.forEach((card, i) => {
      const next = cards.value[i + 1]
      if (!card || !next) return
      const nTop = next.getBoundingClientRect().top
      const start = vh
      const end = card.getBoundingClientRect().top + 40
      const p = Math.min(1, Math.max(0, (start - nTop) / (start - end || 1)))
      const inner = card.firstElementChild
      inner.style.transform = `scale(${1 - p * 0.06})`
      inner.style.filter = `brightness(${1 - p * 0.25})`
    })
  })
})
onBeforeUnmount(() => off?.())
</script>

<template>
  <section id="cong-nghe" class="process">
    <div class="process__hero">
      <div class="process__hero-media">
        <img v-parallax="0.1" :src="'/img/process-woman.webp'" alt="" loading="lazy" />
      </div>
      <div class="process__hero-copy">
        <p class="eyebrow" v-reveal>Product process</p>
        <h2 class="lux-display" v-reveal="100">Công nghệ<br />chế tác</h2>
      </div>
    </div>

    <div class="process__stack">
      <div
        v-for="(p, i) in processes"
        :key="p.title"
        :ref="(el) => (cards[i] = el)"
        class="pcard"
        :style="{ top: `calc(var(--header-h) + 4vh + ${i * 14}px)` }"
      >
        <div class="pcard__inner" :class="{ 'pcard__inner--rev': i % 2 }">
          <div class="pcard__media">
            <img :src="p.img" :alt="p.title" loading="lazy" />
          </div>
          <div class="pcard__body">
            <span class="pcard__num">{{ String(i + 1).padStart(2, '0') }} / {{ String(processes.length).padStart(2, '0') }}</span>
            <h3>{{ p.title }}</h3>
            <p class="pcard__sub">{{ p.sub }}</p>
            <p class="pcard__text">{{ p.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.process {
  background: var(--paper);
}
.process__hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.process__hero-media {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.process__hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 30% center;
}
.process__hero-copy {
  position: relative;
  margin-right: clamp(28px, 10vw, 180px);
  text-align: right;
  color: #fff;
}
.process__hero-copy .eyebrow,
.process__hero-copy .lux-display {
  color: #fff;
}
.process__stack {
  padding: 10vh clamp(16px, 5vw, 80px) 20vh;
}
.pcard {
  position: sticky;
  height: calc(88vh - var(--header-h));
  min-height: 460px;
  margin-bottom: 6vh;
}
.pcard__inner {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  background: #fff;
  overflow: hidden;
  box-shadow: 0 40px 80px -50px rgba(15, 59, 53, 0.5);
  transform-origin: center top;
  will-change: transform, filter;
}
.pcard__inner--rev .pcard__media {
  order: 2;
}
.pcard__media {
  overflow: hidden;
}
.pcard__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 1.4s var(--ease-out);
}
.pcard:hover .pcard__media img {
  transform: scale(1.04);
}
.pcard__body {
  padding: clamp(28px, 4vw, 64px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pcard__num {
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--gold);
}
.pcard h3 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(28px, 2.6vw, 42px);
  line-height: 1.15;
  margin: 18px 0 12px;
  color: var(--ink);
}
.pcard__sub {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--green);
  margin: 0 0 22px;
}
.pcard__text {
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink-soft);
  margin: 0;
}
@media (max-width: 900px) {
  .pcard {
    height: auto;
    min-height: 80vh;
  }
  .pcard__inner {
    grid-template-columns: 1fr;
    grid-template-rows: 45vh auto;
  }
  .pcard__inner--rev .pcard__media {
    order: 0;
  }
}
</style>
