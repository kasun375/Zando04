@echo off
title Zando Web Server
echo ===================================================
echo   Starting Zando Web App Server...
echo   Opening http://localhost:3000 in your browser
echo ===================================================
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
node server.js
pause
