import { createRouter, createWebHistory } from 'vue-router'
import { auth, clearSession } from './auth'
import { api } from './api'

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
      { path: 'settings', name: 'admin-settings', component: () => import('./pages/admin/AdminSettings.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Switching collection tabs inside the catalogue keeps the scroll position
    if (['products', 'collection'].includes(to.name) && ['products', 'collection'].includes(from.name)) return false
    if (to.hash) {
      // Give the target page time to render before scrolling to the section
      const delay = to.path === from.path ? 0 : 350
      return new Promise((resolve) => setTimeout(() => resolve({ el: to.hash, top: 80, behavior: 'smooth' }), delay))
    }
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
