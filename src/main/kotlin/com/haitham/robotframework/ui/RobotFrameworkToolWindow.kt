package com.haitham.robotframework.ui

import com.haitham.robotframework.model.RobotKeyword
import com.haitham.robotframework.model.RobotVariable
import com.haitham.robotframework.services.KeywordService
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.application.ApplicationManager
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.ui.components.JBTabbedPane
import com.intellij.ui.components.JBTextField
import com.intellij.ui.treeStructure.Tree
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import java.awt.BorderLayout
import java.awt.GridBagLayout
import java.awt.GridBagConstraints
import java.awt.Insets
import java.awt.Toolkit
import java.awt.datatransfer.StringSelection
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.*
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeModel
import javax.swing.tree.TreePath

class RobotFrameworkToolWindow(private val project: Project) {
    
    private val keywordService = project.service<KeywordService>()
    private val tabbedPane = JBTabbedPane()
    
    private lateinit var projectKeywordsTree: Tree
    private lateinit var officialKeywordsTree: Tree
    private lateinit var variablesTree: Tree
    private lateinit var projectSearchField: JBTextField
    private lateinit var officialSearchField: JBTextField
    private lateinit var variablesSearchField: JBTextField
    private lateinit var documentationArea: JBTextArea
    
    private var allProjectKeywords = listOf<RobotKeyword>()
    private var allOfficialKeywords = listOf<RobotKeyword>()
    private var allVariables = listOf<RobotVariable>()
    
    init {
        initializeComponents()
        refreshData()
    }
    
    fun getContent(): JComponent {
        return tabbedPane
    }
    
    private fun initializeComponents() {
        // Project Keywords Tab
        projectKeywordsTree = createTree()
        projectSearchField = JBTextField()
        val projectPanel = createKeywordPanel(projectKeywordsTree, projectSearchField, "Project Keywords", true)
        tabbedPane.addTab("Project Keywords", projectPanel)
        
        // Official Keywords Tab
        officialKeywordsTree = createTree()
        officialSearchField = JBTextField()
        val officialPanel = createKeywordPanel(officialKeywordsTree, officialSearchField, "Official Keywords", false)
        tabbedPane.addTab("Official Keywords", officialPanel)
        
        // Variables Tab
        variablesTree = createTree()
        variablesSearchField = JBTextField()
        val variablesPanel = createVariablesPanel(variablesTree, variablesSearchField)
        tabbedPane.addTab("Variables", variablesPanel)
        
        // Documentation Tab
        val documentationPanel = createDocumentationPanel()
        tabbedPane.addTab("Documentation", documentationPanel)
        
        addTreeListeners()
    }
    
    private fun createKeywordPanel(tree: Tree, searchField: JBTextField, title: String, isProject: Boolean): JPanel {
        val panel = JPanel(BorderLayout())
        
        // Toolbar with search and buttons
        val toolbar = JPanel()
        toolbar.layout = BoxLayout(toolbar, BoxLayout.X_AXIS)
        
        if (isProject) {
            val refreshButton = JButton("⟳")
            refreshButton.toolTipText = "Refresh Keywords"
            refreshButton.addActionListener { refreshData() }
            toolbar.add(refreshButton)
            toolbar.add(Box.createHorizontalStrut(5))
        }
        
        toolbar.add(JLabel("Search: "))
        toolbar.add(Box.createHorizontalStrut(2))
        searchField.toolTipText = "Type to search keywords"
        toolbar.add(searchField)
        
        val clearButton = JButton("✕")
        clearButton.toolTipText = "Clear search"
        clearButton.addActionListener {
            searchField.text = ""
            filterKeywords(tree, searchField, isProject)
        }
        toolbar.add(Box.createHorizontalStrut(2))
        toolbar.add(clearButton)
        
        // Add search listener
        searchField.document.addDocumentListener(object : javax.swing.event.DocumentListener {
            override fun insertUpdate(e: javax.swing.event.DocumentEvent) = filterKeywords(tree, searchField, isProject)
            override fun removeUpdate(e: javax.swing.event.DocumentEvent) = filterKeywords(tree, searchField, isProject)
            override fun changedUpdate(e: javax.swing.event.DocumentEvent) = filterKeywords(tree, searchField, isProject)
        })
        
        panel.add(toolbar, BorderLayout.NORTH)
        panel.add(JBScrollPane(tree), BorderLayout.CENTER)
        
        return panel
    }
    
