# Build Scripts - Robot Framework Keywords Explorer

Automated build scripts for generating local versions of both PyCharm and VSCode extensions.

## Quick Start

### Build Both Extensions (macOS/Linux)
```bash
./build-all.sh
```

### Build Both Extensions (Windows)
```cmd
build-all.bat
```

---

## Available Scripts

### 1. Build PyCharm Extension Only

**macOS/Linux:**
```bash
./build-pycharm.sh
```

**Windows:**
```cmd
build-pycharm.bat
```

**Output:** `build/distributions/robot-framework-keywords-pycharm-1.1.3.zip`

---

### 2. Build VSCode Extension Only

**macOS/Linux:**
```bash
./build-vscode.sh
```

**Windows:**
```cmd
build-vscode.bat
```

**Output:** `robot-framework-keywords-1.0.2.vsix`

---

### 3. Build All Extensions

**macOS/Linux:**
```bash
# Build both (default)
./build-all.sh

# Build both (explicit)
./build-all.sh --all

# Build PyCharm only
./build-all.sh --pycharm

# Build VSCode only
./build-all.sh --vscode

# Show help
./build-all.sh --help
```

**Windows:**
```cmd
REM Build both (default)
build-all.bat

REM Build both (explicit)
build-all.bat --all

REM Build PyCharm only
build-all.bat --pycharm

REM Build VSCode only
build-all.bat --vscode

REM Show help
build-all.bat --help
```

---

## Prerequisites

### For PyCharm Plugin

