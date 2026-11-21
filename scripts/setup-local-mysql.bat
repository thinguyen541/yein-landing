@echo off
setlocal EnableExtensions
REM ============================================================
REM  YEIN - Set up the MySQL installed on this Windows machine
REM  Creates database + user from .env, then starts Docker.
REM  Run: double-click this file (or: scripts\setup-local-mysql.bat)
REM ============================================================
cd /d "%~dp0.."

if not exist ".env" if exist "local.env" (
  ren "local.env" ".env"
  echo [i] Da tao file .env tu local.env
)
if not exist ".env" (
  echo [!] Khong tim thay file .env trong %CD%
  echo     Copy .env.example thanh .env roi chay lai.
  goto :end
)

REM ---- Load .env (KEY=VALUE, skip comments) ----
for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do set "%%A=%%B"
if not defined DB_NAME set "DB_NAME=yein"
if not defined DB_USER set "DB_USER=yein"
if not defined LOCAL_DB_PORT set "LOCAL_DB_PORT=3306"
if not defined DB_PASSWORD (
  echo [!] DB_PASSWORD chua duoc dat trong .env
  goto :end
)

REM ---- Find mysql.exe ----
set "MYSQL="
for /f "delims=" %%P in ('where mysql 2^>nul') do if not defined MYSQL set "MYSQL=%%P"
if not defined MYSQL (
  for /d %%D in ("%ProgramFiles%\MySQL\MySQL Server *") do if exist "%%D\bin\mysql.exe" set "MYSQL=%%D\bin\mysql.exe"
)
if not defined MYSQL (
  echo [!] Khong tim thay mysql.exe.
  echo     Them thu muc bin cua MySQL vao PATH, vi du:
  echo     C:\Program Files\MySQL\MySQL Server 8.0\bin
  goto :end
)
echo Dung MySQL client: "%MYSQL%"
echo.

REM ---- Create database + user (asks for the MySQL root password) ----
echo Nhap mat khau ROOT cua MySQL (mat khau ban dat khi cai MySQL):
"%MYSQL%" -u root -p -h 127.0.0.1 -P %LOCAL_DB_PORT% -e "CREATE DATABASE IF NOT EXISTS `%DB_NAME%` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASSWORD%'; CREATE USER IF NOT EXISTS '%DB_USER%'@'%%' IDENTIFIED BY '%DB_PASSWORD%'; ALTER USER '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASSWORD%'; ALTER USER '%DB_USER%'@'%%' IDENTIFIED BY '%DB_PASSWORD%'; GRANT ALL PRIVILEGES ON `%DB_NAME%`.* TO '%DB_USER%'@'localhost'; GRANT ALL PRIVILEGES ON `%DB_NAME%`.* TO '%DB_USER%'@'%%'; FLUSH PRIVILEGES;"
if errorlevel 1 (
  echo.
  echo [!] Tao database that bai. Kiem tra mat khau root va dich vu MySQL dang chay
  echo     ^(services.msc -^> MySQL80 -^> Start^).
  goto :end
)

REM ---- Verify the new user can log in ----
"%MYSQL%" -u %DB_USER% -p%DB_PASSWORD% -h 127.0.0.1 -P %LOCAL_DB_PORT% -e "SELECT 'OK' AS ket_noi;" %DB_NAME%
if errorlevel 1 (
  echo [!] User %DB_USER% khong dang nhap duoc.
  goto :end
)
echo.
echo [OK] Da tao database "%DB_NAME%" va user "%DB_USER%" tren MySQL local.
echo.

REM ---- Start the website with Docker ----
where docker >nul 2>nul
if errorlevel 1 (
  echo [i] Chua thay Docker. Cai Docker Desktop roi chay: docker compose up -d --build
  goto :end
)
choice /c YN /m "Khoi dong website bang Docker ngay bay gio"
if errorlevel 2 goto :end
docker compose up -d --build
if errorlevel 1 goto :end
echo.
echo Dang cho backend khoi dong...
timeout /t 8 /nobreak >nul
docker compose logs --tail 20 backend
echo.
echo Website : http://localhost:%WEB_PORT%
echo Admin   : http://localhost:%WEB_PORT%/admin   (tai khoan: %ADMIN_USERNAME%, mat khau: ADMIN_PASSWORD trong .env)

:end
echo.
pause
endlocal
