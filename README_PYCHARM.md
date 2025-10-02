# Robot Framework Keywords Explorer - PyCharm/IntelliJ Plugin

<p align="center">
  <img src="media/icon.png" alt="Robot Framework Keywords Explorer" width="128" height="128">
</p>

A comprehensive PyCharm/IntelliJ IDEA plugin that supercharges your Robot Framework development with intelligent keyword and variables management, documentation viewing, and project scanning capabilities.

## 🚀 Features

### 📁 **Project Keywords Explorer**
- **Automatic Scanning**: Automatically discovers and indexes all keywords from your project files
- **Smart Organization**: Organizes keywords by library and source file
- **Real-time Updates**: Refreshes keyword list when files change
- **Import Integration**: One-click import of libraries and resources

### 🔧 **Official Keywords Library**
- **BuiltIn Library**: 80+ Robot Framework standard library keywords
- **Browser Library**: Modern web testing with Playwright-based browser automation
- **SeleniumLibrary**: 150+ comprehensive SeleniumLibrary keywords
- **Collections Library**: List and dictionary manipulation keywords
- **String Library**: Text processing and manipulation keywords
- **DateTime Library**: Date and time handling keywords
- **OperatingSystem Library**: File system and OS interaction keywords
- **Process Library**: Process execution and management keywords
- **XML Library**: XML document processing keywords
- **RequestsLibrary**: HTTP API testing keywords

### 📋 **Variables Management**
- **Variable Discovery**: Automatically finds variables from Python and Robot files
- **Smart Insertion**: Insert variables with proper `${variable}` syntax
- **Type Detection**: Identifies variable types (string, list, dict, etc.)
- **File Import**: Import variable files with one click

### 📖 **Interactive Documentation**
- **Keyword Documentation**: View detailed documentation for any keyword
- **Argument Information**: See parameter types, defaults, and descriptions
- **Source Links**: Navigate to keyword source files
- **Copy Documentation**: Export documentation to clipboard

### ⚡ **Productivity Features**
- **One-Click Insert**: Insert keywords with proper Robot Framework syntax
- **Interactive Parameter Input**: Dialog box for modifying default parameter values
- **Smart Templates**: Keywords include parameter placeholders
- **Copy to Clipboard**: Copy keyword calls for use anywhere
- **Search & Filter**: Powerful search across all keywords and variables
- **Quick Import**: One-click library and resource imports
- **Context Menus**: Right-click actions for all operations

## 🛠 Installation

### From JetBrains Marketplace (Coming Soon)
1. Open PyCharm/IntelliJ IDEA
2. Go to Settings/Preferences → Plugins
3. Search for "Robot Framework Keywords Explorer"
4. Click Install

### From Disk (Manual Installation)
1. Download the plugin `.jar` file from releases
2. Open PyCharm/IntelliJ IDEA
3. Go to Settings/Preferences → Plugins
4. Click ⚙️ (gear icon) → Install Plugin from Disk
5. Select the downloaded `.jar` file
6. Restart IDE

## 🔨 Building from Source

### Prerequisites
- JDK 17 or higher
- Git

