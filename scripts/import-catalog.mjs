#!/usr/bin/env node
/**
 * YEIN – import collections + products (with images) from CSV files through the backend API.
 * Runs on your own computer (Node 18+, no npm install needed) against a local or remote backend.
 *
 *   node scripts/import-catalog.mjs                                   # local backend, admin login from .env
 *   node scripts/import-catalog.mjs --api https://yein.com.vn --user admin --password xxx
 *
 * Options
 *   --api <url>            Backend URL (default http://localhost:4000)
 *   --user / --password    Admin login (default ADMIN_USERNAME / ADMIN_PASSWORD from .env)
 *   --collections <file>   default data/collections.csv
 *   --products <file>      default data/products.csv
 *   --images-root <dir>    Folder the "images" column is relative to (can repeat). Defaults:
 *                          frontend/public, then ../../yein-landing-full/yein-landing/public
 *   --replace-images       Re-upload images even for products that already have images
 *   --only <codes>         Import only these product codes (comma separated)
 *   --dry-run              Read and check the files, change nothing
 *
 * Collections are matched by "slug", products by "code": running it again updates instead of duplicating.
 * Images are uploaded only for products that have none yet (unless --replace-images).
 * CSV: UTF-8, comma or semicolon separated; "images" may list several files separated by "|".
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---------------- args / env ----------------
function parseArgs(argv) {
  const out = { imagesRoot: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--api') out.api = next()
    else if (a === '--user') out.user = next()
    else if (a === '--password') out.password = next()
    else if (a === '--collections') out.collections = next()
    else if (a === '--products') out.products = next()
    else if (a === '--images-root') out.imagesRoot.push(next())
    else if (a === '--replace-images') out.replaceImages = true
    else if (a === '--only') out.only = next().split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '-h' || a === '--help') out.help = true
    else throw new Error(`Unknown option ${a}`)
  }
  return out
}

function readEnv(file) {
  const env = {}
  if (!fs.existsSync(file)) return env
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

// ---------------- CSV ----------------
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '')
  const firstLine = text.split(/\r?\n/, 1)[0]
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [header, ...body] = rows.filter((r) => r.some((x) => x.trim() !== ''))
  const keys = header.map((h) => h.trim().toLowerCase())
  return body.map((r, idx) => {
    const o = { _line: idx + 2 }
    keys.forEach((k, i) => (o[k] = (r[i] ?? '').trim()))
    return o
  })
}

const money = (v) => {
  const s = String(v ?? '').replace(/[^\d]/g, '')
  return s === '' ? null : Number(s)
}
const bool = (v, d = false) => {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === '') return d
  return ['1', 'true', 'x', 'yes', 'y', 'có', 'co'].includes(s)
}
const int = (v, d = 0) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : d
}

// ---------------- API ----------------
function makeApi(base) {
  let token = null
  // Retries network errors (backend restarting / busy) for up to ~60s before giving up
  const call = async (method, p, body) => {
    let res
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetch(base.replace(/\/$/, '') + p, {
          method,
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        })
        break
      } catch (err) {
        if (attempt >= 20) throw err
        if (attempt === 0) process.stdout.write(`\n  (mất kết nối backend, đang thử lại ${method} ${p}…)`)
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`${method} ${p}: ${data.error || res.status}`)
    return data
  }
  return {
    async login(username, password) {
      const r = await call('POST', '/api/auth/login', { username, password })
      token = r.token
    },
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    put: (p, b) => call('PUT', p, b),
  }
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

function findImage(rel, roots) {
  if (path.isAbsolute(rel)) return fs.existsSync(rel) ? rel : null
  for (const r of roots) {
    const p = path.resolve(r, rel)
    if (fs.existsSync(p)) return p
  }
  return null
}

// ---------------- main ----------------
async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
    return
  }
  const env = readEnv(path.join(ROOT, '.env'))
  const apiBase = args.api || 'http://localhost:4000'
  const user = args.user || env.ADMIN_USERNAME || 'admin'
  const password = args.password || env.ADMIN_PASSWORD
  const colFile = path.resolve(args.collections || path.join(ROOT, 'data/collections.csv'))
  const prodFile = path.resolve(args.products || path.join(ROOT, 'data/products.csv'))
  const roots = [
    ...args.imagesRoot.map((r) => path.resolve(r)),
    path.join(ROOT, 'frontend/public'),
    path.resolve(ROOT, '../../yein-landing-full/yein-landing/public'),
    path.dirname(prodFile),
  ]

  const collections = parseCsv(fs.readFileSync(colFile, 'utf8'))
  let products = parseCsv(fs.readFileSync(prodFile, 'utf8'))
  if (args.only) products = products.filter((p) => args.only.includes(p.code))
  console.log(`Đọc ${collections.length} bộ sưu tập (${path.relative(ROOT, colFile)}), ${products.length} sản phẩm (${path.relative(ROOT, prodFile)})`)

  // Validate files before touching the server
  const problems = []
  const slugs = new Set(collections.map((c) => c.slug))
  const seen = new Set()
  for (const p of products) {
    if (!p.code) problems.push(`products dòng ${p._line}: thiếu mã (code)`)
    if (!p.name) problems.push(`products dòng ${p._line}: thiếu tên (name)`)
    if (seen.has(p.code)) problems.push(`products dòng ${p._line}: trùng mã ${p.code}`)
    seen.add(p.code)
    if (!p.collection) problems.push(`products dòng ${p._line}: thiếu bộ sưu tập (collection)`)
    p._images = String(p.images || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((rel) => ({ rel, file: findImage(rel, roots) }))
    for (const im of p._images) if (!im.file) problems.push(`products dòng ${p._line} (${p.code}): không thấy ảnh ${im.rel}`)
  }
  for (const c of collections) if (!c.slug || !c.name) problems.push(`collections dòng ${c._line}: thiếu slug hoặc name`)
  const missingImages = problems.filter((x) => x.includes('không thấy ảnh')).length
  const hard = problems.filter((x) => !x.includes('không thấy ảnh'))
  if (hard.length) {
    console.error('Lỗi dữ liệu:\n  ' + hard.join('\n  '))
    process.exit(1)
  }
  if (missingImages) {
    console.warn(`Cảnh báo: ${missingImages} ảnh không tìm thấy (sản phẩm vẫn được nhập, chỉ thiếu ảnh). Ví dụ:`)
    problems.filter((x) => x.includes('không thấy ảnh')).slice(0, 5).forEach((x) => console.warn('  ' + x))
    console.warn('  Thư mục đã tìm: ' + roots.join(' ; '))
  }
  if (args.dryRun) {
    console.log('Dry run: dữ liệu hợp lệ, không thay đổi gì.')
    return
  }
  if (!password) throw new Error('Thiếu mật khẩu admin: dùng --password hoặc ADMIN_PASSWORD trong .env')

  const api = makeApi(apiBase)
  await api.login(user, password)
  console.log(`Đã đăng nhập ${apiBase} với tài khoản ${user}`)

  // ---- collections (by slug) ----
  const existingCols = await api.get('/api/admin/collections')
  const colBySlug = Object.fromEntries(existingCols.map((c) => [c.slug, c]))
  let cNew = 0
  let cUpd = 0
  for (const c of collections) {
    const body = {
      slug: c.slug,
      name: c.name,
      tagline: c.tagline || null,
      description: c.description || null,
      default_price: money(c.default_price),
      sort_order: int(c.sort_order),
      is_active: bool(c.is_active, true),
    }
    if (c.cover_image) {
      if (/^(https?:)?\//.test(c.cover_image)) body.cover_image = c.cover_image
      else {
        const file = findImage(c.cover_image, roots)
        if (file) {
          const up = await api.post('/api/admin/resources', {
            data: `data:${MIME[path.extname(file).toLowerCase()] || 'image/jpeg'};base64,${fs.readFileSync(file).toString('base64')}`,
            name: path.basename(file),
          })
          body.cover_image = up.url
        } else console.warn(`  Không thấy ảnh bìa ${c.cover_image} của ${c.slug}`)
      }
    }
    const ex = colBySlug[c.slug]
    colBySlug[c.slug] = ex ? await api.put(`/api/admin/collections/${ex.id}`, body) : await api.post('/api/admin/collections', body)
    ex ? cUpd++ : cNew++
  }
  console.log(`Bộ sưu tập: ${cNew} mới, ${cUpd} cập nhật`)

  // ---- products (by code) ----
  const existing = await api.get('/api/admin/products')
  const byCode = Object.fromEntries(existing.filter((p) => p.code).map((p) => [p.code, p]))
  let pNew = 0
  let pUpd = 0
  let imgUp = 0
  const failed = []
  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const col = colBySlug[p.collection]
    try {
      if (!col) throw new Error(`không có bộ sưu tập "${p.collection}"`)
      const ex = byCode[p.code]
      const body = {
        code: p.code,
        name: p.name,
        series: p.series || null,
        collection_id: col.id,
        price: money(p.price),
        sale_price: money(p.sale_price),
        is_featured: bool(p.is_featured),
        is_active: bool(p.is_active, true),
        sort_order: int(p.sort_order, i),
        description: p.description || null,
      }
      const needImages = p._images.some((im) => im.file) && (args.replaceImages || !ex || !ex.images?.length)
      if (needImages) {
        const ids = []
        for (const im of p._images) {
          if (!im.file) continue
          const up = await api.post('/api/admin/resources', {
            data: `data:${MIME[path.extname(im.file).toLowerCase()] || 'image/jpeg'};base64,${fs.readFileSync(im.file).toString('base64')}`,
            name: path.basename(im.file),
          })
          ids.push(up.id)
          imgUp++
        }
        body.image_ids = ids
        body.image_url = null
      }
      if (ex) {
        await api.put(`/api/admin/products/${ex.id}`, body)
        pUpd++
      } else {
        await api.post('/api/admin/products', body)
        pNew++
      }
    } catch (err) {
      failed.push(`${p.code}: ${err.message}`)
    }
    if ((i + 1) % 25 === 0 || i === products.length - 1) process.stdout.write(`\r  Sản phẩm ${i + 1}/${products.length}`)
  }
  console.log(`\nSản phẩm: ${pNew} mới, ${pUpd} cập nhật, ${imgUp} ảnh đã tải lên`)
  if (failed.length) {
    console.error(`${failed.length} sản phẩm lỗi:\n  ` + failed.join('\n  '))
    process.exitCode = 1
  } else console.log('Xong!')
}

main().catch((err) => {
  const code = err.cause?.code || err.code
  if (code === 'ECONNREFUSED' || /fetch failed/i.test(err.message))
    console.error(`Lỗi: không kết nối được backend (${err.cause?.address || ''}:${err.cause?.port || ''}). Kiểm tra terminal backend có dòng "[api] listening on :4000" và không báo lỗi.`)
  else console.error('Lỗi:', err.message)
  process.exit(1)
})
