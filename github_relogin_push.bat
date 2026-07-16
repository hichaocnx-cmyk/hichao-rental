@echo off
cd /d "%~dp0"

echo ============================================
echo  STEP 1: Logout GitHub บัญชีเดิม (onezero10studio-CH)
echo ============================================
rem ลบ credential ทุกแบบที่ git อาจเก็บไว้
git credential-manager github logout >nul 2>&1
cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>&1
cmdkey /delete:git:https://github.com >nul 2>&1
(echo protocol=https& echo host=github.com& echo.) | git credential reject >nul 2>&1
echo เรียบร้อย - ออกจากบัญชีเดิมแล้ว
echo.

echo ============================================
echo  STEP 2: Push ขึ้น GitHub
echo  *** จะมีหน้าต่าง Login เด้งขึ้นมา ***
echo  ให้ล็อกอินด้วยบัญชี: hichaocnx-cmyk
echo ============================================
git push origin main
if errorlevel 1 (
  echo.
  echo RESULT=PUSH_FAILED - ลองเช็คว่าล็อกอินถูกบัญชีไหม
) else (
  echo.
  echo RESULT=PUSH_OK - Vercel กำลัง deploy อัตโนมัติ
)
pause
