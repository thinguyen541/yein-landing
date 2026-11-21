<script setup>
import { ref } from 'vue'
import { adminApi } from '../../api'
import { thumb, readAsDataURL } from '../../utils'

const model = defineModel({ type: String, default: '' })
defineProps({ label: { type: String, default: 'Ảnh' } })

const status = ref('')

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  status.value = 'Đang tải ảnh…'
  try {
    const { url } = await adminApi.upload(await readAsDataURL(file))
    model.value = url
    status.value = ''
  } catch (err) {
    status.value = err.message
  }
  e.target.value = ''
}
</script>

<template>
  <div class="img-field">
    <img :src="thumb(model)" alt="" />
    <div>
      <label>{{ label }} (link) <input v-model.trim="model" /></label>
      <label class="upload">
        Hoặc tải ảnh lên
        <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFile" />
      </label>
      <p v-if="status" class="error">{{ status }}</p>
    </div>
  </div>
</template>
