@echo off
title ZANDO Dev Server Bootstrapper
color 0b
echo =====================================================
echo Starting ZANDO Development Services...
echo =====================================================
echo.

:: Check Python availability
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        python3 --version >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] Python is not installed or not in PATH. Please install Python.
            pause
            exit /b
        ) else (
            set PYTHON_CMD=python3
        )
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

:: Check Node.js availability
set START_PAYMENT=true
node --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js is not installed or not in PATH. Payment Server will not start.
    set START_PAYMENT=false
)

:: Check Java availability (Required for Firebase Emulators)
set START_EMULATOR=true
java -version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Java is not installed or not in PATH. Firebase Emulator will not start.
    set START_EMULATOR=false
)

:: Check Port conflicts
netstat -o -n -a | findstr :3000 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 3000 is already in use. The Web App Server might fail to start.
)

netstat -o -n -a | findstr :4242 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 4242 is already in use. The Payment Server might fail to start.
)

netstat -o -n -a | findstr :5001 | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5001 is already in use. The Firebase Emulator might fail to start.
)

if "%START_PAYMENT%"=="true" (
    echo [1/3] Starting Local Payment Server on port 4242...
    start "ZANDO Payment Server" cmd /k "cd payment-server && node server.js"
) else (
    echo [1/3] Skipping Payment Server - Node.js missing
)

if "%START_EMULATOR%"=="true" (
    echo [2/3] Starting Firebase Emulator on port 5001/4000...
    start "ZANDO Firebase Emulator" cmd /k "cd zando && firebase emulators:start"
) else (
    echo [2/3] Skipping Firebase Emulator - Java missing
)

echo [3/3] Starting Web App Server on port 3000...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Falling back to Python web server...
    start "ZANDO Web App Server" cmd /k "cd /d "%~dp0." && %PYTHON_CMD% web-server.py"
) else (
    start "ZANDO Web App Server" cmd /k "cd /d "%~dp0." && node web-server.js"
)

echo.
echo Waiting a brief moment for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo [INFO] Automatically opening the web app in your default browser...
start http://127.0.0.1:3000

echo =====================================================
echo All services started in separate terminal windows.
echo Keep those terminal windows open while testing the app.
echo =====================================================
pause
