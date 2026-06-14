@echo off
cd /d "%~dp0"
echo ==========================================
echo  HICHAO Camera Rental - DEPLOY to Vercel
echo ==========================================

if exist ".git\index.lock" del /f /q ".git\index.lock"

echo.
echo [1/4] Build check (prevent broken deploy)...
call npm.cmd run build
if errorlevel 1 goto builderr

echo.
echo [2/4] Staging changes...
git add -A

echo [3/4] Committing...
git commit -m "Update HICHAO rental app"

echo [4/4] Pushing to GitHub (Vercel auto-deploy)...
git push origin main

echo.
echo Done. Check status:
echo   https://vercel.com/hichaocnx-5608s-projects/hichao-rental
echo.
pause
exit /b 0

:builderr
echo.
echo ============================================
echo  BUILD FAILED - stopped, nothing pushed.
echo  Fix the error above, then run again.
echo ============================================
pause
exit /b 1
