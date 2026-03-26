@echo off
echo ============================================
echo   Business Suite - Full Stack Startup
echo ============================================
echo.
echo Starting Backend (Cloudflare Workers on port 8787)...
cd /d "%~dp0backend"
start "Backend - Wrangler" cmd /k "npx wrangler dev --port 8787"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend (Next.js on port 3000)...
cd /d "%~dp0"
start "Frontend - Next.js" cmd /k "npm run dev"

echo.
echo ============================================
echo   Both servers starting...
echo   Backend:  http://localhost:8787
echo   Frontend: http://localhost:3000
echo ============================================
echo.
pause
