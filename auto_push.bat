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
git commit -m "Instant feedback and less traffic: realtime now applies the row from the event payload instead of refetching the whole rentals table (~49KB per change), deliver/return/delete update the UI optimistically with rollback on failure, and the expenses page reads from AppContext instead of fetching its own copy" >> push_log.txt 2>&1
echo === PUSH === >> push_log.txt
git push origin main >> push_log.txt 2>&1
if errorlevel 1 ( echo RESULT=PUSH_FAILED >> push_log.txt ) else ( echo RESULT=PUSH_OK >> push_log.txt )
echo === END === >> push_log.txt
exit
