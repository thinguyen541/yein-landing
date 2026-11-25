<script setup>

defineProps({
  story: { type: Object, required: true }
})
</script>

<template>
  <section :id="story.id" class="story">
    <template v-for="(b, i) in story.blocks" :key="i">
      <!-- INTRO: gray panel with hexagon letter (like the catalogue series pages) -->
      <div v-if="b.type === 'intro'" class="intro">
        <div class="intro__hex" v-reveal>
          <svg viewBox="0 0 60 80" aria-hidden="true">
            <path d="M30 2 L58 20 L58 60 L30 78 L2 60 L2 20 Z" />
          </svg>
          <span>{{ b.letter }}</span>
        </div>
        <div class="intro__body">
          <p class="eyebrow" v-reveal>{{ b.en }}</p>
          <h2 class="lux-display lux-display--sm" v-reveal="100">{{ b.title }}</h2>
          <p class="intro__text" v-reveal="200">{{ b.text }}</p>
          <p v-if="b.note" class="intro__note" v-reveal="300">{{ b.note }}</p>
          <div v-if="b.cta" v-reveal="380"><RouterLink class="intro__cta" :to="b.cta.to">{{ b.cta.label }} <span>→</span></RouterLink></div>
        </div>
      </div>

      <!-- FULL: full-bleed image with parallax and overlay copy -->
      <div
        v-else-if="b.type === 'full'"
        class="full"
        :class="[`full--${b.align || 'left'}`, `full--${b.tone || 'light'}`, b.height === 'short' ? 'full--short' : '']"
      >
        <div class="full__media">
          <img
            v-parallax="0.1"
            :src="b.img"
            :alt="b.title || ''"
            :style="{ objectPosition: b.position || 'center' }"
            loading="lazy"
          />
        </div>
        <div v-if="b.title" class="full__copy">
          <p v-if="b.eyebrow" class="eyebrow" v-reveal>{{ b.eyebrow }}</p>
          <h3 class="lux-display lux-display--sm" v-reveal="100">{{ b.title }}</h3>
          <p v-if="b.text" class="full__text" v-reveal="200">{{ b.text }}</p>
        </div>
      </div>

      <!-- SPLIT: image + copy/specs -->
      <div v-else-if="b.type === 'split'" class="split" :class="{ 'split--reverse': b.reverse }">
        <div class="split__media reveal-mask" :class="{ 'split__media--contain': b.contain }" v-reveal>
          <img v-if="b.contain" class="float" :src="b.img" :alt="b.title" loading="lazy" />
          <img v-else v-parallax="0.08" :src="b.img" :alt="b.title" loading="lazy" />
        </div>
        <div class="split__body">
          <p class="eyebrow" v-reveal>{{ b.eyebrow }}</p>
          <h3 class="lux-display lux-display--sm" v-reveal="100">{{ b.title }}</h3>
          <p class="split__text" v-reveal="200">{{ b.text }}</p>
          <dl v-if="b.specs" class="specs">
            <div v-for="(s, j) in b.specs" :key="j" v-reveal="250 + j * 60">
              <dt>{{ s.k }}</dt>
              <dd>{{ s.v }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- DUO: two staggered images + caption -->
      <div v-else-if="b.type === 'duo'" class="duo">
        <div class="duo__a reveal-mask" v-reveal>
          <img v-parallax="0.08" :src="b.imgs[0]" alt="" loading="lazy" />
        </div>
        <div class="duo__b reveal-mask" v-reveal="150">
          <img v-parallax="0.12" :src="b.imgs[1]" alt="" loading="lazy" />
        </div>
        <div class="duo__copy">
          <h3 class="lux-display lux-display--xs" v-reveal>{{ b.title }}</h3>
          <p v-reveal="100">{{ b.text }}</p>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.story {
  background: #fff;
}

/* ---------- intro ---------- */
.intro {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
  gap: clamp(32px, 6vw, 100px);
  align-items: center;
  padding: var(--section-pad);
  background: var(--stone);
  min-height: 80vh;
}
.intro__hex {
  position: relative;
  justify-self: center;
  width: clamp(120px, 14vw, 200px);
}
.intro__hex svg {
  width: 100%;
  fill: none;
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 0.8;
  animation: slowSpin 40s linear infinite;
}
@keyframes slowSpin {
  to { transform: rotate(360deg); }
}
.intro__hex span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--serif);
  font-size: clamp(48px, 5vw, 80px);
  color: #fff;
}
.intro .eyebrow {
  color: #fff;
}
.intro .display {
  color: var(--ink);
}
.intro__text {
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink-soft);
  max-width: 680px;
}
.intro__cta {
  display: inline-flex; align-items: center; gap: 12px; margin-top: 30px; padding: 14px 24px;
  border-radius: 999px; background: var(--green); color: #f3efe7; font-size: 13px; letter-spacing: 0.08em;
  transition: background 0.4s, transform 0.4s var(--ease-out);
}
.intro__cta:hover { background: var(--green-deep); transform: translateY(-2px); }
.intro__cta span { transition: transform 0.4s var(--ease-out); }
.intro__cta:hover span { transform: translateX(4px); }
.intro__note {
  margin-top: 24px;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--ink);
  border-bottom: 1px solid currentColor;
  display: inline-block;
  padding-bottom: 4px;
}