    private fun createVariablesPanel(tree: Tree, searchField: JBTextField): JPanel {
        val panel = JPanel(BorderLayout())
        
        // Toolbar
        val toolbar = JPanel()
        toolbar.layout = BoxLayout(toolbar, BoxLayout.X_AXIS)
        
        val refreshButton = JButton("⟳")
        refreshButton.toolTipText = "Refresh Variables"
        refreshButton.addActionListener { refreshData() }
        toolbar.add(refreshButton)
        toolbar.add(Box.createHorizontalStrut(5))
        
        toolbar.add(JLabel("Search: "))
        toolbar.add(Box.createHorizontalStrut(2))
        searchField.toolTipText = "Type to search variables"
        toolbar.add(searchField)
        
        val clearButton = JButton("✕")
        clearButton.toolTipText = "Clear search"
        clearButton.addActionListener {
            searchField.text = ""
            filterVariables(tree, searchField)
        }
        toolbar.add(Box.createHorizontalStrut(2))
        toolbar.add(clearButton)
        
        // Add search listener
        searchField.document.addDocumentListener(object : javax.swing.event.DocumentListener {
            override fun insertUpdate(e: javax.swing.event.DocumentEvent) = filterVariables(tree, searchField)
            override fun removeUpdate(e: javax.swing.event.DocumentEvent) = filterVariables(tree, searchField)
            override fun changedUpdate(e: javax.swing.event.DocumentEvent) = filterVariables(tree, searchField)
        })
        
        panel.add(toolbar, BorderLayout.NORTH)
        panel.add(JBScrollPane(tree), BorderLayout.CENTER)
        
        return panel
    }
    
    private fun createDocumentationPanel(): JPanel {
        val panel = JPanel(BorderLayout())
        
        documentationArea = JBTextArea()
        documentationArea.isEditable = false
        documentationArea.lineWrap = true
        documentationArea.wrapStyleWord = true
        documentationArea.text = "Select a keyword or variable to view its documentation."
        
        val scrollPane = JBScrollPane(documentationArea)
        panel.add(scrollPane, BorderLayout.CENTER)
        
        val clearButton = JButton("Clear")
        clearButton.addActionListener {
            documentationArea.text = "Select a keyword or variable to view its documentation."
        }
        
        val buttonPanel = JPanel()
        buttonPanel.add(clearButton)
        panel.add(buttonPanel, BorderLayout.SOUTH)
        
        return panel
    }
    
    private fun createTree(): Tree {
        val root = DefaultMutableTreeNode("Root")
        val tree = Tree(DefaultTreeModel(root))
        tree.isRootVisible = false
        tree.showsRootHandles = true
        return tree
    }
    
    private fun addTreeListeners() {
        addKeywordTreeListeners(projectKeywordsTree)
        addKeywordTreeListeners(officialKeywordsTree)
        addVariableTreeListeners(variablesTree)
    }
    
