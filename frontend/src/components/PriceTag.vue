<script setup>
import { money, onSale } from '../utils'

defineProps({ product: { type: Object, required: true } })
</script>

<template>
  <div class="price">
    <span v-if="product.price == null" class="contact">Liên hệ báo giá</span>
    <template v-else-if="onSale(product)">
      <span>{{ money(product.sale_price) }}</span>
      <span class="old">{{ money(product.price) }}</span>
    </template>
    <span v-else>{{ money(product.price) }}</span>
  </div>
</template>
