<script setup>
import PriceTag from './PriceTag.vue'
import { thumb, imgFallback } from '../utils'

defineProps({
  product: { type: Object, required: true },
  showCollection: { type: Boolean, default: true },
})
defineEmits(['open'])
</script>

<template>
  <button class="card" type="button" @click="$emit('open', product)">
    <div class="card-img">
      <img :src="thumb(product.image_url)" :alt="product.name" loading="lazy" @error="imgFallback($event, product.code)" />
    </div>
    <div class="card-body">
      <span class="card-meta">{{ showCollection ? product.collection_name : product.series || product.collection_name }}</span>
      <span class="card-name">{{ product.name }}</span>
      <PriceTag :product="product" />
    </div>
  </button>
</template>