/* ---------- full ---------- */
.full {
  position: relative;
  height: 100vh;
  min-height: 560px;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.full--short {
  height: 70vh;
}
.full__media {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.full__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.full__copy {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0 clamp(28px, 8vw, 140px);
  padding: 36px 0;
}
.full--right {
  justify-content: flex-end;
  text-align: right;
}
.full--right .full__copy {
  margin-left: auto;
}
.full--dark .full__copy,
.full--light .full__copy {
  color: var(--ink);
}
.full--light .full__copy::before {
  content: '';
  position: absolute;
  inset: -40px -60px;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.55), transparent);
  z-index: -1;
}
.full__text {
  font-size: 15px;
  line-height: 1.85;
  color: var(--ink-soft);
}

/* ---------- split ---------- */
.split {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 110px);
  align-items: center;
  padding: var(--section-pad);
}
.split--reverse .split__media {
  order: 2;
}
.split__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 5 / 4;
}
.split__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.split__media--contain {
  aspect-ratio: 16 / 9;
  background: #fff;
}
.split__media--contain img {
  object-fit: contain;
}
.float {
  animation: floaty 6s ease-in-out infinite;
}
@keyframes floaty {
  0%, 100% { transform: translateY(-8px) rotate(-0.6deg); }
  50% { transform: translateY(8px) rotate(0.6deg); }
}
.split__text {
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink-soft);
}
.specs {
  margin: 32px 0 0;
  border-top: 1px solid rgba(29, 36, 34, 0.12);
}
.specs > div {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(29, 36, 34, 0.12);
}
.specs dt {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
  padding-top: 3px;
}
.specs dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink);
}

/* ---------- duo ---------- */
.duo {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: var(--section-pad);
  align-items: start;
}
.duo__a,
.duo__b {
  position: relative;
  overflow: hidden;
}
.duo__a img,
.duo__b img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.duo__a {
  grid-column: 1 / span 7;
  aspect-ratio: 16 / 10;
}
.duo__b {
  grid-column: 8 / span 5;
  aspect-ratio: 4 / 5;
  margin-top: 18vh;
}
.duo__copy {
  grid-column: 2 / span 5;
  margin-top: -6vh;
}
.duo__copy p {
  font-size: 15px;
  line-height: 1.9;
  color: var(--ink-soft);
}

@media (max-width: 900px) {
  .intro,
  .split {
    grid-template-columns: 1fr;
  }
  .split--reverse .split__media {
    order: 0;
  }
  .intro__hex {
    justify-self: start;
    width: 110px;
  }
  .full {
    height: 80vh;
  }
  .full--right {
    text-align: left;
    justify-content: flex-start;
  }
  .full__copy {
    align-self: flex-end;
    margin-bottom: 40px;
  }
  .duo__a,
  .duo__b,
  .duo__copy {
    grid-column: 1 / -1;
    margin-top: 0;
  }
  .specs > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
