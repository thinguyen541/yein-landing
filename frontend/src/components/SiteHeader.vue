<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ZaloLink from './ZaloLink.vue'
import { onFrame, scrollTo } from '../composables/smooth'

// overlay: transparent header on top of the home hero, turns solid once you scroll
const props = defineProps({ overlay: { type: Boolean, default: false } })
const scrolled = ref(false)
let off
onMounted(() => (off = onFrame((y) => (scrolled.value = y > window.innerHeight * 0.75))))
onBeforeUnmount(() => off?.())

const route = useRoute()
const router = useRouter()
const open = ref(false)

// to: route path; hash: section on that page
const links = [
  { label: 'Về YEIN', path: '/ve-yein' },
  { label: 'Bộ sưu tập', path: '/bo-suu-tap' },
  { label: 'Sản phẩm', path: '/san-pham' },
  { label: 'Công nghệ', path: '/', hash: '#cong-nghe' },
  { label: 'Đại lý', path: '/', hash: '#dai-ly' },
  { label: 'Liên hệ', hash: '#lien-he' }, // footer, present on every page
]

const isActive = (l) =>
  (l.path === '/san-pham' && route.name === 'products') ||
  (l.path === '/ve-yein' && !l.hash && route.name === 'about') ||
  (l.path === '/bo-suu-tap' && (route.name === 'collections' || route.name === 'collection'))

function go(l) {
  open.value = false
  const samePage = !l.path || l.path === route.path
  if (samePage && l.hash) {
    scrollTo(l.hash)
    history.replaceState(history.state, '', l.hash)
  } else if (samePage) {
    scrollTo(0, { offset: 0 })
  } else {
    router.push({ path: l.path, hash: l.hash })
  }
}
</script>

<template>
  <header class="site-header" :class="{ 'is-overlay': props.overlay && !scrolled && !open }">
    <div class="wrap">
      <RouterLink to="/" class="logo">YEIN</RouterLink>
      <nav class="main-nav" :class="{ open }">
        <a
          v-for="l in links"
          :key="l.label"
          :href="(l.path || '') + (l.hash || '')"
          :class="{ active: isActive(l) }"
          @click.prevent="go(l)"
        >{{ l.label }}</a>
        <ZaloLink class="btn btn-dark" @click="open = false">Nhắn Zalo</ZaloLink>
      </nav>
      <button class="nav-toggle" aria-label="Menu" @click="open = !open">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
</template>
