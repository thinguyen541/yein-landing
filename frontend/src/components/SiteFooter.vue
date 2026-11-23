<script setup>
import { useSettings, DEFAULT_ZALO } from '../composables/useSettings'

const { settings, zaloUrl } = useSettings()
const year = new Date().getFullYear()
</script>

<template>
  <footer id="lien-he" class="site-footer">
    <div class="wrap">
      <div class="foot-big">Kính không viền<em>Chọn YEIN</em></div>
      <div class="foot-grid">
        <div>
          <p class="eyebrow">Nhà phân phối</p>
          <p v-if="settings.company_name" class="foot-name">{{ settings.company_name }}</p>
          <p v-if="settings.tax_code">Mã số thuế: {{ settings.tax_code }}</p>
          <p v-if="settings.address">{{ settings.address }}</p>
        </div>
        <div>
          <p class="eyebrow">Liên hệ</p>
          <a v-if="settings.hotline" :href="'tel:' + settings.hotline.replace(/\s/g, '')">SĐT: {{ settings.hotline }}</a>
          <a v-if="zaloUrl" :href="zaloUrl" target="_blank" rel="noopener">Zalo: {{ settings.zalo || DEFAULT_ZALO }}</a>
          <a v-if="settings.email" :href="'mailto:' + settings.email">{{ settings.email }}</a>
          <p v-if="settings.working_hours">{{ settings.working_hours }}</p>
          <a v-if="settings.facebook" :href="settings.facebook" target="_blank" rel="noopener">Facebook</a>
        </div>
        <div>
          <p class="eyebrow">Khám phá</p>
          <RouterLink to="/san-pham">Tất cả sản phẩm</RouterLink>
          <RouterLink :to="{ path: '/', hash: '#bo-suu-tap' }">Bộ sưu tập</RouterLink>
          <RouterLink to="/ve-yein">Về YEIN</RouterLink>
          <RouterLink :to="{ path: '/', hash: '#dai-ly' }">Hệ thống đại lý</RouterLink>
        </div>
      </div>
      <div class="foot-bar">
        <span>© {{ year }} YEIN · Kính không viền cắt cạnh kim cương</span>
        <span class="logo">YEIN</span>
      </div>
    </div>
  </footer>
</template>
