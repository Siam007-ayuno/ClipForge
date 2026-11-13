@echo off
setlocal enabledelayedexpansion
title ClipForge Desktop Launcher

echo ===================================================
echo           Starting ClipForge AI Desktop
echo ===================================================

cd /d "%~dp0"

:: 1. Check & Start Backend (Port 8000)
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [*] Starting ClipForge AI Backend on port 8000...
    start /min "ClipForge Backend" cmd /c "cd /d "%~dp0backend" && .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000"
) else (
    echo [v] Backend is already active on port 8000.
)

:: 2. Check & Start Frontend (Port 3000)
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [*] Starting ClipForge Studio Frontend on port 3000...
    start /min "ClipForge Frontend" cmd /c "cd /d "%~dp0frontend" && npm run start -- -p 3000"
) else (
    echo [v] Frontend is already active on port 3000.
)

:: 3. Wait for Frontend to be ready
echo [*] Waiting for ClipForge services to initialize...
powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 800 }; exit 1"

:: 4. Launch Desktop App Window (No browser address bar / standalone window)
echo [*] Launching ClipForge Desktop window...
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge.exe --app="http://localhost:3000/dashboard" --window-size=1380,900
    exit /b 0
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome.exe --app="http://localhost:3000/dashboard" --window-size=1380,900
    exit /b 0
)

:: Fallback to default browser
start http://localhost:3000/dashboard
exit /b 0
