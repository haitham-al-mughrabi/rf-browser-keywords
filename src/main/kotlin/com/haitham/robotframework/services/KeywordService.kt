package com.haitham.robotframework.services

import com.haitham.robotframework.model.KeywordArgument
import com.haitham.robotframework.model.RobotKeyword
import com.haitham.robotframework.model.RobotVariable
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import java.io.File
import java.util.concurrent.ConcurrentHashMap

@Service(Service.Level.PROJECT)
class KeywordService(private val project: Project) {
    
    private val projectKeywords = ConcurrentHashMap<String, RobotKeyword>()
    private val officialKeywords = ConcurrentHashMap<String, RobotKeyword>()
    private val variables = ConcurrentHashMap<String, RobotVariable>()

    init {
        loadOfficialKeywords()
    }
    
    fun getProjectKeywords(): List<RobotKeyword> = projectKeywords.values.toList()
    fun getOfficialKeywords(): List<RobotKeyword> = officialKeywords.values.toList()
    fun getVariables(): List<RobotVariable> = variables.values.toList()
    
    fun refreshKeywords() {
        projectKeywords.clear()
        variables.clear()
        scanProjectKeywords()
        scanProjectVariables()
    }
    
    private fun scanProjectKeywords() {
        project.baseDir?.let { baseDir ->
            scanRobotFiles(baseDir)
            scanPythonFiles(baseDir)
        }
    }
    
    private fun scanRobotFiles(dir: VirtualFile) {
        dir.children?.forEach { file ->
            when {
                file.isDirectory -> scanRobotFiles(file)
                file.extension in listOf("robot", "resource") -> {
                    val content = String(file.contentsToByteArray())
                    parseRobotKeywords(content, file.path).forEach { keyword ->
                        projectKeywords[keyword.name] = keyword
                    }
                }
            }
        }
    }
    
    private fun scanPythonFiles(dir: VirtualFile) {
        dir.children?.forEach { file ->
            when {
                file.isDirectory -> scanPythonFiles(file)
                file.extension == "py" -> {
                    val content = String(file.contentsToByteArray())
                    parsePythonKeywords(content, file.path).forEach { keyword ->
                        projectKeywords[keyword.name] = keyword
                    }
                }
            }
        }
    }
    
    private fun scanProjectVariables() {
        project.baseDir?.let { baseDir ->
            scanVariablesInDir(baseDir)
        }
    }
    
    private fun scanVariablesInDir(dir: VirtualFile) {
        dir.children?.forEach { file ->
            when {
                file.isDirectory -> scanVariablesInDir(file)
                file.extension in listOf("robot", "resource", "py") -> {
                    val content = String(file.contentsToByteArray())
                    val vars = when (file.extension) {
                        "py" -> parsePythonVariables(content, file.path)
                        else -> parseRobotVariables(content, file.path)
                    }
                    vars.forEach { variable ->
                        variables[variable.name] = variable
                    }
                }
            }
        }
    }
    
    private fun parseRobotKeywords(content: String, filePath: String): List<RobotKeyword> {
        val keywords = mutableListOf<RobotKeyword>()
        val lines = content.lines()
        var inKeywordsSection = false
        val fileName = File(filePath).nameWithoutExtension

        for (i in lines.indices) {
            val line = lines[i].trim()
            
            if (line.matches(Regex("\\*+\\s*Keywords?\\s*\\*+", RegexOption.IGNORE_CASE))) {
                inKeywordsSection = true
                continue
            }
            
            if (line.matches(Regex("\\*+\\s*(Test Cases?|Variables?|Settings?)\\s*\\*+", RegexOption.IGNORE_CASE))) {
                inKeywordsSection = false
                continue
            }
            
            if (inKeywordsSection && line.isNotEmpty() && !line.startsWith("#") && 
                lines[i].isNotEmpty() && !lines[i].first().isWhitespace()) {
                
                // Extract arguments from [Arguments] tag
                val argsList = mutableListOf<String>()
                var j = i + 1
                while (j < lines.size) {
                    val nextLine = lines[j].trim()
                    if (nextLine.startsWith("[Arguments]", ignoreCase = true)) {
                        val argsLine = nextLine.substringAfter("[Arguments]", "").trim()
                        if (argsLine.isNotEmpty()) {
                            argsList.addAll(argsLine.split(Regex("\\s+")).filter { it.isNotEmpty() })
                        }
                        j++
                        while (j < lines.size && lines[j].trim().startsWith("...")) {
                            val contLine = lines[j].trim().removePrefix("...").trim()
                            if (contLine.isNotEmpty()) {
                                argsList.addAll(contLine.split(Regex("\\s+")).filter { it.isNotEmpty() })
                            }
                            j++
                        }
                        break
                    } else if (lines[j].isNotEmpty() && !lines[j].first().isWhitespace() && !nextLine.startsWith("[")) {
                        break
                    }
                    j++
                }
                
                // Parse arguments with default values
                val args = argsList.map { arg ->
                    val parts = arg.split("=", limit = 2)
                    val paramName = parts[0].trim().removePrefix("\${").removeSuffix("}")
                    val defaultValue = if (parts.size > 1) parts[1].trim() else null
                    KeywordArgument(
                        name = paramName,
                        defaultValue = defaultValue,
                        required = defaultValue == null
                    )
                }
                
                // Build multi-line implementation
                val implementation = if (args.isNotEmpty()) {
                    buildString {
                        append(line)
                        append("    ")
                        args.forEach { arg ->
                            append("\n    ...    ${arg.name}=\${")
                            if (arg.defaultValue != null) {
                                append(arg.defaultValue)
                            }
                            append("}    ")
                        }
                    }
                } else {
                    line
                }
                
                keywords.add(RobotKeyword(
                    name = line,
                    implementation = implementation,
                    library = fileName,
                    description = "Robot keyword from $fileName",
                    source = "robot",
                    filePath = filePath,
                    folderPath = computeFolderPath(filePath),
                    fileType = "resource"
                ))
            }
        }
        
        return keywords
    }
    
