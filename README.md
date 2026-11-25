# Yein Landing

Landing page kính YEIN + trang quản trị sản phẩm, giá và bộ sưu tập.

| Phần | Công nghệ | Thư mục |
|---|---|---|
| Frontend | **Vue 3 + Vite + Vue Router** | `frontend/` (code trong `frontend/src`) |
| Backend API | Node.js 22 + Express | `backend/` |
| Database | MySQL 8 | MySQL trên máy (local) hoặc container `db` |

## Dữ liệu: bộ sưu tập, sản phẩm, ảnh

**Database**
- `collections`: bộ sưu tập (slug, tên, mô tả, ảnh bìa, giá chung).
- `products`: sản phẩm, **bắt buộc thuộc 1 bộ sưu tập** (`collection_id`, khoá ngoại; mã `code` không trùng).
- `resources`: ảnh của sản phẩm (nhiều ảnh / sản phẩm, có thứ tự; ảnh đầu tiên là ảnh chính).
  File ảnh lưu trong thư mục **`backend/resources/`** (Docker: volume `resources`), xem ở `/resources/<tên file>`.

**Admin** (`/admin`): thêm / sửa / xoá bộ sưu tập và sản phẩm; khi thêm/sửa sản phẩm chọn bộ sưu tập, tải lên nhiều ảnh,
đổi thứ tự, xoá ảnh. Không xoá được bộ sưu tập còn sản phẩm.

**Nạp dữ liệu từ file** – `scripts/import-catalog.mjs` (chạy trên máy bạn, Node 18+, không cần cài thêm gì):

```bash
node scripts/import-catalog.mjs --dry-run                 # kiểm tra file, không thay đổi gì
node scripts/import-catalog.mjs                           # nạp vào backend local (http://localhost:4000), tài khoản admin lấy từ .env
node scripts/import-catalog.mjs --api https://yein.com.vn --user admin --password <mật khẩu>   # nạp lên VPS
```

- `data/collections.csv`: `slug, name, tagline, description, default_price, sort_order, is_active, cover_image`
- `data/products.csv`: `code, name, series, collection (slug), price, sale_price, is_featured, is_active, sort_order, description, images`
  - `images`: đường dẫn ảnh, nhiều ảnh cách nhau bằng `|`. Tìm trong `frontend/public` và `..\..\yein-landing-full\yein-landing\public`
    (đổi bằng `--images-root <thư mục>`).
- Mở/sửa bằng Excel, lưu dạng **CSV UTF-8**. Chạy lại script = cập nhật (khớp theo `slug` / `code`), không tạo trùng.
  Ảnh chỉ tải lên cho sản phẩm chưa có ảnh (thêm `--replace-images` để tải lại).
- Hiện có 3 bộ sưu tập, 305 sản phẩm với giá theo cột *Giá bán lẻ kiến nghị* của bảng giá.

## Cấu trúc frontend

```
frontend/
├─ index.html              # entry của Vite
├─ vite.config.js          # proxy /api, /resources -> backend :4000 khi dev
├─ public/assets/          # hero.jpg + ảnh 70 sản phẩm (products/*.jpg)
└─ src/
   ├─ main.js, App.vue, router.js
   ├─ api.js               # gọi API (tự gắn Bearer token cho /api/admin/*)
   ├─ auth.js              # trạng thái đăng nhập admin
   ├─ utils.js
   ├─ composables/useSettings.js
   ├─ styles/main.css, admin.css
   ├─ layouts/SiteLayout.vue, AdminLayout.vue
   ├─ components/          # SiteHeader, SiteFooter, ProductCard, ProductModal, PriceTag, ZaloLink, admin/*
   └─ pages/
      ├─ HomePage.vue, CollectionPage.vue, NotFound.vue
      └─ admin/AdminLogin.vue, AdminProducts.vue, AdminCollections.vue, AdminSettings.vue
```

### Routes

