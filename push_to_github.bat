@echo off
title Push to GitHub
cd /d "%~dp0"
echo ========================================================
echo        Push Portfolio Code to Your GitHub
echo ========================================================
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/portfolio.git): "

if "%REPO_URL%"=="" (
    echo Error: No repository URL entered.
    pause
    exit /b
)

echo.
echo Linking repository to origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Pushing code to GitHub main branch...
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Code successfully pushed to GitHub!
) else (
    echo [NOTE] If you were prompted for credentials, make sure you are signed in to GitHub.
)
echo.
pause
