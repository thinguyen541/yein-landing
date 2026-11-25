import { createRouter, createWebHistory } from 'vue-router'
import { auth, clearSession } from './auth'
import { api } from './api'
import { getLenis, scrollTo } from './composables/smooth'

import SiteLayout from './layouts/SiteLayout.vue'
import HomePage from './pages/HomePage.vue'

const routes = [
  {
    path: '/',
    component: SiteLayout,
    children: [
      { path: '', name: 'home', component: HomePage },
      { path: 'san-pham', name: 'products', component: () => import('./pages/CatalogPage.vue') },
      { path: 'bo-suu-tap/:slug', name: 'collection', component: () => import('./pages/CatalogPage.vue') },
      { path: 've-yein', name: 'about', component: () => import('./pages/AboutPage.vue') },
      { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('./pages/NotFound.vue') },
    ],
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('./pages/admin/AdminLogin.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/admin',
    component: () => import('./layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'admin-products' } },
      { path: 'products', name: 'admin-products', component: () => import('./pages/admin/AdminProducts.vue') },
      { path: 'collections', name: 'admin-collections', component: () => import('./pages/admin/AdminCollections.vue') },
      { path: 'dealers', name: 'admin-dealers', component: () => import('./pages/admin/AdminDealers.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('./pages/admin/AdminSettings.vue') },
    ],
  },
]

// Let the app (not the browser) decide the scroll position after a reload
if (typeof history !== 'undefined' && 'scrollRestoration' in history) history.scrollRestoration = 'manual'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    const lenis = getLenis()
    // First load / F5: always start at the top (no browser scroll restore, no jump to an old #hash)
    if (!from.matched.length) {
      if (to.hash) history.replaceState(history.state, '', to.fullPath.replace(/#.*$/, ''))
      lenis?.scrollTo(0, { immediate: true, force: true })
      return { top: 0 }
    }
    if (saved) return saved
    // Switching collection tabs inside the catalogue keeps the scroll position
    if (['products', 'collection'].includes(to.name) && ['products', 'collection'].includes(from.name)) return false
    if (to.hash) {
      // Give the target page time to render, then glide to the section
      const delay = to.path === from.path ? 0 : 450
      if (to.path !== from.path) lenis?.scrollTo(0, { immediate: true, force: true })
      // wait until the section exists (home sections render after the catalogue loads)
      const t0 = Date.now()
      const go = () => {
        if (document.querySelector(to.hash) || Date.now() - t0 > 3000) scrollTo(to.hash)
        else setTimeout(go, 100)
      }
      setTimeout(go, delay)
      return to.path === from.path ? false : { top: 0 }
    }
    lenis?.scrollTo(0, { immediate: true, force: true })
    return { top: 0 }
  },
})

// Admin route guard: verify the token with the backend once per session
router.beforeEach(async (to) => {
  if (to.matched.some((r) => r.meta.requiresAuth)) {
    if (!auth.token) return { name: 'admin-login', query: { redirect: to.fullPath } }
    if (!auth.admin) {
      try {
        const { admin } = await api('/api/auth/me')
        auth.admin = admin
      } catch {
        clearSession()
        return { name: 'admin-login', query: { redirect: to.fullPath } }
      }
    }
  }
  if (to.meta.guestOnly && auth.token) return { name: 'admin-products' }
  return true
})

export default router
