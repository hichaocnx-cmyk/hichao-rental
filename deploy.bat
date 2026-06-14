@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo  HICHAO Camera Rental - DEPLOY to Vercel
echo ==========================================

REM clear stale git lock if any
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo.
echo [1/3] Staging changes...
git add -A

echo [2/3] Committing...
git commit -m "Add HICHAO logo to login, sidebar, topbar, favicon and PWA icons"

echo [3/3] Pushing to GitHub (Vercel will auto-deploy)...
git push origin main

echo.
echo Done. Check deploy status at:
echo   https://vercel.com/hichaocnx-5608s-projects/hichao-rental
echo.
pause
