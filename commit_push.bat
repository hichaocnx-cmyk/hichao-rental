@echo off
cd /d "%~dp0"
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo ==========================================
echo  HICHAO - CHECK + BUILD + COMMIT + PUSH
echo ==========================================
echo.

echo [1/4] Safety check...
call npm.cmd run check
if errorlevel 1 ( echo. & echo CHECK FAILED - nothing pushed. Fix code first. & pause & exit /b 1 )

echo.
echo [2/4] Build...
call npm.cmd run build
if errorlevel 1 ( echo. & echo BUILD FAILED - nothing pushed. Fix code first. & pause & exit /b 1 )

echo.
echo [3/4] Commit
set MSG=
set /p MSG="Commit message (Enter = default): "
if "%MSG%"=="" set MSG=Update HICHAO rental app
git add -A
git commit -m "%MSG%"

echo.
echo [4/4] Push to GitHub (Vercel auto-deploy)...
git push origin main
if errorlevel 1 ( echo. & echo RESULT=PUSH_FAILED ) else ( echo. & echo RESULT=PUSH_OK - Vercel deploying )
pause
