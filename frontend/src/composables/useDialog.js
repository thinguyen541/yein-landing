import { reactive } from 'vue'

/**
 * Promise-based dialogs for the admin (replace window.confirm / window.alert).
 * Rendered once by <ConfirmHost /> in AdminLayout.
 *
 *   const r = await confirmDialog({ title, message, items, okText, tone: 'danger', check: 'Xoá luôn…' })
 *   if (!r) return            // cancelled
 *   r.checked                  // value of the optional checkbox
 *   await alertDialog('Đã lưu', { tone: 'success' })
 */
export const dialog = reactive({ current: null })

function open(opts) {
  return new Promise((resolve) => {
    dialog.current = { checked: false, ...opts, resolve }
  })
}

export function confirmDialog(opts = {}) {
  return open({ kind: 'confirm', tone: 'danger', okText: 'Xoá', cancelText: 'Huỷ', ...opts })
}

export function alertDialog(message, opts = {}) {
  return open({ kind: 'alert', tone: 'info', okText: 'Đóng', message, ...opts })
}

export function closeDialog(ok) {
  const d = dialog.current
  if (!d) return
  dialog.current = null
  d.resolve(d.kind === 'confirm' ? (ok ? { checked: d.checked } : false) : true)
}
