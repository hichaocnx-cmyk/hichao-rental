@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================
echo  HICHAO Camera Rental - DEV
echo ==============================

if not exist "node_modules" (
  echo Installing dependencies ^(first run^)...
  call npm.cmd install
)

echo.
echo Opening http://localhost:5173/login ...
start "" http://localhost:5173/login

echo Starting Vite dev server... ^(close this window to stop^)
call npm.cmd run dev
pause
