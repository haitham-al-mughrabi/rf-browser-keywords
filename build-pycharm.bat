@echo off
REM Build script for PyCharm/IntelliJ Plugin (Windows)
REM Robot Framework Keywords Explorer

setlocal enabledelayedexpansion

echo ========================================
echo   PyCharm Plugin Build Script
echo   Robot Framework Keywords Explorer
echo ========================================
echo.

REM Check if Java is installed
echo Checking prerequisites...
where java >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install JDK 17 or higher
    exit /b 1
)

echo [OK] Java found
java -version
echo.

REM Clean previous builds
echo Cleaning previous builds...
call gradlew.bat clean
echo.

REM Build the plugin
echo Building PyCharm plugin...
call gradlew.bat build

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

REM Find the plugin file
for %%f in (build\distributions\*.zip) do (
    set PLUGIN_FILE=%%f
    set PLUGIN_NAME=%%~nxf
)

if defined PLUGIN_FILE (
    echo Plugin Details:
    echo   Name: !PLUGIN_NAME!
    echo   Location: !PLUGIN_FILE!
    echo.
    echo Installation Instructions:
    echo   1. Open PyCharm or IntelliJ IDEA
    echo   2. Go to Settings/Preferences -^> Plugins
    echo   3. Click gear icon -^> Install Plugin from Disk
    echo   4. Select: !PLUGIN_FILE!
    echo   5. Restart the IDE
    echo.
    echo Or test in development mode:
    echo   gradlew.bat runIde
    echo.
    echo Plugin is ready for installation!
) else (
    echo WARNING: Plugin file not found in build\distributions\
)

endlocal
