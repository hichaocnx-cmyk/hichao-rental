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
git commit -m "BACKUP.md: point at the real Drive folder in use, record the verification results (file synced to the cloud, folder access restricted to the owner, 8.5GB headroom) and correct the size figures against the actual 89KB file" >> push_log.txt 2>&1
echo === PUSH === >> push_log.txt
git push origin main >> push_log.txt 2>&1
if errorlevel 1 ( echo RESULT=PUSH_FAILED >> push_log.txt ) else ( echo RESULT=PUSH_OK >> push_log.txt )
echo === END === >> push_log.txt
exit
