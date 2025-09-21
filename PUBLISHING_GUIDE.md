# Publishing Guide for Robot Framework Keywords Explorer

This guide walks you through publishing your extension to the VS Code Marketplace.

## 📋 Pre-Publishing Checklist

### 1. Complete Package Information
- [ ] Update `publisher` field in package.json with your publisher name
- [ ] Update `author` information
- [ ] Set correct `homepage` and `repository` URLs
- [ ] Verify `version` number (start with 1.0.0 for first release)
- [ ] Add appropriate `keywords` for discoverability

### 2. Create Required Assets
- [ ] Create extension icon (128x128 PNG) and add to `images/icon.png`
- [ ] Take screenshots of key features
- [ ] Update README.md with actual screenshot paths
- [ ] Test all features thoroughly

### 3. Documentation Review
- [ ] Verify README.md is comprehensive and accurate
- [ ] Update CHANGELOG.md with current version
- [ ] Ensure all links work correctly
- [ ] Check grammar and spelling

### 4. Code Quality
- [ ] Remove debug code and console.logs
- [ ] Ensure TypeScript compilation is clean
- [ ] Test extension in clean VS Code environment
- [ ] Verify all commands and features work

## 🔧 Setup for Publishing

### 1. Install VSCE (Visual Studio Code Extension Manager)
```bash
npm install -g vsce
```

### 2. Create Publisher Account
1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with Microsoft account
3. Create a new organization if needed
4. Go to [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
5. Create a new publisher

### 3. Get Personal Access Token
1. In Azure DevOps, go to User Settings > Personal Access Tokens
2. Create new token with:
   - **Name**: VS Code Extension Publishing
   - **Organization**: All accessible organizations
   - **Expiration**: 1 year (or as needed)
   - **Scopes**: Custom defined
   - **Marketplace**: Manage

### 4. Login with VSCE
```bash
vsce login Haitham-Al-Mughrabi
```
Enter your Personal Access Token when prompted.

## 📦 Package and Publish

### 1. Update Package Information
Edit `package.json`:
```json
{
  "publisher": "Haitham-Al-Mughrabi",
  "author": {
    "name": "Haitham Al-Mughrabi",
    "email": "haitham.almughrabi@example.com"
  },
  "homepage": "https://github.com/haitham-al-mughrabi/rf-browser-keywords",
  "repository": {
    "type": "git",
    "url": "https://github.com/haitham-al-mughrabi/rf-browser-keywords.git"
  },
  "bugs": {
    "url": "https://github.com/haitham-al-mughrabi/rf-browser-keywords/issues"
  }
}
```

### 2. Create Extension Icon
Create a 128x128 PNG icon and save as `images/icon.png`, then update package.json:
```json
{
  "icon": "images/icon.png"
}
```

### 3. Take Screenshots
Capture screenshots showing:
- Project Keywords Explorer
- Documentation viewer
- Variables management
- Overall interface

Save in `images/` directory and update README.md paths.

### 4. Final Testing
```bash
# Compile the extension
npm run compile

# Package locally for testing
vsce package

# Install the .vsix file locally to test
code --install-extension robot-framework-keywords-1.0.0.vsix
```

### 5. Publish to Marketplace
```bash
# Publish directly
vsce publish

# Or publish with specific version
vsce publish 1.0.0

# Or publish pre-release
vsce publish --pre-release
```

## 🎯 Post-Publishing Steps

### 1. Verify Listing
1. Check your extension on [VS Code Marketplace](https://marketplace.visualstudio.com/)
2. Verify all information displays correctly
3. Test installation from marketplace
4. Check that all features work in fresh installation

### 2. Promote Your Extension
- Share on social media
- Post in Robot Framework community forums
- Add to your GitHub profile
- Write blog posts about features

### 3. Monitor and Maintain
- Watch for user feedback and issues
- Respond to marketplace reviews
- Plan future updates and features
- Monitor download statistics

## 🔄 Updating Your Extension

### Version Updates
```bash
# Patch version (bug fixes)
vsce publish patch

# Minor version (new features)
vsce publish minor

# Major version (breaking changes)
vsce publish major
```

### Update Process
1. Make your changes
2. Update CHANGELOG.md
3. Test thoroughly
4. Commit changes
5. Publish new version
6. Tag release in Git

## 📊 Marketplace Optimization

### Improve Discoverability
- Use relevant keywords in package.json
- Write clear, searchable description
- Include popular search terms
- Add comprehensive tags

### Enhance Listing
- High-quality screenshots
- Professional icon design
- Detailed feature descriptions
- Clear usage instructions
- Regular updates

### Build Community
- Respond to user feedback
- Fix issues promptly
- Add requested features
- Maintain good documentation

## 🚨 Common Issues and Solutions

### Publishing Errors
- **"Publisher not found"**: Verify publisher name matches exactly
- **"Personal Access Token expired"**: Create new token and login again
- **"Package validation failed"**: Check package.json for required fields

### Icon Issues
- **Icon not displaying**: Ensure icon.png is exactly 128x128 pixels
- **Icon looks blurry**: Use high-quality PNG with transparent background
- **Wrong icon shown**: Clear browser cache and wait for CDN update

### README Problems
- **Images not showing**: Use relative paths and ensure images are included
- **Formatting issues**: Test README rendering on GitHub
- **Broken links**: Verify all URLs are accessible

## 📞 Support Resources

### Official Documentation
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest Reference](https://code.visualstudio.com/api/references/extension-manifest)
- [Marketplace Publisher Portal](https://marketplace.visualstudio.com/manage)

### Community Help
- [VS Code Extension Development Discord](https://discord.gg/vscode-dev)
- [Stack Overflow - vscode-extensions tag](https://stackoverflow.com/questions/tagged/vscode-extensions)
- [GitHub Discussions](https://github.com/microsoft/vscode-discussions)

## ✅ Final Checklist

Before publishing:
- [ ] All personal information updated in package.json
- [ ] Extension icon created and added
- [ ] Screenshots taken and README updated
- [ ] All features tested in clean environment
- [ ] Documentation reviewed and updated
- [ ] Version number set appropriately
- [ ] Publisher account created and verified
- [ ] Personal Access Token obtained
- [ ] VSCE installed and login completed
- [ ] Extension packaged and tested locally

**Ready to publish!** 🚀

Good luck with your extension! Remember that building a successful extension takes time, so be patient and keep improving based on user feedback.