@echo off
title Portfolio Website & Admin CMS
cd /d "%~dp0"
echo ===================================================
echo   Portfolio Website & Admin CMS Launcher
echo ===================================================
echo.
echo Starting local web server on http://localhost:3000...
echo.
timeout /t 2 /nobreak >nul
start "" http://localhost:3000/
call .\node.cmd server.js
pause
