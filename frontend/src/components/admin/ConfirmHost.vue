<script setup>
import { watch, nextTick, ref, onMounted, onBeforeUnmount } from 'vue'
import { dialog, closeDialog } from '../../composables/useDialog'

const okBtn = ref(null)
const ICONS = { danger: '!', warning: '!', success: '✓', error: '✕', info: 'i' }
const MAX_ITEMS = 8

watch(
  () => dialog.current,
  async (d) => {
    if (!d) return
    await nextTick()
    okBtn.value?.focus()
  }
)

function onKey(e) {
  if (!dialog.current) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopImmediatePropagation() // don't also close an AdminModal underneath
    closeDialog(false)
  }
}
onMounted(() => document.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey, true))
</script>

<template>
  <Transition name="cdlg">
    <div v-if="dialog.current" class="cdlg-overlay" @mousedown.self="closeDialog(false)">
      <div class="cdlg" :class="`tone-${dialog.current.tone}`" role="alertdialog" aria-modal="true">
        <div class="cdlg-icon">{{ ICONS[dialog.current.tone] || 'i' }}</div>
        <div class="cdlg-body">
          <h3 v-if="dialog.current.title">{{ dialog.current.title }}</h3>
          <p v-if="dialog.current.message" class="cdlg-msg">{{ dialog.current.message }}</p>

          <ul v-if="dialog.current.items?.length" class="cdlg-items">
            <li v-for="(it, i) in dialog.current.items.slice(0, MAX_ITEMS)" :key="i">{{ it }}</li>
            <li v-if="dialog.current.items.length > MAX_ITEMS" class="more">… và {{ dialog.current.items.length - MAX_ITEMS }} mục khác</li>
          </ul>

          <label v-if="dialog.current.check" class="cdlg-check">
            <input v-model="dialog.current.checked" type="checkbox" />
            <span>{{ dialog.current.check }}</span>
          </label>
          <p v-if="dialog.current.note" class="cdlg-note">{{ dialog.current.note }}</p>
        </div>
        <div class="cdlg-actions">
          <button v-if="dialog.current.kind === 'confirm'" type="button" class="cdlg-cancel" @click="closeDialog(false)">
            {{ dialog.current.cancelText }}
          </button>
          <button ref="okBtn" type="button" class="cdlg-ok" @click="closeDialog(true)">{{ dialog.current.okText }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
