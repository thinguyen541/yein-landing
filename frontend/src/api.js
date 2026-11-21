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
  bulkPrice: (ids, price) => api('/api/admin/products/bulk-price', { method: 'PUT', body: { ids, price } }),
  saveSettings: (body) => api('/api/admin/settings', { method: 'PUT', body }),
  // Image files -> backend "resources" folder + resources table
  upload: (dataUrl, name) => api('/api/admin/resources', { method: 'POST', body: { data: dataUrl, name } }),
  removeResource: (id) => api(`/api/admin/resources/${id}`, { method: 'DELETE' }),
}
