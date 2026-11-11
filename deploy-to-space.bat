@echo off
title Deploy ClipForge AI to Hugging Face
color 0b
echo ===================================================================
echo             ClipForge AI - Free Cloud Web Deployment
echo ===================================================================
echo.
echo Target Hugging Face Space:
echo https://huggingface.co/spaces/SAIFSIAM/ClipForge
echo.
echo Step 1: Open your browser and generate a WRITE Access Token:
echo         https://huggingface.co/settings/tokens
echo.
set /p HF_TOKEN="Step 2: Paste your Hugging Face Token (starts with hf_...): "
if "%HF_TOKEN%"=="" (
    echo.
    echo [ERROR] No token provided. Aborting.
    pause
    exit /b 1
)

echo.
echo [1/2] Configuring git credentials...
cd /d "%~dp0"
git remote set-url space https://SAIFSIAM:%HF_TOKEN%@huggingface.co/spaces/SAIFSIAM/ClipForge

echo [2/2] Pushing ClipForge codebase to Hugging Face Space...
git push --force space main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo   SUCCESS! ClipForge AI has been deployed to Hugging Face!
    echo ===================================================================
    echo.
    echo Your space is now building and will be live at:
    echo https://huggingface.co/spaces/SAIFSIAM/ClipForge
    echo.
) else (
    echo.
    echo [ERROR] Git push failed. Please verify that your token has 'WRITE' permission.
)
echo.
pause
