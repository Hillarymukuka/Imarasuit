@echo off
title Business Suite - Stopping Server
echo ========================================
echo    Stopping Business Suite Server
echo ========================================
echo.
echo Killing all Node.js processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Stopping process ID: %%a
    taskkill /F /PID %%a 2>nul
)
echo.
echo Server stopped.
echo.
pause
