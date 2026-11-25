<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({
  text: { type: String, default: 'Kính không viền · Tôi yêu YEIN hơn' },
  dark: { type: Boolean, default: false }
})

const track = ref(null)
let raf = 0
let lastY = 0
let x = 0
let velocity = 0

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  // Constant drift + boost from scroll velocity (own loop: must run even when idle)
  let prev = performance.now()
  lastY = window.scrollY
  const loop = (now) => {
    const dt = Math.min(64, now - prev)
    prev = now
    const y = window.scrollY
    velocity = velocity * 0.9 + (y - lastY) * 0.1
    lastY = y
    x -= 0.03 * dt + Math.abs(velocity) * 0.25
    const el = track.value
    if (el) {
      const w = el.scrollWidth / 2
      if (-x >= w) x += w
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="marquee" :class="{ 'marquee--dark': props.dark }" aria-hidden="true">
    <div ref="track" class="marquee__track">
      <span v-for="n in 8" :key="n">{{ props.text }} <i>✦</i></span>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  padding: 14px 0;
  background: var(--paper);
  border-top: 1px solid rgba(29, 36, 34, 0.12);
  border-bottom: 1px solid rgba(29, 36, 34, 0.12);
}
.marquee--dark {
  background: var(--green);
  color: #f3efe7;
  border-color: transparent;
}
.marquee__track {
  display: flex;
  width: max-content;
  will-change: transform;
}
.marquee span {
  font-family: var(--serif);
  font-size: clamp(18px, 2vw, 28px);
  font-weight: 300;
  white-space: nowrap;
  padding-right: 0.6em;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.marquee i {
  font-style: normal;
  font-size: 0.4em;
  vertical-align: middle;
  color: var(--gold);
  margin-left: 0.6em;
}
</style>
