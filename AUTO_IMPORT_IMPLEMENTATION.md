# Auto-Import Implementation for Keyword and Variable Insertion

## Overview
This implementation adds automatic import functionality when inserting keywords and variables into Robot Framework files. When a user inserts a keyword or variable, the extension now automatically checks if the source file is imported and adds the appropriate import statement if needed.

## Changes Made

### 1. New Helper Functions (Lines 251-289)

#### `autoImportForKeyword(item: KeywordTreeItem, editor: vscode.TextEditor)`
- Automatically imports the source file when a keyword is inserted
- **Logic:**
  - Checks if the keyword has a `filePath`
  - Calculates the relative path from workspace root to the source file
  - Determines import type based on file extension:
    - `.py` files → `Library` import
    - `.robot` or `.resource` files → `Resource` import
  - Checks if the import already exists using `checkExistingImport()`
  - If not present, adds the import statement using `insertImportStatement()`

#### `autoImportForVariable(item: VariableTreeItem, editor: vscode.TextEditor)`
- Automatically imports the source file when a variable is inserted
- **Logic:**
  - Checks if the variable has a `filePath`
  - Calculates the relative path from workspace root to the source file
  - Determines import type based on file extension:
    - `.py` files → `Variables` import
    - `.robot` or `.resource` files → `Resource` import
  - Checks if the import already exists using `checkExistingImport()`
  - If not present, adds the import statement using `insertImportStatement()`

### 2. Modified Commands

#### `rfKeywords.insertKeyword` (Line 25)
- **Before:** Direct keyword insertion without import handling
- **After:** 
  - Changed from synchronous to async function
  - Calls `autoImportForKeyword()` before inserting the keyword
  - Ensures the source file is imported before the keyword is used

#### `rfKeywords.insertKeywordWithDialog` (Line 48)
- **Before:** Parameter dialog insertion without import handling
- **After:**
  - Calls `autoImportForKeyword()` before showing the parameter dialog
  - Ensures the source file is imported before the keyword is used

#### `rfVariables.insertVariable` (Line 143)
- **Before:** Direct variable insertion without import handling
- **After:**
  - Changed from synchronous to async function
  - Calls `autoImportForVariable()` before inserting the variable
  - Ensures the source file is imported before the variable is used

## Import Rules

### For Keywords:
- **Python files (.py)** → Imported as `Library`
- **Robot/Resource files (.robot, .resource)** → Imported as `Resource`

### For Variables:
- **Python files (.py)** → Imported as `Variables`
- **Robot/Resource files (.robot, .resource)** → Imported as `Resource`

## Duplicate Prevention
The implementation uses the existing `checkExistingImport()` function to prevent duplicate imports:
- Checks if an import with the same type and path already exists
- Handles path variations (with/without file extensions, relative paths)
- Only adds the import if it doesn't already exist

## User Experience
1. User clicks to insert a keyword or variable
2. Extension automatically checks if the source file is imported
3. If not imported, the import statement is added to the `*** Settings ***` section
4. The keyword/variable is then inserted at the cursor position
5. User sees a single information message confirming the insertion

## Example Scenarios

### Scenario 1: Insert Python Keyword
- User inserts keyword from `Libraries/MyLibrary.py`
- Extension automatically adds: `Library    Libraries/MyLibrary.py`
- Keyword is then inserted

### Scenario 2: Insert Robot Resource Keyword
- User inserts keyword from `Resources/Common.resource`
- Extension automatically adds: `Resource    Resources/Common.resource`
- Keyword is then inserted

### Scenario 3: Insert Python Variable
- User inserts variable from `Variables/config.py`
- Extension automatically adds: `Variables    Variables/config.py`
- Variable is then inserted

### Scenario 4: Already Imported
- User inserts keyword from already imported file
- Extension detects existing import and skips adding duplicate
- Keyword is inserted normally
