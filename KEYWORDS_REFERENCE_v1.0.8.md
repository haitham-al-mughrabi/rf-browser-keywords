# Official Keywords Reference - PyCharm Plugin v1.0.8

**Build Date:** October 2, 2025  
**Total Keywords:** 115+  
**Libraries:** 10

---

## 📚 Library Overview

| Library | Keywords | Category |
|---------|----------|----------|
| BuiltIn | 18 | Core Framework |
| Browser | 16 | Modern Web Testing |
| SeleniumLibrary | 20 | Traditional Web Testing |
| Collections | 7 | Data Structures |
| String | 6 | Text Manipulation |
| DateTime | 5 | Date/Time Operations |
| OperatingSystem | 13 | File System Operations |
| Process | 8 | Process Management |
| XML | 8 | XML Processing |
| RequestsLibrary | 6 | HTTP/REST API Testing |

---

## 🔧 BuiltIn Library (18 Keywords)

### Logging & Output
- **Log** - Logs the given message with the given level
- **Log To Console** - Logs the given message to console

### Variables
- **Set Variable** - Returns the given values which can then be assigned to variables
- **Set Global Variable** - Makes a variable available globally in all tests and suites

### Assertions
- **Should Be Equal** - Fails if the given objects are unequal
- **Should Not Be Equal** - Fails if the given objects are equal
- **Should Contain** - Fails if container does not contain item
- **Should Be True** - Fails if the given condition is not true

### Timing & Flow Control
- **Sleep** - Pauses the test execution for the given time
- **Wait Until Keyword Succeeds** - Runs the specified keyword and retries if it fails
- **Run Keyword** - Executes the given keyword with the given arguments
- **Run Keyword If** - Runs the given keyword if condition is true

### Test Control
- **Fail** - Fails the test with the given message
- **Pass Execution** - Skips rest of the current test with PASS status

### Utilities
- **Get Time** - Returns the current time in the requested format
- **Evaluate** - Evaluates the given expression in Python and returns the result
- **Create List** - Returns a list containing given items
- **Create Dictionary** - Creates and returns a dictionary from the given items
- **Get Length** - Returns the length of the given item

---

## 🌐 Browser Library (16 Keywords)

### Browser Management
- **New Browser** - Create a new browser instance (chromium/firefox/webkit, headless option)
- **New Context** - Create a new browser context
- **New Page** - Open a new page
- **Close Browser** - Closes the current browser
- **Close Page** - Closes the current page

### Navigation
- **Go To** - Navigate to the given URL

### Element Interaction
- **Click** - Click element identified by selector
- **Fill Text** - Clears and fills the text field identified by selector
- **Type Text** - Types text into the element identified by selector
- **Hover** - Hovers over the element identified by selector

### Element Queries
- **Get Text** - Returns the text content of the element
- **Get Element Count** - Returns the count of elements matching the selector

### Waiting & States
- **Wait For Elements State** - Waits for the element to reach the specified state

### Form Controls
- **Select Options By** - Selects options from a select element

### Screenshots
- **Take Screenshot** - Takes a screenshot of the current page

---

## 🔍 SeleniumLibrary (20 Keywords)

### Browser Management
- **Open Browser** - Opens a new browser instance to the given URL
- **Close Browser** - Closes the current browser
- **Close All Browsers** - Closes all open browsers
- **Maximize Browser Window** - Maximizes the current browser window

### Navigation
- **Go To** - Navigates the current browser window to the given URL

### Element Interaction
- **Click Element** - Click element identified by locator
- **Click Button** - Clicks a button identified by locator
- **Click Link** - Clicks a link identified by locator

### Input Fields
- **Input Text** - Types the given text into text field identified by locator
- **Input Password** - Types the given password into password field
- **Clear Element Text** - Clears the text field identified by locator

### Element Queries
- **Get Text** - Returns the text of the element identified by locator
- **Get Value** - Returns the value attribute of the element

### Assertions
- **Element Should Be Visible** - Verifies that the element is visible
- **Element Should Contain** - Verifies that element contains expected text

### Waiting
- **Wait Until Element Is Visible** - Waits until the element is visible
- **Wait Until Page Contains** - Waits until the page contains the given text

### Form Controls
- **Select From List By Label** - Selects options from selection list by label
- **Select Checkbox** - Selects the checkbox identified by locator

### Screenshots
- **Capture Page Screenshot** - Takes a screenshot of the current page

---

## 📋 Collections Library (7 Keywords)

### List Operations
- **Append To List** - Adds values to the end of list
- **Get From List** - Returns the value from list at the given index
- **Remove From List** - Removes and returns the value at the given index
- **Insert Into List** - Inserts value into list at the specified index
- **Sort List** - Sorts the given list in-place

### List Queries
- **Get Length** - Returns the length of the given item
- **List Should Contain Value** - Fails if the list does not contain the value

---

## 📝 String Library (6 Keywords)

### Case Conversion
- **Convert To Lowercase** - Converts string to lowercase
- **Convert To Uppercase** - Converts string to uppercase

### String Operations
- **Get Substring** - Returns a substring from start index to end index
- **Replace String** - Replaces search string with replace string
- **Split String** - Splits the string using the given separator

