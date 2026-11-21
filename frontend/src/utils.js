export const money = (n) => (n == null || n === '' ? '' : new Intl.NumberFormat('vi-VN').format(n) + ' ₫')

// Seeded PDF images (/assets/products/*.jpg) have a cropped "-t" thumbnail; other images are used as-is
export const thumb = (url) =>
  url && /^\/assets\/products\/[^/]+\.jpg$/.test(url) ? url.replace(/\.jpg$/, '-t.jpg') : url || ''

export const onSale = (p) => p.sale_price != null && p.price != null && p.sale_price < p.price

export const effectivePrice = (p) => (onSale(p) ? p.sale_price : p.price)

// If a catalogue image is missing, fall back to the PDF image of the same code (once)
export function imgFallback(e, code) {
  const img = e.target
  if (img.dataset.fallback || !code) return
  img.dataset.fallback = '1'
  img.src = `/assets/products/${code}.jpg`
}

/** "Name | 500000" per line -> [{ name, price }] */
export function parseLensOptions(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, price] = l.split('|').map((x) => x.trim())
      const n = Number(String(price || '').replace(/[^\d]/g, ''))
      return { name, price: Number.isFinite(n) && price ? n : null }
    })
}

export const stringifyLensOptions = (rows) =>
  rows
    .filter((r) => String(r.name || '').trim())
    .map((r) => `${String(r.name).trim()} | ${r.price === '' || r.price == null ? '' : Number(r.price)}`)
    .join('\n')

export const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
