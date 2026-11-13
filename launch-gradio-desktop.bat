@echo off
setlocal enabledelayedexpansion
title ClipForge AI - Turbo Studio
color 0b
echo ===================================================
echo       Starting ClipForge AI (Gradio Desktop)
echo ===================================================
echo.
cd /d "%~dp0"

:: 1. Check if server already running on port 7860
netstat -ano | findstr ":7860 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [*] Starting Gradio Studio server on port 7860...
    start /min "ClipForge Gradio Studio" cmd /c "backend\.venv\Scripts\python.exe app.py"
    
    echo [*] Waiting for server to launch...
    powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:7860' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 600 }; exit 1"
) else (
    echo [v] Gradio Studio is already active on port 7860.
)

:: 2. Open ClipForge in standalone App Window Mode
echo [*] Opening ClipForge in App Mode...
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge.exe --app="http://localhost:7860" --window-size=1400,920
    exit /b 0
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome.exe --app="http://localhost:7860" --window-size=1400,920
    exit /b 0
)

start http://localhost:7860
exit /b 0