### String Assertions
- **Should Start With** - Fails if the string does not start with start string
- **Should End With** - Fails if the string does not end with end string

---

## 📅 DateTime Library (5 Keywords)

### Current Time
- **Get Current Date** - Returns current local or UTC time with an optional increment

### Date Arithmetic
- **Add Time To Date** - Adds time to date and returns the resulting date
- **Subtract Time From Date** - Subtracts time from date and returns the resulting date
- **Subtract Date From Date** - Subtracts date from another date and returns time between

### Date Conversion
- **Convert Date** - Converts between supported date formats

---

## 📁 OperatingSystem Library (13 Keywords)

### Directory Operations
- **Create Directory** - Creates the specified directory
- **Directory Should Exist** - Fails unless the given path points to an existing directory
- **Remove Directory** - Removes the directory pointed by the given path
- **List Directory** - Returns and logs items in a directory

### File Operations
- **Create File** - Creates a file with the given content
- **File Should Exist** - Fails unless the given path points to an existing file
- **Copy File** - Copies the source file into the destination
- **Move File** - Moves the source file into the destination
- **Remove File** - Removes the given file
- **Get File** - Returns the contents of a specified file
- **Append To File** - Appends the given content to the specified file

### Environment Variables
- **Get Environment Variable** - Returns the value of an environment variable
- **Set Environment Variable** - Sets an environment variable to a specified value

---

## ⚙️ Process Library (8 Keywords)

### Process Execution
- **Run Process** - Runs a process and waits for it to complete
- **Start Process** - Starts a new process on background
- **Wait For Process** - Waits for the process to complete or timeout

### Process Control
- **Terminate Process** - Stops the process gracefully
- **Kill Process** - Forcibly stops the process

### Process Queries
- **Get Process Result** - Returns the result object of a process
- **Process Should Be Stopped** - Verifies that the process is not running
- **Process Should Be Running** - Verifies that the process is running

---

## 🗂️ XML Library (8 Keywords)

### XML Parsing
- **Parse XML** - Parses the given XML file or string into an element structure

### Element Queries
- **Get Element** - Returns an element from the source matching the xpath
- **Get Elements** - Returns a list of elements from the source matching the xpath
- **Get Element Text** - Returns the text content of an element
- **Get Element Attribute** - Returns the named attribute of an element

### XML Assertions
- **Element Should Exist** - Verifies that one or more element(s) matching xpath exist
- **Element Text Should Be** - Verifies that the text of an element is as expected

### XML Output
- **Save XML** - Saves the given element into a file

---

## 🌐 RequestsLibrary (6 Keywords)

### Session Management
- **Create Session** - Creates a HTTP session with a server

### HTTP Methods
- **GET On Session** - Sends a GET request on a previously created HTTP Session
- **POST On Session** - Sends a POST request on a previously created HTTP Session
- **PUT On Session** - Sends a PUT request on a previously created HTTP Session
- **DELETE On Session** - Sends a DELETE request on a previously created HTTP Session

### Response Validation
- **Status Should Be** - Fails if response status code is not the expected status

---

## 🎯 Keyword Format

All keywords use the multi-line format with parameter names:

```robot
Wait Until Element Is Visible    
    ...    locator=${}    
    ...    timeout=${5s}    
```

### Features:
- ✅ Multi-line format with `...` continuation
- ✅ Named parameters for clarity
- ✅ Default values shown where applicable
- ✅ Proper indentation
- ✅ Placeholder `${}` for easy fill-in

---

## 📦 Installation

1. Download `robot-framework-keywords-pycharm-1.0.8.zip`
2. Open PyCharm
3. Go to **Settings → Plugins → ⚙️ → Install Plugin from Disk**
4. Select the downloaded ZIP file
5. Restart PyCharm
6. Access via **View → Tool Windows → Robot Framework**

---

## 🔄 Future Updates

See `KEYWORD_AUTO_LOADING.md` for plans on JSON-based keyword auto-loading system that will:
- Enable keyword updates without plugin recompilation
- Allow community contributions
- Sync keywords between VSCode and PyCharm extensions
- Support custom keyword repositories

---

## 📚 Documentation

For complete documentation on each keyword:
- Visit [Robot Framework Documentation](https://robotframework.org/robotframework/)
- Check library-specific docs:
  - [Browser Library](https://marketsquare.github.io/robotframework-browser/)
  - [SeleniumLibrary](https://robotframework.org/SeleniumLibrary/)
  - [BuiltIn](https://robotframework.org/robotframework/latest/libraries/BuiltIn.html)
  - [Collections](https://robotframework.org/robotframework/latest/libraries/Collections.html)
  - [String](https://robotframework.org/robotframework/latest/libraries/String.html)
  - [DateTime](https://robotframework.org/robotframework/latest/libraries/DateTime.html)
  - [OperatingSystem](https://robotframework.org/robotframework/latest/libraries/OperatingSystem.html)
  - [Process](https://robotframework.org/robotframework/latest/libraries/Process.html)
  - [XML](https://robotframework.org/robotframework/latest/libraries/XML.html)
  - [RequestsLibrary](https://marketsquare.github.io/robotframework-requests/)

---

**Plugin Version:** 1.0.8  
**Last Updated:** October 2, 2025  
**Maintainer:** Haitham Al-Mughrabi
