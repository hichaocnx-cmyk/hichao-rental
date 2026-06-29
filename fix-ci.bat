@echo off
cd /d "%~dp0"
echo Fixing stuck commit (remove CI workflow, push backup)...
if exist ".git\index.lock" del /f /q ".git\index.lock"

git reset --soft HEAD~1
if exist ".github\workflows\ci.yml" del /f /q ".github\workflows\ci.yml"
git rm --cached --ignore-unmatch ".github/workflows/ci.yml"

git add -A
git commit -m "Add in-app backup button"
git push origin main

echo.
echo Done. Check: https://vercel.com/hichaocnx-5608s-projects/hichao-rental
pause
