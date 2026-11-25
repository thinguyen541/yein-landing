<script setup>
import { computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'
import ZaloLink from '../components/ZaloLink.vue'
import LuxLoader from '../components/home/LuxLoader.vue'
import { initSmooth, destroySmooth, refresh, onFrame } from '../composables/smooth'

const route = useRoute()
const isHome = computed(() => route.name === 'home')

// start smooth scrolling before children mount (the intro loader pauses it); always open at the top
window.scrollTo(0, 0)
initSmooth()

let progressEl = null
let off
onMounted(() => {
  off = onFrame((y) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    if (progressEl) progressEl.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`
  })
})
onBeforeUnmount(() => {
  off?.()
  destroySmooth()
})
// page change -> re-measure scroll effects once the new page is rendered
watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    refresh()
  }
)
</script>

<template>
  <LuxLoader />
  <div class="scroll-progress" aria-hidden="true"><i :ref="(el) => (progressEl = el)"></i></div>
  <SiteHeader :overlay="isHome" />
  <main class="site-main" :class="{ 'site-main--home': isHome }">
    <RouterView />
  </main>
  <SiteFooter />
  <ZaloLink class="zalo-float">Zalo</ZaloLink>
</template>
