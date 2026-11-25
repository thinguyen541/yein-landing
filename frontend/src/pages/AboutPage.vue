<script setup>
import { onMounted } from 'vue'
import { aboutText, stats, history, honors, designer } from '../data/about'

const formatStat = (s) => new Intl.NumberFormat('vi-VN').format(s.value) + s.suffix

const nav = [
  { id: 'cau-chuyen', label: 'Câu chuyện thương hiệu' },
  { id: 'nha-thiet-ke', label: 'Nhà thiết kế' },
  { id: 'lich-su', label: 'Lịch sử' },
  { id: 'giai-thuong', label: 'Giải thưởng' },
  { id: 'trung-bay', label: 'Hệ thống trưng bày' },
]

onMounted(() => (document.title = 'Về YEIN – Kính không viền cắt cạnh kim cương'))
</script>

<template>
  <section class="banner">
    <div class="banner-text">
      <div class="crumbs"><RouterLink to="/">Trang chủ</RouterLink> / <span>Về YEIN</span></div>
      <p class="eyebrow" style="color: var(--gold-light)">About us</p>
      <h1>Kính không viền,<br />tôi yêu YEIN hơn</h1>
      <p class="desc">Câu chuyện thương hiệu, nhà thiết kế, lịch sử và giải thưởng của YEIN.</p>
    </div>
    <div class="banner-media"><img :src="'/img/cover.webp'" alt="" /></div>
  </section>

  <nav class="subnav">
    <div class="wrap">
      <a v-for="n in nav" :key="n.id" :href="'#' + n.id">{{ n.label }}</a>
    </div>
  </nav>

  <!-- Brand story -->
  <section id="cau-chuyen" class="section">
    <div class="wrap media-split">
      <div class="media"><img :src="'/img/about.webp'" alt="Chi tiết càng kính YEIN đính kim cương" loading="lazy" /></div>
      <div>
        <p class="eyebrow">Câu chuyện thương hiệu</p>
        <h2 class="display">Chế tác bằng tâm huyết</h2>
        <p v-for="(t, i) in aboutText" :key="i">{{ t }}</p>
        <div class="stats stats--light">
          <div v-for="s in stats" :key="s.label" class="stat">
            <strong>{{ formatStat(s) }}</strong>
            <span>{{ s.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Designer -->
  <section id="nha-thiet-ke" class="section section--paper">
    <div class="wrap media-split reverse">
      <div class="media"><img :src="designer.img" :alt="'Nhà thiết kế ' + designer.name" loading="lazy" /></div>
      <div>
        <p class="eyebrow">Nhà thiết kế hợp tác YEIN</p>
        <h2 class="display">{{ designer.name }}</h2>
        <div class="facts">
          <div v-for="f in designer.facts" :key="f.value">
            <strong>{{ f.value }}</strong>
            <span>{{ f.text }}</span>
          </div>
        </div>
        <p class="quote">{{ designer.quote }}</p>
      </div>
    </div>
  </section>

  <!-- History -->
  <section id="lich-su" class="section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Lịch sử thương hiệu</p>
          <h2 class="display">Từ 2006 đến nay</h2>
        </div>
      </div>
      <div class="timeline">
        <div v-for="h in history" :key="h.year" class="tl-item">
          <strong>{{ h.year }}</strong>
          <p>{{ h.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Honors -->
  <section id="giai-thuong" class="honors">
    <img class="honors-bg" :src="'/img/cover.webp'" alt="" loading="lazy" />
    <div class="wrap">
      <div>
        <p class="eyebrow" style="color: var(--gold-light)">Brand honors</p>
        <h2 class="display display--lg">Giải thưởng<br />thương hiệu</h2>
      </div>
      <ul>
        <li v-for="(h, i) in honors" :key="i">
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          <span>{{ h }}</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- Showroom -->
  <section id="trung-bay" class="section section--paper">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">Counter & zones display</p>
          <h2 class="display">Hình ảnh quầy và khu trưng bày</h2>
        </div>
        <RouterLink class="link-arrow" :to="{ path: '/', hash: '#dai-ly' }">Trở thành đại lý →</RouterLink>
      </div>
      <div class="show-grid">
        <img :src="'/img/store.webp'" alt="Khu trưng bày YEIN" loading="lazy" />
        <img :src="'/img/shelf.webp'" alt="Tủ trưng bày YEIN" loading="lazy" />
      </div>
    </div>
  </section>
</template>
