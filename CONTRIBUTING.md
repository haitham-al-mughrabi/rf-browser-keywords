# Contributing to Robot Framework Keywords Explorer

Thank you for your interest in contributing to Robot Framework Keywords Explorer! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information** including:
   - VS Code version
   - Extension version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Suggesting Features
1. **Check existing feature requests** to avoid duplicates
2. **Describe the use case** and why the feature would be valuable
3. **Provide mockups or examples** if possible
4. **Consider implementation complexity** and maintenance impact

### Code Contributions

#### Prerequisites
- Node.js (version 16 or higher)
- npm
- VS Code
- TypeScript knowledge
- Familiarity with VS Code extension development

#### Development Setup
1. **Fork the repository**
   ```bash
   git clone https://github.com/haitham-al-mughrabi/rf-browser-keywords.git
   cd rf-browser-keywords
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Open in VS Code**
   ```bash
   code .
   ```

4. **Start development**
   - Press `F5` to launch Extension Development Host
   - Make changes to the code
   - Reload the Extension Development Host to test changes

#### Code Style
- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Use Prettier for code formatting
- **Linting**: Follow ESLint rules
- **Naming**: Use descriptive variable and function names
- **Comments**: Add JSDoc comments for public functions

#### Testing
- **Manual Testing**: Test all changes in the Extension Development Host
- **Edge Cases**: Test with various Robot Framework project structures
- **Performance**: Ensure changes don't impact extension startup time
- **Compatibility**: Test with different VS Code versions

#### Pull Request Process
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the code style guidelines
   - Add appropriate comments
   - Update documentation if needed

3. **Test thoroughly**
   - Test in Extension Development Host
   - Verify all existing functionality still works
   - Test edge cases

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use the PR template
   - Provide clear description of changes
   - Link related issues
   - Add screenshots for UI changes

## 📁 Project Structure

```
rf-browser-keywords/
├── src/
│   └── extension.ts          # Main extension code
├── styles/
│   └── tree-view.css        # Custom styling
├── images/                  # Extension icons and screenshots
├── out/                     # Compiled JavaScript
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript configuration
├── README.md               # Main documentation
├── CHANGELOG.md            # Version history
├── CONTRIBUTING.md         # This file
└── LICENSE                 # MIT license
```

## 🔧 Key Components

### Extension Architecture
- **Tree Data Providers**: Manage keyword and variable trees
- **Command Handlers**: Process user actions
- **File Scanners**: Discover keywords and variables
- **Documentation Provider**: Display keyword information
- **Configuration Manager**: Handle extension settings

### Main Classes
- `RobotFrameworkKeywordProvider`: Manages keyword trees
- `VariablesProvider`: Handles variable discovery
- `DocumentationProvider`: Shows keyword documentation
- `KeywordTreeItem`: Represents individual keywords
- `VariableTreeItem`: Represents variables

## 🎯 Development Guidelines

### Adding New Features
1. **Plan the feature** - Consider user experience and implementation
2. **Update package.json** - Add new commands, views, or settings
3. **Implement the feature** - Follow existing patterns
4. **Add documentation** - Update README and inline comments
5. **Test thoroughly** - Verify functionality and performance

### Modifying Existing Features
1. **Understand current behavior** - Test existing functionality
2. **Make minimal changes** - Avoid breaking existing features
3. **Maintain backward compatibility** - Don't break user configurations
4. **Update tests** - Ensure all scenarios still work

### Performance Considerations
- **Lazy loading** - Load data only when needed
- **Efficient scanning** - Use appropriate file watching and caching
- **Memory management** - Avoid memory leaks in long-running processes
- **Startup time** - Keep extension activation fast

## 📝 Documentation Standards

### Code Documentation
- Use JSDoc comments for all public functions
- Include parameter types and return values
- Provide usage examples for complex functions
- Document any side effects or assumptions

### User Documentation
- Update README.md for new features
- Add configuration examples
- Include screenshots for UI changes
- Update CHANGELOG.md with all changes

## 🐛 Debugging

### Common Issues
- **Keywords not appearing**: Check file scanning patterns
- **Variables not found**: Verify variable file formats
- **Performance issues**: Profile extension startup and operations
- **Import failures**: Check file path resolution

### Debugging Tools
- **VS Code Developer Tools**: Use for debugging extension code
- **Extension Host Logs**: Check Output panel for errors
- **File System Watching**: Monitor file change events
- **Configuration Inspection**: Verify settings are applied correctly

## 📋 Release Process

### Version Numbering
- Follow [Semantic Versioning](https://semver.org/)
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

### Release Checklist
1. Update version in package.json
2. Update CHANGELOG.md
3. Test all functionality
4. Create release notes
5. Tag the release
6. Publish to VS Code Marketplace

## 🙋 Getting Help

### Resources
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Robot Framework Documentation](https://robotframework.org/robotframework/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Contact
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: [your.email@example.com] for private matters

## 📜 Code of Conduct

### Our Standards
- **Be respectful** and inclusive in all interactions
- **Be constructive** in feedback and criticism
- **Be patient** with newcomers and different skill levels
- **Be collaborative** and help others succeed

### Unacceptable Behavior
- Harassment, discrimination, or offensive language
- Personal attacks or trolling
- Spam or off-topic discussions
- Sharing private information without permission

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor statistics

Thank you for contributing to Robot Framework Keywords Explorer! 🤖✨