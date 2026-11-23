<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { adminApi } from '../../api'
import { money, thumb } from '../../utils'
import AdminModal from '../../components/admin/AdminModal.vue'
import ProductImages from '../../components/admin/ProductImages.vue'
import { loadCatalog } from '../../composables/useCatalog'

const products = ref([])
const collections = ref([])
const loadError = ref('')

const filter = reactive({ q: '', collection: '', series: '', flag: '' })

const seriesOptions = computed(() => [...new Set(products.value.map((p) => p.series).filter(Boolean))].sort())

const visible = computed(() => {
  const q = filter.q.trim().toLowerCase()
  return products.value.filter((p) => {
    if (q && !`${p.code || ''} ${p.name} ${p.series || ''}`.toLowerCase().includes(q)) return false
    if (filter.series && p.series !== filter.series) return false
    if (filter.collection === 'none' && p.collection_id) return false
    if (filter.collection && filter.collection !== 'none' && String(p.collection_id) !== filter.collection) return false
    if (filter.flag === 'featured' && !p.is_featured) return false
    if (filter.flag === 'hidden' && p.is_active) return false
    return true
  })
})

async function load() {
  loadError.value = ''
  try {
    const [cols, prods] = await Promise.all([adminApi.list('collections'), adminApi.list('products')])
    collections.value = cols
    products.value = prods
    loadCatalog(true) // keep the public pages in sync after edits
  } catch (err) {
    loadError.value = err.message
  }
}
onMounted(load)

// ---- Edit dialog ----
const editing = ref(null) // form object while the dialog is open
const formError = ref('')

const emptyForm = () => ({
  id: null,
  code: '',
  name: '',
  series: filter.series || '',
  collection_id: filter.collection && filter.collection !== 'none' ? Number(filter.collection) : '',
  price: '',
  sale_price: '',
  description: '',
  images: [],
  sort_order: products.value.length,
  is_featured: false,
  is_active: true,
})

function openNew() {
  formError.value = ''
  editing.value = emptyForm()
}

function openEdit(p) {
  formError.value = ''
  editing.value = {
    id: p.id,
    code: p.code ?? '',
    name: p.name,
    series: p.series ?? '',
    collection_id: p.collection_id ?? '',
    price: p.price ?? '',
    sale_price: p.sale_price ?? '',
    description: p.description ?? '',
    // Uploaded images (resources); an old static image URL is shown as a removable "Ảnh cũ"
    images: p.images?.length ? p.images.map((i) => ({ id: i.id, url: i.url })) : p.image_url ? [{ id: null, url: p.image_url }] : [],
    sort_order: p.sort_order,
    is_featured: !!p.is_featured,
    is_active: !!p.is_active,
  }
}

// New product: build the name from collection + code automatically
function autoName() {
  const f = editing.value
  if (!f || f.id) return
  const col = collections.value.find((c) => c.id === f.collection_id)
  f.name = [f.series || col?.name, f.code].filter(Boolean).join(' ')
}

const collectionPrice = computed(() => {
  const f = editing.value
  const col = f && collections.value.find((c) => c.id === f.collection_id)
  return col?.default_price ?? null
})

async function save() {
  formError.value = ''
  const { id, images, ...body } = editing.value
  if (!body.collection_id) {
    formError.value = 'Chọn bộ sưu tập cho sản phẩm'
    return
  }
  body.image_ids = images.filter((i) => i.id).map((i) => i.id)
  body.image_url = images.find((i) => !i.id)?.url || null // kept only while there is no uploaded image
  try {
    if (id) await adminApi.update('products', id, body)
    else await adminApi.create('products', body)
    editing.value = null
    await load()
  } catch (err) {
    formError.value = err.message
  }
}

// ---- Bulk price for the filtered list ----
const bulk = ref(null)
const bulkError = ref('')
function openBulk() {
  bulkError.value = ''
  bulk.value = { price: '' }
}
async function saveBulk() {
  bulkError.value = ''
  try {
    const { updated } = await adminApi.bulkPrice(visible.value.map((p) => p.id), bulk.value.price)
    bulk.value = null
    await load()
    window.alert(`Đã cập nhật giá cho ${updated} sản phẩm`)
  } catch (err) {
    bulkError.value = err.message
  }
}

async function toggle(p, field) {
  try {
    await adminApi.update('products', p.id, { [field]: !p[field] })
    p[field] = p[field] ? 0 : 1
  } catch (err) {
    window.alert(err.message)
  }
}

