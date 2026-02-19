# Auto-Import Feature - Quick Reference

## What Was Implemented

The extension now **automatically imports source files** when you insert keywords or variables into your Robot Framework files.

## How It Works

### Before (Old Behavior)
1. Click to insert a keyword → Keyword inserted
2. You had to manually import the source file

### After (New Behavior)
1. Click to insert a keyword → Source file automatically imported (if not already) → Keyword inserted
2. No manual import needed!

## Import Logic

| Source Type | Import Statement |
|------------|-----------------|
| Python file (.py) with keyword | `Library    path/to/file.py` |
| Robot/Resource file (.robot/.resource) with keyword | `Resource    path/to/file.robot` |
| Python file (.py) with variable | `Variables    path/to/file.py` |
| Robot/Resource file (.robot/.resource) with variable | `Resource    path/to/file.robot` |

## Features

✅ **Automatic Detection** - Detects file type and creates correct import statement
✅ **Duplicate Prevention** - Won't add duplicate imports if file is already imported
✅ **Smart Paths** - Uses relative paths from workspace root
✅ **Settings Section** - Imports are added to `*** Settings ***` section
✅ **All Insert Methods** - Works with:
   - Direct click insert
   - Insert with parameters dialog
   - Variable insertion

## Example

### Before Implementation
```robot
*** Settings ***
# No imports yet

*** Test Cases ***
My Test
    My Keyword    # ERROR: Keyword not found!
```

### After Implementation
```robot
*** Settings ***
Library    Libraries/MyLibrary.py    # Auto-added!

*** Test Cases ***
My Test
    My Keyword    # Works! ✓
```

## No Changes Needed

- No configuration required
- Works automatically with existing insert commands
- Respects existing import detection logic
- Maintains all existing functionality