- **JDK 17 or higher**
  - Download from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [Adoptium](https://adoptium.net/)
  - Verify: `java -version`

### For VSCode Extension

- **Node.js 16.x or higher**
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node -v` and `npm -v`

- **VSCE (VSCode Extension Manager)**
  - The script will automatically install it if missing
  - Or install manually: `npm install -g @vscode/vsce`

---

## What the Scripts Do

### PyCharm Build Script (`build-pycharm.sh` / `build-pycharm.bat`)

1. ✓ Checks Java installation (JDK 17+)
2. ✓ Cleans previous builds (`./gradlew clean`)
3. ✓ Builds the plugin (`./gradlew build`)
4. ✓ Displays plugin details and installation instructions
5. ✓ **Output:** `build/distributions/robot-framework-keywords-pycharm-1.1.3.zip`

### VSCode Build Script (`build-vscode.sh` / `build-vscode.bat`)

1. ✓ Checks Node.js and npm installation
2. ✓ Checks/installs VSCE if needed
3. ✓ Installs npm dependencies
4. ✓ Compiles TypeScript (`npm run compile`)
5. ✓ Packages extension (`vsce package`)
6. ✓ Displays extension details and installation instructions
7. ✓ **Output:** `robot-framework-keywords-1.0.2.vsix`

### Unified Build Script (`build-all.sh` / `build-all.bat`)

1. ✓ Supports command-line options (--pycharm, --vscode, --all)
2. ✓ Runs selected build scripts
3. ✓ Displays comprehensive build summary
4. ✓ Shows installation quick reference
5. ✓ Reports build time and success/failure status

---

## Installation After Build

### PyCharm/IntelliJ Plugin

**From Built File:**
1. Open PyCharm or IntelliJ IDEA
2. Go to Settings/Preferences → Plugins
3. Click ⚙️ (gear icon) → Install Plugin from Disk
4. Select: `build/distributions/robot-framework-keywords-pycharm-1.1.3.zip`
5. Restart the IDE

**Development Mode (for testing):**
```bash
./gradlew runIde
```
This launches a new IDE instance with the plugin pre-loaded.

### VSCode Extension

**Method 1: Command Line**
```bash
code --install-extension robot-framework-keywords-1.0.2.vsix
```

**Method 2: VSCode UI**
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Click "..." menu → Install from VSIX
4. Select the `.vsix` file
5. Reload VSCode

**Method 3: Development Mode (for testing)**
1. Open this folder in VSCode
2. Press F5 to launch Extension Development Host

---

## Features

### Color-Coded Output
- 🔵 Blue: Information
- 🟢 Green: Success
- 🟡 Yellow: Warnings
- 🔴 Red: Errors

### Automatic Checks
- ✓ Prerequisites verification (Java, Node.js, npm)
- ✓ Automatic VSCE installation if missing
- ✓ Build success/failure detection
- ✓ File size and location reporting

### Smart Error Handling
- ✓ Exit on first error
- ✓ Clear error messages
- ✓ Helpful troubleshooting tips

### Build Summary
- ✓ Lists all built extensions
- ✓ Shows file locations
- ✓ Displays total build time
- ✓ Provides installation quick reference

---

## Troubleshooting

### PyCharm Build Issues

**Java not found:**
```bash
# macOS/Linux - Set JAVA_HOME
export JAVA_HOME=/path/to/jdk-17

# Windows - Set JAVA_HOME
set JAVA_HOME=C:\path\to\jdk-17
```

**Gradle build fails:**
```bash
# Clean and rebuild
./gradlew clean build --stacktrace
```

**Permission denied (macOS/Linux):**
```bash
chmod +x build-pycharm.sh
chmod +x build-all.sh
```

### VSCode Build Issues

**Node.js not found:**
- Download and install from [nodejs.org](https://nodejs.org/)
- Restart terminal after installation

**VSCE installation fails:**
```bash
# Try with npx instead
npx vsce package
```

**TypeScript compilation errors:**
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json out/
npm install
npm run compile
```

**npm install fails:**
```bash
# Clear npm cache
npm cache clean --force
npm install
```

---

## Script Output Examples

### Successful Build Output

```
========================================
  PyCharm Plugin Build Script
  Robot Framework Keywords Explorer
========================================

Checking prerequisites...
✓ Java found: openjdk version "17.0.15" 2025-04-15

Cleaning previous builds...
BUILD SUCCESSFUL in 553ms

Building PyCharm plugin...
BUILD SUCCESSFUL in 8s

========================================
  Build Successful! ✓
========================================

Plugin Details:
  Name: robot-framework-keywords-pycharm-1.1.3.zip
  Size: 1.7M
  Location: build/distributions/robot-framework-keywords-pycharm-1.1.3.zip

Installation Instructions:
  1. Open PyCharm or IntelliJ IDEA
  2. Go to Settings/Preferences → Plugins
  3. Click ⚙️ → Install Plugin from Disk
  4. Select: build/distributions/robot-framework-keywords-pycharm-1.1.3.zip
  5. Restart the IDE

Or test in development mode:
  ./gradlew runIde

Plugin version 1.1.3 is ready for installation!
```

---

## Advanced Usage

### Clean Build

**PyCharm:**
```bash
./gradlew clean build
```

**VSCode:**
```bash
rm -rf node_modules out/ *.vsix
npm install
npm run compile
vsce package
```

### Build for Specific Platform

The scripts automatically detect your platform and use the appropriate commands.

### Continuous Integration

These scripts can be used in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Build PyCharm Plugin
  run: ./build-pycharm.sh

- name: Build VSCode Extension
  run: ./build-vscode.sh

- name: Upload Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: extensions
    path: |
      build/distributions/*.zip
      *.vsix
```

---

## File Descriptions

| File | Purpose | Platform |
|------|---------|----------|
| `build-pycharm.sh` | Build PyCharm plugin | macOS/Linux |
| `build-pycharm.bat` | Build PyCharm plugin | Windows |
| `build-vscode.sh` | Build VSCode extension | macOS/Linux |
| `build-vscode.bat` | Build VSCode extension | Windows |
| `build-all.sh` | Build both extensions | macOS/Linux |
| `build-all.bat` | Build both extensions | Windows |

---

## Version Information

The build scripts automatically include version information from:
- **PyCharm**: `build.gradle.kts` → `version = "1.1.3"`
- **VSCode**: `package.json` → `"version": "1.0.2"`

To update versions, edit these files before building.

---

## Benefits of Using Build Scripts

✅ **Automated Process** - No need to remember multiple commands
✅ **Prerequisites Checking** - Verifies Java, Node.js, npm, VSCE
✅ **Error Detection** - Clear error messages and exit codes
✅ **Installation Help** - Shows exact installation steps
✅ **Cross-Platform** - Works on macOS, Linux, and Windows
✅ **Color Output** - Easy to read status messages
✅ **Time Tracking** - Shows total build time
✅ **Flexible Options** - Build one or both extensions

---

## Support

For issues or questions:
- [GitHub Issues](https://github.com/haitham-al-mughrabi/rf-browser-keywords/issues)
- [Main README](README.md)
- [Local Build Guide](LOCAL_BUILD_GUIDE.md)

---

**Happy Building!** 🚀
