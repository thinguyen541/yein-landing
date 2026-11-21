<script setup>
import { ref } from 'vue'
import { adminApi } from '../../api'
import { readAsDataURL, thumb } from '../../utils'

// v-model: [{ id, url }] in display order. id = resources.id (null for an old static image URL).
// The first image is the main photo shown on the website.
const images = defineModel({ type: Array, default: () => [] })
const status = ref('')

async function onFiles(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  if (!files.length) return
  const added = []
  for (let i = 0; i < files.length; i++) {
    status.value = `Đang tải ảnh ${i + 1}/${files.length}…`
    try {
      const r = await adminApi.upload(await readAsDataURL(files[i]), files[i].name)
      added.push({ id: r.id, url: r.url })
    } catch (err) {
      status.value = `${files[i].name}: ${err.message}`
      images.value = [...images.value, ...added]
      return
    }
  }
  images.value = [...images.value, ...added]
  status.value = ''
}

function remove(i) {
  const next = [...images.value]
  next.splice(i, 1)
  images.value = next // file is deleted by the backend when the product is saved
}

function move(i, d) {
  const j = i + d
  if (j < 0 || j >= images.value.length) return
  const next = [...images.value]
  ;[next[i], next[j]] = [next[j], next[i]]
  images.value = next
}
</script>

<template>
  <div class="pimgs">
    <div class="pimgs-head">
      <span>Ảnh sản phẩm ({{ images.length }}) · ảnh đầu tiên là ảnh chính</span>
      <label class="upload-btn">
        + Thêm ảnh
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="onFiles" />
      </label>
    </div>
    <div v-if="images.length" class="pimgs-list">
      <figure v-for="(img, i) in images" :key="(img.id || 'u') + img.url" :class="{ main: i === 0 }">
        <img :src="thumb(img.url)" alt="" />
        <figcaption>
          <button type="button" class="ghost" title="Sang trái" :disabled="i === 0" @click="move(i, -1)">←</button>
          <button type="button" class="ghost" title="Sang phải" :disabled="i === images.length - 1" @click="move(i, 1)">→</button>
          <button type="button" class="danger" title="Xoá ảnh" @click="remove(i)">✕</button>
        </figcaption>
        <span v-if="i === 0" class="tag">Ảnh chính</span>
        <span v-if="!img.id" class="tag tag-old">Ảnh cũ</span>
      </figure>
    </div>
    <p v-else class="hint">Chưa có ảnh. Bấm “Thêm ảnh” để chọn một hoặc nhiều ảnh.</p>
    <p v-if="status" class="error">{{ status }}</p>
  </div>
</template>
