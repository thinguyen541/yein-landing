<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { adminApi } from '../../api'
import { money, readAsDataURL } from '../../utils'
import AdminModal from './AdminModal.vue'

const emit = defineEmits(['close', 'done'])

const STEPS = ['Tải file', 'Xem trước', 'Hoàn thành']
const step = ref(1)
const error = ref('')
const busy = ref(false)

// ---------- Step 1: files ----------
const sheet = ref(null) // { name, data(base64 data URL), size }
const images = ref([]) // File[]
const dragging = ref(false)
const IMG_RE = /\.(jpe?g|png|webp)$/i
const SHEET_RE = /\.(xlsx|csv)$/i

async function setSheet(file) {
  error.value = ''
  if (!file) return
  if (/\.xls$/i.test(file.name)) {
    error.value = 'File .xls (Excel cũ) chưa hỗ trợ – mở bằng Excel rồi "Lưu thành" .xlsx'
    return
  }
  if (!SHEET_RE.test(file.name)) {
    error.value = 'Chỉ nhận file .xlsx hoặc .csv'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File Excel tối đa 10MB'
    return
  }
  sheet.value = { name: file.name, size: file.size, data: await readAsDataURL(file) }
}

function addImages(fileList) {
  const byName = new Map(images.value.map((f) => [f.name.toLowerCase(), f]))
  let skipped = 0
  for (const f of fileList) {
    if (!IMG_RE.test(f.name)) {
      skipped++
      continue
    }
    byName.set(f.name.toLowerCase(), f) // same name -> newest wins
  }
  images.value = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  if (skipped) error.value = `Bỏ qua ${skipped} file không phải ảnh JPG/PNG/WEBP`
}
const removeImage = (f) => (images.value = images.value.filter((x) => x !== f))

function onDrop(e) {
  dragging.value = false
  const files = [...(e.dataTransfer?.files || [])]
  const sheetFile = files.find((f) => SHEET_RE.test(f.name) || /\.xls$/i.test(f.name))
  if (sheetFile) setSheet(sheetFile)
  addImages(files.filter((f) => f !== sheetFile))
}

const imagesSize = computed(() => images.value.reduce((s, f) => s + f.size, 0))
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

async function download(kind) {
  error.value = ''
  try {
    await (kind === 'template' ? adminApi.importTemplate() : adminApi.exportProducts())
  } catch (err) {
    error.value = err.message
  }
}

// ---------- Step 2: preview ----------
const preview = ref(null)
const tab = ref('all')

async function runPreview() {
  if (!sheet.value) return
  busy.value = true
  error.value = ''
  try {
    preview.value = await adminApi.importPreview({
      fileName: sheet.value.name,
      data: sheet.value.data,
      imageNames: images.value.map((f) => f.name),
    })
    tab.value = preview.value.summary.error ? 'error' : 'all'
    step.value = 2
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'create', label: 'Thêm mới' },
  { key: 'update', label: 'Cập nhật' },
  { key: 'unchanged', label: 'Không đổi' },
  { key: 'error', label: 'Lỗi' },
  { key: 'warn', label: 'Cảnh báo' },
]
const STATUS = { create: 'Thêm mới', update: 'Cập nhật', unchanged: 'Không đổi', error: 'Lỗi' }
const tabCount = (k) => {
  const s = preview.value?.summary
  if (!s) return 0
  if (k === 'all') return s.total
  if (k === 'warn') return s.warnings
  return s[k]
}
const shownRows = computed(() => {
  const rows = preview.value?.rows || []
  if (tab.value === 'all') return rows
  if (tab.value === 'warn') return rows.filter((r) => r.warnings.length)
  return rows.filter((r) => r.status === tab.value)
})
const toImport = computed(() => (preview.value ? preview.value.summary.create + preview.value.summary.update : 0))
const neededFiles = computed(() => {
  const want = new Set((preview.value?.neededUploads || []).map((n) => n.toLowerCase()))
  return images.value.filter((f) => want.has(f.name.toLowerCase()))
})

// local previews of the picked images
const objectUrls = new Map()
function localUrl(name) {
  const key = name.toLowerCase()
  if (!objectUrls.has(key)) {
    const f = images.value.find((x) => x.name.toLowerCase() === key)
    objectUrls.set(key, f ? URL.createObjectURL(f) : '')
  }
  return objectUrls.get(key)
}
onBeforeUnmount(() => objectUrls.forEach((u) => u && URL.revokeObjectURL(u)))

