<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ZaloLink from './ZaloLink.vue'

const route = useRoute()
const router = useRouter()
const open = ref(false)

// to: route path; hash: section on that page
const links = [
  { label: 'Về YEIN', path: '/ve-yein' },
  { label: 'Bộ sưu tập', path: '/', hash: '#bo-suu-tap' },
  { label: 'Sản phẩm', path: '/san-pham' },
  { label: 'Công nghệ', path: '/ve-yein', hash: '#cong-nghe' },
  { label: 'Đại lý', path: '/', hash: '#dai-ly' },
  { label: 'Liên hệ', hash: '#lien-he' }, // footer, present on every page
]

const isActive = (l) =>
  (l.path === '/san-pham' && (route.name === 'products' || route.name === 'collection')) ||
  (l.path === '/ve-yein' && !l.hash && route.name === 'about')

function go(l) {
  open.value = false
  const samePage = !l.path || l.path === route.path
  if (samePage && l.hash) {
    document.querySelector(l.hash)?.scrollIntoView({ behavior: 'smooth' })
    history.replaceState(history.state, '', l.hash)
  } else if (samePage) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    router.push({ path: l.path, hash: l.hash })
  }
}
</script>

<template>
  <header class="site-header">
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
