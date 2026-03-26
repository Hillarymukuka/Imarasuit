@echo off
echo Stopping Backend (Wrangler) processes...
taskkill /F /IM "workerd.exe" 2>nul
taskkill /F /IM "wrangler.exe" 2>nul
echo Backend processes stopped.
pause
