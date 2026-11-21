<script setup>
import { reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../../api'
import { setSession } from '../../auth'
import '../../styles/admin.css'

const router = useRouter()
const route = useRoute()
const form = reactive({ username: '', password: '', error: '', busy: false })

async function login() {
  form.error = ''
  form.busy = true
  try {
    const { token, admin } = await api('/api/auth/login', {
      method: 'POST',
      body: { username: form.username, password: form.password },
    })
    setSession(token, admin)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin') ? route.query.redirect : '/admin'
    router.replace(redirect)
  } catch (err) {
    form.error = err.message
  } finally {
    form.busy = false
  }
}
</script>

<template>
  <div class="admin-app">
    <section class="center">
      <form class="box" @submit.prevent="login">
        <h1>YEIN</h1>
        <p class="hint">Đăng nhập trang quản trị</p>
        <label>Tài khoản <input v-model.trim="form.username" autocomplete="username" required /></label>
        <label>Mật khẩu <input v-model="form.password" type="password" autocomplete="current-password" required /></label>
        <p class="error">{{ form.error }}</p>
        <button type="submit" :disabled="form.busy">{{ form.busy ? 'Đang đăng nhập…' : 'Đăng nhập' }}</button>
        <RouterLink to="/" class="ghost-link" style="text-align: center">← Về website</RouterLink>
      </form>
    </section>
  </div>
</template>
