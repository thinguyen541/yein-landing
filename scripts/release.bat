@echo off
rem ============================================================
rem  Release YEIN: commit + push code len GitHub, roi cap nhat VPS
rem  Cach dung:  scripts\release.bat "noi dung thay doi"
rem  (se hoi mat khau root cua VPS khi SSH)
rem ============================================================
setlocal
set VPS=root@45.117.178.140
set APP_DIR=/root/yein-landing
cd /d "%~dp0.."

set "MSG=%~1"
if "%MSG%"=="" set "MSG=Release %date% %time:~0,5%"

echo.
echo ==^> 1/3 Commit code
git add -A
git diff --cached --quiet && (echo     Khong co thay doi moi, bo qua commit) || git commit -m "%MSG%"
if errorlevel 1 goto fail

echo.
echo ==^> 2/3 Push len GitHub
git push
if errorlevel 1 goto fail

echo.
echo ==^> 3/3 Cap nhat VPS (backup DB, git pull, build lai Docker)
ssh %VPS% "cd %APP_DIR% && (bash scripts/backup-db.sh || echo '(backup skipped)') && bash scripts/deploy-vps.sh"
if errorlevel 1 goto fail

echo.
echo ============================================================
echo  Release xong. Mo trang web va bam Ctrl+F5 de tai ban moi.
echo ============================================================
pause
exit /b 0

:fail
echo.
echo [LOI] Release dung lai o buoc tren. Xem thong bao loi phia tren.
pause
exit /b 1