    private fun parsePythonKeywords(content: String, filePath: String): List<RobotKeyword> {
        val keywords = mutableListOf<RobotKeyword>()
        val lines = content.lines()
        val fileName = File(filePath).nameWithoutExtension

        for (line in lines) {
            val trimmed = line.trim()
            if (trimmed.startsWith("def ") && !trimmed.contains("__")) {
                val functionName = trimmed.substringAfter("def ").substringBefore("(").trim()
                val paramsString = trimmed.substringAfter("(").substringBefore(")").trim()
                
                // Parse parameters with default values
                val args = if (paramsString.isNotBlank()) {
                    paramsString.split(",")
                        .map { it.trim() }
                        .filter { it.isNotEmpty() && it != "self" && it != "cls" && !it.startsWith("*") }
                        .map { param ->
                            val parts = param.split("=", limit = 2)
                            val paramName = parts[0].split(":")[0].trim()
                            val defaultValue = if (parts.size > 1) {
                                parts[1].trim().removeSurrounding("\"").removeSurrounding("'")
                            } else {
                                null
                            }
                            KeywordArgument(
                                name = paramName,
                                defaultValue = defaultValue,
                                required = defaultValue == null
                            )
                        }
                } else {
                    emptyList()
                }
                
                val keywordName = functionName.replace('_', ' ')
                    .replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                
                // Build multi-line implementation
                val implementation = if (args.isNotEmpty()) {
                    buildString {
                        append(keywordName)
                        append("    ")
                        args.forEach { arg ->
                            append("\n    ...    ${arg.name}=\${")
                            if (arg.defaultValue != null) {
                                append(arg.defaultValue)
                            }
                            append("}    ")
                        }
                    }
                } else {
                    keywordName
                }
                
                keywords.add(RobotKeyword(
                    name = keywordName,
                    implementation = implementation,
                    library = fileName,
                    description = "Python keyword from $fileName.py",
                    arguments = args,
                    source = "python",
                    filePath = filePath,
                    folderPath = computeFolderPath(filePath),
                    fileType = "python"
                ))
            }
        }
        
        return keywords
    }
    
    private fun parseRobotVariables(content: String, filePath: String): List<RobotVariable> {
        val vars = mutableListOf<RobotVariable>()
        val lines = content.lines()
        var inVariablesSection = false
        
        for (line in lines) {
            val trimmed = line.trim()
            
            if (trimmed.matches(Regex("\\*+\\s*Variables?\\s*\\*+", RegexOption.IGNORE_CASE))) {
                inVariablesSection = true
                continue
            }
            
            if (inVariablesSection && trimmed.matches(Regex("\\*+\\s*(Test Cases?|Keywords?|Settings?)\\s*\\*+", RegexOption.IGNORE_CASE))) {
                break
            }
            
            if (inVariablesSection && trimmed.isNotEmpty() && !trimmed.startsWith("#")) {
                val parts = trimmed.split("\\s+".toRegex(), 2)
                if (parts.isNotEmpty()) {
                    vars.add(RobotVariable(
                        name = parts[0],
                        value = if (parts.size > 1) parts[1] else "",
                        source = "robot",
                        filePath = filePath,
                        folderPath = computeFolderPath(filePath),
                        fileName = File(filePath).nameWithoutExtension
                    ))
                }
            }
        }
        
        return vars
    }
    
    private fun parsePythonVariables(content: String, filePath: String): List<RobotVariable> {
        val vars = mutableListOf<RobotVariable>()
        val lines = content.lines()
        
        for (line in lines) {
            val trimmed = line.trim()
            if (trimmed.matches(Regex("^[A-Z_][A-Z0-9_]*\\s*=.*"))) {
                val parts = trimmed.split("=", limit = 2)
                if (parts.size == 2) {
                    vars.add(RobotVariable(
                        name = parts[0].trim(),
                        value = parts[1].trim(),
                        source = "python",
                        filePath = filePath,
                        folderPath = computeFolderPath(filePath),
                        fileName = File(filePath).nameWithoutExtension
                    ))
                }
            }
        }
        
        return vars
    }
    
