@echo off
cd /d "%~dp0"
echo START > push_log.txt
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo === CHECK === >> push_log.txt
call npm.cmd run check >> push_log.txt 2>&1
if errorlevel 1 ( echo RESULT=CHECK_FAILED >> push_log.txt & exit )
echo === BUILD === >> push_log.txt
call npm.cmd run build >> push_log.txt 2>&1
if errorlevel 1 ( echo RESULT=BUILD_FAILED >> push_log.txt & exit )
echo === COMMIT === >> push_log.txt
git add -A >> push_log.txt 2>&1
git commit -m "Fix empty data on mobile: AppProvider mounts above the router and fetched before AuthProvider restored the session, so RLS silently returned 200 [] with no error. Gate loading on auth, clear state and cache on logout, and only open realtime when signed in" >> push_log.txt 2>&1
echo === PUSH === >> push_log.txt
git push origin main >> push_log.txt 2>&1
if errorlevel 1 ( echo RESULT=PUSH_FAILED >> push_log.txt ) else ( echo RESULT=PUSH_OK >> push_log.txt )
echo === END === >> push_log.txt
exit
