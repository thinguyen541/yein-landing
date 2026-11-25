<script setup>
import { ref, onMounted } from 'vue'
import { siteReady } from '../../composables/useSiteReady'
import { stopSmooth, startSmooth, refresh } from '../../composables/smooth'

// Intro curtain shown once when the site is opened (luxury feel, like the demo)
const done = ref(false)
const gone = ref(false)

onMounted(() => {
  stopSmooth()
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    done.value = true
    siteReady.value = true
    document.documentElement.classList.add('site-ready')
    startSmooth()
    refresh()
    setTimeout(() => (gone.value = true), 1600)
  }
  const minShow = 1100 // let the logo animation play
  const t0 = performance.now()
  const afterLoad = () => setTimeout(finish, Math.max(250, minShow - (performance.now() - t0)))
  if (document.readyState === 'complete') afterLoad()
  else window.addEventListener('load', afterLoad, { once: true })
  setTimeout(finish, 3500) // never block longer than this
})
</script>

<template>
  <div v-if="!gone" class="loader" :class="{ 'is-done': done }" aria-hidden="true">
    <span class="loader__logo">Y E I N</span>
    <span class="loader__line"></span>
    <span class="loader__tag">Kính không viền · Cắt cạnh kim cương</span>
  </div>
</template>
