# Changelog

All notable changes to the Robot Framework Keywords Explorer extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- **Project Keywords Explorer**: Automatic discovery and indexing of project keywords
- **Official Keywords Library**: Built-in Robot Framework and Browser library keywords
- **Variables Management**: Automatic variable discovery and insertion
- **Interactive Documentation**: Comprehensive keyword documentation viewer
- **One-Click Insert**: Direct keyword insertion with proper syntax
- **Smart Templates**: Parameter placeholders with default values
- **Import Integration**: Automatic library and resource imports
- **Copy to Clipboard**: Copy keyword calls and documentation
- **Custom Keywords**: Add and manage custom keyword definitions
- **Configurable Defaults**: Set default values for common parameters
- **Project Scanning**: Configurable glob patterns for file discovery
- **Real-time Updates**: Automatic refresh when files change
- **Context Menus**: Right-click actions for all major operations
- **Settings Integration**: Full VS Code settings support
- **Multi-format Support**: Robot Framework, Python, and resource files
- **Variable Wrapping**: Automatic `${variable}` syntax handling
- **Source Navigation**: Jump to keyword and variable definitions
- **Tree View Organization**: Hierarchical display of keywords and variables
- **Icon Support**: Visual indicators for different item types

### Features
- Supports Robot Framework `.robot` and `.resource` files
- Python library keyword detection
- Variable file parsing (Python and Robot Framework)
- Automatic workspace scanning
- Customizable scan paths
- Default value configuration
- Documentation export
- Import statement generation
- Settings section management
- Parameter placeholder generation
- Context-aware menus
- Real-time file monitoring

### Configuration Options
- `robotFrameworkKeywords.scanCustomKeywords`: Enable/disable automatic keyword scanning
- `robotFrameworkKeywords.scanVariables`: Enable/disable automatic variable scanning
- `robotFrameworkKeywords.wrapVariables`: Control variable wrapping with `${}`
- `robotFrameworkKeywords.showIcons`: Show/hide icons in tree views
- `robotFrameworkKeywords.projectScanPaths`: Configure file scanning patterns
- `robotFrameworkKeywords.defaultValues`: Set default parameter values
- `robotFrameworkKeywords.customStyle`: Enable custom tree styling

### Supported File Patterns
- `Libraries/**/*.py` - Python library files
- `POM/**/*.{robot,resource}` - Page Object Model files
- `Utilities/**/*.{py,robot,resource}` - Utility files
- `Resources/**/*.{py,robot,resource}` - Resource files
- `*.resource` - Root-level resource files

### Commands
- `rfKeywords.insertKeyword` - Insert keyword at cursor
- `rfKeywords.copyKeyword` - Copy keyword to clipboard
- `rfKeywords.refresh` - Refresh keyword list
- `rfKeywords.addCustomKeyword` - Add custom keyword
- `rfKeywords.editKeywordDefaults` - Edit default values
- `rfKeywords.importFile` - Import library/resource
- `rfVariables.insertVariable` - Insert variable
- `rfVariables.copyVariable` - Copy variable
- `rfVariables.importFile` - Import variable file
- `rfVariables.refresh` - Refresh variables
- `rfDocumentation.showKeywordDoc` - Show documentation
- `rfDocumentation.copyDocumentation` - Copy documentation
- `rfDocumentation.clear` - Clear documentation view

### Initial Release
This is the initial release of Robot Framework Keywords Explorer, providing a comprehensive solution for Robot Framework development in VS Code.