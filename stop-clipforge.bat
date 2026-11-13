@echo off
title Stop ClipForge Services
echo Stopping ClipForge background processes...

powershell -NoProfile -Command "Get-Process -Name 'node','python' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*clipping*' -or $_.CommandLine -like '*app.main*' -or $_.CommandLine -like '*next*' } | Stop-Process -Force"

:: Also kill listening ports 8000 and 3000 if needed
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7860 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [v] All ClipForge services stopped.
pause
