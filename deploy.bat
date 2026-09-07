@echo off
cd /d "%~dp0"
echo ==========================================
echo  HICHAO Camera Rental - DEPLOY to Vercel
echo ==========================================

if exist ".git\index.lock" del /f /q ".git\index.lock"

rem --- make sure npm/node can be found even if this window's PATH is stale ---
where npm >nul 2>&1
if errorlevel 1 (
  for %%P in (
    "%ProgramFiles%\nodejs"
    "%ProgramFiles(x86)%\nodejs"
    "%APPDATA%\npm"
    "%LOCALAPPDATA%\Programs\nodejs"
    "%LOCALAPPDATA%\nvm"
    "%ProgramFiles%\nvm4w\nodejs"
  ) do (
    if exist "%%~P\npm.cmd" set "PATH=%PATH%;%%~P"
  )
)
where npm >nul 2>&1
if errorlevel 1 goto npmerr

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

:npmerr
echo.
echo ============================================
echo  ไม่พบ npm ในเครื่อง (หรือ path หาย) - หยุดทำงาน ไม่มีอะไรถูก push
echo  ลองรีสตาร์ทเครื่อง 1 ครั้งแล้วรันไฟล์นี้ใหม่
echo  ถ้ายังไม่ได้ ให้เปิด Node.js installer ติดตั้งซ้ำอีกครั้ง
echo ============================================
pause
exit /b 1

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