### Build Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/haitham-al-mughrabi/rf-browser-keywords.git
   cd rf-browser-keywords
   ```

2. **Build the plugin**
   ```bash
   ./gradlew build
   ```
   
   On Windows:
   ```cmd
   gradlew.bat build
   ```

3. **The plugin will be generated in:**
   ```
   build/distributions/robot-framework-keywords-pycharm-1.0.2.zip
   ```

4. **Run in development mode**
   ```bash
   ./gradlew runIde
   ```

### Gradle Tasks

- `./gradlew build` - Build the plugin
- `./gradlew runIde` - Run IDE with the plugin installed
- `./gradlew buildPlugin` - Build plugin distribution
- `./gradlew verifyPlugin` - Verify plugin structure
- `./gradlew test` - Run tests

## 🎯 Quick Start

1. **Open a Robot Framework project** in PyCharm/IntelliJ IDEA
2. **Look for the Robot Framework tool window** (usually on the left sidebar)
3. **Browse keywords** in the Project Keywords, Official Keywords, or Variables tabs
4. **Double-click any keyword** to insert it at your cursor position
5. **Right-click keywords** for additional options

## 📚 Usage Guide

### Tool Window Tabs

The plugin provides four main tabs:

#### 1. Project Keywords
- Shows all keywords discovered in your project
- Organized by library/file
- Supports `.robot`, `.resource`, and `.py` files
- Right-click to insert, copy, or show documentation

#### 2. Official Keywords
- Pre-loaded official Robot Framework libraries
- Browser, SeleniumLibrary, BuiltIn, Collections, String, etc.
- Right-click to import library into current file

#### 3. Variables
- Shows all variables from your project
- Organized by source (Python, Robot, Built-in)
- Double-click to insert with `${variable}` syntax

#### 4. Documentation
- Displays detailed keyword documentation
- Shows arguments, return types, and descriptions
- Updates when you select keywords

### Inserting Keywords

**Method 1: Double-click**
- Double-click any keyword in the tree
- Keyword is inserted at cursor position

**Method 2: Context Menu**
- Right-click keyword → "Insert Keyword"
- Or "Insert with Parameters..." for custom values

**Method 3: Drag and Drop** (Coming Soon)
- Drag keyword from tool window to editor

### Importing Libraries

1. Right-click any library node in Project Keywords or Official Keywords
2. Select "Import Library" or "Import Resource"
3. Import statement is added to the Settings section

### Searching

1. Use the search field at the top of each tab
2. Type to filter keywords/variables in real-time
3. Click ✕ to clear search

## ⚙️ Configuration

### Settings Location
Settings/Preferences → Tools → Robot Framework Keywords

### Available Settings
- **Scan on Project Open**: Automatically scan project when opened
- **Show Icons**: Display icons in tree views
- **Wrap Variables**: Automatically wrap variables with `${}`
- **Scan Patterns**: Configure glob patterns for project scanning

### Default Scan Patterns
```
Libraries/**/*.py
POM/**/*.{robot,resource}
Utilities/**/*.{py,robot,resource}
Resources/**/*.{py,robot,resource}
*.resource
```

## 🎨 Supported File Types

- **Robot Framework**: `.robot`, `.resource`
- **Python Libraries**: `.py` files with Robot Framework keywords
- **Variable Files**: Python and Robot Framework variable files

## 🔧 Development

### Project Structure
```
rf-browser-keywords/
├── src/main/
│   ├── kotlin/com/haitham/robotframework/
│   │   ├── actions/          # Action handlers
│   │   ├── model/            # Data models
│   │   ├── services/         # Business logic
│   │   ├── settings/         # Configuration
│   │   └── ui/               # UI components
│   └── resources/
│       ├── META-INF/
│       │   ├── plugin.xml    # Plugin descriptor
│       │   └── pluginIcon.png
│       └── icons/
│           └── robot.svg
├── build.gradle.kts          # Build configuration
├── settings.gradle.kts       # Gradle settings
└── gradle.properties         # Plugin metadata
```

### Technology Stack
- **Language**: Kotlin 1.9.21
- **Platform**: IntelliJ Platform 2023.2+
- **Build System**: Gradle 8.5
- **Target IDEs**: PyCharm, IntelliJ IDEA (Community & Ultimate)

### Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🐛 Troubleshooting

### Plugin Not Loading?
1. Ensure you're using PyCharm 2023.2 or newer
2. Check if Python plugin is enabled
3. Check IDE logs: Help → Show Log in Finder/Explorer

### Keywords Not Appearing?
1. Click the refresh button (⟳) in the tool window
2. Verify files match scan patterns in settings
3. Check that files have proper Robot Framework syntax

### Build Errors?
1. Ensure JDK 17+ is installed: `java -version`
2. Clean build: `./gradlew clean build`
3. Invalidate caches: File → Invalidate Caches / Restart

### Performance Issues?
1. Adjust scan patterns to exclude large directories
2. Disable automatic scanning in settings
3. Use manual refresh instead

## 📄 License

This plugin is licensed under the [MIT License](LICENSE).

## 🔗 Links

- [GitHub Repository](https://github.com/haitham-al-mughrabi/rf-browser-keywords)
- [Issue Tracker](https://github.com/haitham-al-mughrabi/rf-browser-keywords/issues)
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=Haitham-Al-Mughrabi.robot-framework-keywords)

## 🆕 Version History

### Version 1.0.2
- Interactive parameter input dialog
- Expanded library support (150+ SeleniumLibrary keywords)
- One-click imports for official libraries
- Enhanced search and filtering
- Improved UI and performance

### Version 1.0.1
- Enhanced keyword parameter handling
- Improved library detection
- Bug fixes

### Version 1.0.0
- Initial release
- Project and official keyword management
- Variables discovery
- Documentation viewer
- Basic import functionality

---

**Enjoy using Robot Framework Keywords Explorer for PyCharm!** 🤖✨
