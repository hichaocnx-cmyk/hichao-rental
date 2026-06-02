@echo off
echo ==============================
echo  HICHAO.CNX Camera Rental
echo  Starting dev server...
echo ==============================
cd /d "%~dp0"
echo Installing dependencies...
call npm install
echo.
echo Starting Vite dev server...
echo Open: http://localhost:5173
echo.
call npm run dev
pause
