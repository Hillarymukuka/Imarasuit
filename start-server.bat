@echo off
title Business Suite - Starting Server
echo ========================================
echo    Business Suite WebApp
echo ========================================
echo.
echo Starting development server...
echo.
cd /d "%~dp0"
call npm run dev
pause