    private fun loadOfficialKeywords() {
        officialKeywords.putAll(getBuiltInKeywords())
        officialKeywords.putAll(getBrowserKeywords())
        officialKeywords.putAll(getSeleniumKeywords())
        officialKeywords.putAll(getCollectionsKeywords())
        officialKeywords.putAll(getStringKeywords())
        officialKeywords.putAll(getDateTimeKeywords())
        officialKeywords.putAll(getOperatingSystemKeywords())
        officialKeywords.putAll(getProcessKeywords())
        officialKeywords.putAll(getXMLKeywords())
        officialKeywords.putAll(getRequestsLibraryKeywords())
    }
    
    private fun getBuiltInKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Log" to RobotKeyword("Log", "Log    \n    ...    message=\${}    \n    ...    level=\${INFO}    ", "BuiltIn", 
                "Logs the given message with the given level.", 
                arguments = listOf(KeywordArgument("message"), KeywordArgument("level", defaultValue = "INFO")),
                source = "official"),
            "Log To Console" to RobotKeyword("Log To Console", "Log To Console    \n    ...    message=\${}    ", "BuiltIn", 
                "Logs the given message to console.",
                arguments = listOf(KeywordArgument("message")),
                source = "official"),
            "Set Variable" to RobotKeyword("Set Variable", "Set Variable    \n    ...    value=\${}    ", "BuiltIn", 
                "Returns the given values which can then be assigned to variables.",
                arguments = listOf(KeywordArgument("value")),
                source = "official"),
            "Set Global Variable" to RobotKeyword("Set Global Variable", "Set Global Variable    \n    ...    name=\${}    \n    ...    value=\${}    ", "BuiltIn", 
                "Makes a variable available globally in all tests and suites.",
                arguments = listOf(KeywordArgument("name"), KeywordArgument("value")),
                source = "official"),
            "Should Be Equal" to RobotKeyword("Should Be Equal", "Should Be Equal    \n    ...    first=\${}    \n    ...    second=\${}    ", "BuiltIn", 
                "Fails if the given objects are unequal.",
                arguments = listOf(KeywordArgument("first"), KeywordArgument("second")),
                source = "official"),
            "Should Not Be Equal" to RobotKeyword("Should Not Be Equal", "Should Not Be Equal    \n    ...    first=\${}    \n    ...    second=\${}    ", "BuiltIn", 
                "Fails if the given objects are equal.",
                arguments = listOf(KeywordArgument("first"), KeywordArgument("second")),
                source = "official"),
            "Should Contain" to RobotKeyword("Should Contain", "Should Contain    \n    ...    container=\${}    \n    ...    item=\${}    ", "BuiltIn", 
                "Fails if container does not contain item.",
                arguments = listOf(KeywordArgument("container"), KeywordArgument("item")),
                source = "official"),
            "Should Be True" to RobotKeyword("Should Be True", "Should Be True    \n    ...    condition=\${}    ", "BuiltIn", 
                "Fails if the given condition is not true.",
                arguments = listOf(KeywordArgument("condition")),
                source = "official"),
            "Sleep" to RobotKeyword("Sleep", "Sleep    \n    ...    time=\${}    ", "BuiltIn", 
                "Pauses the test execution for the given time.",
                arguments = listOf(KeywordArgument("time")),
                source = "official"),
            "Wait Until Keyword Succeeds" to RobotKeyword("Wait Until Keyword Succeeds", "Wait Until Keyword Succeeds    \n    ...    retry=\${}    \n    ...    retry_interval=\${}    \n    ...    keyword=\${}    ", "BuiltIn", 
                "Runs the specified keyword and retries if it fails.",
                arguments = listOf(KeywordArgument("retry"), KeywordArgument("retry_interval"), KeywordArgument("keyword")),
                source = "official"),
            "Run Keyword" to RobotKeyword("Run Keyword", "Run Keyword    \n    ...    name=\${}    \n    ...    args=\${}    ", "BuiltIn", 
                "Executes the given keyword with the given arguments.",
                arguments = listOf(KeywordArgument("name"), KeywordArgument("args")),
                source = "official"),
            "Run Keyword If" to RobotKeyword("Run Keyword If", "Run Keyword If    \n    ...    condition=\${}    \n    ...    name=\${}    ", "BuiltIn", 
                "Runs the given keyword if condition is true.",
                arguments = listOf(KeywordArgument("condition"), KeywordArgument("name")),
                source = "official"),
            "Fail" to RobotKeyword("Fail", "Fail    \n    ...    msg=\${}    ", "BuiltIn", 
                "Fails the test with the given message.",
                arguments = listOf(KeywordArgument("msg")),
                source = "official"),
            "Pass Execution" to RobotKeyword("Pass Execution", "Pass Execution    \n    ...    message=\${}    ", "BuiltIn", 
                "Skips rest of the current test with PASS status.",
                arguments = listOf(KeywordArgument("message")),
                source = "official"),
            "Get Time" to RobotKeyword("Get Time", "Get Time    \n    ...    format=\${timestamp}    ", "BuiltIn", 
                "Returns the current time in the requested format.",
                arguments = listOf(KeywordArgument("format", defaultValue = "timestamp")),
                source = "official"),
            "Evaluate" to RobotKeyword("Evaluate", "Evaluate    \n    ...    expression=\${}    ", "BuiltIn", 
                "Evaluates the given expression in Python and returns the result.",
                arguments = listOf(KeywordArgument("expression")),
                source = "official"),
            "Create List" to RobotKeyword("Create List", "Create List    \n    ...    items=\${}    ", "BuiltIn", 
                "Returns a list containing given items.",
                arguments = listOf(KeywordArgument("items")),
                source = "official"),
            "Create Dictionary" to RobotKeyword("Create Dictionary", "Create Dictionary    \n    ...    items=\${}    ", "BuiltIn", 
                "Creates and returns a dictionary from the given items.",
                arguments = listOf(KeywordArgument("items")),
                source = "official"),
            "Get Length" to RobotKeyword("Get Length", "Get Length    \n    ...    item=\${}    ", "BuiltIn", 
                "Returns the length of the given item.",
                arguments = listOf(KeywordArgument("item")),
                source = "official")
        )
    }
    
    private fun getBrowserKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "New Browser" to RobotKeyword("New Browser", "New Browser    \n    ...    browser=\${chromium}    \n    ...    headless=\${False}    ", "Browser", 
                "Create a new browser instance.",
                arguments = listOf(KeywordArgument("browser", defaultValue = "chromium"), KeywordArgument("headless", defaultValue = "False")),
                source = "official"),
            "New Context" to RobotKeyword("New Context", "New Context    ", "Browser", 
                "Create a new browser context.",
                arguments = emptyList(),
                source = "official"),
            "New Page" to RobotKeyword("New Page", "New Page    \n    ...    url=\${}    ", "Browser", 
                "Open a new page.",
                arguments = listOf(KeywordArgument("url")),
                source = "official"),
            "Go To" to RobotKeyword("Go To", "Go To    \n    ...    url=\${}    ", "Browser", 
                "Navigate to the given URL.",
                arguments = listOf(KeywordArgument("url")),
                source = "official"),
            "Click" to RobotKeyword("Click", "Click    \n    ...    selector=\${}    ", "Browser", 
                "Click element identified by selector.",
                arguments = listOf(KeywordArgument("selector")),
                source = "official"),
            "Fill Text" to RobotKeyword("Fill Text", "Fill Text    \n    ...    selector=\${}    \n    ...    text=\${}    ", "Browser", 
                "Clears and fills the text field identified by selector.",
                arguments = listOf(KeywordArgument("selector"), KeywordArgument("text")),
                source = "official"),
            "Type Text" to RobotKeyword("Type Text", "Type Text    \n    ...    selector=\${}    \n    ...    text=\${}    \n    ...    delay=\${0}    ", "Browser", 
                "Types text into the element identified by selector.",
                arguments = listOf(KeywordArgument("selector"), KeywordArgument("text"), KeywordArgument("delay", defaultValue = "0")),
                source = "official"),
            "Get Text" to RobotKeyword("Get Text", "Get Text    \n    ...    selector=\${}    ", "Browser", 
                "Returns the text content of the element.",
                arguments = listOf(KeywordArgument("selector")),
                source = "official"),
            "Get Element Count" to RobotKeyword("Get Element Count", "Get Element Count    \n    ...    selector=\${}    ", "Browser", 
                "Returns the count of elements matching the selector.",
                arguments = listOf(KeywordArgument("selector")),
                source = "official"),
            "Wait For Elements State" to RobotKeyword("Wait For Elements State", "Wait For Elements State    \n    ...    selector=\${}    \n    ...    state=\${visible}    ", "Browser", 
                "Waits for the element to reach the specified state.",
                arguments = listOf(KeywordArgument("selector"), KeywordArgument("state", defaultValue = "visible")),
                source = "official"),
            "Take Screenshot" to RobotKeyword("Take Screenshot", "Take Screenshot    \n    ...    filename=\${}    ", "Browser", 
                "Takes a screenshot of the current page.",
                arguments = listOf(KeywordArgument("filename")),
                source = "official"),
            "Hover" to RobotKeyword("Hover", "Hover    \n    ...    selector=\${}    ", "Browser", 
                "Hovers over the element identified by selector.",
                arguments = listOf(KeywordArgument("selector")),
                source = "official"),
            "Select Options By" to RobotKeyword("Select Options By", "Select Options By    \n    ...    selector=\${}    \n    ...    attribute=\${}    \n    ...    values=\${}    ", "Browser", 
                "Selects options from a select element.",
                arguments = listOf(KeywordArgument("selector"), KeywordArgument("attribute"), KeywordArgument("values")),
                source = "official"),
            "Close Browser" to RobotKeyword("Close Browser", "Close Browser    ", "Browser", 
                "Closes the current browser.",
                arguments = emptyList(),
                source = "official"),
            "Close Page" to RobotKeyword("Close Page", "Close Page    ", "Browser", 
                "Closes the current page.",
                arguments = emptyList(),
                source = "official")
        )
    }
    
    private fun getSeleniumKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Open Browser" to RobotKeyword("Open Browser", "Open Browser    \n    ...    url=\${}    \n    ...    browser=\${chrome}    ", "SeleniumLibrary", 
                "Opens a new browser instance to the given URL.",
                arguments = listOf(KeywordArgument("url"), KeywordArgument("browser", defaultValue = "chrome")),
                source = "official"),
            "Close Browser" to RobotKeyword("Close Browser", "Close Browser    ", "SeleniumLibrary", 
                "Closes the current browser.",
                arguments = emptyList(),
                source = "official"),
            "Close All Browsers" to RobotKeyword("Close All Browsers", "Close All Browsers    ", "SeleniumLibrary", 
                "Closes all open browsers.",
                arguments = emptyList(),
                source = "official"),
            "Go To" to RobotKeyword("Go To", "Go To    \n    ...    url=\${}    ", "SeleniumLibrary", 
                "Navigates the current browser window to the given URL.",
                arguments = listOf(KeywordArgument("url")),
                source = "official"),
            "Click Element" to RobotKeyword("Click Element", "Click Element    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Click element identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Click Button" to RobotKeyword("Click Button", "Click Button    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Clicks a button identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Click Link" to RobotKeyword("Click Link", "Click Link    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Clicks a link identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Input Text" to RobotKeyword("Input Text", "Input Text    \n    ...    locator=\${}    \n    ...    text=\${}    ", "SeleniumLibrary", 
                "Types the given text into text field identified by locator.",
                arguments = listOf(KeywordArgument("locator"), KeywordArgument("text")),
                source = "official"),
            "Input Password" to RobotKeyword("Input Password", "Input Password    \n    ...    locator=\${}    \n    ...    password=\${}    ", "SeleniumLibrary", 
                "Types the given password into password field.",
                arguments = listOf(KeywordArgument("locator"), KeywordArgument("password")),
                source = "official"),
            "Clear Element Text" to RobotKeyword("Clear Element Text", "Clear Element Text    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Clears the text field identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Get Text" to RobotKeyword("Get Text", "Get Text    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Returns the text of the element identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Get Value" to RobotKeyword("Get Value", "Get Value    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Returns the value attribute of the element.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Element Should Be Visible" to RobotKeyword("Element Should Be Visible", "Element Should Be Visible    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Verifies that the element is visible.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Element Should Contain" to RobotKeyword("Element Should Contain", "Element Should Contain    \n    ...    locator=\${}    \n    ...    expected=\${}    ", "SeleniumLibrary", 
                "Verifies that element contains expected text.",
                arguments = listOf(KeywordArgument("locator"), KeywordArgument("expected")),
                source = "official"),
            "Wait Until Element Is Visible" to RobotKeyword("Wait Until Element Is Visible", "Wait Until Element Is Visible    \n    ...    locator=\${}    \n    ...    timeout=\${5s}    ", "SeleniumLibrary", 
                "Waits until the element is visible.",
                arguments = listOf(KeywordArgument("locator"), KeywordArgument("timeout", defaultValue = "5s")),
                source = "official"),
            "Wait Until Page Contains" to RobotKeyword("Wait Until Page Contains", "Wait Until Page Contains    \n    ...    text=\${}    \n    ...    timeout=\${5s}    ", "SeleniumLibrary", 
                "Waits until the page contains the given text.",
                arguments = listOf(KeywordArgument("text"), KeywordArgument("timeout", defaultValue = "5s")),
                source = "official"),
            "Select From List By Label" to RobotKeyword("Select From List By Label", "Select From List By Label    \n    ...    locator=\${}    \n    ...    label=\${}    ", "SeleniumLibrary", 
                "Selects options from selection list by label.",
                arguments = listOf(KeywordArgument("locator"), KeywordArgument("label")),
                source = "official"),
            "Select Checkbox" to RobotKeyword("Select Checkbox", "Select Checkbox    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Selects the checkbox identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Capture Page Screenshot" to RobotKeyword("Capture Page Screenshot", "Capture Page Screenshot    \n    ...    filename=\${}    ", "SeleniumLibrary", 
                "Takes a screenshot of the current page.",
                arguments = listOf(KeywordArgument("filename")),
                source = "official"),
            "Maximize Browser Window" to RobotKeyword("Maximize Browser Window", "Maximize Browser Window    ", "SeleniumLibrary", 
                "Maximizes the current browser window.",
                arguments = emptyList(),
                source = "official")
        )
    }
    
    private fun getCollectionsKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Append To List" to RobotKeyword("Append To List", "Append To List    \n    ...    list=\${}    \n    ...    values=\${}    ", "Collections", 
                "Adds values to the end of list.",
                arguments = listOf(KeywordArgument("list"), KeywordArgument("values")),
                source = "official"),
            "Get From List" to RobotKeyword("Get From List", "Get From List    \n    ...    list=\${}    \n    ...    index=\${}    ", "Collections", 
                "Returns the value from list at the given index.",
                arguments = listOf(KeywordArgument("list"), KeywordArgument("index")),
                source = "official"),
            "Get Length" to RobotKeyword("Get Length", "Get Length    \n    ...    item=\${}    ", "Collections", 
                "Returns the length of the given item.",
                arguments = listOf(KeywordArgument("item")),
                source = "official"),
            "List Should Contain Value" to RobotKeyword("List Should Contain Value", "List Should Contain Value    \n    ...    list=\${}    \n    ...    value=\${}    ", "Collections", 
                "Fails if the list does not contain the value.",
                arguments = listOf(KeywordArgument("list"), KeywordArgument("value")),
                source = "official"),
            "Sort List" to RobotKeyword("Sort List", "Sort List    \n    ...    list=\${}    ", "Collections", 
                "Sorts the given list in-place.",
                arguments = listOf(KeywordArgument("list")),
                source = "official"),
            "Remove From List" to RobotKeyword("Remove From List", "Remove From List    \n    ...    list=\${}    \n    ...    index=\${}    ", "Collections", 
                "Removes and returns the value at the given index.",
                arguments = listOf(KeywordArgument("list"), KeywordArgument("index")),
                source = "official"),
            "Insert Into List" to RobotKeyword("Insert Into List", "Insert Into List    \n    ...    list=\${}    \n    ...    index=\${}    \n    ...    value=\${}    ", "Collections", 
                "Inserts value into list at the specified index.",
                arguments = listOf(KeywordArgument("list"), KeywordArgument("index"), KeywordArgument("value")),
                source = "official")
        )
    }
    
    private fun getStringKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Convert To Lowercase" to RobotKeyword("Convert To Lowercase", "Convert To Lowercase    \n    ...    string=\${}    ", "String", 
                "Converts string to lowercase.",
                arguments = listOf(KeywordArgument("string")),
                source = "official"),
            "Convert To Uppercase" to RobotKeyword("Convert To Uppercase", "Convert To Uppercase    \n    ...    string=\${}    ", "String", 
                "Converts string to uppercase.",
                arguments = listOf(KeywordArgument("string")),
                source = "official"),
            "Get Substring" to RobotKeyword("Get Substring", "Get Substring    \n    ...    string=\${}    \n    ...    start=\${}    \n    ...    end=\${}    ", "String", 
                "Returns a substring from start index to end index.",
                arguments = listOf(KeywordArgument("string"), KeywordArgument("start"), KeywordArgument("end")),
                source = "official"),
            "Replace String" to RobotKeyword("Replace String", "Replace String    \n    ...    string=\${}    \n    ...    search=\${}    \n    ...    replace=\${}    ", "String", 
                "Replaces search string with replace string.",
                arguments = listOf(KeywordArgument("string"), KeywordArgument("search"), KeywordArgument("replace")),
                source = "official"),
            "Split String" to RobotKeyword("Split String", "Split String    \n    ...    string=\${}    \n    ...    separator=\${}    ", "String", 
                "Splits the string using the given separator.",
                arguments = listOf(KeywordArgument("string"), KeywordArgument("separator")),
                source = "official"),
            "Should Start With" to RobotKeyword("Should Start With", "Should Start With    \n    ...    string=\${}    \n    ...    start=\${}    ", "String", 
                "Fails if the string does not start with start string.",
                arguments = listOf(KeywordArgument("string"), KeywordArgument("start")),
                source = "official"),
            "Should End With" to RobotKeyword("Should End With", "Should End With    \n    ...    string=\${}    \n    ...    end=\${}    ", "String", 
                "Fails if the string does not end with end string.",
                arguments = listOf(KeywordArgument("string"), KeywordArgument("end")),
                source = "official")
        )
    }
    
    private fun getDateTimeKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Get Current Date" to RobotKeyword("Get Current Date", "Get Current Date    ", "DateTime", 
                "Returns current local or UTC time with an optional increment.",
                arguments = emptyList(),
                source = "official"),
            "Add Time To Date" to RobotKeyword("Add Time To Date", "Add Time To Date    \n    ...    date=\${}    \n    ...    time=\${}    ", "DateTime", 
                "Adds time to date and returns the resulting date.",
                arguments = listOf(KeywordArgument("date"), KeywordArgument("time")),
                source = "official"),
            "Subtract Time From Date" to RobotKeyword("Subtract Time From Date", "Subtract Time From Date    \n    ...    date=\${}    \n    ...    time=\${}    ", "DateTime", 
                "Subtracts time from date and returns the resulting date.",
                arguments = listOf(KeywordArgument("date"), KeywordArgument("time")),
                source = "official"),
            "Convert Date" to RobotKeyword("Convert Date", "Convert Date    \n    ...    date=\${}    \n    ...    result_format=\${%Y-%m-%d}    ", "DateTime", 
                "Converts between supported date formats.",
                arguments = listOf(KeywordArgument("date"), KeywordArgument("result_format", defaultValue = "%Y-%m-%d")),
                source = "official"),
            "Subtract Date From Date" to RobotKeyword("Subtract Date From Date", "Subtract Date From Date    \n    ...    date1=\${}    \n    ...    date2=\${}    ", "DateTime", 
                "Subtracts date from another date and returns time between.",
                arguments = listOf(KeywordArgument("date1"), KeywordArgument("date2")),
                source = "official")
        )
    }
    
    private fun getOperatingSystemKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Create Directory" to RobotKeyword("Create Directory", "Create Directory    \n    ...    path=\${}    ", "OperatingSystem", 
                "Creates the specified directory.",
                arguments = listOf(KeywordArgument("path")),
                source = "official"),
            "Create File" to RobotKeyword("Create File", "Create File    \n    ...    path=\${}    \n    ...    content=\${}    ", "OperatingSystem", 
                "Creates a file with the given content.",
                arguments = listOf(KeywordArgument("path"), KeywordArgument("content")),
                source = "official"),
            "File Should Exist" to RobotKeyword("File Should Exist", "File Should Exist    \n    ...    path=\${}    ", "OperatingSystem", 
                "Fails unless the given path points to an existing file.",
                arguments = listOf(KeywordArgument("path")),
                source = "official"),
            "Directory Should Exist" to RobotKeyword("Directory Should Exist", "Directory Should Exist    \n    ...    path=\${}    ", "OperatingSystem", 
                "Fails unless the given path points to an existing directory.",
                arguments = listOf(KeywordArgument("path")),
                source = "official"),
            "Copy File" to RobotKeyword("Copy File", "Copy File    \n    ...    source=\${}    \n    ...    destination=\${}    ", "OperatingSystem", 
                "Copies the source file into the destination.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("destination")),
                source = "official"),
            "Move File" to RobotKeyword("Move File", "Move File    \n    ...    source=\${}    \n    ...    destination=\${}    ", "OperatingSystem", 
                "Moves the source file into the destination.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("destination")),
                source = "official"),
            "Remove File" to RobotKeyword("Remove File", "Remove File    \n    ...    path=\${}    ", "OperatingSystem", 
                "Removes the given file.",
                arguments = listOf(KeywordArgument("path")),
                source = "official"),
            "Remove Directory" to RobotKeyword("Remove Directory", "Remove Directory    \n    ...    path=\${}    \n    ...    recursive=\${False}    ", "OperatingSystem", 
                "Removes the directory pointed by the given path.",
                arguments = listOf(KeywordArgument("path"), KeywordArgument("recursive", defaultValue = "False")),
                source = "official"),
            "Get File" to RobotKeyword("Get File", "Get File    \n    ...    path=\${}    ", "OperatingSystem", 
                "Returns the contents of a specified file.",
                arguments = listOf(KeywordArgument("path")),
                source = "official"),
            "Append To File" to RobotKeyword("Append To File", "Append To File    \n    ...    path=\${}    \n    ...    content=\${}    ", "OperatingSystem", 
                "Appends the given content to the specified file.",
                arguments = listOf(KeywordArgument("path"), KeywordArgument("content")),
                source = "official"),
            "List Directory" to RobotKeyword("List Directory", "List Directory    \n    ...    path=\${}    ", "OperatingSystem", 
                "Returns and logs items in a directory.",
                arguments = listOf(KeywordArgument("path")),
                source = "official"),
            "Get Environment Variable" to RobotKeyword("Get Environment Variable", "Get Environment Variable    \n    ...    name=\${}    ", "OperatingSystem", 
                "Returns the value of an environment variable.",
                arguments = listOf(KeywordArgument("name")),
                source = "official"),
            "Set Environment Variable" to RobotKeyword("Set Environment Variable", "Set Environment Variable    \n    ...    name=\${}    \n    ...    value=\${}    ", "OperatingSystem", 
                "Sets an environment variable to a specified value.",
                arguments = listOf(KeywordArgument("name"), KeywordArgument("value")),
                source = "official")
        )
    }
    
    private fun getProcessKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Run Process" to RobotKeyword("Run Process", "Run Process    \n    ...    command=\${}    \n    ...    shell=\${True}    ", "Process", 
                "Runs a process and waits for it to complete.",
                arguments = listOf(KeywordArgument("command"), KeywordArgument("shell", defaultValue = "True")),
                source = "official"),
            "Start Process" to RobotKeyword("Start Process", "Start Process    \n    ...    command=\${}    \n    ...    alias=\${}    ", "Process", 
                "Starts a new process on background.",
                arguments = listOf(KeywordArgument("command"), KeywordArgument("alias")),
                source = "official"),
            "Wait For Process" to RobotKeyword("Wait For Process", "Wait For Process    \n    ...    handle=\${}    \n    ...    timeout=\${1 min}    ", "Process", 
                "Waits for the process to complete or timeout.",
                arguments = listOf(KeywordArgument("handle"), KeywordArgument("timeout", defaultValue = "1 min")),
                source = "official"),
            "Terminate Process" to RobotKeyword("Terminate Process", "Terminate Process    \n    ...    handle=\${}    ", "Process", 
                "Stops the process gracefully.",
                arguments = listOf(KeywordArgument("handle")),
                source = "official"),
            "Kill Process" to RobotKeyword("Kill Process", "Kill Process    \n    ...    handle=\${}    ", "Process", 
                "Forcibly stops the process.",
                arguments = listOf(KeywordArgument("handle")),
                source = "official"),
            "Get Process Result" to RobotKeyword("Get Process Result", "Get Process Result    \n    ...    handle=\${}    ", "Process", 
                "Returns the result object of a process.",
                arguments = listOf(KeywordArgument("handle")),
                source = "official"),
            "Process Should Be Stopped" to RobotKeyword("Process Should Be Stopped", "Process Should Be Stopped    \n    ...    handle=\${}    ", "Process", 
                "Verifies that the process is not running.",
                arguments = listOf(KeywordArgument("handle")),
                source = "official"),
            "Process Should Be Running" to RobotKeyword("Process Should Be Running", "Process Should Be Running    \n    ...    handle=\${}    ", "Process", 
                "Verifies that the process is running.",
                arguments = listOf(KeywordArgument("handle")),
                source = "official")
        )
    }
    
    private fun getXMLKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Parse XML" to RobotKeyword("Parse XML", "Parse XML    \n    ...    source=\${}    ", "XML", 
                "Parses the given XML file or string into an element structure.",
                arguments = listOf(KeywordArgument("source")),
                source = "official"),
            "Get Element" to RobotKeyword("Get Element", "Get Element    \n    ...    source=\${}    \n    ...    xpath=\${}    ", "XML", 
                "Returns an element from the source matching the xpath.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("xpath")),
                source = "official"),
            "Get Elements" to RobotKeyword("Get Elements", "Get Elements    \n    ...    source=\${}    \n    ...    xpath=\${}    ", "XML", 
                "Returns a list of elements from the source matching the xpath.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("xpath")),
                source = "official"),
            "Get Element Text" to RobotKeyword("Get Element Text", "Get Element Text    \n    ...    source=\${}    \n    ...    xpath=\${}    ", "XML", 
                "Returns the text content of an element.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("xpath")),
                source = "official"),
            "Get Element Attribute" to RobotKeyword("Get Element Attribute", "Get Element Attribute    \n    ...    source=\${}    \n    ...    name=\${}    \n    ...    xpath=\${}    ", "XML", 
                "Returns the named attribute of an element.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("name"), KeywordArgument("xpath")),
                source = "official"),
            "Element Should Exist" to RobotKeyword("Element Should Exist", "Element Should Exist    \n    ...    source=\${}    \n    ...    xpath=\${}    ", "XML", 
                "Verifies that one or more element(s) matching xpath exist.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("xpath")),
                source = "official"),
            "Element Text Should Be" to RobotKeyword("Element Text Should Be", "Element Text Should Be    \n    ...    source=\${}    \n    ...    expected=\${}    \n    ...    xpath=\${}    ", "XML", 
                "Verifies that the text of an element is as expected.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("expected"), KeywordArgument("xpath")),
                source = "official"),
            "Save XML" to RobotKeyword("Save XML", "Save XML    \n    ...    source=\${}    \n    ...    path=\${}    ", "XML", 
                "Saves the given element into a file.",
                arguments = listOf(KeywordArgument("source"), KeywordArgument("path")),
                source = "official")
        )
    }
    
    private fun getRequestsLibraryKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Create Session" to RobotKeyword("Create Session", "Create Session    \n    ...    alias=\${}    \n    ...    url=\${}    ", "RequestsLibrary", 
                "Creates a HTTP session with a server.",
                arguments = listOf(KeywordArgument("alias"), KeywordArgument("url")),
                source = "official"),
            "GET On Session" to RobotKeyword("GET On Session", "GET On Session    \n    ...    alias=\${}    \n    ...    url=\${}    ", "RequestsLibrary", 
                "Sends a GET request on a previously created HTTP Session.",
                arguments = listOf(KeywordArgument("alias"), KeywordArgument("url")),
                source = "official"),
            "POST On Session" to RobotKeyword("POST On Session", "POST On Session    \n    ...    alias=\${}    \n    ...    url=\${}    \n    ...    data=\${}    ", "RequestsLibrary", 
                "Sends a POST request on a previously created HTTP Session.",
                arguments = listOf(KeywordArgument("alias"), KeywordArgument("url"), KeywordArgument("data")),
                source = "official"),
            "PUT On Session" to RobotKeyword("PUT On Session", "PUT On Session    \n    ...    alias=\${}    \n    ...    url=\${}    \n    ...    data=\${}    ", "RequestsLibrary", 
                "Sends a PUT request on a previously created HTTP Session.",
                arguments = listOf(KeywordArgument("alias"), KeywordArgument("url"), KeywordArgument("data")),
                source = "official"),
            "DELETE On Session" to RobotKeyword("DELETE On Session", "DELETE On Session    \n    ...    alias=\${}    \n    ...    url=\${}    ", "RequestsLibrary", 
                "Sends a DELETE request on a previously created HTTP Session.",
                arguments = listOf(KeywordArgument("alias"), KeywordArgument("url")),
                source = "official"),
            "Status Should Be" to RobotKeyword("Status Should Be", "Status Should Be    \n    ...    expected_status=\${}    \n    ...    response=\${}    ", "RequestsLibrary", 
                "Fails if response status code is not the expected status.",
                arguments = listOf(KeywordArgument("expected_status"), KeywordArgument("response")),
                source = "official")
        )
    }
    
    private fun computeFolderPath(filePath: String): String {
        val projectPath = project.basePath ?: return "Root"
        val file = File(filePath)
        val parentPath = file.parent ?: return "Root"
        
        return if (parentPath.startsWith(projectPath)) {
            val relativePath = parentPath.substring(projectPath.length)
                .removePrefix(File.separator)
                .replace(File.separator, "/")
            if (relativePath.isBlank()) "Root" else relativePath
        } else {
            "Root"
        }
    }
}
