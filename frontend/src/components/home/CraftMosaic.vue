<script setup>
import { craftShots } from '../../data/banners'
</script>

<template>
  <section class="mosaic">
    <div class="mosaic__head">
      <p class="eyebrow" v-reveal>Chi tiết chế tác</p>
      <h2 class="lux-display lux-display--sm" v-reveal="100">Đẹp đến từng<br /><em>chi tiết nhỏ</em></h2>
      <p class="mosaic__lead" v-reveal="200">Từ viên đá đính trên càng kính đến đường cắt mép tròng – mỗi chiếc kính YEIN là một món trang sức.</p>
    </div>
    <div class="mosaic__grid">
      <figure v-for="(c, i) in craftShots" :key="c.img" class="mosaic__item" :class="`m${i + 1}`">
        <div class="mosaic__media reveal-mask" v-reveal="(i % 3) * 120">
          <img v-parallax="0.06" :src="c.img" :alt="c.title" loading="lazy" />
        </div>
        <figcaption v-reveal="(i % 3) * 120 + 150">
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          <b>{{ c.title }}</b>
          <em>{{ c.text }}</em>
        </figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.mosaic { padding: var(--section-pad); background: #fff; }
.mosaic__head { max-width: 640px; margin-bottom: clamp(40px, 6vw, 80px); }
.mosaic__head em { font-style: italic; color: var(--gold); }
.mosaic__lead { font-size: 15px; line-height: 1.9; color: var(--ink-soft); margin: 0; }
.mosaic__grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: clamp(16px, 2vw, 28px); align-items: start; }
.mosaic__item { margin: 0; }
.mosaic__media { position: relative; overflow: hidden; background: var(--card); }
.mosaic__media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.m1 { grid-column: 1 / span 7; } .m1 .mosaic__media { aspect-ratio: 16 / 9; }
.m2 { grid-column: 8 / span 5; margin-top: 12vh; } .m2 .mosaic__media { aspect-ratio: 4 / 3; }
.m3 { grid-column: 1 / span 4; } .m3 .mosaic__media { aspect-ratio: 1; }
.m4 { grid-column: 5 / span 4; margin-top: 8vh; } .m4 .mosaic__media { aspect-ratio: 1; }
.m5 { grid-column: 9 / span 4; margin-top: 2vh; } .m5 .mosaic__media { aspect-ratio: 1; }
figcaption { display: grid; grid-template-columns: auto 1fr; column-gap: 14px; padding-top: 16px; }
figcaption span { grid-row: span 2; font-size: 11px; color: var(--gold); padding-top: 6px; }
figcaption b { font-family: var(--serif); font-weight: 400; font-size: 24px; color: var(--ink); }
figcaption em { font-style: normal; font-size: 13.5px; color: var(--muted); }
@media (max-width: 900px) {
  .mosaic__grid { grid-template-columns: 1fr 1fr; }
  .m1 { grid-column: 1 / -1; }
  .m2, .m3, .m4, .m5 { grid-column: span 1; margin-top: 0; }
  .m2 .mosaic__media, .m3 .mosaic__media, .m4 .mosaic__media, .m5 .mosaic__media { aspect-ratio: 1; }
  figcaption em { display: none; }
  figcaption b { font-size: 18px; }
}
</style>
