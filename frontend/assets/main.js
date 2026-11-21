const fmt = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error(res.status);
    const items = await res.json();
    if (!items.length) {
      grid.innerHTML = '<p class="muted">Chưa có sản phẩm.</p>';
      return;
    }
    grid.innerHTML = items
      .map((p) => {
        const onSale = p.sale_price != null && p.sale_price < p.price;
        return `
        <article class="card">
          ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" />` : '<div class="img-ph"></div>'}
          <div class="card-body">
            <h3>${esc(p.name)}</h3>
            ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
            <div class="price">
              ${onSale ? `<span class="old">${fmt(p.price)}</span><span>${fmt(p.sale_price)}</span>` : `<span>${fmt(p.price)}</span>`}
            </div>
          </div>
        </article>`;
      })
      .join('');
  } catch (e) {
    grid.innerHTML = '<p class="muted">Không tải được sản phẩm.</p>';
  }
}

document.getElementById('year').textContent = new Date().getFullYear();
loadProducts();
