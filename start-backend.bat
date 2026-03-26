@echo off
echo Starting Business Suite Backend (Cloudflare Workers)...
echo.
cd /d "%~dp0backend"
call npx wrangler dev --port 8787
pause