async function remove(p) {
  if (!window.confirm(`Xoá sản phẩm "${p.code || p.name}"?`)) return
  try {
    await adminApi.remove('products', p.id)
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
    <h2>Sản phẩm <small>({{ visible.length }}/{{ products.length }})</small></h2>
    <div class="filters">
      <input v-model="filter.q" type="search" placeholder="Tìm mã / tên…" />
      <select v-model="filter.collection">
        <option value="">Tất cả bộ sưu tập</option>
        <option v-for="c in collections" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
        <option value="none">(Chưa xếp)</option>
      </select>
      <select v-model="filter.series">
        <option value="">Tất cả dòng phụ</option>
        <option v-for="s in seriesOptions" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filter.flag">
        <option value="">Tất cả</option>
        <option value="featured">Bán chạy</option>
        <option value="hidden">Đang ẩn</option>
      </select>
      <button class="ghost" :disabled="!visible.length" @click="openBulk">Đặt giá {{ visible.length }} mẫu đang lọc</button>
      <button @click="openNew">+ Thêm sản phẩm</button>
    </div>
  </div>
  <p class="hint">
    <b>Nháy đúp vào dòng</b> (hoặc bấm <b>Sửa</b>) để đổi giá, ảnh, tên, mã của từng mẫu. Muốn đổi giá cả nhóm: lọc theo bộ sưu tập / dòng phụ rồi bấm <b>Đặt giá … mẫu đang lọc</b>.
    Ô giá để trống → dùng <b>giá chung</b> của bộ sưu tập.
  </p>
  <p v-if="loadError" class="error">{{ loadError }}</p>

  <table>
    <thead>
      <tr>
        <th>Ảnh</th><th>Mã</th><th>Bộ sưu tập</th><th>Giá</th><th>Giá KM</th><th>Bán chạy</th><th>Hiển thị</th><th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="p in visible" :key="p.id" class="row-edit" title="Nháy đúp để sửa" @dblclick="rowDblClick($event, p)">
        <td>
          <span class="thumb-wrap">
            <img v-if="p.image_url" :src="thumb(p.image_url)" alt="" />
            <span v-if="p.images?.length > 1" class="thumb-count">{{ p.images.length }}</span>
          </span>
        </td>
        <td><b>{{ p.code }}</b><div class="sub">{{ p.name }}</div></td>
        <td>{{ p.collection_name || '—' }}<div class="sub">{{ p.series }}</div></td>
        <td class="num">
          <template v-if="p.price != null"><b>{{ money(p.price) }}</b><div class="sub">giá riêng</div></template>
          <template v-else-if="p.collection_price != null">{{ money(p.collection_price) }}<div class="sub">giá chung</div></template>
          <span v-else class="sub">Liên hệ</span>
        </td>
        <td class="num">{{ money(p.sale_price) }}</td>
        <td>
          <button class="toggle" title="Bật/tắt bán chạy" @click="toggle(p, 'is_featured')">
            <span class="badge" :class="p.is_featured ? 'star' : 'off'">{{ p.is_featured ? '★ Bán chạy' : '—' }}</span>
          </button>
        </td>
        <td>
          <button class="toggle" title="Bật/tắt hiển thị" @click="toggle(p, 'is_active')">
            <span class="badge" :class="{ off: !p.is_active }">{{ p.is_active ? 'Hiện' : 'Ẩn' }}</span>
          </button>
        </td>
        <td class="num">
          <button class="ghost" @click="openEdit(p)">Sửa</button>
          <button class="danger" @click="remove(p)">Xoá</button>
        </td>
      </tr>
      <tr v-if="!visible.length">
        <td colspan="8" class="sub">Không có sản phẩm phù hợp.</td>
      </tr>
    </tbody>
  </table>

  <AdminModal
    v-if="editing"
    :title="editing.id ? `Sửa sản phẩm ${editing.code}` : 'Thêm sản phẩm'"
    @close="editing = null"
  >
    <form class="form box-form" @submit.prevent="save">
      <div class="row">
        <label>Mã kính <input v-model.trim="editing.code" placeholder="F3714" @input="autoName" /></label>
        <label>Tên * <input v-model.trim="editing.name" required /></label>
      </div>
      <div class="row">
        <label>
          Bộ sưu tập *
          <select v-model="editing.collection_id" required @change="autoName">
            <option value="" disabled>— Chọn bộ sưu tập —</option>
            <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label>
          Dòng phụ
          <input v-model.trim="editing.series" list="series-list" placeholder="VD: Mộc Quang" @input="autoName" />
          <datalist id="series-list"><option v-for="s in seriesOptions" :key="s" :value="s" /></datalist>
        </label>
      </div>
      <div class="row">
        <label>
          Giá bán lẻ (VND)
          <input
            v-model="editing.price"
            type="number"
            min="0"
            step="1000"
            :placeholder="collectionPrice != null ? `Trống = giá chung ${money(collectionPrice)}` : 'Trống = Liên hệ'"
          />
        </label>
        <label>Giá khuyến mãi <input v-model="editing.sale_price" type="number" min="0" step="1000" /></label>
      </div>
      <label>Mô tả <textarea v-model="editing.description" rows="2"></textarea></label>
      <ProductImages v-model="editing.images" />
      <div class="row">
        <label>Thứ tự <input v-model="editing.sort_order" type="number" /></label>
        <label class="check"><input v-model="editing.is_featured" type="checkbox" /> Bán chạy (trang chủ)</label>
        <label class="check"><input v-model="editing.is_active" type="checkbox" /> Hiển thị</label>
      </div>
      <p class="error">{{ formError }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="editing = null">Huỷ</button>
        <button type="submit">Lưu</button>
      </div>
    </form>
  </AdminModal>

  <AdminModal v-if="bulk" :title="`Đặt giá cho ${visible.length} mẫu đang lọc`" @close="bulk = null">
    <form class="form" @submit.prevent="saveBulk">
      <p class="hint">
        Áp dụng cho các mẫu đang hiển thị trong bảng (bộ lọc hiện tại). Để trống = dùng giá chung của bộ sưu tập.
      </p>
      <label>Giá bán lẻ mới (VND) <input v-model="bulk.price" type="number" min="0" step="1000" autofocus /></label>
      <p class="error">{{ bulkError }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="bulk = null">Huỷ</button>
        <button type="submit">Cập nhật giá</button>
      </div>
    </form>
  </AdminModal>
</template>
