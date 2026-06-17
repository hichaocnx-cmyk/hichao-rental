@echo off
cd /d "%~dp0"
echo ==========================================
echo  HICHAO Camera Rental - DEPLOY to Vercel
echo ==========================================

if exist ".git\index.lock" del /f /q ".git\index.lock"

echo.
echo [1/5] Safety check (syntax + use-before-define)...
call npm.cmd run check
if errorlevel 1 goto checkerr

echo.
echo [2/5] Build check...
call npm.cmd run build
if errorlevel 1 goto builderr

echo.
echo [3/5] Staging changes...
git add -A

echo [4/5] Committing...
git commit -m "Update HICHAO rental app"

echo [5/5] Pushing to GitHub (Vercel auto-deploy)...
git push origin main

echo.
echo Done. Check status:
echo   https://vercel.com/hichaocnx-5608s-projects/hichao-rental
echo.
pause
exit /b 0

:checkerr
echo.
echo ============================================
echo  SAFETY CHECK FAILED - stopped, nothing pushed.
echo  Fix the listed code issue above, then run again.
echo ============================================
pause
exit /b 1

:builderr
echo.
echo ============================================
echo  BUILD FAILED - stopped, nothing pushed.
echo  Fix the error above, then run again.
echo ============================================
pause
exit /b 1
