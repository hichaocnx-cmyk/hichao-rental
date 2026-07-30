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
git commit -m "Cut Supabase cached egress ~90%%: real stored thumbnails, drop free-plan-incompatible render/image, 1yr cache on backfill, contract/invoice use thumbs; friendly 402 handling + service banner; remove duplicate client auto-process (pg_cron owns it); 18-month rentals window; sessionStorage cache; realtime only rentals+cameras; remove NekoCat/lottie; optimize logo+icons+signature" >> push_log.txt 2>&1
echo === PUSH === >> push_log.txt
git push origin main >> push_log.txt 2>&1
if errorlevel 1 ( echo RESULT=PUSH_FAILED >> push_log.txt ) else ( echo RESULT=PUSH_OK >> push_log.txt )
echo === END === >> push_log.txt
exit