| URL | Trang | Auth |
|---|---|---|
| `/` | Trang chủ: sản phẩm bán chạy, 3 bộ sưu tập, Về YEIN, Công nghệ, Đại lý, Liên hệ | – |
| `/san-pham` | Toàn bộ sản phẩm, lọc theo dòng / dòng phụ, tìm mã, sắp xếp giá | – |
| `/bo-suu-tap/:slug` | Catalogue một dòng sản phẩm | – |
| `/ve-yein` | Câu chuyện, nhà thiết kế, lịch sử, giải thưởng, công nghệ, trưng bày | – |
| `/admin/login` | Đăng nhập admin (`POST /api/auth/login`) | – |
| `/admin/products` | Quản lý sản phẩm, giá, bán chạy | ✔ JWT |
| `/admin/collections` | Quản lý bộ sưu tập, giá chung | ✔ JWT |
| `/admin/dealers` | Đại lý đối tác: tên, tỉnh/thành, địa chỉ, điện thoại, Zalo, link bản đồ, giờ mở cửa | ✔ JWT |
| `/admin/settings` | Giá cộng thêm (nâng cấp tròng), thông tin công ty, hotline, Zalo… | ✔ JWT |

Các route `/admin/*` có route guard: chưa đăng nhập → chuyển về `/admin/login`; token được kiểm tra bằng
`GET /api/auth/me`. Trang admin chỉ gọi nhóm API riêng `/api/admin/*` (bắt buộc header `Authorization: Bearer <token>`).

## Chạy local (không Docker) – khi đang code

Cần: Node.js 22, MySQL đã setup bằng `scripts\setup-local-mysql.bat` (có file `.env`).

**Terminal 1 – Backend (API, cổng 4000):**
```bash
cd backend
npm install      # lần đầu
npm run local    # đọc ../.env, tự reload khi sửa code
```

**Terminal 2 – Frontend (Vite, cổng 5173):**
```bash
cd frontend
npm install      # lần đầu
npm run dev
```

Mở **http://localhost:5173** (web) và **http://localhost:5173/admin**. Sửa file trong `frontend/src` là trình duyệt
tự cập nhật (hot reload). Vite tự chuyển `/api` và `/resources` sang backend :4000.

Muốn chỉ chạy 1 cổng: `cd frontend && npm run build`, sau đó backend (`npm run local`) tự phục vụ `frontend/dist`
tại http://localhost:4000.

## Chạy bằng Docker (giống VPS)

```bash
docker compose up -d --build
```
- Web: http://localhost:8080 · Admin: http://localhost:8080/admin
- Container `web` tự build Vue (`frontend/Dockerfile`) rồi phục vụ bằng Nginx. Sửa FE xong chạy lại
  `docker compose up -d --build web`.

## Deploy lên VPS (Ubuntu/Debian)

```bash
ssh root@<IP-VPS>
git clone https://github.com/thinguyen541/yein-landing.git
cd yein-landing
bash scripts/deploy-vps.sh
```

Script tự: tạo swap 2 GB, cài Docker, tạo `.env` với mật khẩu ngẫu nhiên, bật `docker-compose.prod.yml`
(MySQL tiết kiệm RAM, không mở cổng MySQL ra ngoài, giới hạn log), build & chạy ở cổng 80, cài backup DB hằng ngày
lúc 03:00 vào `/root/yein-backups` (giữ 7 ngày). Cuối cùng in ra link web và tài khoản admin.

Cập nhật code mới: `cd yein-landing && bash scripts/deploy-vps.sh` (tự `git pull` rồi build lại).

**Release 1 lệnh từ máy Windows:** `scripts\release.bat "nội dung thay đổi"` – commit + push lên GitHub,
SSH vào VPS, backup database rồi chạy `deploy-vps.sh`. Chỉ hỏi mật khẩu root VPS.

### HTTPS (SSL miễn phí)

