# Quick Start Guide - PyCharm Plugin

## 🚀 Installation (2 Minutes)

### Step 1: Locate the Plugin
The plugin file is located at:
```
build/distributions/robot-framework-keywords-pycharm-1.0.2.zip
```

### Step 2: Install in PyCharm
1. Open **PyCharm** or **IntelliJ IDEA**
2. Go to **Settings/Preferences** (⌘, on Mac, Ctrl+Alt+S on Windows/Linux)
3. Select **Plugins** from the left menu
4. Click the **⚙️ gear icon** at the top
5. Select **Install Plugin from Disk...**
6. Navigate to and select `robot-framework-keywords-pycharm-1.0.2.zip`
7. Click **OK**
8. **Restart IDE** when prompted

### Step 3: Verify Installation
1. After restart, open any Robot Framework project
2. Look for **"Robot Framework"** in the right sidebar
3. Click it to open the tool window

## 🎯 First Use

### Viewing Keywords
1. Open the **Robot Framework** tool window
2. Click on **"Project Keywords"** tab to see your project's keywords
3. Click on **"Official Keywords"** tab to see built-in libraries
4. Click on **"Variables"** tab to see your project's variables

### Inserting Keywords
1. Open a `.robot` or `.resource` file
2. Place cursor where you want to insert a keyword
3. In the tool window, find a keyword
4. **Double-click** the keyword
5. The keyword is inserted at your cursor! 🎉

### Refreshing
- Click the **⟳ Refresh** button to re-scan your project
- New files and keywords will be automatically detected

## 📖 Common Tasks

### Insert a BuiltIn Keyword
1. Go to **Official Keywords** tab
2. Expand **BuiltIn** library
3. Double-click **Log** or **Set Variable**
4. Keyword inserted with placeholders: `Log    ${message}`

### Insert a Variable
1. Go to **Variables** tab
2. Find your variable
3. Double-click it
4. Variable inserted with syntax: `${VARIABLE_NAME}`

### Scan New Files
1. Add new `.robot`, `.resource`, or `.py` files to your project
2. Click **⟳ Refresh** in the tool window
3. New keywords/variables appear automatically

## 🔧 Alternative: Run from Source

If you want to test during development:

```bash
cd /Users/TKM-h.almughrabi-c/Documents/rf-browser-keywords
./gradlew runIde
```

This launches a new IDE instance with the plugin pre-installed.

## 🆘 Troubleshooting

### Tool Window Not Visible?
- **View** → **Tool Windows** → **Robot Framework**
- Or check the right sidebar for the Robot Framework icon

### No Keywords Showing?
1. Make sure you have `.robot`, `.resource`, or `.py` files in your project
2. Click the **⟳ Refresh** button
3. Check that files contain proper Robot Framework syntax

### Plugin Not Loading?
1. Ensure you have PyCharm 2023.2 or newer
2. Check: **Settings** → **Plugins** → verify plugin is enabled
3. Try: **File** → **Invalidate Caches / Restart**

## 📚 Learn More

- Full documentation: [README_PYCHARM.md](README_PYCHARM.md)
- Build details: [PYCHARM_BUILD_SUMMARY.md](PYCHARM_BUILD_SUMMARY.md)
- VSCode version: [README.md](README.md)

## 🎉 You're Ready!

The plugin is now installed and ready to boost your Robot Framework development productivity! 

**Tip**: Keep the Robot Framework tool window open on your right sidebar for quick access to keywords while coding.
