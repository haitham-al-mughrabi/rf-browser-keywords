package com.haitham.robotframework.model

data class RobotKeyword(
    val name: String,
    val implementation: String,
    val library: String,
    val description: String = "",
    val arguments: List<KeywordArgument> = emptyList(),
    val source: String = "",
    val filePath: String? = null,
    val returnType: String? = null,
    val tags: List<String> = emptyList(),
    val documentation: String = "",
    val folderPath: String? = null,
    val fileType: String? = null
) {
    override fun toString(): String = name
}

data class KeywordArgument(
    val name: String,
    val type: String = "string",
    val defaultValue: String? = null,
    val required: Boolean = true
)

data class RobotVariable(
    val name: String,
    val value: String,
    val type: String = "string",
    val source: String = "",
    val filePath: String? = null,
    val folderPath: String? = null,
    val fileName: String? = null
) {
    override fun toString(): String = name
}
