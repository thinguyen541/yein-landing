<script setup>
import { reactive, ref, onMounted } from 'vue'
import { api, adminApi } from '../../api'
import { loadSettings } from '../../composables/useSettings'
import { parseLensOptions, stringifyLensOptions, money } from '../../utils'

const form = reactive({
  company_name: '',
  tax_code: '',
  hotline: '',
  zalo: '',
  email: '',
  address: '',
  facebook: '',
  working_hours: '',
})
// Add-on prices (lens upgrades) shown in every product popup
const lens = ref([])
const msg = ref('')
const ok = ref(false)

onMounted(async () => {
  try {
    const s = await api('/api/settings')
    for (const k of Object.keys(form)) form[k] = s[k] || ''
    lens.value = parseLensOptions(s.lens_options).map((o) => ({ name: o.name, price: o.price ?? '' }))
  } catch (err) {
    msg.value = err.message
  }
})

const addLens = () => lens.value.push({ name: '', price: '' })
const removeLens = (i) => lens.value.splice(i, 1)
function moveLens(i, d) {
  const j = i + d
  if (j < 0 || j >= lens.value.length) return
  const [row] = lens.value.splice(i, 1)
  lens.value.splice(j, 0, row)
}

async function save() {
  msg.value = ''
  try {
    await adminApi.saveSettings({ ...form, lens_options: stringifyLensOptions(lens.value) })
    loadSettings(true) // refresh the copy used by the public site
    ok.value = true
    msg.value = 'Đã lưu'
  } catch (err) {
    ok.value = false
    msg.value = err.message
  }
}
</script>

<template>
  <div class="toolbar"><h2>Cài đặt</h2></div>
  <form class="box wide" @submit.prevent="save">
    <h3>Giá cộng thêm · Nâng cấp tròng</h3>
    <p class="hint">Hiện trong cửa sổ chi tiết của mọi sản phẩm, dưới giá bán lẻ.</p>
    <table class="lens-table">
      <thead>
        <tr><th>Tuỳ chọn</th><th style="width: 180px">Giá cộng thêm (VND)</th><th style="width: 150px"></th></tr>
      </thead>
      <tbody>
        <tr v-for="(o, i) in lens" :key="i">
          <td><input v-model.trim="o.name" placeholder="VD: Tròng 1.67 blue cut SHMC" /></td>
          <td>
            <input v-model="o.price" type="number" min="0" step="1000" placeholder="Trống = Liên hệ" />
            <div class="sub">{{ o.price !== '' ? '+' + money(o.price) : '' }}</div>
          </td>
          <td class="num">
            <button type="button" class="ghost" title="Lên" @click="moveLens(i, -1)">↑</button>
            <button type="button" class="ghost" title="Xuống" @click="moveLens(i, 1)">↓</button>
            <button type="button" class="danger" @click="removeLens(i)">Xoá</button>
          </td>
        </tr>
        <tr v-if="!lens.length"><td colspan="3" class="sub">Chưa có tuỳ chọn nào.</td></tr>
      </tbody>
    </table>
    <div><button type="button" class="ghost" @click="addLens">+ Thêm tuỳ chọn</button></div>

    <h3 style="margin-top: 16px">Thông tin công ty & liên hệ</h3>
    <div class="row">
      <label>Tên công ty / nhà phân phối <input v-model.trim="form.company_name" /></label>
      <label>Mã số thuế <input v-model.trim="form.tax_code" /></label>
    </div>
    <div class="row">
      <label>Hotline <input v-model.trim="form.hotline" placeholder="0901 234 567" /></label>
      <label>Zalo (số điện thoại hoặc link) <input v-model.trim="form.zalo" placeholder="0901234567" /></label>
    </div>
    <div class="row">
      <label>Email <input v-model.trim="form.email" type="email" /></label>
      <label>Giờ làm việc <input v-model.trim="form.working_hours" placeholder="8:00 – 21:00, T2 – CN" /></label>
    </div>
    <label>Địa chỉ <input v-model.trim="form.address" /></label>
    <label>Facebook (link) <input v-model.trim="form.facebook" placeholder="https://facebook.com/..." /></label>
    <p class="error" :class="{ ok }">{{ msg }}</p>
    <div class="actions"><button type="submit">Lưu cài đặt</button></div>
  </form>
</template>
