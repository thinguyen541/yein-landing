<script setup>
import { ref, reactive, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth, clearSession } from '../auth'
import { api } from '../api'
import AdminModal from '../components/admin/AdminModal.vue'
import ConfirmHost from '../components/admin/ConfirmHost.vue'
import { alertDialog } from '../composables/useDialog'
import '../styles/admin.css'

const router = useRouter()
const route = useRoute()

// Session dropped (logout or 401 from the API) -> back to the login page
watch(
  () => auth.token,
  (t) => {
    if (!t) router.replace({ name: 'admin-login', query: { redirect: route.fullPath } })
  }
)

// Sticky header heights -> CSS variables, so the page toolbar and table headers dock right below them
const root = ref(null)
let ro = null
function measure() {
  const el = root.value
  if (!el) return
  const top = el.querySelector('.topbar')
  const tb = el.querySelector('main .toolbar')
  el.style.setProperty('--admin-top', `${top ? top.offsetHeight : 0}px`)
  el.style.setProperty('--toolbar-h', `${tb ? tb.offsetHeight : 0}px`)
}
async function observe() {
  await nextTick()
  if (!ro) return
  ro.disconnect()
  root.value?.querySelectorAll('.topbar, main .toolbar').forEach((n) => ro.observe(n))
  measure()
}
onMounted(() => {
  ro = new ResizeObserver(measure)
  observe()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
})
// Each admin page has its own toolbar: re-measure after navigating (lazy pages render a moment later)
watch(
  () => route.fullPath,
  () => {
    observe()
    setTimeout(observe, 300)
  }
)

function logout() {
  clearSession()
}

// ---- Change password ----
const pwOpen = ref(false)
const pw = reactive({ currentPassword: '', newPassword: '', error: '' })

function openPassword() {
  Object.assign(pw, { currentPassword: '', newPassword: '', error: '' })
  pwOpen.value = true
}

async function savePassword() {
  pw.error = ''
  try {
    await api('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
    })
    pwOpen.value = false
    alertDialog('Mật khẩu mới đã được lưu.', { title: 'Đã đổi mật khẩu', tone: 'success' })
  } catch (err) {
    pw.error = err.message
  }
}
</script>

<template>
  <div ref="root" class="admin-app">
    <header class="topbar">
      <div class="brand">
        <strong>YEIN Admin</strong>
        <nav class="tabs">
          <RouterLink :to="{ name: 'admin-products' }">Sản phẩm</RouterLink>
          <RouterLink :to="{ name: 'admin-collections' }">Bộ sưu tập</RouterLink>
          <RouterLink :to="{ name: 'admin-dealers' }">Đại lý</RouterLink>
          <RouterLink :to="{ name: 'admin-settings' }">Giá cộng thêm & liên hệ</RouterLink>
        </nav>
      </div>
      <div>
        <a href="/" target="_blank" class="ghost-link">Xem website ↗</a>
        <span id="who">{{ auth.admin?.username }}</span>
        <button class="ghost" @click="openPassword">Đổi mật khẩu</button>
        <button class="ghost" @click="logout">Đăng xuất</button>
      </div>
    </header>

    <main class="wrap">
      <RouterView />
    </main>

    <AdminModal v-if="pwOpen" title="Đổi mật khẩu" @close="pwOpen = false">
      <form class="form" @submit.prevent="savePassword">
        <label>Mật khẩu hiện tại <input v-model="pw.currentPassword" type="password" required /></label>
        <label>Mật khẩu mới (≥ 8 ký tự) <input v-model="pw.newPassword" type="password" minlength="8" required /></label>
        <p class="error">{{ pw.error }}</p>
        <div class="actions">
          <button type="button" class="ghost" @click="pwOpen = false">Huỷ</button>
          <button type="submit">Lưu</button>
        </div>
      </form>
    </AdminModal>

    <ConfirmHost />
  </div>
</template>
