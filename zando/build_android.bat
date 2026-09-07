@echo off
REM Zando Android Build Script for Windows
REM Generates both the Release APK and Release AAB (App Bundle)

echo ==========================================
echo  Building Zando Android (APK ^& AAB)
echo  Version: 1.0.3+5
echo ==========================================

cd /d "%~dp0"

echo.
echo [1/4] Cleaning previous builds...
call flutter clean

echo.
echo [2/4] Getting dependencies...
call flutter pub get

echo.
echo [3/4] Building Release APK...
call flutter build apk --release

echo.
echo [4/4] Building Release App Bundle (AAB)...
call flutter build appbundle --release

echo.
echo ==========================================
echo  BUILD SUCCEEDED!
echo ==========================================
echo APK location: build\app\outputs\flutter-apk\app-release.apk
echo AAB location: build\app\outputs\bundle\release\app-release.aab
echo ==========================================
pause
