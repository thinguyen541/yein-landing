<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  dealers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const province = ref('')
const q = ref('')

const provinces = computed(() => [...new Set(props.dealers.map((d) => d.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')))

const shown = computed(() => {
  const s = q.value.trim().toLowerCase()
  return props.dealers.filter(
    (d) =>
      (!province.value || d.province === province.value) &&
      (!s || `${d.name} ${d.address || ''} ${d.province || ''} ${d.phone || ''}`.toLowerCase().includes(s))
  )
})

const zaloHref = (z) => (/^https?:\/\//.test(z) ? z : 'https://zalo.me/' + String(z).replace(/\D/g, ''))
const mapHref = (d) => d.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.name} ${d.address || ''}`)}`
</script>

<template>
  <div class="dealers">
    <div v-if="dealers.length > 3" class="dealer-tools">
      <select v-model="province" aria-label="Lọc theo tỉnh / thành">
        <option value="">Tất cả tỉnh / thành ({{ dealers.length }})</option>
        <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
      </select>
      <input v-model="q" type="search" placeholder="Tìm tên, địa chỉ, số điện thoại…" />
    </div>

    <p v-if="loading" class="empty">Đang tải danh sách đại lý…</p>
    <p v-else-if="!dealers.length" class="empty">Danh sách đại lý đối tác đang được cập nhật.</p>
    <p v-else-if="!shown.length" class="empty">Không tìm thấy đại lý phù hợp.</p>

    <div v-else class="dealer-grid">
      <article v-for="d in shown" :key="d.id" class="dealer-card">
        <span v-if="d.province" class="dealer-province">{{ d.province }}</span>
        <h3>{{ d.name }}</h3>
        <p v-if="d.address" class="dealer-line">
          <span aria-hidden="true">📍</span>
          <a :href="mapHref(d)" target="_blank" rel="noopener">{{ d.address }}</a>
        </p>
        <p v-if="d.opening_hours" class="dealer-line"><span aria-hidden="true">🕘</span>{{ d.opening_hours }}</p>
        <p v-if="d.note" class="dealer-note">{{ d.note }}</p>
        <div class="dealer-actions">
          <a v-if="d.phone" class="btn btn-ghost" :href="'tel:' + d.phone.replace(/\s/g, '')">Gọi {{ d.phone }}</a>
          <a v-if="d.zalo" class="btn btn-dark" :href="zaloHref(d.zalo)" target="_blank" rel="noopener">Zalo</a>
          <a v-if="d.address || d.map_url" class="link-arrow" :href="mapHref(d)" target="_blank" rel="noopener">Chỉ đường →</a>
        </div>
      </article>
    </div>
  </div>
</template>
