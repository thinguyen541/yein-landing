<script setup>
import PriceTag from './PriceTag.vue'
import { computed } from 'vue'
import { thumb, imgFallback, onSale } from '../utils'

const props = defineProps({
  product: { type: Object, required: true },
  showCollection: { type: Boolean, default: true },
})
defineEmits(['open'])

// labels set in admin: Mẫu hot / Hàng mới / Bán chạy, plus the discount
const badges = computed(() => {
  const p = props.product
  const b = []
  if (p.is_hot) b.push({ cls: 'hot', text: 'Hot' })
  if (p.is_new) b.push({ cls: 'new', text: 'Mới' })
  if (p.is_featured) b.push({ cls: 'best', text: 'Bán chạy' })
  if (onSale(p)) b.push({ cls: 'sale', text: `-${Math.round((1 - p.sale_price / p.price) * 100)}%` })
  return b
})
</script>

<template>
  <button class="card" type="button" @click="$emit('open', product)">
    <div class="card-img">
      <span v-if="badges.length" class="card-badges">
        <i v-for="b in badges" :key="b.cls" :class="b.cls">{{ b.text }}</i>
      </span>
      <img :src="thumb(product.image_url)" :alt="product.name" loading="lazy" @error="imgFallback($event, product.code)" />
    </div>
    <div class="card-body">
      <span class="card-meta">{{ showCollection ? product.collection_name : product.series || product.collection_name }}</span>
      <span class="card-name">{{ product.name }}</span>
      <PriceTag :product="product" />
    </div>
  </button>
</template>
