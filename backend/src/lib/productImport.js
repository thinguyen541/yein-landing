/**
 * Product import logic (pure – no database access), shared by preview and commit.
 *
 * analyzeImport(rows, ctx)
 *   rows: array of arrays (first non-empty header row is detected automatically)
 *   ctx:  { collections: [{id, slug, name}],
 *           products:    [{id, code, name, collection_id, series, price, sale_price,
 *                          is_featured, is_active, sort_order, description, image_url,
 *                          images: [{id, url}]}],
 *           resources:   Map(file_name -> {id, product_id}),   // resources referenced in the sheet
 *           imageNames:  ['F3714.jpg', ...] }                   // image files picked by the admin
 */

const { slugify } = require('../util');

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Column keys and the header names accepted for them (normalized)
const COLUMNS = {
  code: ['code', 'ma', 'makinh', 'masanpham', 'masp', 'mahang'],
  name: ['name', 'ten', 'tensanpham', 'tensp', 'tenhang', 'tenkinh'],
  collection: ['collection', 'bosuutap', 'bst', 'collectionslug', 'dongbst'],
  series: ['series', 'dong', 'dongsanpham', 'nhom'],
  price: ['price', 'gia', 'giaban', 'giabanle', 'giabanlekiennghi', 'giale'],
  sale_price: ['saleprice', 'giakhuyenmai', 'giakm', 'giasale', 'giagiam'],
  is_featured: ['isfeatured', 'featured', 'noibat'],
  is_active: ['isactive', 'active', 'hienthi', 'trangthai'],
  sort_order: ['sortorder', 'thutu', 'stt', 'order'],
  description: ['description', 'mota', 'ghichu'],
  images: ['images', 'image', 'anh', 'hinhanh', 'hinh', 'tenanh'],
};
const ALIAS = new Map();
for (const [key, names] of Object.entries(COLUMNS)) for (const n of names) ALIAS.set(n, key);

const LABELS = {
  code: 'Mã kính',
  name: 'Tên',
  collection_id: 'Bộ sưu tập',
  series: 'Dòng',
  price: 'Giá',
  sale_price: 'Giá KM',
  is_featured: 'Nổi bật',
  is_active: 'Hiển thị',
  sort_order: 'Thứ tự',
  description: 'Mô tả',
  images: 'Ảnh',
};

const CLEAR = new Set(['-', 'xoa', 'trong', 'null', 'none']);
// Collection names match when equal ignoring letter case and extra spaces (accents must match)
const nameKey = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

function parseMoney(v) {
  const s = String(v).trim();
  if (CLEAR.has(norm(s)) || s === '-') return { ok: true, value: null };
  if (/^\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) return { ok: true, value: Math.round(Number(s)) };
  // "6.564.000", "6,564,000 đ", "6 564 000 VNĐ"
  if (/^[\d\s.,]+(đ|d|vnd|vnđ)?$/i.test(s)) {
    const digits = s.replace(/[^\d]/g, '');
    if (digits) return { ok: true, value: Number(digits) };
  }
  return { ok: false };
}

function parseBool(v) {
  const s = norm(v);
  if (['1', 'true', 'x', 'co', 'yes', 'y', 'hien', 'bat', 'on'].includes(s)) return { ok: true, value: 1 };
  if (['0', 'false', 'khong', 'no', 'n', 'an', 'tat', 'off'].includes(s)) return { ok: true, value: 0 };
  return { ok: false };
}

const baseName = (p) => String(p).split(/[\\/]/).pop();
const stripExt = (n) => n.replace(/\.[a-z0-9]+$/i, '');

/** Split an images cell into tokens. */
const splitImages = (v) =>
  String(v)
    .split(/[|;\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const map = {};
    (rows[i] || []).forEach((h, c) => {
      const key = ALIAS.get(norm(h));
      if (key && map[key] === undefined) map[key] = c;
    });
    if (map.code !== undefined && (map.name !== undefined || map.price !== undefined || map.images !== undefined)) return { index: i, map };
  }
  return null;
}

