@echo off
setlocal
cd /d "%~dp0"

rem Node/Git may not be on this window's PATH yet (Explorer caches the old
rem environment until you sign out). Add the standard install folders first.
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%ProgramFiles%\Git\bin;%PATH%"

echo ==========================================
echo   HICHAO Camera Rental - DEPLOY to Vercel
echo ==========================================
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock"

where node >nul 2>&1
if errorlevel 1 goto nonode
where git >nul 2>&1
if errorlevel 1 goto nogit
if not exist ".git" goto norepo

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
git diff --cached --quiet
if not errorlevel 1 goto nochange

echo.
echo These files will be deployed:
git diff --cached --name-only
echo.

echo [4/5] Committing...
git commit -m "Update HICHAO rental app (%DATE% %TIME%)"

echo.
echo [5/5] Pushing to GitHub (Vercel auto-deploys)...
git push origin main
if errorlevel 1 goto pusherr

echo.
echo ==========================================
echo   SUCCESS - pushed. Vercel is building now.
echo   https://vercel.com/hichaocnx-5608s-projects/hichao-rental
echo ==========================================
pause
exit /b 0

:nochange
echo.
echo ==========================================
echo   Nothing to deploy - no files changed.
echo ==========================================
pause
exit /b 0

:checkerr
echo.
echo ==========================================
echo   SAFETY CHECK FAILED - nothing was pushed.
echo   Fix the code issue listed above, then run again.
echo ==========================================
pause
exit /b 1

:builderr
echo.
echo ==========================================
echo   BUILD FAILED - nothing was pushed.
echo   Fix the error above, then run again.
echo ==========================================
pause
exit /b 1

:pusherr
echo.
echo ==========================================
echo   PUSH FAILED - the commit was made but not sent.
echo   Usually a GitHub sign-in issue: sign in as
echo   hichaocnx-cmyk in the window that appeared,
echo   then run this file again.
echo ==========================================
pause
exit /b 1

:nonode
echo.
echo Node.js not found. Install from https://nodejs.org then run again.
pause
exit /b 1

:nogit
echo.
echo Git not found. Install from https://git-scm.com then run again.
pause
exit /b 1

:norepo
echo.
echo This folder is not connected to GitHub (no .git folder).
echo Ask Claude to reconnect it before deploying.
pause
exit /b 1
