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
    }
    
    private fun getBuiltInKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Log" to RobotKeyword("Log", "Log    \${message}", "BuiltIn", 
                "Logs the given message with the given level.", 
                arguments = listOf(KeywordArgument("message")),
                source = "official"),
            "Set Variable" to RobotKeyword("Set Variable", "Set Variable    \${value}", "BuiltIn", 
                "Returns the given values which can then be assigned to variables.",
                arguments = listOf(KeywordArgument("value")),
                source = "official"),
            "Should Be Equal" to RobotKeyword("Should Be Equal", "Should Be Equal    \${first}    \${second}", "BuiltIn", 
                "Fails if the given objects are unequal.",
                arguments = listOf(KeywordArgument("first"), KeywordArgument("second")),
                source = "official")
        )
    }
    
    private fun getBrowserKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "New Browser" to RobotKeyword("New Browser", "New Browser    \n    ...    browser=\${chromium}    ", "Browser", 
                "Create a new browser instance.",
                arguments = listOf(KeywordArgument("browser", defaultValue = "chromium")),
                source = "official"),
            "New Page" to RobotKeyword("New Page", "New Page    \n    ...    url=\${}    ", "Browser", 
                "Open a new page.",
                arguments = listOf(KeywordArgument("url")),
                source = "official"),
            "Click" to RobotKeyword("Click", "Click    \n    ...    selector=\${}    ", "Browser", 
                "Click element identified by selector.",
                arguments = listOf(KeywordArgument("selector")),
                source = "official")
        )
    }
    
    private fun getSeleniumKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Open Browser" to RobotKeyword("Open Browser", "Open Browser    \n    ...    url=\${}    \n    ...    browser=\${chrome}    ", "SeleniumLibrary", 
                "Opens a new browser instance to the given URL.",
                arguments = listOf(KeywordArgument("url"), KeywordArgument("browser", defaultValue = "chrome")),
                source = "official"),
            "Click Element" to RobotKeyword("Click Element", "Click Element    \n    ...    locator=\${}    ", "SeleniumLibrary", 
                "Click element identified by locator.",
                arguments = listOf(KeywordArgument("locator")),
                source = "official"),
            "Input Text" to RobotKeyword("Input Text", "Input Text    \${locator}    \${text}", "SeleniumLibrary", 
                "Types the given text into text field identified by locator.",
                arguments = listOf(KeywordArgument("locator"), KeywordArgument("text")),
                source = "official")
        )
    }
    
    private fun getCollectionsKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Append To List" to RobotKeyword("Append To List", "Append To List    \${list}    \${*values}", "Collections", 
                "Adds values to the end of list.",
                arguments = listOf(KeywordArgument("list"), KeywordArgument("values")),
                source = "official"),
            "Get Length" to RobotKeyword("Get Length", "Get Length    \${item}", "Collections", 
                "Returns the length of the given item.",
                arguments = listOf(KeywordArgument("item")),
                source = "official")
        )
    }
    
    private fun getStringKeywords(): Map<String, RobotKeyword> {
        return mapOf(
            "Convert To Lowercase" to RobotKeyword("Convert To Lowercase", "Convert To Lowercase    \${string}", "String", 
                "Converts string to lowercase.",
                arguments = listOf(KeywordArgument("string")),
                source = "official"),
            "Should Contain" to RobotKeyword("Should Contain", "Should Contain    \${container}    \${item}", "String", 
                "Fails if container does not contain item one or more times.",
                arguments = listOf(KeywordArgument("container"), KeywordArgument("item")),
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
