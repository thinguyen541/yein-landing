<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

defineProps({ title: { type: String, default: '' }, wide: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const onKey = (e) => e.key === 'Escape' && emit('close')
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" @mousedown.self="emit('close')">
    <div class="box" :class="{ xl: wide }">
      <h3 v-if="title">{{ title }}</h3>
      <slot />
    </div>
  </div>
</template>
