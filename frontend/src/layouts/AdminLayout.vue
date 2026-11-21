<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth, clearSession } from '../auth'
import { api } from '../api'
import AdminModal from '../components/admin/AdminModal.vue'
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
    window.alert('Đã đổi mật khẩu')
  } catch (err) {
    pw.error = err.message
  }
}
</script>

<template>
  <div class="admin-app">
    <header class="topbar">
      <div class="brand">
        <strong>YEIN Admin</strong>
        <nav class="tabs">
          <RouterLink :to="{ name: 'admin-products' }">Sản phẩm</RouterLink>
          <RouterLink :to="{ name: 'admin-collections' }">Bộ sưu tập</RouterLink>
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
  </div>
</template>
