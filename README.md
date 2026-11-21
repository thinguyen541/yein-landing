# Yein Landing

Landing page + trang quản trị sản phẩm/giá.

| Thành phần | Công nghệ | Thư mục |
|---|---|---|
| Web (landing + admin) | HTML/CSS/JS tĩnh, phục vụ bằng Nginx | `frontend/` |
| API | Node.js 22 + Express | `backend/` |
| Database | MySQL 8 | container `db` |

- Trang chủ: `http://localhost:8080`
- Trang admin: `http://localhost:8080/admin`
- API: `http://localhost:8080/api/...` (Nginx chuyển tiếp sang backend)

## Chạy lần đầu

```bash
cp .env.example .env      # Windows: copy .env.example .env
# Sửa .env: đặt mật khẩu DB, JWT_SECRET, ADMIN_PASSWORD
docker compose up -d --build
```

Lần đầu backend tự tạo bảng và tạo tài khoản admin từ `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
Sau khi đăng nhập, nên vào **Đổi mật khẩu** trong trang admin.

## Cập nhật sau khi sửa code

```bash
git pull
docker compose up -d --build
```

- Sửa `frontend/` → chỉ cần F5 (thư mục được mount trực tiếp vào Nginx).
- Sửa `backend/` → chạy lại `docker compose up -d --build backend`.

### Chế độ dev (backend tự reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Database

MySQL chạy trong container, dữ liệu nằm trong volume `db_data` (không mất khi rebuild).
Từ máy Windows kết nối bằng MySQL Workbench: `localhost:3307`, user/pass theo `.env`
(dùng cổng 3307 để không đụng MySQL đã cài sẵn trên máy ở cổng 3306).

Muốn dùng MySQL cài trên máy thay vì container: bỏ service `db` trong `docker-compose.yml`
và đặt `DB_HOST: host.docker.internal`, `DB_PORT: 3306` cho backend.

Backup:

```bash
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" yein' > backup.sql
```

## API

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | – | `{username, password}` → `{token}` |
| GET | `/api/auth/me` | Bearer | Thông tin admin |
| POST | `/api/auth/change-password` | Bearer | `{currentPassword, newPassword}` |
| GET | `/api/products` | – | Sản phẩm đang hiển thị |
| GET | `/api/admin/products` | Bearer | Tất cả sản phẩm |
| POST | `/api/admin/products` | Bearer | Tạo sản phẩm |
| PUT | `/api/admin/products/:id` | Bearer | Sửa sản phẩm / giá |
| DELETE | `/api/admin/products/:id` | Bearer | Xoá sản phẩm |

Trường sản phẩm: `name`, `description`, `price`, `sale_price`, `image_url`, `is_active`, `sort_order`.