function analyzeImport(rows, ctx) {
  const header = findHeader(rows);
  if (!header) {
    throw Object.assign(new Error('Không tìm thấy dòng tiêu đề. File cần có cột "Mã kính" (code) và ít nhất cột "Tên" hoặc "Giá".'), {
      status: 400,
    });
  }
  const { map } = header;

  const collBySlug = new Map();
  const collByName = new Map();
  const collById = new Map();
  for (const c of ctx.collections) {
    collBySlug.set(String(c.slug), c);
    collByName.set(nameKey(c.name), c);
    collById.set(c.id, c);
  }
  const prodByCode = new Map(ctx.products.filter((p) => p.code).map((p) => [String(p.code).toLowerCase(), p]));

  // uploaded image names: lowercase basename -> original name
  const uploads = new Map();
  for (const n of ctx.imageNames || []) uploads.set(baseName(n).toLowerCase(), baseName(n));

  // code -> uploaded files named "CODE.jpg", "CODE-2.jpg", "CODE_2.png", "CODE (2).webp"
  const byCode = new Map();
  for (const name of uploads.values()) {
    const m = /^(.+?)(?:[-_ ]\(?(\d{1,3})\)?)?$/.exec(stripExt(name));
    const add = (code, n) => {
      const k = code.toLowerCase();
      if (!byCode.has(k)) byCode.set(k, []);
      byCode.get(k).push({ name, n });
    };
    add(stripExt(name), 0); // exact "F3714-2" also matches a product coded "F3714-2"
    if (m && m[2]) add(m[1], Number(m[2]));
  }

  const seen = new Map();
  const out = [];
  const usedUploads = new Set();

  for (let r = header.index + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const cell = (k) => (map[k] === undefined ? undefined : row[map[k]]);
    if (Object.values(map).every((c) => blank(row[c]))) continue; // empty line

    const item = {
      row: r + 1,
      code: blank(cell('code')) ? '' : String(cell('code')).trim(),
      name: blank(cell('name')) ? '' : String(cell('name')).trim(),
      status: 'update',
      errors: [],
      warnings: [],
      changes: [],
      data: {},
      images: [],
      imagePlan: 'keep',
    };
    out.push(item);

    if (!item.code) {
      item.errors.push('Thiếu mã kính');
      item.status = 'error';
      continue;
    }
    if (item.code.length > 64) item.errors.push('Mã kính quá dài (tối đa 64 ký tự)');
    const key = item.code.toLowerCase();
    if (seen.has(key)) item.errors.push(`Mã kính trùng với dòng ${seen.get(key)}`);
    else seen.set(key, item.row);

    const cur = prodByCode.get(key);
    item.id = cur?.id || null;
    item.status = cur ? 'update' : 'create';
    const data = {};

    // text fields
    if (!blank(cell('name'))) data.name = String(cell('name')).trim().slice(0, 255);
    if (!blank(cell('series'))) data.series = CLEAR.has(norm(cell('series'))) ? null : String(cell('series')).trim().slice(0, 128);
    if (!blank(cell('description')))
      data.description = CLEAR.has(norm(cell('description'))) ? null : String(cell('description')).trim().slice(0, 5000);

    // collection (slug or name)
    if (!blank(cell('collection'))) {
      const v = String(cell('collection')).trim();
      // by name (case-insensitive); an exact slug still works for files exported by older versions
      let c = collByName.get(nameKey(v)) || collBySlug.get(v);
      if (!c) {
        // Unknown collection -> it will be created on import (one per distinct name)
        const base = slugify(v);
        if (!base) item.errors.push(`Tên bộ sưu tập không hợp lệ: "${v}"`);
        else {
          let slug = base;
          for (let n = 2; collBySlug.has(slug); n++) slug = `${base}-${n}`;
          const name = v.replace(/\s+/g, ' ').slice(0, 255);
          c = { id: `new:${slug}`, slug, name, isNew: true };
          collBySlug.set(slug, c);
          collByName.set(nameKey(v), c);
          collById.set(c.id, c);
        }
      }
      if (c) {
        data.collection_id = c.id;
        if (c.isNew) item.newCollection = c.name;
      }
    }

    for (const k of ['price', 'sale_price']) {
      if (blank(cell(k))) continue;
      const m = parseMoney(cell(k));
      if (!m.ok) item.errors.push(`${LABELS[k]} không hợp lệ: "${cell(k)}"`);
      else data[k] = m.value;
    }
    for (const k of ['is_featured', 'is_active']) {
      if (blank(cell(k))) continue;
      const b = parseBool(cell(k));
      if (!b.ok) item.errors.push(`${LABELS[k]} chỉ nhận 1/0, có/không: "${cell(k)}"`);
      else data[k] = b.value;
    }
    if (!blank(cell('sort_order'))) {
      const n = Number.parseInt(String(cell('sort_order')).trim(), 10);
      if (!Number.isFinite(n)) item.errors.push(`Thứ tự không hợp lệ: "${cell('sort_order')}"`);
      else data.sort_order = n;
    }

    if (!cur) {
      if (!data.name) item.errors.push('Sản phẩm mới cần có tên');
      if (!data.collection_id && blank(cell('collection'))) item.errors.push('Sản phẩm mới cần có bộ sưu tập');
      data.code = item.code;
    }
    const price = data.price !== undefined ? data.price : cur?.price;
    if (data.sale_price != null && price != null && data.sale_price >= price) item.warnings.push('Giá KM không thấp hơn giá bán');

    // ---- images ----
    const cellImages = cell('images');
    let tokens = null;
    if (!blank(cellImages)) {
      if (CLEAR.has(norm(cellImages))) {
        item.imagePlan = 'clear';
      } else {
        tokens = splitImages(cellImages);
        item.imagePlan = 'replace';
      }
    } else {
      const matched = (byCode.get(key) || []).sort((a, b) => a.n - b.n || a.name.localeCompare(b.name));
      if (matched.length) {
        tokens = [...new Set(matched.map((m) => m.name))];
        item.imagePlan = 'replace';
        item.autoMatched = true;
      }
    }

    if (tokens) {
      for (const t of tokens) {
        let img;
        const resMatch = /(?:^|\/)resources\/([^/?#]+)$/i.exec(t.split(/[?#]/)[0]);
        if (resMatch && ctx.resources?.has(resMatch[1])) {
          const res = ctx.resources.get(resMatch[1]);
          img = { kind: 'existing', name: resMatch[1], url: `/resources/${resMatch[1]}`, id: res.id };
          if (res.product_id && res.product_id !== cur?.id) img.copy = true; // belongs to another product -> copy
        } else if (/^https?:\/\//i.test(t)) {
          img = { kind: 'url', name: t, url: t };
        } else if (resMatch) {
          img = { kind: 'missing', name: t };
          item.warnings.push(`Ảnh "${t}" không còn trên máy chủ`);
        } else if (t.includes('/')) {
          img = { kind: 'static', name: t, url: t.startsWith('/') ? t : `/${t}` };
        } else {
          const up = uploads.get(baseName(t).toLowerCase());
          if (up) {
            img = { kind: 'upload', name: up };
            usedUploads.add(up);
          } else {
            img = { kind: 'missing', name: t };
            item.warnings.push(`Chưa chọn file ảnh "${t}"`);
          }
        }
        item.images.push(img);
      }
      // images unchanged? (same existing resources in the same order)
      const curIds = (cur?.images || []).map((i) => i.id);
      if (
        cur &&
        item.images.length === curIds.length &&
        item.images.every((im, i) => im.kind === 'existing' && im.id === curIds[i] && !im.copy)
      ) {
        item.imagePlan = 'keep';
      }
      if (item.imagePlan === 'replace' && !item.images.some((im) => im.kind !== 'missing')) {
        item.imagePlan = 'keep';
        item.warnings.push('Không có ảnh hợp lệ – giữ ảnh hiện tại');
      }
    } else if (item.imagePlan === 'clear' && cur && !(cur.images || []).length && !cur.image_url) {
      item.imagePlan = 'keep';
    }

    // ---- diff ----
    for (const [k, v] of Object.entries(data)) {
      if (k === 'code') continue;
      const from = cur ? cur[k] ?? null : null;
      const num = (x) => x !== null && x !== '' && Number.isFinite(Number(x));
      const same =
        (from == null && v == null) ||
        (from != null && v != null && (String(from) === String(v) || (num(from) && num(v) && Number(from) === Number(v))));
      if (cur && same) {
        delete data[k];
        continue;
      }
      item.changes.push({
        field: k,
        label: LABELS[k],
        from: k === 'collection_id' ? collById.get(from)?.name ?? null : from,
        to: k === 'collection_id' ? collById.get(v)?.name ?? null : v,
      });
    }
    if (item.imagePlan !== 'keep') {
      item.changes.push({
        field: 'images',
        label: 'Ảnh',
        from: cur ? (cur.images || []).length : 0,
        to: item.imagePlan === 'clear' ? 0 : item.images.filter((i) => i.kind !== 'missing').length,
      });
    }

    item.data = data;
    item.collection_name = collById.get(data.collection_id ?? cur?.collection_id)?.name || '';
    if (!item.name && cur) item.name = cur.name;
    if (item.errors.length) item.status = 'error';
    else if (cur && !item.changes.length) item.status = 'unchanged';
  }

  const summary = { total: out.length, create: 0, update: 0, unchanged: 0, error: 0, warnings: 0 };
  for (const it of out) {
    summary[it.status]++;
    if (it.warnings.length) summary.warnings++;
  }
  const columns = Object.keys(map);
  // New collections actually used by importable rows
  const newCollections = [];
  for (const c of collById.values()) {
    if (!c.isNew) continue;
    const rowsUsing = out.filter((it) => it.status !== 'error' && it.data.collection_id === c.id);
    if (rowsUsing.length) newCollections.push({ id: c.id, slug: c.slug, name: c.name, products: rowsUsing.length });
  }
  summary.newCollections = newCollections.length;

  const needed = new Set();
  for (const it of out)
    if (it.status !== 'error' && it.imagePlan === 'replace') for (const im of it.images) if (im.kind === 'upload') needed.add(im.name);
  const unusedImages = [...uploads.values()].filter((n) => !usedUploads.has(n));
  return { header: header.index + 1, columns, rows: out, summary, newCollections, unusedImages, neededUploads: [...needed] };
}

module.exports = { analyzeImport, parseMoney, parseBool, norm, LABELS };
