@echo off
REM ============================================================
REM  YEIN - Nap bo suu tap + san pham + anh vao backend local
REM  Can: backend dang chay (cd backend ^&^& npm run dev)
REM ============================================================
cd /d "%~dp0.."
where node >nul 2>nul || (echo [!] Chua cai Node.js & goto :end)

echo.
echo === Kiem tra file du lieu ===
node scripts\import-catalog.mjs --dry-run
if errorlevel 1 goto :end

echo.
echo === Nap du lieu ===
node scripts\import-catalog.mjs %*

:end
echo.
pause
