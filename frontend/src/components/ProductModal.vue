<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { stopSmooth, startSmooth } from '../composables/smooth'
import PriceTag from './PriceTag.vue'
import ZaloLink from './ZaloLink.vue'
import { useSettings } from '../composables/useSettings'
import { money, imgFallback, parseLensOptions } from '../utils'

const props = defineProps({
  product: { type: Object, default: null },
  showCollectionLink: { type: Boolean, default: true },
})
const emit = defineEmits(['close'])

const { settings } = useSettings()
const lensOptions = computed(() => parseLensOptions(settings.value.lens_options))

// All images of the product (first = main); falls back to image_url
const gallery = computed(() => {
  const p = props.product
  if (!p) return []
  return p.images?.length ? p.images : p.image_url ? [p.image_url] : []
})
const active = ref(0)

const onKey = (e) => e.key === 'Escape' && emit('close')
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  startSmooth()
})

// Lock page scroll while open
watch(
  () => props.product,
  (p) => {
    document.body.style.overflow = p ? 'hidden' : ''
    p ? stopSmooth() : startSmooth() // the page must not scroll behind the popup
    active.value = 0
  }
)
</script>

<template>
  <Transition name="fade">
    <div v-if="product" class="modal" data-lenis-prevent role="dialog" aria-modal="true" @click.self="emit('close')">
      <div class="modal-box">
        <button class="modal-close" aria-label="Đóng" @click="emit('close')">×</button>
        <div class="modal-img">
          <div class="modal-stage">
            <img :key="gallery[active]" :src="gallery[active]" :alt="product.name" @error="imgFallback($event, product.code)" />
          </div>
          <div v-if="gallery.length > 1" class="modal-thumbs">
            <button
              v-for="(g, i) in gallery"
              :key="g"
              type="button"
              :class="{ active: i === active }"
              @click="active = i"
            ><img :src="g" alt="" /></button>
          </div>
        </div>
        <div class="modal-info">
          <span class="eyebrow">{{ product.collection_name }}<template v-if="product.series"> · {{ product.series }}</template></span>
          <h3>{{ product.name }}</h3>
          <span class="code">Mã {{ product.code }}<template v-if="product.description"> · {{ product.description }}</template></span>
          <PriceTag :product="product" />
          <p class="price-note">Giá bán lẻ kiến nghị.</p>

          <div v-if="lensOptions.length" class="lens">
            <h4>Nâng cấp tròng (cộng thêm)</h4>
            <ul>
              <li v-for="o in lensOptions" :key="o.name">
                <span>{{ o.name }}</span>
                <b>{{ o.price != null ? '+' + money(o.price) : 'Liên hệ' }}</b>
              </li>
            </ul>
          </div>

          <div class="actions">
            <ZaloLink class="btn btn-dark">Nhắn Zalo tư vấn mẫu {{ product.code }}</ZaloLink>
            <RouterLink
              v-if="showCollectionLink && product.collection_slug"
              class="btn btn-ghost"
              :to="{ name: 'collection', params: { slug: product.collection_slug } }"
              @click="emit('close')"
            >Xem cả {{ product.collection_name }}</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
