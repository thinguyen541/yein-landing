<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../../api'
import { money, thumb } from '../../utils'
import { confirmDialog, alertDialog } from '../../composables/useDialog'
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

// Delete one (row button) or many (checkboxes) – both go through the same confirm dialog
function remove(c) {
  openDelete([c])
}

// ---- Selection (checkboxes) ----
const selected = ref([]) // collection ids
let lastIndex = -1
const isSelected = (c) => selected.value.includes(c.id)
const allSelected = computed(() => collections.value.length > 0 && selected.value.length === collections.value.length)
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value)
function toggleAll() {
  selected.value = allSelected.value ? [] : collections.value.map((c) => c.id)
}
// Shift+click selects a range
function toggleRow(e, c, index) {
  const on = !isSelected(c)
  const range = e.shiftKey && lastIndex >= 0 ? collections.value.slice(Math.min(lastIndex, index), Math.max(lastIndex, index) + 1) : [c]
  const ids = new Set(selected.value)
  for (const x of range) on ? ids.add(x.id) : ids.delete(x.id)
  selected.value = collections.value.filter((x) => ids.has(x.id)).map((x) => x.id)
  lastIndex = index
}

// ---- Delete (custom confirm popup) ----
async function openDelete(items) {
  if (!items.length) return
  const productCount = items.reduce((n, c) => n + Number(c.product_count || 0), 0)
  const r = await confirmDialog({
    title: items.length > 1 ? `Xoá ${items.length} bộ sưu tập?` : `Xoá bộ sưu tập "${items[0].name}"?`,
    message: productCount
      ? `Có ${productCount} sản phẩm đang thuộc ${items.length > 1 ? 'các bộ sưu tập này' : 'bộ sưu tập này'}.`
      : items.length > 1 ? 'Các bộ sưu tập sau sẽ bị xoá:' : '',
    items: items.length > 1 || productCount ? items.map((c) => `${c.name} – ${c.product_count || 0} sản phẩm`) : [],
    check: productCount ? `Xoá luôn ${productCount} sản phẩm bên trong (kèm ảnh)` : '',
    note: productCount
      ? 'Không tích: chỉ xoá bộ sưu tập chưa có sản phẩm. Thao tác này không hoàn tác được.'
      : 'Thao tác này không hoàn tác được.',
    okText: items.length > 1 ? `Xoá ${items.length} mục` : 'Xoá',
  })
  if (!r) return
  try {
    const res = await adminApi.bulkDelete('collections', items.map((c) => c.id), { withProducts: r.checked })
    const skippedIds = res.skipped.map((x) => x.id)
    selected.value = selected.value.filter((id) => !items.some((c) => c.id === id) || skippedIds.includes(id))
    await load()
    if (res.skipped.length) {
      alertDialog(
        `Đã xoá ${res.deleted} bộ sưu tập. Các bộ sưu tập dưới đây còn sản phẩm nên được giữ lại – chọn lại và tích "Xoá luôn sản phẩm" nếu muốn xoá.`,
        { title: 'Một số mục chưa xoá', tone: 'warning', items: res.skipped.map((x) => `${x.name} – ${x.products} sản phẩm`) }
      )
    }
  } catch (err) {
    alertDialog(err.message, { title: 'Không xoá được', tone: 'error' })
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
    <div class="filters">
      <template v-if="selected.length">
        <span class="sel-count">Đã chọn <b>{{ selected.length }}</b></span>
        <button class="ghost" @click="selected = []">Bỏ chọn</button>
        <button class="danger-solid" @click="openDelete(collections.filter(isSelected))">Xoá {{ selected.length }} bộ sưu tập</button>
      </template>
      <button @click="openNew">+ Thêm bộ sưu tập</button>
    </div>
  </div>
  <p class="hint"><b>Giá chung</b> dùng cho mẫu nào chưa nhập giá riêng. Đổi giá từng mẫu hoặc cả nhóm ở tab Sản phẩm.</p>
  <p v-if="loadError" class="error">{{ loadError }}</p>

  <table>
    <thead>
      <tr>
        <th class="sel">
          <input type="checkbox" title="Chọn tất cả" :checked="allSelected" :indeterminate="someSelected" @change="toggleAll" />
        </th>
        <th>Thứ tự</th><th>Ảnh bìa</th><th>Tên</th><th>Đường dẫn</th><th>Số mẫu</th><th>Giá chung</th><th>Hiển thị</th><th></th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(c, i) in collections"
        :key="c.id"
        class="row-edit"
        :class="{ selected: isSelected(c) }"
        title="Nháy đúp để sửa"
        @dblclick="rowDblClick($event, c)"
      >
        <td class="sel" @click.self="toggleRow($event, c, i)">
          <input type="checkbox" :checked="isSelected(c)" @click="toggleRow($event, c, i)" />
        </td>
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
        <td colspan="9" class="sub">Chưa có bộ sưu tập.</td>
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
