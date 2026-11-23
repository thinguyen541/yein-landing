<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../../api'
import { money, thumb } from '../../utils'
import AdminModal from '../../components/admin/AdminModal.vue'
import ImageField from '../../components/admin/ImageField.vue'
import { loadCatalog } from '../../composables/useCatalog'

const collections = ref([])
const loadError = ref('')

async function load() {
  loadError.value = ''
  try {
    collections.value = await adminApi.list('collections')
    loadCatalog(true)
  } catch (err) {
    loadError.value = err.message
  }
}
onMounted(load)

const editing = ref(null)
const formError = ref('')

function openNew() {
  formError.value = ''
  editing.value = {
    id: null,
    name: '',
    slug: '',
    tagline: '',
    description: '',
    default_price: '',
    sort_order: collections.value.length + 1,
    cover_image: '',
    is_active: true,
  }
}

function openEdit(c) {
  formError.value = ''
  editing.value = {
    id: c.id,
    name: c.name,
    slug: c.slug,
    tagline: c.tagline ?? '',
    description: c.description ?? '',
    default_price: c.default_price ?? '',
    sort_order: c.sort_order,
    cover_image: c.cover_image ?? '',
    is_active: !!c.is_active,
  }
}

async function save() {
  formError.value = ''
  const { id, ...body } = editing.value
  try {
    if (id) await adminApi.update('collections', id, body)
    else await adminApi.create('collections', body)
    editing.value = null
    await load()
  } catch (err) {
    formError.value = err.message
  }
}

async function remove(c) {
  if (!window.confirm(`Xoá bộ sưu tập "${c.name}"?\nCác sản phẩm bên trong vẫn được giữ lại (chuyển sang "Chưa xếp").`)) return
  try {
    await adminApi.remove('collections', c.id)
    await load()
  } catch (err) {
    window.alert(err.message)
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
    <h2>Bộ sưu tập</h2>
    <button @click="openNew">+ Thêm bộ sưu tập</button>
  </div>
  <p class="hint"><b>Giá chung</b> dùng cho mẫu nào chưa nhập giá riêng. Đổi giá từng mẫu hoặc cả nhóm ở tab Sản phẩm.</p>
  <p v-if="loadError" class="error">{{ loadError }}</p>

  <table>
    <thead>
      <tr>
        <th>Thứ tự</th><th>Ảnh bìa</th><th>Tên</th><th>Đường dẫn</th><th>Số mẫu</th><th>Giá chung</th><th>Hiển thị</th><th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="c in collections" :key="c.id" class="row-edit" title="Nháy đúp để sửa" @dblclick="rowDblClick($event, c)">
        <td>{{ c.sort_order }}</td>
        <td><img v-if="c.cover_image" :src="thumb(c.cover_image)" alt="" /></td>
        <td><b>{{ c.name }}</b><div class="sub">{{ c.tagline }}</div></td>
        <td class="sub">/bo-suu-tap/{{ c.slug }}</td>
        <td>{{ c.product_count }}</td>
        <td class="num">
          <template v-if="c.default_price != null">{{ money(c.default_price) }}</template>
          <span v-else class="sub">Liên hệ</span>
        </td>
        <td><span class="badge" :class="{ off: !c.is_active }">{{ c.is_active ? 'Hiện' : 'Ẩn' }}</span></td>
        <td class="num">
          <button class="ghost" @click="openEdit(c)">Sửa</button>
          <button class="danger" @click="remove(c)">Xoá</button>
        </td>
      </tr>
      <tr v-if="!collections.length">
        <td colspan="8" class="sub">Chưa có bộ sưu tập.</td>
      </tr>
    </tbody>
  </table>

  <AdminModal v-if="editing" :title="editing.id ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập'" @close="editing = null">
    <form class="form box-form" @submit.prevent="save">
      <div class="row">
        <label>Tên * <input v-model.trim="editing.name" required /></label>
        <label>Đường dẫn <input v-model.trim="editing.slug" placeholder="tự tạo từ tên" /></label>
      </div>
      <label>Câu giới thiệu ngắn <input v-model="editing.tagline" /></label>
      <label>Mô tả dòng sản phẩm <textarea v-model="editing.description" rows="3"></textarea></label>
      <div class="row">
        <label>Giá chung (VND) <input v-model="editing.default_price" type="number" min="0" step="1000" placeholder="Trống = Liên hệ" /></label>
        <label>Thứ tự <input v-model="editing.sort_order" type="number" /></label>
      </div>
      <ImageField v-model="editing.cover_image" label="Ảnh bìa" />
      <label class="check"><input v-model="editing.is_active" type="checkbox" /> Hiển thị trên web</label>
      <p class="error">{{ formError }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="editing = null">Huỷ</button>
        <button type="submit">Lưu</button>
      </div>
    </form>
  </AdminModal>
</template>
