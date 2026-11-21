@echo off
REM ============================================================
REM  YEIN - Remove old files that are no longer used
REM  Run once after updating to the Vue + Vite frontend.
REM ============================================================
cd /d "%~dp0..\frontend"
echo Xoa cac file frontend cu trong %CD% ...
if exist "collection.html" del /q "collection.html" && echo  - collection.html
if exist "admin" rmdir /s /q "admin" && echo  - admin\
if exist "assets" rmdir /s /q "assets" && echo  - assets\  (anh san pham da chuyen sang public\assets)
if exist "src\pages\CollectionPage.vue" del /q "src\pages\CollectionPage.vue" && echo  - src\pages\CollectionPage.vue (da thay bang CatalogPage.vue)
cd /d "%~dp0..\backend\src"
if exist "routes\upload.js" del /q "routes\upload.js" && echo  - backend\src\routes\upload.js (thay bang routes\resources.js)
if exist "seed.json" del /q "seed.json" && echo  - backend\src\seed.json (du lieu da chuyen sang data\*.csv)
echo.
echo Xong. Cau truc moi: frontend\src (code Vue), frontend\public (anh).
pause