function fmtValue(field, v) {
  if (v === null || v === undefined || v === '') return '—'
  if (field === 'price' || field === 'sale_price') return money(v)
  if (field === 'is_featured' || field === 'is_active') return Number(v) ? 'Có' : 'Không'
  if (field === 'images') return `${v} ảnh`
  const s = String(v)
  return s.length > 40 ? `${s.slice(0, 40)}…` : s
}
const hostOf = (u) => {
  try {
    return new URL(u).host
  } catch {
    return u
  }
}

// ---------- Step 3: upload + commit ----------
const progress = reactive({ phase: '', done: 0, total: 0 })
const result = ref(null)
const uploadErrors = ref([])
const MAX_BYTES = 8 * 1024 * 1024

/** Shrink very large photos in the browser so they fit the 8MB upload limit. */
async function shrink(file) {
  if (file.size <= MAX_BYTES * 0.95) return readAsDataURL(file)
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
  const canvas = Object.assign(document.createElement('canvas'), {
    width: Math.round(bmp.width * scale),
    height: Math.round(bmp.height * scale),
  })
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.88)
}

async function commit() {
  step.value = 3
  busy.value = true
  error.value = ''
  uploadErrors.value = []
  result.value = null
  const uploaded = {}
  try {
    // 1) images, 3 at a time
    const files = neededFiles.value
    Object.assign(progress, { phase: 'upload', done: 0, total: files.length })
    let next = 0
    const worker = async () => {
      while (next < files.length) {
        const f = files[next++]
        try {
          const res = await adminApi.upload(await shrink(f), f.name)
          uploaded[f.name] = res.id
        } catch (err) {
          uploadErrors.value.push({ name: f.name, error: err.message })
        }
        progress.done++
      }
    }
    await Promise.all([worker(), worker(), worker()])

    // 2) save products
    Object.assign(progress, { phase: 'save', done: 0, total: 0 })
    result.value = await adminApi.importCommit({ fileName: sheet.value.name, data: sheet.value.data, uploaded })
    emit('done')
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
    progress.phase = ''
  }
}

const pct = computed(() => (progress.total ? Math.round((progress.done / progress.total) * 100) : 0))

function close() {
  if (busy.value && step.value === 3) return // never interrupt a running import
  emit('close')
}
function restart() {
  step.value = 1
  preview.value = null
  result.value = null
  error.value = ''
}
</script>