    private fun addKeywordTreeListeners(tree: Tree) {
        // Double-click to insert
        tree.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (e.clickCount == 2) {
                    getSelectedKeyword(tree)?.let { insertKeyword(it) }
                } else if (SwingUtilities.isRightMouseButton(e)) {
                    val path = tree.getPathForLocation(e.x, e.y)
                    if (path != null) {
                        tree.selectionPath = path
                        showKeywordContextMenu(tree, e.x, e.y)
                    }
                }
            }
        })
        
        // Selection listener for documentation
        tree.addTreeSelectionListener {
            getSelectedKeyword(tree)?.let { showKeywordDocumentation(it) }
        }
    }
    
    private fun addVariableTreeListeners(tree: Tree) {
        tree.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (e.clickCount == 2) {
                    getSelectedVariable()?.let { insertVariable(it) }
                } else if (SwingUtilities.isRightMouseButton(e)) {
                    val path = tree.getPathForLocation(e.x, e.y)
                    if (path != null) {
                        tree.selectionPath = path
                        showVariableContextMenu(tree, e.x, e.y)
                    }
                }
            }
        })
        
        tree.addTreeSelectionListener {
            getSelectedVariable()?.let { showVariableDocumentation(it) }
        }
    }
    
    private fun showKeywordContextMenu(tree: Tree, x: Int, y: Int) {
        val path = tree.getPathForLocation(x, y) ?: return
        val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return
        val userObject = node.userObject
        
        val menu = JPopupMenu()
        
        // Check if this is a file node (not a keyword, not a folder)
        if (userObject is String && !node.isLeaf && node.parent != null) {
            // This is a FILE node - show import option
            val fileName = userObject
            
            // Find a keyword from this file to get file path
            val firstChild = if (node.childCount > 0) node.getChildAt(0) as? DefaultMutableTreeNode else null
            val sampleKeyword = firstChild?.userObject as? RobotKeyword
            
            if (sampleKeyword?.filePath != null) {
                val importItem = JMenuItem("Import Library/Resource")
                importItem.addActionListener { importResourceByPath(sampleKeyword.filePath, sampleKeyword.source, false) }
                menu.add(importItem)
                
                val openFileItem = JMenuItem("Open Source File")
                openFileItem.addActionListener { openSourceFile(sampleKeyword.filePath) }
                menu.add(openFileItem)
            }
            
            menu.show(tree, x, y)
            return
        }
        
        // Otherwise, this is a keyword node
        val keyword = userObject as? RobotKeyword ?: return
        
        val insertItem = JMenuItem("✓ Insert Keyword")
        insertItem.addActionListener { insertKeyword(keyword) }
        menu.add(insertItem)
        
        val copyItem = JMenuItem("Copy Keyword")
        copyItem.addActionListener { copyKeyword(keyword) }
        menu.add(copyItem)
        
        menu.addSeparator()
        
        if (keyword.filePath != null) {
            val openFileItem = JMenuItem("Open Source File")
            openFileItem.addActionListener { openSourceFile(keyword.filePath) }
            menu.add(openFileItem)
            
            menu.addSeparator()
        }
        
        val docItem = JMenuItem("Show Documentation")
        docItem.addActionListener {
            showKeywordDocumentation(keyword)
            tabbedPane.selectedIndex = 3
        }
        menu.add(docItem)
        
        menu.show(tree, x, y)
    }
    
    private fun showVariableContextMenu(tree: Tree, x: Int, y: Int) {
        val path = tree.getPathForLocation(x, y) ?: return
        val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return
        val userObject = node.userObject
        
        val menu = JPopupMenu()
        
        // Check if this is a file node
        if (userObject is String && !node.isLeaf && node.parent != null) {
            // This is a FILE node - show import option
            val fileName = userObject
            
            // Find a variable from this file to get file path
            val firstChild = if (node.childCount > 0) node.getChildAt(0) as? DefaultMutableTreeNode else null
            val sampleVariable = firstChild?.userObject as? RobotVariable
            
            if (sampleVariable?.filePath != null) {
                val importItem = JMenuItem("Import Variables/Resource")
                importItem.addActionListener { importResourceByPath(sampleVariable.filePath, sampleVariable.source, true) }
                menu.add(importItem)
                
                val openFileItem = JMenuItem("Open Source File")
                openFileItem.addActionListener { openSourceFile(sampleVariable.filePath) }
                menu.add(openFileItem)
            }
            
            menu.show(tree, x, y)
            return
        }
        
        // Otherwise, this is a variable node
        val variable = userObject as? RobotVariable ?: return
        
        val insertItem = JMenuItem("Insert Variable")
        insertItem.addActionListener { insertVariable(variable) }
        menu.add(insertItem)
        
        val copyItem = JMenuItem("Copy Variable")
        copyItem.addActionListener { copyVariable(variable) }
        menu.add(copyItem)
        
        menu.addSeparator()
        
        if (variable.filePath != null) {
            val openFileItem = JMenuItem("Open Source File")
            openFileItem.addActionListener { openSourceFile(variable.filePath) }
            menu.add(openFileItem)
            
            menu.addSeparator()
        }
        
        val docItem = JMenuItem("Show Details")
        docItem.addActionListener {
            showVariableDocumentation(variable)
            tabbedPane.selectedIndex = 3
        }
        menu.add(docItem)
        
        menu.show(tree, x, y)
    }
    
    private fun insertKeyword(keyword: RobotKeyword) {
        val editor = FileEditorManager.getInstance(project).selectedTextEditor
        if (editor == null) {
            showNotification("ERROR: No active editor found. Please open a .robot file first.")
            return
        }
        
        try {
            com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
                val document = editor.document
                val caretOffset = editor.caretModel.offset
                val lineNumber = document.getLineNumber(caretOffset)
                val lineStartOffset = document.getLineStartOffset(lineNumber)
                val lineText = document.getText(com.intellij.openapi.util.TextRange(lineStartOffset, caretOffset))
                
                // Insert the keyword implementation as-is (already has proper spacing)
                val keywordText = keyword.implementation + "\n"
                
                document.insertString(caretOffset, keywordText)
                
                // Move cursor to after the inserted text
                editor.caretModel.moveToOffset(caretOffset + keywordText.length)
            }
            showNotification("✓ Inserted: ${keyword.name}")
        } catch (e: Exception) {
            showNotification("ERROR inserting: ${e.message}")
            e.printStackTrace()
        }
    }
    
    private fun copyKeyword(keyword: RobotKeyword) {
        val clipboard = Toolkit.getDefaultToolkit().systemClipboard
        clipboard.setContents(StringSelection(keyword.implementation), null)
        showNotification("Copied: ${keyword.name}")
    }
    
    private fun insertVariable(variable: RobotVariable) {
        val editor = FileEditorManager.getInstance(project).selectedTextEditor
        if (editor != null) {
            com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
                val document = editor.document
                val offset = editor.caretModel.offset
                val varName = if (variable.name.startsWith("\${")) variable.name else "\${${variable.name}}"
                document.insertString(offset, varName)
                editor.caretModel.moveToOffset(offset + varName.length)
            }
            showNotification("✓ Inserted: ${variable.name}")
        } else {
            showNotification("No active editor found")
        }
    }
    
    private fun copyVariable(variable: RobotVariable) {
        val varName = if (variable.name.startsWith("\${")) variable.name else "\${${variable.name}}"
        val clipboard = Toolkit.getDefaultToolkit().systemClipboard
        clipboard.setContents(StringSelection(varName), null)
        showNotification("Copied: ${variable.name}")
    }
    
    private fun showKeywordDocumentation(keyword: RobotKeyword) {
        val doc = buildString {
            appendLine("KEYWORD: ${keyword.name}")
            appendLine("Library: ${keyword.library}")
            appendLine()
            if (keyword.arguments.isNotEmpty()) {
                appendLine("Arguments:")
                keyword.arguments.forEach { arg ->
                    append("  - ${arg.name}")
                    if (arg.defaultValue != null) append(" = ${arg.defaultValue}")
                    if (!arg.required) append(" (optional)")
                    appendLine()
                }
                appendLine()
            }
            if (keyword.description.isNotBlank()) {
                appendLine("Description:")
                appendLine(keyword.description)
                appendLine()
            }
            if (keyword.filePath != null) {
                appendLine("Source:")
                appendLine(keyword.filePath)
            }
        }
        documentationArea.text = doc
    }
    
    private fun showVariableDocumentation(variable: RobotVariable) {
        val doc = buildString {
            appendLine("VARIABLE: ${variable.name}")
            appendLine("Type: ${variable.type}")
            appendLine("Source: ${variable.source}")
            appendLine()
            appendLine("Value:")
            appendLine(variable.value)
            if (variable.filePath != null) {
                appendLine()
                appendLine("File:")
                appendLine(variable.filePath)
            }
        }
        documentationArea.text = doc
    }
    
    private fun refreshData() {
        keywordService.refreshKeywords()
        allProjectKeywords = keywordService.getProjectKeywords()
        allOfficialKeywords = keywordService.getOfficialKeywords()
        allVariables = keywordService.getVariables()
        
        updateTree(projectKeywordsTree, allProjectKeywords, false) // collapsed
        updateTree(officialKeywordsTree, allOfficialKeywords, false) // collapsed
        updateVariablesTree(variablesTree, allVariables, false) // collapsed
        
        showNotification("Keywords and variables refreshed")
    }
    
    private fun filterKeywords(tree: Tree, searchField: JBTextField, isProject: Boolean) {
        val searchText = searchField.text.trim()
        val keywords = if (isProject) allProjectKeywords else allOfficialKeywords
        
        if (searchText.isEmpty()) {
            updateTree(tree, keywords, false)
        } else {
            val filtered = keywords.filter {
                it.name.contains(searchText, ignoreCase = true) ||
                it.library.contains(searchText, ignoreCase = true)
            }
            updateTree(tree, filtered, true) // expand when searching
        }
    }
    
    private fun filterVariables(tree: Tree, searchField: JBTextField) {
        val searchText = searchField.text.trim()
        
        if (searchText.isEmpty()) {
            updateVariablesTree(tree, allVariables, false)
        } else {
            val filtered = allVariables.filter {
                it.name.contains(searchText, ignoreCase = true) ||
                it.value.contains(searchText, ignoreCase = true)
            }
            updateVariablesTree(tree, filtered, true) // expand when searching
        }
    }
    
    private fun updateTree(tree: Tree, keywords: List<RobotKeyword>, expand: Boolean) {
        val root = DefaultMutableTreeNode("Keywords")
        
        if (keywords.isEmpty()) {
            val emptyNode = DefaultMutableTreeNode("No keywords found - click Refresh")
            root.add(emptyNode)
            tree.model = DefaultTreeModel(root)
            return
        }
        
        // For official keywords, group ONLY by library (no folders)
        val officialKeywords = keywords.filter { it.source == "official" }
        if (officialKeywords.isNotEmpty()) {
            val libraryGroups = officialKeywords.groupBy { it.library }
            libraryGroups.toSortedMap().forEach { (library, keywordList) ->
                val libraryNode = DefaultMutableTreeNode("$library (${keywordList.size})")
                root.add(libraryNode)
                keywordList.sortedBy { it.name }.forEach { keyword ->
                    libraryNode.add(DefaultMutableTreeNode(keyword))
                }
            }
        }
        
        // For project keywords: Build hierarchical folder tree
        val projectKeywords = keywords.filter { it.source != "official" }
        if (projectKeywords.isNotEmpty()) {
            // Build folder hierarchy tree
            val folderTree = buildFolderHierarchy(projectKeywords)
            addFolderTreeNodes(root, folderTree)
        }
        
        tree.model = DefaultTreeModel(root)
        if (expand) {
            expandTree(tree)
        }
    }
    
    private fun updateVariablesTree(tree: Tree, variables: List<RobotVariable>, expand: Boolean) {
        val root = DefaultMutableTreeNode("Variables")
        
        if (variables.isEmpty()) {
            val emptyNode = DefaultMutableTreeNode("No variables found - click Refresh")
            root.add(emptyNode)
            tree.model = DefaultTreeModel(root)
            return
        }
        
        // Build folder hierarchy tree for variables
        val folderTree = buildVariableFolderHierarchy(variables)
        addVariableFolderTreeNodes(root, folderTree)
        
        tree.model = DefaultTreeModel(root)
        if (expand) {
            expandTree(tree)
        }
    }
    
    private fun expandTree(tree: Tree) {
        for (i in 0 until tree.rowCount) {
            tree.expandRow(i)
        }
    }
    
    // Hierarchical folder tree structure
    data class FolderTreeNode(
        val name: String,
        val subfolders: MutableMap<String, FolderTreeNode> = mutableMapOf(),
        val files: MutableMap<String, List<RobotKeyword>> = mutableMapOf()
    )
    
    private fun buildFolderHierarchy(keywords: List<RobotKeyword>): FolderTreeNode {
        val root = FolderTreeNode("Root")
        
        keywords.forEach { keyword ->
            val folderPath = when {
                keyword.folderPath.isNullOrBlank() -> ""
                keyword.folderPath == "." -> ""
                keyword.folderPath == "Root" -> ""
                else -> keyword.folderPath
            }
            
            // Navigate/create folder structure
            var currentNode = root
            if (folderPath.isNotEmpty()) {
                val pathParts = folderPath.split("/", "\\")
                pathParts.forEach { part ->
                    if (part.isNotEmpty()) {
                        currentNode = currentNode.subfolders.getOrPut(part) {
                            FolderTreeNode(part)
                        }
                    }
                }
            }
            
            // Add file to current folder
            val fileName = keyword.library
            val displayName = when {
                fileName.endsWith(".py") -> fileName
                fileName.endsWith(".robot") -> fileName
                fileName.endsWith(".resource") -> fileName
                keyword.source == "python" -> "$fileName.py"
                keyword.filePath?.endsWith(".resource") == true -> "$fileName.resource"
                else -> "$fileName.robot"
            }
            
            val existingKeywords = currentNode.files[displayName] ?: emptyList()
            currentNode.files[displayName] = existingKeywords + keyword
        }
        
        return root
    }
    
    private fun addFolderTreeNodes(parentNode: DefaultMutableTreeNode, folderTreeNode: FolderTreeNode) {
        // Add subfolders first (sorted)
        folderTreeNode.subfolders.toSortedMap().forEach { (folderName, childTreeNode) ->
            val folderDisplayNode = DefaultMutableTreeNode("📁 $folderName")
            parentNode.add(folderDisplayNode)
            addFolderTreeNodes(folderDisplayNode, childTreeNode)
        }
        
        // Then add files (sorted)
        folderTreeNode.files.toSortedMap().forEach { (fileName, keywordList) ->
            val fileNode = DefaultMutableTreeNode(fileName)
            parentNode.add(fileNode)
            
            keywordList.sortedBy { it.name }.forEach { keyword ->
                fileNode.add(DefaultMutableTreeNode(keyword))
            }
        }
    }
    
    // Variable folder tree structure
    data class VariableFolderTreeNode(
        val name: String,
        val subfolders: MutableMap<String, VariableFolderTreeNode> = mutableMapOf(),
        val files: MutableMap<String, List<RobotVariable>> = mutableMapOf()
    )
    
    private fun buildVariableFolderHierarchy(variables: List<RobotVariable>): VariableFolderTreeNode {
        val root = VariableFolderTreeNode("Root")
        
        variables.forEach { variable ->
            val folderPath = when {
                variable.folderPath.isNullOrBlank() -> ""
                variable.folderPath == "." -> ""
                variable.folderPath == "Root" -> ""
                else -> variable.folderPath
            }
            
            // Navigate/create folder structure
            var currentNode = root
            if (folderPath.isNotEmpty()) {
                val pathParts = folderPath.split("/", "\\")
                pathParts.forEach { part ->
                    if (part.isNotEmpty()) {
                        currentNode = currentNode.subfolders.getOrPut(part) {
                            VariableFolderTreeNode(part)
                        }
                    }
                }
            }
            
            // Add file to current folder
            val fileName = variable.fileName ?: "Unknown"
            val displayName = when {
                fileName.endsWith(".py") -> fileName
                fileName.endsWith(".robot") -> fileName
                fileName.endsWith(".resource") -> fileName
                variable.source == "python" -> "$fileName.py"
                variable.filePath?.endsWith(".resource") == true -> "$fileName.resource"
                else -> "$fileName.robot"
            }
            
            val existingVariables = currentNode.files[displayName] ?: emptyList()
            currentNode.files[displayName] = existingVariables + variable
        }
        
        return root
    }
    
    private fun addVariableFolderTreeNodes(parentNode: DefaultMutableTreeNode, folderTreeNode: VariableFolderTreeNode) {
        // Add subfolders first (sorted)
        folderTreeNode.subfolders.toSortedMap().forEach { (folderName, childTreeNode) ->
            val folderDisplayNode = DefaultMutableTreeNode("📁 $folderName")
            parentNode.add(folderDisplayNode)
            addVariableFolderTreeNodes(folderDisplayNode, childTreeNode)
        }
        
        // Then add files (sorted)
        folderTreeNode.files.toSortedMap().forEach { (fileName, variableList) ->
            val fileNode = DefaultMutableTreeNode(fileName)
            parentNode.add(fileNode)
            
            variableList.sortedBy { it.name }.forEach { variable ->
                fileNode.add(DefaultMutableTreeNode(variable))
            }
        }
    }
    
    private fun getSelectedKeyword(tree: Tree): RobotKeyword? {
        val path = tree.selectionPath ?: return null
        val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return null
        return node.userObject as? RobotKeyword
    }
    
    private fun getSelectedVariable(): RobotVariable? {
        val path = variablesTree.selectionPath ?: return null
        val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return null
        return node.userObject as? RobotVariable
    }
    
    private fun importResourceByPath(filePath: String, source: String?, isVariable: Boolean) {
        val editor = FileEditorManager.getInstance(project).selectedTextEditor
        if (editor == null) {
            showNotification("ERROR: No active editor. Open a .robot file first.")
            return
        }
        
        val projectPath = project.basePath ?: return
        
        try {
            com.intellij.openapi.command.WriteCommandAction.runWriteCommandAction(project) {
                val document = editor.document
                val text = document.text
                
                // Calculate relative path from project root
                val relativePath = if (filePath.startsWith(projectPath)) {
                    filePath.substring(projectPath.length + 1).replace("\\", "/")
                } else {
                    filePath
                }
                
                // Determine import type based on file type and whether it's a variable
                val importLine = when {
                    filePath.endsWith(".robot") -> "Resource    $relativePath"
                    filePath.endsWith(".resource") -> "Resource    $relativePath"
                    filePath.endsWith(".py") && isVariable -> "Variables    $relativePath"  // .py variables use Variables tag
                    filePath.endsWith(".py") && !isVariable -> "Library    $relativePath"    // .py keywords use Library tag
                    else -> "Resource    $relativePath"
                }
                
                // Find or create Settings section
                val settingsRegex = Regex("\\*+\\s*Settings?\\s*\\*+", RegexOption.IGNORE_CASE)
                val settingsMatch = settingsRegex.find(text)
                
                if (settingsMatch != null) {
                    // Settings section exists, check if import already there
                    if (text.contains(importLine)) {
                        showNotification("Already imported: $importLine")
                        return@runWriteCommandAction
                    }
                    
                    // Insert after Settings header
                    val insertPos = settingsMatch.range.last + 1
                    document.insertString(insertPos, "\n$importLine")
                    showNotification("✓ Imported: $importLine")
                } else {
                    // No Settings section, create at beginning
                    val settingsSection = "*** Settings ***\n$importLine\n\n"
                    document.insertString(0, settingsSection)
                    showNotification("✓ Created Settings and imported: $importLine")
                }
            }
        } catch (e: Exception) {
            showNotification("ERROR importing: ${e.message}")
            e.printStackTrace()
        }
    }
    
    private fun openSourceFile(filePath: String) {
        try {
            val virtualFile = com.intellij.openapi.vfs.LocalFileSystem.getInstance()
                .findFileByPath(filePath)
            if (virtualFile != null) {
                FileEditorManager.getInstance(project).openFile(virtualFile, true)
            } else {
                showNotification("File not found: $filePath")
            }
        } catch (e: Exception) {
            showNotification("ERROR opening file: ${e.message}")
        }
    }
    
    private fun showNotification(message: String) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Robot Framework")
            .createNotification(message, NotificationType.INFORMATION)
            .notify(project)
    }
}
