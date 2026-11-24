<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../../api'
import { confirmDialog, alertDialog } from '../../composables/useDialog'
import AdminModal from '../../components/admin/AdminModal.vue'

const dealers = ref([])
const loadError = ref('')
const q = ref('')

const visible = computed(() => {
  const s = q.value.trim().toLowerCase()
  return dealers.value.filter((d) => !s || `${d.name} ${d.province || ''} ${d.address || ''} ${d.phone || ''}`.toLowerCase().includes(s))
})
const provinces = computed(() => [...new Set(dealers.value.map((d) => d.province).filter(Boolean))].sort())

async function load() {
  loadError.value = ''
  try {
    dealers.value = await adminApi.list('dealers')
  } catch (err) {
    loadError.value = err.message
  }
}
onMounted(load)

const editing = ref(null)
const formError = ref('')

const empty = () => ({
  id: null,
  name: '',
  province: '',
  address: '',
  phone: '',
  zalo: '',
  map_url: '',
  opening_hours: '',
  note: '',
  sort_order: dealers.value.length,
  is_active: true,
})

function openNew() {
  formError.value = ''
  editing.value = empty()
}

function openEdit(d) {
  formError.value = ''
  editing.value = { ...empty(), ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])), is_active: !!d.is_active }
}

async function save() {
  formError.value = ''
  const { id, created_at, updated_at, ...body } = editing.value
  try {
    if (id) await adminApi.update('dealers', id, body)
    else await adminApi.create('dealers', body)
    editing.value = null
    await load()
  } catch (err) {
    formError.value = err.message
  }
}

async function toggle(d) {
  try {
    await adminApi.update('dealers', d.id, { is_active: !d.is_active })
    d.is_active = d.is_active ? 0 : 1
  } catch (err) {
    alertDialog(err.message, { title: 'Có lỗi', tone: 'error' })
  }
}

async function remove(d) {
  if (
    !(await confirmDialog({
      title: 'Xoá đại lý?',
      message: `Đại lý "${d.name}" sẽ bị xoá khỏi danh sách đối tác trên web.`,
      note: 'Thao tác này không hoàn tác được.',
    }))
  )
    return
  try {
    await adminApi.remove('dealers', d.id)
    await load()
  } catch (err) {
    alertDialog(err.message, { title: 'Có lỗi', tone: 'error' })
  }
}

// Double-click a row to edit it (ignored on buttons/links inside the row)
function rowDblClick(e, item) {
  if (e.target.closest('button, a, input, select, label')) return
  window.getSelection?.()?.removeAllRanges()
  openEdit(item)
}
</script>

<template>
  <div class="toolbar">
    <h2>Đại lý đối tác <small>({{ visible.length }}/{{ dealers.length }})</small></h2>
    <div class="filters">
      <input v-model="q" type="search" placeholder="Tìm tên, tỉnh, địa chỉ…" />
      <button @click="openNew">+ Thêm đại lý</button>
    </div>
  </div>
  <p class="hint">Hiển thị ở mục <b>Hệ thống đại lý</b> trên trang chủ. Bỏ chọn “Hiển thị” để tạm ẩn một đại lý.</p>
  <p v-if="loadError" class="error">{{ loadError }}</p>

  <table>
    <thead>
      <tr><th>Thứ tự</th><th>Đại lý</th><th>Tỉnh / thành</th><th>Liên hệ</th><th>Hiển thị</th><th></th></tr>
    </thead>
    <tbody>
      <tr v-for="d in visible" :key="d.id" class="row-edit" title="Nháy đúp để sửa" @dblclick="rowDblClick($event, d)">
        <td>{{ d.sort_order }}</td>
        <td><b>{{ d.name }}</b><div class="sub">{{ d.address }}</div></td>
        <td>{{ d.province || '—' }}</td>
        <td class="num">{{ d.phone }}<div class="sub">{{ d.zalo ? 'Zalo: ' + d.zalo : '' }}</div></td>
        <td>
          <button class="toggle" @click="toggle(d)"><span class="badge" :class="{ off: !d.is_active }">{{ d.is_active ? 'Hiện' : 'Ẩn' }}</span></button>
        </td>
        <td class="num">
          <button class="ghost" @click="openEdit(d)">Sửa</button>
          <button class="danger" @click="remove(d)">Xoá</button>
        </td>
      </tr>
      <tr v-if="!visible.length"><td colspan="6" class="sub">Chưa có đại lý nào. Bấm “+ Thêm đại lý”.</td></tr>
    </tbody>
  </table>

  <AdminModal v-if="editing" :title="editing.id ? 'Sửa đại lý' : 'Thêm đại lý'" @close="editing = null">
    <form class="form" @submit.prevent="save">
      <div class="row">
        <label>Tên đại lý * <input v-model.trim="editing.name" required placeholder="VD: Kính mắt An Khang" /></label>
        <label>
          Tỉnh / thành
          <input v-model.trim="editing.province" list="province-list" placeholder="VD: Hà Nội" />
          <datalist id="province-list"><option v-for="p in provinces" :key="p" :value="p" /></datalist>
        </label>
      </div>
      <label>Địa chỉ <input v-model.trim="editing.address" placeholder="Số nhà, đường, phường, quận" /></label>
      <div class="row">
        <label>Số điện thoại <input v-model.trim="editing.phone" /></label>
        <label>Zalo (số hoặc link) <input v-model.trim="editing.zalo" /></label>
      </div>
      <label>Link Google Maps <input v-model.trim="editing.map_url" type="url" placeholder="https://maps.app.goo.gl/… (trống = tự tìm theo địa chỉ)" /></label>
      <div class="row">
        <label>Giờ mở cửa <input v-model.trim="editing.opening_hours" placeholder="8:00 – 21:00 hằng ngày" /></label>
        <label>Thứ tự <input v-model="editing.sort_order" type="number" /></label>
      </div>
      <label>Ghi chú <input v-model.trim="editing.note" placeholder="VD: Có đo mắt miễn phí" /></label>
      <label class="check"><input v-model="editing.is_active" type="checkbox" /> Hiển thị trên website</label>
      <p class="error">{{ formError }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="editing = null">Huỷ</button>
        <button type="submit">Lưu</button>
      </div>
    </form>
  </AdminModal>
</template>
