package com.haitham.robotframework.services

import com.haitham.robotframework.model.KeywordArgument
import com.haitham.robotframework.model.RobotKeyword
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

/**
 * Loads keywords from installed Robot Framework libraries using libdoc
 */
class LibdocKeywordLoader(private val project: Project) {
    
    private val logger = Logger.getInstance(LibdocKeywordLoader::class.java)
    
    /**
     * Load keywords from a library file path using Robot Framework's libdoc
     * 
     * @param filePath Path to the .py file
     * @return Map of keyword name to RobotKeyword, or empty map if loading fails
     */
    fun loadKeywordsFromFile(filePath: String): Map<String, RobotKeyword> {
        try {
            logger.info("Loading keywords from file: $filePath")
            
            val pythonPath = findPythonExecutable()
            if (pythonPath == null) {
                logger.warn("Python executable not found")
                return emptyMap()
            }
            
            val file = File(filePath)
            val libraryName = file.nameWithoutExtension
            
            val jsonOutput = runLibdocOnFile(pythonPath, filePath)
            if (jsonOutput == null) {
                logger.warn("Failed to run libdoc on file: $filePath")
                return emptyMap()
            }
            
            return parseLibdocJson(jsonOutput, libraryName, filePath)
            
        } catch (e: Exception) {
            logger.error("Error loading keywords from file $filePath", e)
            return emptyMap()
        }
    }
    
    /**
     * Load keywords from an installed library using Robot Framework's libdoc
     * 
     * @param libraryName Name of the library (e.g., "BuiltIn", "SeleniumLibrary", "Browser")
     * @return Map of keyword name to RobotKeyword, or empty map if loading fails
     */
    fun loadLibraryKeywords(libraryName: String): Map<String, RobotKeyword> {
        try {
            logger.info("Loading keywords for library: $libraryName")
            
            // Find Python executable
            val pythonPath = findPythonExecutable()
            if (pythonPath == null) {
                logger.warn("Python executable not found")
                return emptyMap()
            }
            
            // Run libdoc to get JSON output
            val jsonOutput = runLibdoc(pythonPath, libraryName)
            if (jsonOutput == null) {
                logger.warn("Failed to run libdoc for library: $libraryName")
                return emptyMap()
            }
            
            // Parse JSON and extract keywords
            return parseLibdocJson(jsonOutput, libraryName, null)
            
        } catch (e: Exception) {
            logger.error("Error loading keywords for library $libraryName", e)
            return emptyMap()
        }
    }
    
    /**
     * Find Python executable (python3, python, or from project SDK)
     */
    private fun findPythonExecutable(): String? {
        // Try common Python executables
        val pythonCommands = listOf("python3", "python", "python3.9", "python3.10", "python3.11")
        
        for (command in pythonCommands) {
            try {
                val process = ProcessBuilder(command, "--version")
                    .redirectErrorStream(true)
                    .start()
                    
                process.waitFor(2, TimeUnit.SECONDS)
                if (process.exitValue() == 0) {
                    logger.info("Found Python executable: $command")
                    return command
                }
            } catch (e: Exception) {
                // Try next command
                continue
            }
        }
        
        return null
    }
    
    /**
     * Run libdoc on a file path
     */
    private fun runLibdocOnFile(pythonPath: String, filePath: String): String? {
        try {
            val tempFile = createTempFile("libdoc_file", ".json")
            tempFile.deleteOnExit()
            
            val command = listOf(
                pythonPath,
                "-m", "robot.libdoc",
                "-f", "JSON",
                filePath,
                tempFile.absolutePath
            )
            
            logger.info("Running command: ${command.joinToString(" ")}")
            
            val process = ProcessBuilder(command)
                .redirectErrorStream(true)
                .start()
            
            val output = BufferedReader(InputStreamReader(process.inputStream)).use { 
                it.readText() 
            }
            
            val completed = process.waitFor(10, TimeUnit.SECONDS)
            if (!completed || process.exitValue() != 0) {
                logger.warn("Libdoc failed for file $filePath: $output")
                return null
            }
            
            val jsonContent = tempFile.readText()
            tempFile.delete()
            
            return jsonContent
            
        } catch (e: Exception) {
            logger.error("Error running libdoc on file $filePath", e)
            return null
        }
    }
    
    /**
     * Run libdoc command and return JSON output as string
     */
    private fun runLibdoc(pythonPath: String, libraryName: String): String? {
        try {
            val tempFile = createTempFile("libdoc_$libraryName", ".json")
            tempFile.deleteOnExit()
            
            val command = listOf(
                pythonPath,
                "-m", "robot.libdoc",
                "-f", "JSON",
                libraryName,
                tempFile.absolutePath
            )
            
            logger.info("Running command: ${command.joinToString(" ")}")
            
            val process = ProcessBuilder(command)
                .redirectErrorStream(true)
                .start()
            
            // Read output for debugging
            val output = BufferedReader(InputStreamReader(process.inputStream)).use { 
                it.readText() 
            }
            
            val completed = process.waitFor(10, TimeUnit.SECONDS)
            if (!completed || process.exitValue() != 0) {
                logger.warn("Libdoc failed for $libraryName: $output")
                return null
            }
            
            // Read generated JSON file
            val jsonContent = tempFile.readText()
            tempFile.delete()
            
            return jsonContent
            
        } catch (e: Exception) {
            logger.error("Error running libdoc for $libraryName", e)
            return null
        }
    }
    
