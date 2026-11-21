const TOKEN_KEY = 'yein_admin_token';
const $ = (s) => document.querySelector(s);
const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('vi-VN').format(n) + ' ₫');
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {}
};

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    setToken(null);
    showLogin();
  }
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

function showLogin() {
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
}
async function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  await loadProducts();
}

// ---- Auth ----
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  const fd = new FormData(e.target);
  try {
    const { token, admin } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
    });
    setToken(token);
    $('#who').textContent = admin.username;
    e.target.reset();
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#btn-logout').addEventListener('click', () => {
  setToken(null);
  showLogin();
});

// ---- Products ----
let products = [];

async function loadProducts() {
  products = await api('/api/admin/products');
  $('#rows').innerHTML = products.length
    ? products
        .map(
          (p) => `
    <tr>
      <td>${p.sort_order}</td>
      <td>${p.image_url ? `<img src="${esc(p.image_url)}" alt="" />` : ''}</td>
      <td>${esc(p.name)}</td>
      <td class="num">${fmt(p.price)}</td>
      <td class="num">${fmt(p.sale_price)}</td>
      <td><span class="badge ${p.is_active ? '' : 'off'}">${p.is_active ? 'Hiện' : 'Ẩn'}</span></td>
      <td class="num">
        <button class="ghost" data-edit="${p.id}">Sửa</button>
        <button class="danger" data-del="${p.id}">Xoá</button>
      </td>
    </tr>`
        )
        .join('')
    : '<tr><td colspan="7" style="color:#888">Chưa có sản phẩm.</td></tr>';
}

const dialog = $('#product-dialog');
const form = $('#product-form');

function openProduct(p) {
  form.reset();
  $('#product-error').textContent = '';
  $('#dialog-title').textContent = p ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
  form.id.value = p?.id ?? '';
  form.name.value = p?.name ?? '';
  form.description.value = p?.description ?? '';
  form.price.value = p?.price ?? '';
  form.sale_price.value = p?.sale_price ?? '';
  form.image_url.value = p?.image_url ?? '';
  form.sort_order.value = p?.sort_order ?? 0;
  form.is_active.checked = p ? !!p.is_active : true;
  dialog.showModal();
}

$('#btn-new').addEventListener('click', () => openProduct(null));
$('#btn-cancel').addEventListener('click', () => dialog.close());

$('#rows').addEventListener('click', async (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  if (editId) openProduct(products.find((p) => String(p.id) === editId));
  if (delId) {
    const p = products.find((x) => String(x.id) === delId);
    if (!window.confirm(`Xoá "${p?.name}"?`)) return;
    try {
      await api(`/api/admin/products/${delId}`, { method: 'DELETE' });
      loadProducts();
    } catch (err) {
      window.alert(err.message);
    }
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: form.name.value,
    description: form.description.value || null,
    price: form.price.value,
    sale_price: form.sale_price.value === '' ? null : form.sale_price.value,
    image_url: form.image_url.value || null,
    sort_order: form.sort_order.value,
    is_active: form.is_active.checked,
  };
  const id = form.id.value;
  try {
    await api(id ? `/api/admin/products/${id}` : '/api/admin/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });
    dialog.close();
    loadProducts();
  } catch (err) {
    $('#product-error').textContent = err.message;
  }
});

// ---- Change password ----
const pwDialog = $('#password-dialog');
$('#btn-password').addEventListener('click', () => {
  $('#password-form').reset();
  $('#password-error').textContent = '';
  pwDialog.showModal();
});
$('#btn-password-cancel').addEventListener('click', () => pwDialog.close());
$('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    pwDialog.close();
    window.alert('Đã đổi mật khẩu');
  } catch (err) {
    $('#password-error').textContent = err.message;
  }
});

// ---- Boot ----
(async () => {
  if (!getToken()) return showLogin();
  try {
    const { admin } = await api('/api/auth/me');
    $('#who').textContent = admin.username;
    showApp();
  } catch {
    showLogin();
  }
})();
