@echo off
REM Build script for VSCode Extension (Windows)
REM Robot Framework Keywords Explorer

setlocal enabledelayedexpansion

echo ========================================
echo   VSCode Extension Build Script
echo   Robot Framework Keywords Explorer
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking prerequisites...
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 16.x or higher from https://nodejs.org/
    exit /b 1
)

echo [OK] Node.js found
node -v
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    exit /b 1
)

echo [OK] npm found
npm -v
echo.

REM Check if VSCE is installed
where vsce >nul 2>&1
if errorlevel 1 (
    echo VSCE (VSCode Extension Manager) not found
    echo Installing @vscode/vsce globally...
    call npm install -g @vscode/vsce
    if errorlevel 1 (
        echo Failed to install VSCE
        echo Trying with npx instead...
        set USE_NPX=true
    ) else (
        echo [OK] VSCE installed successfully
        set USE_NPX=false
    )
) else (
    echo [OK] VSCE found
    set USE_NPX=false
)
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Compile TypeScript
echo Compiling TypeScript...
call npm run compile
if errorlevel 1 (
    echo TypeScript compilation failed
    exit /b 1
)
echo [OK] TypeScript compiled successfully
echo.

REM Package the extension
echo Packaging VSCode extension...
if "!USE_NPX!"=="true" (
    call npx vsce package
) else (
    call vsce package
)

if errorlevel 1 (
    echo.
    echo ========================================
    echo   Build Failed
    echo ========================================
    echo.
    exit /b 1
)

echo.
echo ========================================
echo   Build Successful!
echo ========================================
echo.

REM Find the extension file
for %%f in (*.vsix) do (
    set EXTENSION_FILE=%%f
    set EXTENSION_NAME=%%~nxf
)

if defined EXTENSION_FILE (
    echo Extension Details:
    echo   Name: !EXTENSION_NAME!
    echo   Location: !EXTENSION_FILE!
    echo.
    echo Installation Instructions:
    echo.
    echo Method 1: Command Line
    echo   code --install-extension !EXTENSION_NAME!
    echo.
    echo Method 2: VSCode UI
    echo   1. Open VSCode
    echo   2. Go to Extensions (Ctrl+Shift+X)
    echo   3. Click '...' menu -^> Install from VSIX
    echo   4. Select: !EXTENSION_FILE!
    echo.
    echo Method 3: Development Mode
    echo   1. Open this folder in VSCode
    echo   2. Press F5 to launch Extension Development Host
    echo.
    echo Extension is ready for installation!
) else (
    echo WARNING: Extension file (.vsix) not found
)

endlocal