<template>
  <AdminModal wide title="Nhập sản phẩm từ Excel" @close="close">
    <ol class="iw-steps">
      <li v-for="(s, i) in STEPS" :key="s" :class="{ active: step === i + 1, done: step > i + 1 }">
        <span>{{ step > i + 1 ? '✓' : i + 1 }}</span>{{ s }}
      </li>
    </ol>

    <!-- ========== STEP 1 ========== -->
    <template v-if="step === 1">
      <div
        class="iw-drop"
        :class="{ over: dragging, has: sheet }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <template v-if="sheet">
          <b>📄 {{ sheet.name }}</b>
          <small>{{ fmtSize(sheet.size) }}</small>
          <label class="upload-btn ghosty">Đổi file<input type="file" accept=".xlsx,.csv" @change="setSheet($event.target.files[0]); $event.target.value = ''" /></label>
        </template>
        <template v-else>
          <b>Kéo thả file Excel (.xlsx / .csv) và ảnh vào đây</b>
          <small>hoặc</small>
          <label class="upload-btn">Chọn file Excel<input type="file" accept=".xlsx,.csv" @change="setSheet($event.target.files[0]); $event.target.value = ''" /></label>
        </template>
      </div>

      <div class="iw-images">
        <div class="pimgs-head">
          <span>
            <b>Ảnh sản phẩm</b> (không bắt buộc) –
            {{ images.length ? `${images.length} ảnh, ${fmtSize(imagesSize)}` : 'chưa chọn' }}
          </span>
          <span class="iw-pick">
            <label class="upload-btn">Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="addImages($event.target.files); $event.target.value = ''" /></label>
            <label class="upload-btn ghosty">Chọn cả thư mục<input type="file" webkitdirectory multiple @change="addImages($event.target.files); $event.target.value = ''" /></label>
            <button v-if="images.length" type="button" class="danger" @click="images = []">Bỏ hết</button>
          </span>
        </div>
        <div v-if="images.length" class="iw-chips">
          <span v-for="f in images.slice(0, 60)" :key="f.name" class="iw-chip">
            {{ f.name }} <button type="button" title="Bỏ ảnh" @click="removeImage(f)">×</button>
          </span>
          <span v-if="images.length > 60" class="iw-chip more">+{{ images.length - 60 }} ảnh</span>
        </div>
      </div>

      <div class="iw-help">
        <b>Ảnh được ghép vào sản phẩm theo 3 cách:</b>
        <ol>
          <li><b>Tự ghép theo mã:</b> đặt tên ảnh theo mã kính – <code>F3714.jpg</code>, <code>F3714-2.jpg</code>, <code>F3714-3.jpg</code>… và để trống cột <i>Ảnh</i>.</li>
          <li><b>Ghi tên file</b> vào cột <i>Ảnh</i>, nhiều ảnh cách nhau bằng <code>|</code> – ví dụ <code>truoc.jpg | ben.jpg</code>.</li>
          <li><b>Ghi link</b> <code>https://…</code> – máy chủ tự tải ảnh về.</li>
        </ol>
        Cột <i>Bộ sưu tập</i> ghi tên chưa có thì <b>tự tạo bộ sưu tập mới</b>.
        Cột <i>Ảnh</i> để trống (và không có ảnh trùng mã) thì <b>giữ nguyên ảnh cũ</b>. Ô khác để trống cũng giữ nguyên giá trị cũ.
        <div class="iw-links">
          <button type="button" class="ghost" @click="download('template')">⬇ Tải file mẫu</button>
          <button type="button" class="ghost" @click="download('export')">⬇ Xuất dữ liệu hiện tại để sửa</button>
        </div>
      </div>

      <p class="error">{{ error }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="close">Huỷ</button>
        <button type="button" :disabled="!sheet || busy" @click="runPreview">{{ busy ? 'Đang đọc file…' : 'Xem trước →' }}</button>
      </div>
    </template>

    <!-- ========== STEP 2 ========== -->
    <template v-else-if="step === 2 && preview">
      <p class="hint iw-sum">
        <b>{{ sheet.name }}</b> – {{ preview.summary.total }} dòng (tiêu đề ở dòng {{ preview.header }}).
        Sẽ <b class="c-create">thêm {{ preview.summary.create }}</b>, <b class="c-update">cập nhật {{ preview.summary.update }}</b>,
        giữ nguyên {{ preview.summary.unchanged }}<template v-if="preview.summary.error">, <b class="c-error">bỏ qua {{ preview.summary.error }} dòng lỗi</b></template>.
        <template v-if="preview.summary.newCollections"> Tạo {{ preview.summary.newCollections }} bộ sưu tập mới.</template>
        <template v-if="neededFiles.length"> Tải lên {{ neededFiles.length }} ảnh.</template>
      </p>
      <p v-if="preview.newCollections?.length" class="iw-note iw-newcol">
        ✚ Sẽ <b>tạo {{ preview.newCollections.length }} bộ sưu tập mới</b>:
        <span v-for="c in preview.newCollections" :key="c.id" class="iw-colchip">{{ c.name }} <small>{{ c.products }} SP</small></span>
        <br /><small>Sau khi nhập, vào tab Bộ sưu tập để thêm ảnh bìa, mô tả, giá chung.</small>
      </p>
      <p v-if="preview.unusedImages.length" class="iw-note">
        {{ preview.unusedImages.length }} ảnh không khớp sản phẩm nào và sẽ không được tải lên:
        <i>{{ preview.unusedImages.slice(0, 8).join(', ') }}{{ preview.unusedImages.length > 8 ? '…' : '' }}</i>
      </p>

      <div class="iw-tabs">
        <button
          v-for="t in TABS"
          v-show="t.key === 'all' || tabCount(t.key)"
          :key="t.key"
          type="button"
          :class="['iw-tab', `t-${t.key}`, { active: tab === t.key }]"
          @click="tab = t.key"
        >
          {{ t.label }} <small>{{ tabCount(t.key) }}</small>
        </button>
      </div>

      <div class="iw-table">
        <table>
          <thead>
            <tr><th>Dòng</th><th>Mã / tên</th><th>Trạng thái</th><th>Thay đổi</th><th>Ảnh</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in shownRows.slice(0, 500)" :key="r.row" :class="`s-${r.status}`">
              <td class="num">{{ r.row }}</td>
              <td>
                <b>{{ r.code || '(trống)' }}</b>
                <div class="sub">
                  {{ r.name }}<template v-if="r.collection_name"> · {{ r.collection_name }}</template>
                  <span v-if="r.newCollection && r.status !== 'error'" class="iw-new-tag">BST mới</span>
                </div>
              </td>
              <td><span :class="['iw-badge', r.status]">{{ STATUS[r.status] }}</span></td>
              <td class="iw-changes">
                <div v-for="e in r.errors" :key="e" class="c-error">✕ {{ e }}</div>
                <template v-if="r.status !== 'error'">
                  <div v-for="c in r.changes" :key="c.field">
                    <span class="lbl">{{ c.label }}:</span>
                    <template v-if="r.status === 'update'"><s>{{ fmtValue(c.field, c.from) }}</s> → </template>
                    <b>{{ fmtValue(c.field, c.to) }}</b>
                  </div>
                </template>
                <div v-for="w in r.warnings" :key="w" class="c-warn">⚠ {{ w }}</div>
              </td>
              <td>
                <div v-if="r.imagePlan === 'replace'" class="iw-imgs">
                  <template v-for="(im, i) in r.images" :key="i">
                    <img v-if="im.kind === 'upload'" :src="localUrl(im.name)" :title="im.name" />
                    <img v-else-if="im.kind === 'existing' || im.kind === 'static'" :src="im.url" :title="im.name" />
                    <span v-else-if="im.kind === 'url'" class="iw-img-tag" :title="im.url">🔗 {{ hostOf(im.url) }}</span>
                    <span v-else class="iw-img-tag miss" :title="im.name">thiếu</span>
                  </template>
                  <small v-if="r.autoMatched" class="sub">tự ghép theo mã</small>
                </div>
                <span v-else-if="r.imagePlan === 'clear'" class="c-error">Xoá hết ảnh</span>
                <span v-else class="sub">giữ ảnh cũ</span>
              </td>
            </tr>
            <tr v-if="!shownRows.length"><td colspan="5" class="sub">Không có dòng nào.</td></tr>
            <tr v-if="shownRows.length > 500"><td colspan="5" class="sub">… và {{ shownRows.length - 500 }} dòng nữa</td></tr>
          </tbody>
        </table>
      </div>

      <p class="error">{{ error }}</p>
      <div class="actions">
        <button type="button" class="ghost" @click="step = 1">← Quay lại</button>
        <button type="button" :disabled="!toImport" @click="commit">
          {{ toImport ? `Nhập ${toImport} sản phẩm` : 'Không có gì để nhập' }}
        </button>
      </div>
    </template>

    <!-- ========== STEP 3 ========== -->
    <template v-else-if="step === 3">
      <div v-if="busy" class="iw-progress">
        <p v-if="progress.phase === 'upload'">Đang tải ảnh lên… {{ progress.done }}/{{ progress.total }}</p>
        <p v-else>Đang lưu sản phẩm vào hệ thống…</p>
        <div class="bar"><div :class="{ indeterminate: progress.phase !== 'upload' }" :style="progress.phase === 'upload' ? { width: pct + '%' } : {}" /></div>
        <small class="sub">Đừng đóng cửa sổ này cho đến khi xong.</small>
      </div>

      <template v-else-if="result">
        <div class="iw-result">
          <div><b>{{ result.created }}</b><span>Thêm mới</span></div>
          <div><b>{{ result.updated }}</b><span>Cập nhật</span></div>
          <div><b>{{ result.unchanged }}</b><span>Không đổi</span></div>
          <div :class="{ bad: result.skipped }"><b>{{ result.skipped }}</b><span>Bỏ qua</span></div>
        </div>
        <p v-if="result.collectionsCreated?.length" class="iw-note iw-newcol">
          ✚ Đã tạo {{ result.collectionsCreated.length }} bộ sưu tập mới:
          <span v-for="c in result.collectionsCreated" :key="c.id" class="iw-colchip">{{ c.name }}</span>
          <br /><small>Vào tab <b>Bộ sưu tập</b> để thêm ảnh bìa, mô tả và giá chung.</small>
        </p>
        <p class="error ok">✓ Đã nhập xong. Trang web đã cập nhật.</p>
        <details v-if="result.errors.length || result.imageErrors.length || uploadErrors.length" open class="iw-errs">
          <summary>Chi tiết lỗi ({{ result.errors.length + result.imageErrors.length + uploadErrors.length }})</summary>
          <div v-for="e in result.errors" :key="'r' + e.row">Dòng {{ e.row }} <b>{{ e.code }}</b>: {{ e.error }}</div>
          <div v-for="(e, i) in result.imageErrors" :key="'i' + i">Dòng {{ e.row }} <b>{{ e.code }}</b> – ảnh {{ e.image }}: {{ e.error }}</div>
          <div v-for="e in uploadErrors" :key="'u' + e.name">Ảnh <b>{{ e.name }}</b>: {{ e.error }}</div>
        </details>
      </template>

      <p class="error">{{ error }}</p>
      <div v-if="!busy" class="actions">
        <button v-if="error" type="button" class="ghost" @click="step = 2">← Quay lại xem trước</button>
        <button type="button" class="ghost" @click="restart">Nhập file khác</button>
        <button type="button" @click="emit('close')">Xong</button>
      </div>
    </template>
  </AdminModal>
</template>
