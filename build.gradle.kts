plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.16.1"
}

group = "com.haitham.robotframework"
version = "1.0.8"

repositories {
    mavenCentral()
}

dependencies {
    // Kotlin stdlib is provided by IntelliJ Platform
}

configurations {
    all {
        exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk8")
        exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk7")
    }
}

// Configure Gradle IntelliJ Plugin
intellij {
    version.set("2023.2.5")
    type.set("PC") // Target IDE Platform: PC = PyCharm Community Edition
    
    plugins.set(listOf())
}

tasks {
    // Set the JVM compatibility versions
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }
    
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    patchPluginXml {
        sinceBuild.set("232")
        untilBuild.set("251.*")
        
        // Plugin description from README
        pluginDescription.set("""
            <p>Comprehensive Robot Framework extension with keyword explorer, auto-completion, 
            documentation viewer, and project scanning capabilities.</p>
            
            <h3>Features:</h3>
            <ul>
                <li><b>Project Keywords Explorer</b> - Automatic scanning and indexing of keywords</li>
                <li><b>Official Keywords Library</b> - Browser, SeleniumLibrary, BuiltIn, Collections, and more</li>
                <li><b>Variables Management</b> - Smart insertion with proper syntax</li>
                <li><b>Interactive Documentation</b> - View detailed keyword documentation</li>
                <li><b>One-click Imports</b> - Import libraries and resources instantly</li>
                <li><b>Search & Filter</b> - Quick keyword and variable search</li>
                <li><b>Parameter Dialog</b> - Interactive parameter input before insertion</li>
            </ul>
            
            <h3>Supported Libraries:</h3>
            <ul>
                <li>BuiltIn - 80+ Robot Framework standard library keywords</li>
                <li>Browser - Modern web testing with Playwright</li>
                <li>SeleniumLibrary - 150+ comprehensive Selenium keywords</li>
                <li>Collections - List and dictionary manipulation</li>
                <li>String - Text processing and manipulation</li>
                <li>DateTime - Date and time handling</li>
                <li>OperatingSystem - File system and OS interaction</li>
                <li>Process - Process execution and management</li>
                <li>XML - XML document processing</li>
                <li>RequestsLibrary - HTTP API testing</li>
            </ul>
        """.trimIndent())
        
        changeNotes.set("""
            <h3>Version 1.0.2</h3>
            <ul>
                <li>Interactive parameter input dialog for keywords</li>
                <li>Expanded library support (150+ SeleniumLibrary keywords)</li>
                <li>One-click imports for official libraries</li>
                <li>Enhanced search and filtering</li>
                <li>Improved UI and performance</li>
            </ul>
            
            <h3>Version 1.0.1</h3>
            <ul>
                <li>Enhanced keyword parameter handling</li>
                <li>Improved library detection</li>
                <li>Bug fixes</li>
            </ul>
            
            <h3>Version 1.0.0</h3>
            <ul>
                <li>Initial release</li>
                <li>Project and official keyword management</li>
                <li>Variables discovery and management</li>
                <li>Documentation viewer</li>
            </ul>
        """.trimIndent())
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }
    
    buildSearchableOptions {
        enabled = false
    }
}