1. Ở trang quản lý tên miền, tạo 2 bản ghi **A**: `@` → IP VPS và `www` → IP VPS. Chờ DNS cập nhật (5 phút – vài giờ).
2. Trên VPS: `cd yein-landing && bash scripts/deploy-vps.sh yein.vn` (thay bằng tên miền của bạn).

Script thêm `DOMAIN` vào `.env` và bật `docker-compose.ssl.yml`: **Caddy** đứng trước Nginx, tự lấy và gia hạn chứng chỉ
Let's Encrypt, tự chuyển `http` → `https` và `www` → tên miền chính (`Caddyfile`). Những lần cập nhật sau chỉ cần
`bash scripts/deploy-vps.sh` (không cần nhập lại tên miền).

Dùng Cloudflare: để bản ghi ở chế độ **DNS only** (mây xám) khi lấy chứng chỉ lần đầu; nếu bật proxy (mây cam) thì đặt
SSL/TLS mode là **Full (strict)**.

## MySQL trên máy (Windows)

`.env` có `COMPOSE_FILE=docker-compose.yml;docker-compose.local-mysql.yml` → backend trong Docker kết nối MySQL
trên máy qua `host.docker.internal:3306`, container `db` không chạy. Lần đầu chạy `scripts\setup-local-mysql.bat`
(nhập mật khẩu root MySQL) để tạo database + user theo `.env`. Muốn dùng MySQL trong Docker: xoá dòng `COMPOSE_FILE`.

Lần đầu khởi động, backend tự tạo bảng và tài khoản admin từ `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Sau đó nạp sản phẩm
bằng `node scripts/import-catalog.mjs` (xem mục *Dữ liệu*).

Backup (MySQL trong Docker):
```bash
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" yein' > backup.sql
```

## Trang chủ (luxury)

Bố cục và hiệu ứng theo bản demo khách duyệt: màn hình chờ *Y E I N*, hero dính phóng ảnh theo cuộn, cuộn mượt
([Lenis](https://github.com/darkroomengineering/lenis) – `npm install` sau khi kéo code), ảnh hiện dần / parallax
(`v-reveal`, `v-parallax`), dải chữ chạy, sản phẩm cuộn ngang được ghim (giá lấy từ admin), các khối câu chuyện từng dòng,
thẻ công nghệ xếp chồng. Code: `frontend/src/components/home/`, nội dung: `src/data/stories.js`, `src/data/banners.js`.

## Nhập / xuất Excel (trang Admin → Sản phẩm)

- **⬇ Xuất Excel**: tải toàn bộ sản phẩm ra `.xlsx` (sheet *Sản phẩm* + sheet *Hướng dẫn* liệt kê bộ sưu tập).
  Cột *Ảnh* chứa link ảnh hiện tại → sửa giá rồi nhập lại thì ảnh vẫn giữ nguyên.
- **⬆ Nhập Excel** – 3 bước:
  1. **Tải file**: chọn file `.xlsx`/`.csv` và (nếu có) ảnh – chọn nhiều ảnh hoặc cả thư mục, hoặc kéo thả.
  2. **Xem trước**: từng dòng *Thêm mới / Cập nhật / Không đổi / Lỗi*, giá cũ → mới, ảnh nào khớp, ảnh nào thiếu. Chưa ghi gì vào DB.
  3. **Hoàn thành**: tải các ảnh cần dùng lên (có thanh tiến độ, ảnh > 8MB tự thu nhỏ), ghi vào DB, báo kết quả. Dòng lỗi được bỏ qua.
- Khớp sản phẩm theo **Mã kính**: mã đã có → cập nhật, mã mới → thêm (cần Tên + Bộ sưu tập). Cột *Bộ sưu tập* xuất và nhập theo **tên** (không phân biệt hoa/thường, phải đúng dấu); tên chưa có → **tự tạo mới** (xem trước sẽ báo). Ô trống = giữ nguyên, `-` = xoá giá trị.
  Tiêu đề cột nhận cả tiếng Việt lẫn tiếng Anh (`Mã kính`/`code`, `Giá`/`price`, `Ảnh`/`images`…) và có thể nằm ở dòng 1–15.
- **Ảnh** (ưu tiên từ trên xuống):
  1. Tự ghép theo tên file: `F3714.jpg`, `F3714-2.jpg`, `F3714_3.png`… khi cột *Ảnh* để trống → thay ảnh của F3714.
  2. Cột *Ảnh*: tên file đã chọn, link `https://…` (máy chủ tự tải), hoặc `/resources/…` (ảnh đang có); nhiều ảnh cách nhau `|`.
  3. Cột *Ảnh* trống và không có ảnh trùng mã → giữ ảnh cũ. Ghi `-` → xoá hết ảnh.
