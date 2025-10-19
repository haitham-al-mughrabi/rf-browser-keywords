@echo off
REM Unified build script for both PyCharm and VSCode extensions (Windows)
REM Robot Framework Keywords Explorer

setlocal enabledelayedexpansion

set BUILD_PYCHARM=false
set BUILD_VSCODE=false
set SHOW_HELP=false

REM Parse command line arguments
if "%~1"=="" (
    set BUILD_PYCHARM=true
    set BUILD_VSCODE=true
) else (
    :parse_args
    if "%~1"=="" goto end_parse
    if /i "%~1"=="--pycharm" set BUILD_PYCHARM=true
    if /i "%~1"=="--vscode" set BUILD_VSCODE=true
    if /i "%~1"=="--all" (
        set BUILD_PYCHARM=true
        set BUILD_VSCODE=true
    )
    if /i "%~1"=="--help" set SHOW_HELP=true
    if /i "%~1"=="-h" set SHOW_HELP=true
    shift
    goto parse_args
    :end_parse
)

REM Show help
if "%SHOW_HELP%"=="true" (
    echo.
    echo Robot Framework Keywords Explorer - Build Script
    echo.
    echo Usage: build-all.bat [OPTIONS]
    echo.
    echo Options:
    echo   --pycharm    Build PyCharm/IntelliJ plugin only
    echo   --vscode     Build VSCode extension only
    echo   --all        Build both extensions (default)
    echo   --help, -h   Show this help message
    echo.
    echo Examples:
    echo   build-all.bat              # Build both extensions
    echo   build-all.bat --pycharm    # Build PyCharm plugin only
    echo   build-all.bat --vscode     # Build VSCode extension only
    echo.
    exit /b 0
)

echo.
echo ========================================
echo   Robot Framework Keywords Explorer
echo   Build All Extensions
echo ========================================
echo.

set BUILD_SUCCESS=true
set PYCHARM_SUCCESS=false
set VSCODE_SUCCESS=false

REM Build PyCharm plugin
if "%BUILD_PYCHARM%"=="true" (
    echo ========================================
    echo   Building PyCharm/IntelliJ Plugin
    echo ========================================
    echo.

    if exist "build-pycharm.bat" (
        call build-pycharm.bat
        if errorlevel 1 (
            set BUILD_SUCCESS=false
            echo [FAILED] PyCharm plugin build failed
        ) else (
            set PYCHARM_SUCCESS=true
            echo [OK] PyCharm plugin built successfully
        )
    ) else (
        echo [ERROR] build-pycharm.bat not found
        set BUILD_SUCCESS=false
    )
    echo.
)

REM Build VSCode extension
if "%BUILD_VSCODE%"=="true" (
    echo ========================================
    echo   Building VSCode Extension
    echo ========================================
    echo.

    if exist "build-vscode.bat" (
        call build-vscode.bat
        if errorlevel 1 (
            set BUILD_SUCCESS=false
            echo [FAILED] VSCode extension build failed
        ) else (
            set VSCODE_SUCCESS=true
            echo [OK] VSCode extension built successfully
        )
    ) else (
        echo [ERROR] build-vscode.bat not found
        set BUILD_SUCCESS=false
    )
    echo.
)

REM Print summary
echo.
echo ========================================
echo   Build Summary
echo ========================================
echo.

if "%BUILD_PYCHARM%"=="true" (
    if "%PYCHARM_SUCCESS%"=="true" (
        for %%f in (build\distributions\*.zip) do (
            echo [OK] PyCharm Plugin: %%~nxf
            echo      Location: %%f
        )
    ) else (
        echo [FAILED] PyCharm Plugin: Build Failed
    )
)

if "%BUILD_VSCODE%"=="true" (
    if "%VSCODE_SUCCESS%"=="true" (
        for %%f in (*.vsix) do (
            echo [OK] VSCode Extension: %%~nxf
            echo      Location: %%f
        )
    ) else (
        echo [FAILED] VSCode Extension: Build Failed
    )
)

echo.

REM Final status
if "%BUILD_SUCCESS%"=="true" (
    echo ========================================
    echo   All Builds Completed Successfully!
    echo ========================================
    echo.

    echo Quick Installation:
    echo.
    if "%PYCHARM_SUCCESS%"=="true" (
        echo PyCharm/IntelliJ:
        echo   Settings -^> Plugins -^> gear icon -^> Install from Disk -^> Select plugin file
        echo.
    )
    if "%VSCODE_SUCCESS%"=="true" (
        echo VSCode:
        for %%f in (*.vsix) do (
            echo   code --install-extension %%~nxf
        )
        echo   OR
        echo   Extensions -^> ... -^> Install from VSIX -^> Select extension file
        echo.
    )

    exit /b 0
) else (
    echo ========================================
    echo   Some Builds Failed
    echo ========================================
    echo.
    echo Please check the error messages above
    echo.
    exit /b 1
)

endlocal
