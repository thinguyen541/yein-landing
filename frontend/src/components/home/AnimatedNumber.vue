<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  duration: { type: Number, default: 2000 }
})

const el = ref(null)
const shown = ref(0)
let io
let raf

const fmt = (n) => n.toLocaleString('vi-VN')

onMounted(() => {
  io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return
    io.disconnect()
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / props.duration)
      const eased = 1 - Math.pow(1 - p, 4)
      shown.value = Math.round(props.value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }, { threshold: 0.4 })
  io.observe(el.value)
})
onBeforeUnmount(() => {
  io?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <span ref="el">{{ fmt(shown) }}</span>
</template>
