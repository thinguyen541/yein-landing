@echo off
REM ============================================================
REM  YEIN - Copy product photos + brand images from the old demo
REM  (E:\Develop\yein-landing-full) into frontend\public
REM  Run once, then commit the copied files.
REM ============================================================
setlocal
set "OLD=E:\Develop\yein-landing-full\yein-landing\public"
cd /d "%~dp0..\frontend\public"

if not exist "%OLD%\catalog" (
  echo [!] Khong tim thay %OLD%\catalog
  echo     Sua bien OLD trong file nay cho dung duong dan source cu.
  goto :end
)

echo Copy anh san pham (catalog) ...
xcopy "%OLD%\catalog" "catalog\" /E /I /Y /Q
echo Copy anh thuong hieu (img) ...
xcopy "%OLD%\img" "img\" /E /I /Y /Q

echo.
echo Xong. Anh nam o frontend\public\catalog va frontend\public\img
:end
echo.
pause
endlocal
