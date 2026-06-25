@echo off
cd /d "%~dp0"
echo START > deploy_log.txt
echo === CLEAN LOCKS === >> deploy_log.txt
if exist ".git\index.lock" del /f /q ".git\index.lock" >> deploy_log.txt 2>&1
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"  >> deploy_log.txt 2>&1
echo === CHECK === >> deploy_log.txt
call npm.cmd run check >> deploy_log.txt 2>&1
if errorlevel 1 ( echo RESULT=CHECK_FAILED >> deploy_log.txt & goto done )
echo === BUILD === >> deploy_log.txt
call npm.cmd run build >> deploy_log.txt 2>&1
if errorlevel 1 ( echo RESULT=BUILD_FAILED >> deploy_log.txt & goto done )
echo === PUSH === >> deploy_log.txt
git push origin main >> deploy_log.txt 2>&1
if errorlevel 1 ( echo RESULT=PUSH_FAILED >> deploy_log.txt & goto done )
echo RESULT=PUSH_OK >> deploy_log.txt
:done
echo === END === >> deploy_log.txt
exit
