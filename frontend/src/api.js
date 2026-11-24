import { auth, clearSession } from './auth'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/**
 * fetch wrapper for the backend.
 * - Public endpoints:  /api/products, /api/collections, /api/settings
 * - Auth:              /api/auth/*
 * - Admin (Bearer):    /api/admin/*
 */
export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))

  // Token expired / invalid -> drop the session; AdminLayout redirects to the login page
  if (res.status === 401 && auth.token && !path.startsWith('/api/auth/login')) clearSession()

  if (!res.ok) throw new ApiError(data.error || `Lỗi ${res.status}`, res.status)
  return data
}

export const adminApi = {
  list: (resource) => api(`/api/admin/${resource}`),
  create: (resource, body) => api(`/api/admin/${resource}`, { method: 'POST', body }),
  update: (resource, id, body) => api(`/api/admin/${resource}/${id}`, { method: 'PUT', body }),
  remove: (resource, id) => api(`/api/admin/${resource}/${id}`, { method: 'DELETE' }),
  bulkDelete: (resource, ids, extra = {}) => api(`/api/admin/${resource}/bulk-delete`, { method: 'POST', body: { ids, ...extra } }),
  bulkPrice: (ids, price) => api('/api/admin/products/bulk-price', { method: 'PUT', body: { ids, price } }),
  saveSettings: (body) => api('/api/admin/settings', { method: 'PUT', body }),
  // Image files -> backend "resources" folder + resources table
  upload: (dataUrl, name) => api('/api/admin/resources', { method: 'POST', body: { data: dataUrl, name } }),
  removeResource: (id) => api(`/api/admin/resources/${id}`, { method: 'DELETE' }),
  // Excel import / export
  importPreview: (body) => api('/api/admin/import-export/preview', { method: 'POST', body }),
  importCommit: (body) => api('/api/admin/import-export/commit', { method: 'POST', body }),
  exportProducts: () => downloadFile('/api/admin/import-export/export', 'san-pham-yein.xlsx'),
  importTemplate: () => downloadFile('/api/admin/import-export/template', 'mau-nhap-san-pham.xlsx'),
}

/** Download a file from an admin endpoint (needs the Bearer token, so no plain <a href>). */
export async function downloadFile(path, fallbackName) {
  const res = await fetch(path, { headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {} })
  if (res.status === 401) clearSession()
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(data.error || `Lỗi ${res.status}`, res.status)
  }
  const cd = res.headers.get('Content-Disposition') || ''
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd) || /filename="([^"]+)"/i.exec(cd)
  const name = m ? decodeURIComponent(m[1]) : fallbackName
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
