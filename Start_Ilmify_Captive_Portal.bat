@echo off
:: Ilmify Captive Portal Launcher
:: This script runs the captive portal server as Administrator

echo.
echo ========================================
echo    Ilmify - Captive Portal Launcher
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    cd /d "%~dp0"
    python captive_server.py
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%~dp0\" && python captive_server.py && pause' -Verb RunAs"
)

pause
