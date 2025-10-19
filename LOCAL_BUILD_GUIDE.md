# Local Build Guide - Robot Framework Keywords Explorer

This guide provides step-by-step instructions for building and testing local versions of the Robot Framework Keywords Explorer extensions for both VSCode and PyCharm/IntelliJ IDEA.

## Table of Contents

- [Prerequisites](#prerequisites)
- [VSCode Extension - Local Build](#vscode-extension---local-build)
- [PyCharm/IntelliJ Plugin - Local Build](#pycharmintellij-plugin---local-build)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For VSCode Extension

- **Node.js**: Version 16.x or higher
- **npm**: Comes with Node.js
- **VSCode**: Version 1.74.0 or higher
- **Git**: For cloning the repository

Install Node.js from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

### For PyCharm Plugin

- **JDK**: Java Development Kit 17 or higher
- **Git**: For cloning the repository
- **Gradle**: Included via Gradle wrapper (no separate installation needed)

Install JDK 17+ from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [Adoptium](https://adoptium.net/)

Verify installation:
```bash
java -version
```

---

## VSCode Extension - Local Build

### 1. Clone the Repository

```bash
git clone https://github.com/haitham-al-mughrabi/rf-browser-keywords.git
cd rf-browser-keywords
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- TypeScript compiler
- VSCode extension types
- ESLint for code quality

### 3. Compile the Extension

```bash
npm run compile
```

This compiles TypeScript source files from `src/` to JavaScript in `out/`

### 4. Package the Extension

Install VSCE (VSCode Extension Manager) globally if not already installed:

```bash
npm install -g @vscode/vsce
```

Create the `.vsix` package:

```bash
npm run package
```

Or using vsce directly:

```bash
vsce package
```

This generates: `robot-framework-keywords-1.0.2.vsix`

### 5. Install the Local Extension

**Method 1: Command Line**
```bash
code --install-extension robot-framework-keywords-1.0.2.vsix
```

**Method 2: VSCode UI**
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu (top-right)
4. Select "Install from VSIX..."
5. Choose the generated `.vsix` file

**Method 3: Development Mode (for testing)**
1. Open the project folder in VSCode
2. Press F5 to launch Extension Development Host
3. A new VSCode window opens with the extension loaded
4. Test the extension in this development instance

### 6. Verify Installation

1. Open a Robot Framework project
2. Look for "Robot Framework" icon in the Activity Bar (left sidebar)
3. Click to open the extension views:
   - Project Keywords
   - Official Keywords
   - Variables
   - Documentation

### VSCode Extension - Available npm Scripts

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npm run package

# Publish to marketplace (requires authentication)
npm run publish

# Lint code
npm run lint

# Run tests
npm run pretest
```

### VSCode Extension - Project Structure

```
rf-browser-keywords/
├── package.json                 # Extension manifest
├── tsconfig.json               # TypeScript configuration
├── .vscodeignore               # Files to exclude from package
├── src/                        # TypeScript source files
│   ├── extension.ts            # Main extension entry point
│   ├── officialKeywordsProvider.ts
│   ├── projectKeywordsProvider.ts
│   ├── variablesProvider.ts
│   └── documentationProvider.ts
├── out/                        # Compiled JavaScript (generated)
│   └── extension.js
├── media/                      # Icons and images
│   └── icon.png
└── robot-framework-keywords-*.vsix  # Packaged extension
```

---

## PyCharm/IntelliJ Plugin - Local Build

### 1. Clone the Repository

```bash
git clone https://github.com/haitham-al-mughrabi/rf-browser-keywords.git
cd rf-browser-keywords
```

### 2. Build the Plugin

**On macOS/Linux:**
```bash
./gradlew build
```

**On Windows:**
```cmd
gradlew.bat build
```

The build process will:
- Compile Kotlin source files
- Process resources
- Generate plugin descriptor
- Create distribution package
- Run verification checks

Build time: ~30-60 seconds (first build may take longer)

### 3. Locate the Built Plugin

The plugin is generated as a ZIP file:

```
build/distributions/robot-framework-keywords-pycharm-1.1.2.zip
```

Size: ~1.6 MB

### 4. Install the Plugin

**Method 1: Install from Disk**
1. Open PyCharm or IntelliJ IDEA
2. Go to:
   - **macOS**: PyCharm → Preferences → Plugins
   - **Windows/Linux**: File → Settings → Plugins
3. Click the ⚙️ (gear icon) at the top
4. Select "Install Plugin from Disk..."
5. Navigate to and select `build/distributions/robot-framework-keywords-pycharm-1.1.2.zip`
6. Click OK
7. Restart the IDE when prompted

**Method 2: Development Mode (for testing)**
```bash
./gradlew runIde
```

This launches a new IDE instance with the plugin pre-installed for testing.

### 5. Verify Installation

1. Restart PyCharm/IntelliJ IDEA
2. Open a Robot Framework project
3. Look for "Robot Framework" tool window (usually on the right sidebar)
4. Or go to: View → Tool Windows → Robot Framework
5. You should see tabs for:
   - Project Keywords
   - Official Keywords
   - Variables
   - Documentation

### PyCharm Plugin - Available Gradle Tasks

```bash
# Build the plugin
./gradlew build

# Build only (faster, no verification)
./gradlew buildPlugin

# Run IDE with plugin installed
./gradlew runIde

# Verify plugin structure
./gradlew verifyPlugin

# Clean build artifacts
./gradlew clean

# Complete clean rebuild
./gradlew clean build

# Run tests
./gradlew test

# List all available tasks
./gradlew tasks
```

### PyCharm Plugin - Project Structure

```
rf-browser-keywords/
├── build.gradle.kts                    # Gradle build configuration
├── settings.gradle.kts                 # Gradle project settings
├── gradle.properties                   # Plugin version/metadata
├── gradlew / gradlew.bat              # Gradle wrapper scripts
│
├── src/main/
│   ├── kotlin/com/haitham/robotframework/
│   │   ├── model/
│   │   │   └── RobotKeyword.kt        # Data models
│   │   ├── services/
│   │   │   └── KeywordService.kt      # Business logic
│   │   ├── ui/
│   │   │   ├── RobotFrameworkToolWindowFactory.kt
│   │   │   └── RobotFrameworkToolWindow.kt
│   │   └── actions/
│   │       ├── InsertKeywordAction.kt
│   │       ├── CopyKeywordAction.kt
│   │       └── RefreshAction.kt
│   │
│   └── resources/
│       ├── META-INF/
│       │   ├── plugin.xml            # Plugin descriptor
│       │   └── pluginIcon.png        # Plugin icon
│       └── icons/
│           └── robot.svg             # Tool window icon
│
└── build/
    └── distributions/
        └── robot-framework-keywords-pycharm-1.1.2.zip  ← PLUGIN FILE
```

### PyCharm Plugin - Technical Details

- **Platform**: IntelliJ Platform 2023.2.5
- **IDE Type**: PC (PyCharm Community Edition)
- **Kotlin Version**: 1.9.21
- **JDK Target**: 17
- **Gradle**: 8.5
- **IntelliJ Plugin SDK**: 1.16.1
- **Compatibility**: Build 232 (2023.2) to 251.* (2025.1)

---

## Quick Reference

### VSCode Extension

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run compile` | Compile TypeScript |
| `npm run watch` | Auto-compile on changes |
| `npm run package` | Create .vsix package |
| `code --install-extension *.vsix` | Install extension |

### PyCharm Plugin

| Command | Purpose |
|---------|---------|
| `./gradlew build` | Build plugin |
| `./gradlew runIde` | Test in development IDE |
| `./gradlew clean` | Clean build artifacts |
| `./gradlew verifyPlugin` | Verify plugin structure |

---

## Troubleshooting

### VSCode Extension Issues

#### Build Errors

**Problem**: `npm install` fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

**Problem**: TypeScript compilation errors
```bash
# Check TypeScript version
npx tsc --version

# Clean and rebuild
rm -rf out/
npm run compile
```

**Problem**: VSCE not found
```bash
# Install VSCE globally
npm install -g @vscode/vsce

# Or use npx
npx vsce package
```

#### Installation Issues

**Problem**: Extension not loading
1. Check VSCode version: Help → About (must be 1.74.0+)
2. Disable other Robot Framework extensions
3. Reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"
4. Check Output panel: View → Output → Select "Robot Framework Keywords"

**Problem**: Extension not appearing in sidebar
1. Check if extension is enabled: Extensions → Search for "Robot Framework"
2. Verify package.json has correct `activationEvents`
3. Try reinstalling from `.vsix` file

### PyCharm Plugin Issues

#### Build Errors

**Problem**: Gradle build fails
```bash
# Clean build
./gradlew clean

# Build with stacktrace for details
./gradlew build --stacktrace

# Refresh Gradle dependencies
./gradlew --refresh-dependencies build
```

**Problem**: Java version mismatch
```bash
# Check Java version (must be 17+)
java -version

# Set JAVA_HOME if needed (macOS/Linux)
export JAVA_HOME=/path/to/jdk-17

# Windows
set JAVA_HOME=C:\path\to\jdk-17
```

**Problem**: Kotlin compilation errors
```bash
# Check Kotlin version in build.gradle.kts
# Should be 1.9.21 or compatible

# Clean and rebuild
./gradlew clean build
```

**Problem**: Plugin verification fails
```bash
# Run verification separately
./gradlew verifyPlugin

# Check build/distributions/ exists
ls -la build/distributions/
```

#### Installation Issues

**Problem**: Plugin not loading in IDE
1. Check IDE version: Help → About (must be 2023.2+)
2. Verify Python plugin is enabled: Settings → Plugins → Python
3. Check IDE logs: Help → Show Log in Finder/Explorer
4. Invalidate caches: File → Invalidate Caches / Restart

**Problem**: Tool window not appearing
1. View → Tool Windows → Robot Framework
2. Check if plugin is enabled: Settings → Plugins
3. Restart IDE after installation

**Problem**: "Plugin is incompatible" error
1. Check IDE version matches plugin requirements (2023.2 to 2025.1)
2. Rebuild plugin with updated version in build.gradle.kts
3. Try in PyCharm instead of IntelliJ IDEA (or vice versa)

### Common Issues (Both Extensions)

#### Keywords Not Appearing

**VSCode:**
1. Click refresh button in Project Keywords panel
2. Check workspace folder is open (not just files)
3. Verify file patterns in settings match your project structure
4. Check Output panel for errors

**PyCharm:**
1. Click refresh button (⟳) in tool window
2. Verify files match scan patterns
3. Check project is properly opened (not just editor)
4. Look for errors in Event Log (bottom-right)

#### Performance Issues

**VSCode:**
1. Reduce scan patterns in extension settings
2. Exclude large directories from workspace
3. Disable auto-scanning if project is very large

**PyCharm:**
1. Adjust scan patterns in plugin settings
2. Use manual refresh instead of automatic scanning
3. Exclude build/dist directories

---

## Testing Your Local Build

### VSCode Extension Testing Checklist

- [ ] Extension loads without errors
- [ ] Tool windows appear in Activity Bar
- [ ] Project keywords are discovered
- [ ] Official keywords library is populated
- [ ] Variables are detected
- [ ] Click to insert keyword works
- [ ] Parameter dialog works
- [ ] Documentation viewer shows details
- [ ] Search/filter functionality works
- [ ] Import statements are added correctly
- [ ] Refresh button updates the tree
- [ ] Copy to clipboard works

### PyCharm Plugin Testing Checklist

- [ ] Plugin installs without errors
- [ ] Tool window appears in sidebar
- [ ] Project keywords are discovered
- [ ] Official keywords library is populated
- [ ] Variables are detected
- [ ] Double-click to insert keyword works
- [ ] Context menu actions work
- [ ] Refresh button updates the tree
- [ ] Notifications appear for actions
- [ ] Plugin works with Robot Framework files
- [ ] Plugin works with Python keyword files

---

## Development Workflow

### Making Changes to VSCode Extension

1. Edit TypeScript files in `src/`
2. Run `npm run watch` for auto-compilation
3. Press F5 in VSCode to launch Extension Development Host
4. Test changes in the development window
5. Reload development window: Ctrl+R / Cmd+R
6. When done, package: `npm run package`

### Making Changes to PyCharm Plugin

1. Edit Kotlin files in `src/main/kotlin/`
2. Run `./gradlew runIde` to test immediately
3. Or build and install: `./gradlew build` then install from disk
4. For rapid testing, use `runIde` as it's faster
5. Check IDE logs for debugging: Help → Show Log

---

## Version Management

### VSCode Extension

Update version in [package.json](package.json):
```json
{
  "version": "1.0.3"
}
```

### PyCharm Plugin

Update version in [build.gradle.kts](build.gradle.kts):
```kotlin
version = "1.1.3"
```

---

## Additional Resources

### VSCode Extension Development

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [VSCE Documentation](https://github.com/microsoft/vscode-vsce)

### IntelliJ Platform Development

- [IntelliJ Platform SDK](https://plugins.jetbrains.com/docs/intellij/welcome.html)
- [Plugin Development Guidelines](https://plugins.jetbrains.com/docs/intellij/plugin-development-guidelines.html)
- [Kotlin UI DSL](https://plugins.jetbrains.com/docs/intellij/kotlin-ui-dsl.html)
- [Publishing Plugins](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)

### Project Resources

- [GitHub Repository](https://github.com/haitham-al-mughrabi/rf-browser-keywords)
- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=Haitham-Al-Mughrabi.robot-framework-keywords)
- [Issue Tracker](https://github.com/haitham-al-mughrabi/rf-browser-keywords/issues)

---

## Summary

This guide covered building local versions of both extensions:

**VSCode Extension:**
1. Install Node.js and dependencies → `npm install`
2. Compile → `npm run compile`
3. Package → `npm run package`
4. Install → `code --install-extension *.vsix`

**PyCharm Plugin:**
1. Install JDK 17+
2. Build → `./gradlew build`
3. Find plugin → `build/distributions/*.zip`
4. Install → Settings → Plugins → Install from Disk

Both extensions are now ready for local testing and development!

---

**Happy Building!** 🚀

For questions or issues, please visit the [GitHub repository](https://github.com/haitham-al-mughrabi/rf-browser-keywords/issues).