    /**
     * Parse libdoc JSON output and convert to RobotKeyword objects
     */
    private fun parseLibdocJson(jsonContent: String, libraryName: String, filePath: String?): Map<String, RobotKeyword> {
        try {
            val json = JSONObject(jsonContent)
            val keywords = json.getJSONArray("keywords")
            val result = mutableMapOf<String, RobotKeyword>()
            
            // Determine source type
            val sourceType = if (filePath != null) "python" else "official"
            val folderPath = if (filePath != null) computeFolderPath(filePath) else null
            
            for (i in 0 until keywords.length()) {
                val keywordJson = keywords.getJSONObject(i)
                
                val name = keywordJson.getString("name")
                
                // Skip private/magic methods (they are NOT Robot Framework keywords)
                if (name.startsWith("__") || name.contains(".__")) {
                    logger.debug("Skipping private/magic method: $name")
                    continue
                }
                
                val doc = keywordJson.optString("shortdoc", "")
                val args = parseArguments(keywordJson)
                
                // Build syntax with multi-line format
                val syntax = buildKeywordSyntax(name, args)
                
                val keyword = RobotKeyword(
                    name = name,
                    implementation = syntax,
                    library = libraryName,
                    description = doc,
                    documentation = doc,
                    arguments = args,
                    source = sourceType,
                    filePath = filePath,
                    folderPath = folderPath,
                    fileType = if (filePath != null) "python" else null
                )
                
                result[name] = keyword
            }
            
            logger.info("Loaded ${result.size} keywords from $libraryName")
            return result
            
        } catch (e: Exception) {
            logger.error("Error parsing libdoc JSON for $libraryName", e)
            return emptyMap()
        }
    }
    
    /**
     * Compute folder path relative to project
     */
    private fun computeFolderPath(filePath: String): String {
        val projectPath = project.basePath ?: return "Root"
        val file = File(filePath)
        val parent = file.parentFile ?: return "Root"
        
        return if (parent.absolutePath.startsWith(projectPath)) {
            parent.absolutePath.substring(projectPath.length).trim('/')
        } else {
            parent.name
        }
    }
    
    /**
     * Parse keyword arguments from JSON
     */
    private fun parseArguments(keywordJson: JSONObject): List<KeywordArgument> {
        val result = mutableListOf<KeywordArgument>()
        
        if (!keywordJson.has("args")) {
            return result
        }
        
        val argsArray = keywordJson.getJSONArray("args")
        
        for (i in 0 until argsArray.length()) {
            val argJson = argsArray.getJSONObject(i)
            
            val name = argJson.getString("name")
            val defaultValue = argJson.optString("defaultValue", null)
            val required = argJson.optBoolean("required", true)
            val kind = argJson.optString("kind", "POSITIONAL_OR_NAMED")
            
            // Skip VAR_POSITIONAL (*args) and VAR_NAMED (**kwargs) for cleaner syntax
            if (kind == "VAR_POSITIONAL" || kind == "VAR_NAMED") {
                continue
            }
            
            result.add(KeywordArgument(
                name = name,
                defaultValue = if (defaultValue.isNullOrEmpty() || defaultValue == "null") null else defaultValue
            ))
        }
        
        return result
    }
    
    /**
     * Build keyword syntax in multi-line format with parameter names
     */
    private fun buildKeywordSyntax(name: String, args: List<KeywordArgument>): String {
        if (args.isEmpty()) {
            return "$name    "
        }
        
        val syntax = StringBuilder("$name    \n")
        
        for ((index, arg) in args.withIndex()) {
            val value = if (arg.defaultValue != null) {
                "\${${arg.defaultValue}}"
            } else {
                "\${}"
            }
            
            syntax.append("    ...    ${arg.name}=$value    ")
            
            if (index < args.size - 1) {
                syntax.append("\n")
            }
        }
        
        return syntax.toString()
    }
    
    /**
     * Check if a library is installed
     */
    fun isLibraryInstalled(libraryName: String): Boolean {
        val pythonPath = findPythonExecutable() ?: return false
        
        try {
            val process = ProcessBuilder(
                pythonPath,
                "-c",
                "import $libraryName; print('OK')"
            )
                .redirectErrorStream(true)
                .start()
            
            val output = BufferedReader(InputStreamReader(process.inputStream)).use { 
                it.readText() 
            }
            
            process.waitFor(2, TimeUnit.SECONDS)
            return output.contains("OK")
            
        } catch (e: Exception) {
            return false
        }
    }
    
    /**
     * Get list of installed Robot Framework libraries
     */
    fun getInstalledLibraries(): List<String> {
        val pythonPath = findPythonExecutable() ?: return emptyList()
        
        try {
            val process = ProcessBuilder(
                pythonPath,
                "-m", "pip", "list"
            )
                .redirectErrorStream(true)
                .start()
            
            val output = BufferedReader(InputStreamReader(process.inputStream)).use { 
                it.readText() 
            }
            
            process.waitFor(5, TimeUnit.SECONDS)
            
            // Parse pip list output and find RF libraries
            val libraries = mutableListOf<String>()
            
            val commonLibraries = mapOf(
                "robotframework-browser" to "Browser",
                "robotframework-seleniumlibrary" to "SeleniumLibrary",
                "robotframework-requests" to "RequestsLibrary",
                "robotframework-appiumlibrary" to "AppiumLibrary",
                "robotframework-sshlibrary" to "SSHLibrary",
                "robotframework-databaselibrary" to "DatabaseLibrary"
            )
            
            for ((packageName, libraryName) in commonLibraries) {
                if (output.contains(packageName, ignoreCase = true)) {
                    libraries.add(libraryName)
                }
            }
            
            return libraries
            
        } catch (e: Exception) {
            logger.error("Error getting installed libraries", e)
            return emptyList()
        }
    }
}