- File `.xls` (Excel 97-2003) chưa hỗ trợ: mở bằng Excel và *Lưu thành* `.xlsx`. Tối đa 5000 dòng / lần, file ≤ 10MB.
- Code: `backend/src/lib/xlsx.js` (đọc/ghi xlsx, không cần thư viện), `backend/src/lib/productImport.js` (phân tích),
  `backend/src/routes/importExport.js` (API), `frontend/src/components/admin/ImportWizard.vue` (giao diện).

## API

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | – | `{username, password}` → `{token, admin}` |
| GET | `/api/auth/me` | Bearer | Thông tin admin |
| POST | `/api/auth/change-password` | Bearer | `{currentPassword, newPassword}` |
| GET | `/api/products?featured=1&collection=slug` | – | Sản phẩm đang hiển thị (giá đã tính giá chung) |
| GET | `/api/collections` | – | Danh sách bộ sưu tập + ảnh xem trước |
| GET | `/api/collections/:slug` | – | Chi tiết bộ sưu tập |
| GET | `/api/settings` | – | Thông tin liên hệ |
| GET | `/api/dealers` | – | Đại lý đối tác đang hiển thị |
| GET/POST/PUT/DELETE | `/api/admin/dealers[/:id]` | Bearer | Quản lý đại lý đối tác |
| GET/POST/PUT/DELETE | `/api/admin/products[/:id]` | Bearer | Quản lý sản phẩm (`collection_id` bắt buộc, `image_ids` = danh sách ảnh theo thứ tự) |
| POST | `/api/admin/resources` | Bearer | `{data: "data:image/...;base64,...", name}` → `{id, url}` (lưu file vào `backend/resources`) |
| DELETE | `/api/admin/resources/:id` | Bearer | Xoá ảnh |
| PUT | `/api/admin/products/bulk-price` | Bearer | `{ids: [...], price}` – đặt giá nhiều mẫu |
| POST | `/api/admin/products/bulk-delete` | Bearer | `{ids: [...]}` – xoá nhiều sản phẩm (kèm ảnh) |
| POST | `/api/admin/collections/bulk-delete` | Bearer | `{ids: [...], withProducts}` – xoá nhiều bộ sưu tập; không có `withProducts` thì bỏ qua bộ còn sản phẩm |
| GET/POST/PUT/DELETE | `/api/admin/collections[/:id]` | Bearer | Quản lý bộ sưu tập |
| PUT | `/api/admin/settings` | Bearer | Lưu thông tin liên hệ |
| GET | `/api/admin/import-export/export` | Bearer | Tải file `.xlsx` toàn bộ sản phẩm |
| GET | `/api/admin/import-export/template` | Bearer | Tải file mẫu |
| POST | `/api/admin/import-export/preview` | Bearer | `{fileName, data (base64), imageNames}` → kết quả xem trước từng dòng |
| POST | `/api/admin/import-export/commit` | Bearer | `{fileName, data, uploaded: {"F3714.jpg": resourceId}}` → `{created, updated, unchanged, skipped, errors}` |

Sản phẩm: `code`, `name`, `series`, `collection_id`, `description`, `price` (trống = giá chung), `sale_price`, `image_ids`,
`is_featured`, `is_active`, `sort_order`. Trả về kèm `images` (danh sách ảnh) và `image_url` (ảnh chính).
