# Auto-Loading Official Keywords - Implementation Guide

## Current Status (v1.0.8)
✅ **115+ Official Keywords** hardcoded across 10 libraries:
- BuiltIn (18 keywords)
- Browser (16 keywords)
- SeleniumLibrary (20 keywords)
- Collections (7 keywords)
- String (6 keywords)
- DateTime (5 keywords)
- OperatingSystem (13 keywords)
- Process (8 keywords)
- XML (8 keywords)
- RequestsLibrary (6 keywords)

---

## Future: JSON-Based Auto-Loading System

### Why JSON-Based Loading?
- **Easy Maintenance**: Update keywords without recompiling
- **Shared Definitions**: Same JSON file can be used by VSCode & PyCharm extensions
- **Version Control**: Track keyword changes over time
- **Community Contributions**: Users can submit keyword updates via PRs
- **Future-Proof**: Easy to add new libraries and keywords

---

## Proposed JSON Structure

### File: `src/main/resources/keywords.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-10-02",
  "libraries": {
    "BuiltIn": {
      "name": "BuiltIn",
      "description": "Robot Framework standard library",
      "keywords": [
        {
          "name": "Log",
          "syntax": "Log    \n    ...    message=${}    \n    ...    level=${INFO}    ",
          "description": "Logs the given message with the given level.",
          "arguments": [
            {"name": "message", "required": true},
            {"name": "level", "default": "INFO"}
          ]
        },
        {
          "name": "Set Variable",
          "syntax": "Set Variable    \n    ...    value=${}    ",
          "description": "Returns the given values which can then be assigned to variables.",
          "arguments": [
            {"name": "value", "required": true}
          ]
        }
      ]
    },
    "Browser": {
      "name": "Browser",
      "description": "Browser library for modern web testing",
      "keywords": [...]
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Create JSON Loader (Kotlin)

```kotlin
// src/main/kotlin/com/haitham/robotframework/services/KeywordLoader.kt
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class KeywordDefinition(
    val name: String,
    val syntax: String,
    val description: String,
    val arguments: List<ArgumentDefinition>
)

data class ArgumentDefinition(
    val name: String,
    val required: Boolean = true,
    val default: String? = null
)

data class LibraryDefinition(
    val name: String,
    val description: String,
    val keywords: List<KeywordDefinition>
)

data class KeywordDatabase(
    val version: String,
    val lastUpdated: String,
    val libraries: Map<String, LibraryDefinition>
)

object KeywordLoader {
    fun loadFromJson(jsonPath: String): Map<String, RobotKeyword> {
        val json = this::class.java.getResourceAsStream(jsonPath)?.bufferedReader()?.use { it.readText() }
        val gson = Gson()
        val database = gson.fromJson(json, KeywordDatabase::class.java)
        
        return database.libraries.flatMap { (libraryName, library) ->
            library.keywords.map { keyword ->
                keyword.name to RobotKeyword(
                    name = keyword.name,
                    syntax = keyword.syntax,
                    library = libraryName,
                    documentation = keyword.description,
                    arguments = keyword.arguments.map { 
                        KeywordArgument(it.name, it.default) 
                    },
                    source = "official"
                )
            }
        }.toMap()
    }
}
```

### Phase 2: Update KeywordService

```kotlin
// Modify loadOfficialKeywords() in KeywordService.kt
private fun loadOfficialKeywords() {
    try {
        // Try loading from JSON first
        val jsonKeywords = KeywordLoader.loadFromJson("/keywords.json")
        officialKeywords.putAll(jsonKeywords)
    } catch (e: Exception) {
        // Fallback to hardcoded keywords
        officialKeywords.putAll(getBuiltInKeywords())
        officialKeywords.putAll(getBrowserKeywords())
        // ... etc
    }
}
```

### Phase 3: Add Gson Dependency

```kotlin
// Add to build.gradle.kts
dependencies {
    implementation("com.google.code.gson:gson:2.10.1")
    // ... other dependencies
}
```

---

## Alternative Approaches

### Approach 1: Robot Framework Libdoc Integration
Use Robot Framework's `libdoc` tool to generate keyword documentation dynamically:

```kotlin
fun loadLibraryKeywords(libraryName: String): List<RobotKeyword> {
    val process = ProcessBuilder(
        "python", "-m", "robot.libdoc", 
        libraryName, "JSON"
    ).start()
    
    val json = process.inputStream.bufferedReader().readText()
    // Parse JSON output from libdoc
    return parseLibdocJson(json)
}
```

**Pros:**
- Always up-to-date with installed libraries
- Gets exact parameter information
- Works with any installed library

**Cons:**
- Requires Python and Robot Framework installed
- Slower performance
- May fail in restricted environments

---

### Approach 2: Online Keyword Repository
Fetch keywords from a centralized API/GitHub repository:

```kotlin
fun fetchKeywordsFromRemote(): Map<String, RobotKeyword> {
    val url = "https://raw.githubusercontent.com/..."
    val json = URL(url).readText()
    return parseKeywordJson(json)
}
```

**Pros:**
- Always latest keywords
- No plugin updates needed
- Community-maintained

**Cons:**
- Requires internet connection
- Privacy concerns
- Network latency

---

### Approach 3: Hybrid System (RECOMMENDED)

1. **Bundle** JSON file with plugin (fast, offline)
2. **Check for updates** on plugin load (optional)
3. **Cache** downloaded keywords locally
4. **Fallback** to bundled keywords if network fails

```kotlin
private fun loadOfficialKeywords() {
    // 1. Try loading from local cache
    val cachedKeywords = loadFromCache()
    if (cachedKeywords != null && !isExpired(cachedKeywords)) {
        officialKeywords.putAll(cachedKeywords)
        return
    }
    
    // 2. Try downloading latest from GitHub
    try {
        val latestKeywords = fetchFromGitHub()
        saveToCache(latestKeywords)
        officialKeywords.putAll(latestKeywords)
        return
    } catch (e: Exception) {
        // Network error, continue to fallback
    }
    
    // 3. Load from bundled JSON
    try {
        val bundledKeywords = KeywordLoader.loadFromJson("/keywords.json")
        officialKeywords.putAll(bundledKeywords)
    } catch (e: Exception) {
        // 4. Final fallback to hardcoded
        officialKeywords.putAll(getBuiltInKeywords())
        // ... etc
    }
}
```

---

## Migration Plan

### Step 1: Extract Current Keywords to JSON
Create a script to convert current hardcoded keywords to JSON format:

```bash
# Run this script to generate keywords.json
./extract_keywords_to_json.sh
```

### Step 2: Implement JSON Loader
Add `KeywordLoader.kt` and update `KeywordService.kt`

### Step 3: Test Both Approaches
Keep hardcoded keywords as fallback during testing phase

### Step 4: Release with JSON Support
Version 2.0.0 with JSON-based keyword loading

### Step 5: Gradual Deprecation
Remove hardcoded keywords in version 2.1.0

---

## Benefits for Users

### For Extension Users:
- Get new keywords without plugin updates
- Community can contribute keyword definitions
- Consistency between VSCode and PyCharm extensions

### For Contributors:
- Easy to add new libraries
- Simple PR process (just edit JSON)
- No Kotlin/TypeScript knowledge required

### For Maintainers:
- Single source of truth for keywords
- Easy to sync VSCode and PyCharm versions
- Reduced code maintenance

---

## Next Steps

1. ✅ Add remaining official libraries (DateTime, OperatingSystem, Process, XML, RequestsLibrary) - **DONE in v1.0.8**
2. ⏳ Create `keywords.json` with all current keywords
3. ⏳ Implement `KeywordLoader.kt`
4. ⏳ Test JSON loading system
5. ⏳ Update VSCode extension to use same JSON
6. ⏳ Release v2.0.0 with JSON-based auto-loading

---

## Contributing Keywords

Once JSON-based loading is implemented, users can contribute via:

1. Fork repository
2. Edit `src/main/resources/keywords.json`
3. Add new keywords following the schema
4. Submit pull request
5. Maintainers review and merge

**No coding required!** 🎉

---

## Related Files

- `src/main/kotlin/com/haitham/robotframework/services/KeywordService.kt` - Current keyword loading
- `src/main/kotlin/com/haitham/robotframework/model/RobotKeyword.kt` - Keyword data model
- `src/extension.ts` (VSCode) - VSCode keyword definitions

---

## Questions & Discussion

For questions or suggestions about the auto-loading system:
- Open an issue on GitHub
- Tag with `enhancement` and `keywords-auto-loading`
- Join the discussion at #123 (create discussion issue)
