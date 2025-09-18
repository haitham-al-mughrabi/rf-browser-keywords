"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function activate(context) {
    const provider = new RobotFrameworkKeywordProvider();
    vscode.window.registerTreeDataProvider('rfBrowserKeywords', provider);
    // Clear old keywords and scan workspace for keywords on activation
    const clearAndScan = async () => {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('customKeywords', [], vscode.ConfigurationTarget.Global);
        await scanWorkspaceKeywords();
        provider.refresh();
    };
    clearAndScan();
    vscode.commands.registerCommand('rfBrowserKeywords.insertKeyword', (item) => {
        if (item.implementation) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const position = editor.selection.active;
                const keywordWithNewline = item.implementation + '\n';
                editor.edit(editBuilder => {
                    editBuilder.insert(position, keywordWithNewline);
                });
                vscode.window.showInformationMessage(`Inserted: ${item.label}`);
            }
        }
    });
    vscode.commands.registerCommand('rfBrowserKeywords.copyKeyword', (item) => {
        if (item.implementation) {
            vscode.env.clipboard.writeText(item.implementation);
            vscode.window.showInformationMessage(`Copied: ${item.label}`);
        }
    });
    vscode.commands.registerCommand('rfBrowserKeywords.customizeKeyword', async (item) => {
        if (item.implementation) {
            const customizedKeyword = await customizeKeywordParameters(item);
            if (customizedKeyword) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const position = editor.selection.active;
                    const keywordWithNewline = customizedKeyword + '\n';
                    editor.edit(editBuilder => {
                        editBuilder.insert(position, keywordWithNewline);
                    });
                    vscode.window.showInformationMessage(`Inserted customized: ${item.label}`);
                }
            }
        }
    });
    vscode.commands.registerCommand('rfBrowserKeywords.refresh', async () => {
        vscode.window.showInformationMessage('Scanning workspace for keywords...');
        // Clear existing custom keywords to force fresh scan
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('customKeywords', [], vscode.ConfigurationTarget.Global);
        await scanWorkspaceKeywords();
        provider.refresh();
    });
    vscode.commands.registerCommand('rfBrowserKeywords.editKeywordDefaults', async () => {
        await editKeywordDefaults();
    });
    vscode.commands.registerCommand('rfBrowserKeywords.addCustomKeyword', async () => {
        await addCustomKeyword();
        provider.refresh();
    });
}
exports.activate = activate;
async function customizeKeywordParameters(item) {
    const implementation = item.implementation;
    const placeholders = implementation.match(/\$\{[^}]+\}/g) || [];
    if (placeholders.length === 0) {
        return implementation;
    }
    let customizedKeyword = implementation;
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const defaultValues = config.get('defaultValues', {});
    for (const placeholder of placeholders) {
        const paramName = placeholder.replace(/\$\{|\}/g, '');
        const defaultValue = defaultValues[paramName] || getBuiltInDefault(paramName);
        const value = await vscode.window.showInputBox({
            prompt: `Enter value for parameter: ${paramName}`,
            placeHolder: placeholder,
            value: defaultValue
        });
        if (value === undefined) {
            // User cancelled
            return undefined;
        }
        customizedKeyword = customizedKeyword.replace(placeholder, value || placeholder);
    }
    return customizedKeyword;
}
function getBuiltInDefault(paramName) {
    const builtInDefaults = {
        'url': 'https://example.com',
        'selector': 'css=.my-element',
        'text': 'Sample text',
        'browser': 'chromium',
        'timeout': '10s',
        'filename': 'screenshot.png',
        'path': '/path/to/file',
        'message': 'Test message',
        'value': 'test_value',
        'key': 'test_key'
    };
    return builtInDefaults[paramName] || '';
}
async function editKeywordDefaults() {
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const currentDefaults = config.get('defaultValues', {});
    const result = await vscode.window.showQuickPick([
        { label: '$(add) Add New Default', action: 'add' },
        { label: '$(edit) Edit Existing Defaults', action: 'edit' },
        { label: '$(trash) Reset to Defaults', action: 'reset' }
    ], {
        placeHolder: 'Choose an action for keyword defaults'
    });
    if (!result)
        return;
    switch (result.action) {
        case 'add':
            await addNewDefault(currentDefaults);
            break;
        case 'edit':
            await editExistingDefaults(currentDefaults);
            break;
        case 'reset':
            await resetDefaults();
            break;
    }
}
async function addNewDefault(currentDefaults) {
    const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name (without ${} brackets)',
        placeHolder: 'e.g., url, selector, text'
    });
    if (!paramName)
        return;
    const defaultValue = await vscode.window.showInputBox({
        prompt: `Enter default value for parameter: ${paramName}`,
        placeHolder: 'Default value'
    });
    if (defaultValue !== undefined) {
        currentDefaults[paramName] = defaultValue;
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('defaultValues', currentDefaults, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Added default for ${paramName}: ${defaultValue}`);
    }
}
async function editExistingDefaults(currentDefaults) {
    const items = Object.entries(currentDefaults).map(([key, value]) => ({
        label: key,
        description: value,
        key: key,
        value: value
    }));
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select parameter to edit'
    });
    if (!selected)
        return;
    const newValue = await vscode.window.showInputBox({
        prompt: `Edit default value for: ${selected.key}`,
        value: selected.value
    });
    if (newValue !== undefined) {
        currentDefaults[selected.key] = newValue;
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('defaultValues', currentDefaults, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Updated default for ${selected.key}: ${newValue}`);
    }
}
async function resetDefaults() {
    const confirmed = await vscode.window.showWarningMessage('Reset all keyword defaults to built-in values?', { modal: true }, 'Reset');
    if (confirmed === 'Reset') {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('defaultValues', undefined, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Keyword defaults reset to built-in values');
    }
}
async function addCustomKeyword() {
    const name = await vscode.window.showInputBox({
        prompt: 'Enter keyword name',
        placeHolder: 'e.g., My Custom Keyword'
    });
    if (!name)
        return;
    const implementation = await vscode.window.showInputBox({
        prompt: 'Enter keyword implementation',
        placeHolder: 'e.g., My Custom Keyword    ${param1}    ${param2}'
    });
    if (!implementation)
        return;
    const library = await vscode.window.showInputBox({
        prompt: 'Enter library name',
        placeHolder: 'e.g., Custom, MyLibrary',
        value: 'Custom'
    });
    if (!library)
        return;
    const description = await vscode.window.showInputBox({
        prompt: 'Enter description (optional)',
        placeHolder: 'Brief description of what this keyword does'
    });
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const customKeywords = config.get('customKeywords', []);
    customKeywords.push({
        name,
        implementation,
        library,
        description: description || ''
    });
    await config.update('customKeywords', customKeywords, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Added custom keyword: ${name}`);
}
async function scanWorkspaceKeywords() {
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const shouldScan = config.get('scanCustomKeywords', true);
    if (!shouldScan)
        return;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders)
        return;
    const discoveredKeywords = [];
    for (const folder of workspaceFolders) {
        const workspacePath = folder.uri.fsPath;
        // Check if the workspace has Robot Framework project structure
        let basePath = workspacePath;
        let hasFolders = fs.existsSync(path.join(workspacePath, 'Libraries')) ||
            fs.existsSync(path.join(workspacePath, 'POM')) ||
            fs.existsSync(path.join(workspacePath, 'Utilities')) ||
            fs.existsSync(path.join(workspacePath, 'Resources'));
        // If not, check if there's a sample-workspace subdirectory (for development)
        if (!hasFolders) {
            const sampleWorkspacePath = path.join(workspacePath, 'sample-workspace');
            if (fs.existsSync(sampleWorkspacePath)) {
                basePath = sampleWorkspacePath;
                hasFolders = true;
            }
        }
        if (hasFolders) {
            // Scan Libraries folder recursively for Python keywords
            await scanPythonKeywords(path.join(basePath, 'Libraries'), discoveredKeywords, basePath);
            // Scan POM folder recursively for Robot/Resource keywords
            await scanRobotKeywords(path.join(basePath, 'POM'), discoveredKeywords, basePath);
            // Scan Utilities folder for both Python and Robot keywords
            await scanUtilitiesFolder(path.join(basePath, 'Utilities'), discoveredKeywords, basePath);
            // Scan Resources folder for both Python and Robot keywords
            await scanResourcesFolder(path.join(basePath, 'Resources'), discoveredKeywords, basePath);
            // Scan root level for any .resource files
            await scanRootResourceFiles(basePath, discoveredKeywords, basePath);
        }
    }
    if (discoveredKeywords.length > 0) {
        // Merge with existing custom keywords
        const existingKeywords = config.get('customKeywords', []);
        const mergedKeywords = mergeKeywords(existingKeywords, discoveredKeywords);
        await config.update('customKeywords', mergedKeywords, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Discovered ${discoveredKeywords.length} keywords from workspace`);
    }
    else {
        vscode.window.showInformationMessage('No keywords found in workspace');
    }
}
async function scanPythonKeywords(librariesPath, keywords, basePath) {
    if (!fs.existsSync(librariesPath)) {
        return;
    }
    try {
        const files = await getAllPythonFiles(librariesPath);
        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedKeywords = extractPythonKeywords(content, filePath, basePath);
            keywords.push(...extractedKeywords);
        }
    }
    catch (error) {
        console.error('Error scanning Python keywords:', error);
    }
}
async function scanRobotKeywords(keywordsPath, keywords, basePath) {
    if (!fs.existsSync(keywordsPath)) {
        return;
    }
    try {
        const files = await getAllRobotFiles(keywordsPath);
        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedKeywords = extractRobotKeywords(content, filePath, basePath);
            keywords.push(...extractedKeywords);
        }
    }
    catch (error) {
        console.error('Error scanning Robot keywords:', error);
    }
}
async function scanUtilitiesFolder(utilitiesPath, keywords, basePath) {
    if (!fs.existsSync(utilitiesPath))
        return;
    try {
        // Scan Python files in Utilities
        const pythonFiles = await getAllPythonFiles(utilitiesPath);
        for (const filePath of pythonFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedKeywords = extractPythonKeywords(content, filePath, basePath);
            keywords.push(...extractedKeywords);
        }
        // Scan Robot files in Utilities
        const robotFiles = await getAllRobotFiles(utilitiesPath);
        for (const filePath of robotFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedKeywords = extractRobotKeywords(content, filePath, basePath);
            keywords.push(...extractedKeywords);
        }
    }
    catch (error) {
        console.error('Error scanning Utilities folder:', error);
    }
}
async function scanResourcesFolder(resourcesPath, keywords, basePath) {
    if (!fs.existsSync(resourcesPath))
        return;
    try {
        // Scan Python files in Resources
        const pythonFiles = await getAllPythonFiles(resourcesPath);
        for (const filePath of pythonFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedKeywords = extractPythonKeywords(content, filePath, basePath);
            keywords.push(...extractedKeywords);
        }
        // Scan Robot/Resource files in Resources
        const robotFiles = await getAllRobotFiles(resourcesPath);
        for (const filePath of robotFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedKeywords = extractRobotKeywords(content, filePath, basePath);
            keywords.push(...extractedKeywords);
        }
    }
    catch (error) {
        console.error('Error scanning Resources folder:', error);
    }
}
async function scanRootResourceFiles(rootPath, keywords, basePath) {
    if (!fs.existsSync(rootPath))
        return;
    try {
        // Only scan direct files in root, not subdirectories
        const items = fs.readdirSync(rootPath);
        for (const item of items) {
            const itemPath = path.join(rootPath, item);
            const stat = fs.statSync(itemPath);
            // Only process files, not directories
            if (!stat.isDirectory() && item.endsWith('.resource')) {
                const content = fs.readFileSync(itemPath, 'utf-8');
                const extractedKeywords = extractRobotKeywords(content, itemPath, basePath);
                keywords.push(...extractedKeywords);
            }
        }
    }
    catch (error) {
        console.error('Error scanning root resource files:', error);
    }
}
async function getAllPythonFiles(dirPath) {
    const files = [];
    function scanDirectory(currentPath) {
        if (!fs.existsSync(currentPath))
            return;
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                scanDirectory(itemPath); // Recursive scan
            }
            else if (item.endsWith('.py')) {
                files.push(itemPath);
            }
        }
    }
    scanDirectory(dirPath);
    return files;
}
async function getAllRobotFiles(dirPath) {
    const files = [];
    function scanDirectory(currentPath) {
        if (!fs.existsSync(currentPath))
            return;
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                scanDirectory(itemPath); // Recursive scan
            }
            else if (item.endsWith('.robot') || item.endsWith('.resource')) {
                files.push(itemPath);
            }
        }
    }
    scanDirectory(dirPath);
    return files;
}
function extractPythonKeywords(content, filePath, basePath) {
    const keywords = [];
    const fileName = path.basename(filePath, '.py');
    // Match Python methods with @keyword decorator or public methods
    // Pattern 1: @keyword("Keyword Name") or @keyword decorator
    const keywordDecoratorRegex = /@keyword\s*\(\s*['"](.*?)['"][\s\S]*?\)\s*\n\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\):/g;
    const simpleKeywordDecoratorRegex = /@keyword\s*\n\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\):/g;
    // Pattern 2: Regular public methods (fallback)
    const methodRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\):/g;
    // Get relative path from workspace for organization
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let relativePath = filePath;
    let folderPath = 'Root';
    if (workspaceFolders && workspaceFolders.length > 0) {
        // Use basePath if provided, otherwise use workspace path
        const referencePath = basePath || workspaceFolders[0].uri.fsPath;
        relativePath = path.relative(referencePath, filePath);
        folderPath = path.dirname(relativePath);
        // Normalize path separators and handle root case
        folderPath = folderPath.replace(/\\/g, '/');
        if (folderPath === '.') {
            folderPath = 'Root';
        }
    }
    const processedKeywords = new Set(); // To avoid duplicates
    // First, process @keyword("Custom Name") decorators
    let match;
    while ((match = keywordDecoratorRegex.exec(content)) !== null) {
        const customKeywordName = match[1];
        const methodName = match[2];
        if (processedKeywords.has(methodName))
            continue;
        processedKeywords.add(methodName);
        // Extract parameters from the method signature
        const methodMatch = content.match(new RegExp(`def\\s+${methodName}\\s*\\(([^)]*)\\):`));
        const params = methodMatch ? parseParameters(methodMatch[1]) : [];
        const implementation = params.length > 0
            ? `${customKeywordName}    ${params.map(p => `\${${p}}`).join('    ')}`
            : customKeywordName;
        addKeywordToResults(customKeywordName, implementation, fileName, filePath, folderPath, keywords);
    }
    // Reset regex
    keywordDecoratorRegex.lastIndex = 0;
    // Second, process simple @keyword decorators
    while ((match = simpleKeywordDecoratorRegex.exec(content)) !== null) {
        const methodName = match[1];
        if (processedKeywords.has(methodName))
            continue;
        processedKeywords.add(methodName);
        // Convert snake_case to Title Case for Robot Framework
        const keywordName = methodName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Extract parameters from the method signature
        const methodMatch = content.match(new RegExp(`def\\s+${methodName}\\s*\\(([^)]*)\\):`));
        const params = methodMatch ? parseParameters(methodMatch[1]) : [];
        const implementation = params.length > 0
            ? `${keywordName}    ${params.map(p => `\${${p}}`).join('    ')}`
            : keywordName;
        addKeywordToResults(keywordName, implementation, fileName, filePath, folderPath, keywords);
    }
    // Reset regex
    simpleKeywordDecoratorRegex.lastIndex = 0;
    // Third, process regular public methods (as fallback, but skip if already processed)
    while ((match = methodRegex.exec(content)) !== null) {
        const methodName = match[1];
        // Skip if already processed, private methods, or common Python methods
        if (processedKeywords.has(methodName) ||
            methodName.startsWith('_') ||
            ['setUp', 'tearDown', 'setUpClass', 'tearDownClass', 'init'].includes(methodName)) {
            continue;
        }
        // Convert snake_case to Title Case for Robot Framework
        const keywordName = methodName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Extract parameters from the method signature
        const methodMatch = content.match(new RegExp(`def\\s+${methodName}\\s*\\(([^)]*)\\):`));
        const params = methodMatch ? parseParameters(methodMatch[1]) : [];
        const implementation = params.length > 0
            ? `${keywordName}    ${params.map(p => `\${${p}}`).join('    ')}`
            : keywordName;
        addKeywordToResults(keywordName, implementation, fileName, filePath, folderPath, keywords);
    }
    return keywords;
}
function addKeywordToResults(keywordName, implementation, fileName, filePath, folderPath, keywords) {
    keywords.push({
        name: keywordName,
        implementation: implementation,
        library: fileName,
        description: `Python keyword from ${fileName}.py`,
        source: 'python',
        filePath: filePath,
        folderPath: folderPath
    });
}
function extractRobotKeywords(content, filePath, basePath) {
    const keywords = [];
    const fileExtension = path.extname(filePath);
    const fileName = path.basename(filePath, fileExtension);
    // Look for Robot Framework keyword definitions
    const lines = content.split('\n');
    let inKeywordSection = false;
    let currentKeyword = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check for Keywords section
        if (line.match(/^\*+\s*(Keywords?)\s*\**/i)) {
            inKeywordSection = true;
            continue;
        }
        // Check for other sections
        if (line.match(/^\*+\s*(Test Cases?|Settings?|Variables?|Tasks?)\s*\**/i)) {
            inKeywordSection = false;
            continue;
        }
        if (!inKeywordSection || line === '' || line.startsWith('#')) {
            continue;
        }
        // Check if this is a keyword definition (starts at column 0, not indented)
        if (!lines[i].startsWith(' ') && !lines[i].startsWith('\t') && line !== '') {
            // Save previous keyword if exists
            if (currentKeyword) {
                keywords.push(currentKeyword);
            }
            // Extract arguments from keyword definition if present
            const keywordWithArgs = extractKeywordArguments(line, lines, i);
            // Get relative path from workspace for organization
            const workspaceFolders = vscode.workspace.workspaceFolders;
            let relativePath = filePath;
            let folderPath = 'Root';
            if (workspaceFolders && workspaceFolders.length > 0) {
                // Use basePath if provided, otherwise use workspace path
                const referencePath = basePath || workspaceFolders[0].uri.fsPath;
                relativePath = path.relative(referencePath, filePath);
                folderPath = path.dirname(relativePath);
                // Normalize path separators and handle root case
                folderPath = folderPath.replace(/\\/g, '/');
                if (folderPath === '.') {
                    folderPath = 'Root';
                }
            }
            // Start new keyword
            currentKeyword = {
                name: keywordWithArgs.name,
                implementation: keywordWithArgs.implementation,
                library: fileName,
                description: `${fileExtension === '.resource' ? 'Resource' : 'Robot'} keyword from ${fileName}${fileExtension}`,
                source: 'robot',
                filePath: filePath,
                fileType: fileExtension === '.resource' ? 'resource' : 'robot',
                folderPath: folderPath
            };
        }
    }
    // Don't forget the last keyword
    if (currentKeyword) {
        keywords.push(currentKeyword);
    }
    return keywords;
}
function extractKeywordArguments(keywordLine, allLines, currentIndex) {
    const keywordName = keywordLine.trim();
    const args = [];
    // Look for [Arguments] in the next few lines
    let foundArguments = false;
    for (let i = currentIndex + 1; i < Math.min(currentIndex + 20, allLines.length); i++) {
        const line = allLines[i].trim();
        const originalLine = allLines[i];
        // Stop if we hit another keyword or section
        if ((!originalLine.startsWith(' ') && !originalLine.startsWith('\t') && line !== '') ||
            line.match(/^\*+/)) {
            break;
        }
        // Check for [Arguments] tag
        if (line.match(/^\[Arguments\]/i)) {
            foundArguments = true;
            const argLine = line.replace(/^\[Arguments\]/i, '').trim();
            if (argLine) {
                // Handle arguments on same line as [Arguments]
                const argsOnSameLine = parseArgumentLine(argLine);
                args.push(...argsOnSameLine);
            }
            continue;
        }
        // If we found [Arguments], look for continuation lines with ...
        if (foundArguments && line.startsWith('...')) {
            const continuationLine = line.replace(/^\.\.\./, '').trim();
            if (continuationLine) {
                const continuationArgs = parseArgumentLine(continuationLine);
                args.push(...continuationArgs);
            }
            continue;
        }
        // If we found [Arguments] but this line doesn't start with ..., we're done with arguments
        if (foundArguments && !line.startsWith('...') && line !== '') {
            break;
        }
    }
    // Create implementation with arguments
    const implementation = args.length > 0
        ? `${keywordName}    ${args.join('    ')}`
        : keywordName;
    return {
        name: keywordName,
        implementation: implementation
    };
}
function parseArgumentLine(argLine) {
    if (!argLine.trim())
        return [];
    // Split by spaces but keep together argument=defaultValue pairs
    const parts = argLine.split(/\s+/).filter(arg => arg.length > 0);
    return parts;
}
function parseParameters(paramString) {
    if (!paramString.trim())
        return [];
    const params = paramString.split(',').map(p => p.trim());
    return params
        .filter(p => p !== 'self' && p !== 'cls' && !p.startsWith('*'))
        .map(p => {
        // Remove default values and type hints
        let param = p.split('=')[0].split(':')[0].trim();
        return param;
    })
        .filter(p => p.length > 0);
}
function mergeKeywords(existing, discovered) {
    const merged = [...existing];
    for (const newKeyword of discovered) {
        // Check if keyword already exists (by name and source)
        const exists = existing.some(k => k.name === newKeyword.name &&
            k.source === newKeyword.source &&
            k.filePath === newKeyword.filePath);
        if (!exists) {
            merged.push(newKeyword);
        }
    }
    return merged;
}
function deactivate() { }
exports.deactivate = deactivate;
class KeywordTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, implementation, library) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.implementation = implementation;
        this.library = library;
        if (implementation) {
            this.tooltip = `${this.label}: Click to copy, Right-click for more options`;
            this.description = library;
            this.contextValue = 'keyword';
            this.command = {
                command: 'rfBrowserKeywords.copyKeyword',
                title: 'Copy Keyword',
                arguments: [this]
            };
            // Add styling and icons based on configuration
            const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
            if (config.get('showIcons', true)) {
                this.iconPath = this.getKeywordIcon();
            }
        }
        else {
            this.tooltip = `${this.label} library keywords`;
            this.contextValue = 'library';
            // Set appropriate icons for different file types
            if (this.label.endsWith('.py')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
            }
            else if (this.label.endsWith('.robot')) {
                this.iconPath = new vscode.ThemeIcon('robot');
            }
            else if (this.label.endsWith('.resource')) {
                this.iconPath = new vscode.ThemeIcon('symbol-module');
            }
            else {
                this.iconPath = new vscode.ThemeIcon('folder');
            }
        }
    }
    getKeywordIcon() {
        const label = this.label.toLowerCase();
        // Action keywords
        if (label.includes('click') || label.includes('press') || label.includes('hover')) {
            return new vscode.ThemeIcon('hand');
        }
        // Navigation keywords
        if (label.includes('go') || label.includes('reload') || label.includes('back') || label.includes('forward')) {
            return new vscode.ThemeIcon('arrow-right');
        }
        // Input keywords
        if (label.includes('fill') || label.includes('type') || label.includes('clear')) {
            return new vscode.ThemeIcon('edit');
        }
        // Get keywords
        if (label.startsWith('get ')) {
            return new vscode.ThemeIcon('search');
        }
        // Wait keywords
        if (label.includes('wait')) {
            return new vscode.ThemeIcon('clock');
        }
        // Screenshot keywords
        if (label.includes('screenshot') || label.includes('pdf')) {
            return new vscode.ThemeIcon('device-camera');
        }
        // Browser management
        if (label.includes('open') || label.includes('close') || label.includes('new')) {
            return new vscode.ThemeIcon('browser');
        }
        // Assertions
        if (label.includes('should')) {
            return new vscode.ThemeIcon('check');
        }
        // Default
        return new vscode.ThemeIcon('symbol-method');
    }
}
class RobotFrameworkKeywordProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getLibraryCategories());
        }
        switch (element.label) {
            case 'Custom Keywords':
                return Promise.resolve(this.getManualCustomKeywords());
            case 'Browser Library':
                return Promise.resolve(this.getBrowserSubcategories());
            case 'BuiltIn Library':
                return Promise.resolve(this.getBuiltInKeywords());
            case 'Collections Library':
                return Promise.resolve(this.getCollectionsKeywords());
            case 'String Library':
                return Promise.resolve(this.getStringKeywords());
            case 'DateTime Library':
                return Promise.resolve(this.getDateTimeKeywords());
            case 'OperatingSystem Library':
                return Promise.resolve(this.getOperatingSystemKeywords());
            case 'Process Library':
                return Promise.resolve(this.getProcessKeywords());
            case 'XML Library':
                return Promise.resolve(this.getXMLKeywords());
            // Browser subcategories
            case 'Browser Management':
                return Promise.resolve(this.getBrowserManagementKeywords());
            case 'Navigation':
                return Promise.resolve(this.getNavigationKeywords());
            case 'Element Interaction':
                return Promise.resolve(this.getElementInteractionKeywords());
            case 'Text Input':
                return Promise.resolve(this.getTextInputKeywords());
            case 'Form Elements':
                return Promise.resolve(this.getFormElementsKeywords());
            case 'Keyboard Actions':
                return Promise.resolve(this.getKeyboardActionsKeywords());
            case 'Element Properties':
                return Promise.resolve(this.getElementPropertiesKeywords());
            case 'Page Information':
                return Promise.resolve(this.getPageInformationKeywords());
            case 'Waiting':
                return Promise.resolve(this.getWaitingKeywords());
            case 'Screenshots & PDF':
                return Promise.resolve(this.getScreenshotsKeywords());
            case 'Scrolling':
                return Promise.resolve(this.getScrollingKeywords());
            case 'Alerts & Dialogs':
                return Promise.resolve(this.getAlertsKeywords());
            case 'Network & Cookies':
                return Promise.resolve(this.getNetworkKeywords());
            case 'Local Storage':
                return Promise.resolve(this.getLocalStorageKeywords());
            case 'Assertions':
                return Promise.resolve(this.getAssertionsKeywords());
            default:
                // Check if this is a folder or file
                if (element.folderPath !== undefined) {
                    // This is a folder, return files in this folder
                    return Promise.resolve(this.getFilesInFolder(element.folderPath));
                }
                else {
                    // This is a file, return keywords in this file
                    return Promise.resolve(this.getKeywordsForFile(element.label));
                }
        }
    }
    getLibraryCategories() {
        const categories = [
            new KeywordTreeItem('Browser Library', vscode.TreeItemCollapsibleState.Expanded),
            new KeywordTreeItem('BuiltIn Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Collections Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('String Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('DateTime Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('OperatingSystem Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Process Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('XML Library', vscode.TreeItemCollapsibleState.Collapsed)
        ];
        // Add discovered file-based keyword categories
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []);
        const fileCategories = this.getFileBasedCategories(customKeywords);
        // Add file-based categories at the top
        categories.unshift(...fileCategories);
        return categories;
    }
    getFileBasedCategories(customKeywords) {
        const folderStructure = new Map();
        // Group keywords by folder path and then by file
        customKeywords.forEach(keyword => {
            if (keyword.source === 'python' || keyword.source === 'robot') {
                let folderPath = keyword.folderPath || 'Root';
                // Normalize folder path - convert all root representations to 'Root'
                if (folderPath === '.' || folderPath === '') {
                    folderPath = 'Root';
                }
                const fileName = keyword.library;
                if (!folderStructure.has(folderPath)) {
                    folderStructure.set(folderPath, new Map());
                }
                const folderFiles = folderStructure.get(folderPath);
                if (!folderFiles.has(fileName)) {
                    folderFiles.set(fileName, []);
                }
                folderFiles.get(fileName).push(keyword);
            }
        });
        // Create tree structure
        const categories = [];
        // Sort folders alphabetically
        const sortedFolders = Array.from(folderStructure.keys()).sort();
        sortedFolders.forEach(folderPath => {
            const files = folderStructure.get(folderPath);
            // Create folder category
            const folderDisplayName = this.formatFolderName(folderPath);
            const folderItem = new KeywordTreeItem(folderDisplayName, vscode.TreeItemCollapsibleState.Collapsed, undefined, 'Folder');
            // Store folder path for later retrieval
            folderItem.folderPath = folderPath;
            categories.push(folderItem);
        });
        // Add manually created keywords under "Custom Keywords" if any exist
        const manualKeywords = customKeywords.filter(keyword => !keyword.source);
        if (manualKeywords.length > 0) {
            categories.push(new KeywordTreeItem('Custom Keywords', vscode.TreeItemCollapsibleState.Collapsed, undefined, 'Manual'));
        }
        return categories;
    }
    formatFolderName(folderPath) {
        if (folderPath === '.' || folderPath === '' || folderPath === 'Root') {
            return 'Root';
        }
        // Replace path separators and make it more readable
        return folderPath.replace(/[\/\\]/g, ' → ');
    }
    getFilesInFolder(folderPath) {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []);
        // Get all files in this specific folder
        const filesInFolder = new Map();
        customKeywords.forEach(keyword => {
            if ((keyword.source === 'python' || keyword.source === 'robot') &&
                (keyword.folderPath === folderPath ||
                    (folderPath === 'Root' && (keyword.folderPath === '.' || keyword.folderPath === '' || keyword.folderPath === 'Root')))) {
                const fileName = keyword.library;
                if (!filesInFolder.has(fileName)) {
                    filesInFolder.set(fileName, []);
                }
                filesInFolder.get(fileName).push(keyword);
            }
        });
        // Create file items
        const fileItems = [];
        filesInFolder.forEach((keywords, fileName) => {
            let displayName = fileName;
            let libraryType = 'Robot Keywords';
            // Add appropriate file extension if not present
            if (!fileName.includes('.')) {
                if (keywords[0].source === 'python') {
                    displayName = `${fileName}.py`;
                    libraryType = 'Python Library';
                }
                else if (keywords[0].fileType === 'resource') {
                    displayName = `${fileName}.resource`;
                    libraryType = 'Resource Keywords';
                }
                else {
                    displayName = `${fileName}.robot`;
                    libraryType = 'Robot Keywords';
                }
            }
            else {
                // File already has extension
                if (fileName.endsWith('.py')) {
                    libraryType = 'Python Library';
                }
                else if (fileName.endsWith('.resource')) {
                    libraryType = 'Resource Keywords';
                }
                else {
                    libraryType = 'Robot Keywords';
                }
            }
            fileItems.push(new KeywordTreeItem(displayName, vscode.TreeItemCollapsibleState.Collapsed, undefined, libraryType));
        });
        return fileItems.sort((a, b) => a.label.localeCompare(b.label));
    }
    getKeywordsForFile(fileName) {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []);
        // Remove file extension from the label for comparison
        const baseFileName = fileName.replace(/\.(py|robot|resource)$/, '');
        const fileKeywords = customKeywords.filter(keyword => keyword.library === baseFileName &&
            (keyword.source === 'python' || keyword.source === 'robot'));
        return fileKeywords.map(keyword => new KeywordTreeItem(keyword.name, vscode.TreeItemCollapsibleState.None, keyword.implementation, baseFileName));
    }
    getManualCustomKeywords() {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []);
        // Only return manually created keywords (no source property)
        const manualKeywords = customKeywords.filter(keyword => !keyword.source);
        return manualKeywords.map(keyword => new KeywordTreeItem(keyword.name, vscode.TreeItemCollapsibleState.None, keyword.implementation, keyword.library || 'Custom'));
    }
    getBrowserSubcategories() {
        return [
            new KeywordTreeItem('Browser Management', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Navigation', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Element Interaction', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Text Input', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Form Elements', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Keyboard Actions', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Element Properties', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Page Information', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Waiting', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Screenshots & PDF', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Scrolling', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Alerts & Dialogs', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Network & Cookies', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Local Storage', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Assertions', vscode.TreeItemCollapsibleState.Collapsed)
        ];
    }
    getBrowserManagementKeywords() {
        return [
            new KeywordTreeItem('Open Browser', vscode.TreeItemCollapsibleState.None, 'Open Browser    ${url}    ${browser}=chromium', 'Browser'),
            new KeywordTreeItem('Close Browser', vscode.TreeItemCollapsibleState.None, 'Close Browser', 'Browser'),
            new KeywordTreeItem('Close Page', vscode.TreeItemCollapsibleState.None, 'Close Page', 'Browser'),
            new KeywordTreeItem('New Browser', vscode.TreeItemCollapsibleState.None, 'New Browser    ${browser}=chromium    headless=${False}', 'Browser'),
            new KeywordTreeItem('New Context', vscode.TreeItemCollapsibleState.None, 'New Context    viewport=${{"width": 1920, "height": 1080}}', 'Browser'),
            new KeywordTreeItem('New Page', vscode.TreeItemCollapsibleState.None, 'New Page    ${url}', 'Browser'),
            new KeywordTreeItem('Switch Browser', vscode.TreeItemCollapsibleState.None, 'Switch Browser    ${browser_id}', 'Browser'),
            new KeywordTreeItem('Switch Context', vscode.TreeItemCollapsibleState.None, 'Switch Context    ${context_id}', 'Browser'),
            new KeywordTreeItem('Switch Page', vscode.TreeItemCollapsibleState.None, 'Switch Page    ${page_id}', 'Browser')
        ];
    }
    getNavigationKeywords() {
        return [
            new KeywordTreeItem('Go To', vscode.TreeItemCollapsibleState.None, 'Go To    ${url}', 'Browser'),
            new KeywordTreeItem('Go Back', vscode.TreeItemCollapsibleState.None, 'Go Back', 'Browser'),
            new KeywordTreeItem('Go Forward', vscode.TreeItemCollapsibleState.None, 'Go Forward', 'Browser'),
            new KeywordTreeItem('Reload', vscode.TreeItemCollapsibleState.None, 'Reload', 'Browser')
        ];
    }
    getElementInteractionKeywords() {
        return [
            new KeywordTreeItem('Click', vscode.TreeItemCollapsibleState.None, 'Click    ${selector}', 'Browser'),
            new KeywordTreeItem('Click With Options', vscode.TreeItemCollapsibleState.None, 'Click With Options    ${selector}    button=left    clickCount=1', 'Browser'),
            new KeywordTreeItem('Double Click', vscode.TreeItemCollapsibleState.None, 'Double Click    ${selector}', 'Browser'),
            new KeywordTreeItem('Right Click', vscode.TreeItemCollapsibleState.None, 'Right Click    ${selector}', 'Browser'),
            new KeywordTreeItem('Hover', vscode.TreeItemCollapsibleState.None, 'Hover    ${selector}', 'Browser'),
            new KeywordTreeItem('Focus', vscode.TreeItemCollapsibleState.None, 'Focus    ${selector}', 'Browser'),
            new KeywordTreeItem('Drag And Drop', vscode.TreeItemCollapsibleState.None, 'Drag And Drop    ${from_selector}    ${to_selector}', 'Browser')
        ];
    }
    getTextInputKeywords() {
        return [
            new KeywordTreeItem('Fill Text', vscode.TreeItemCollapsibleState.None, 'Fill Text    ${selector}    ${text}', 'Browser'),
            new KeywordTreeItem('Type Text', vscode.TreeItemCollapsibleState.None, 'Type Text    ${selector}    ${text}', 'Browser'),
            new KeywordTreeItem('Clear Text', vscode.TreeItemCollapsibleState.None, 'Clear Text    ${selector}', 'Browser'),
            new KeywordTreeItem('Press Keys', vscode.TreeItemCollapsibleState.None, 'Press Keys    ${selector}    ${key}', 'Browser')
        ];
    }
    getFormElementsKeywords() {
        return [
            new KeywordTreeItem('Check Checkbox', vscode.TreeItemCollapsibleState.None, 'Check Checkbox    ${selector}', 'Browser'),
            new KeywordTreeItem('Uncheck Checkbox', vscode.TreeItemCollapsibleState.None, 'Uncheck Checkbox    ${selector}', 'Browser'),
            new KeywordTreeItem('Select Options By', vscode.TreeItemCollapsibleState.None, 'Select Options By    ${selector}    text    ${value}', 'Browser'),
            new KeywordTreeItem('Deselect Options', vscode.TreeItemCollapsibleState.None, 'Deselect Options    ${selector}', 'Browser'),
            new KeywordTreeItem('Upload File', vscode.TreeItemCollapsibleState.None, 'Upload File    ${selector}    ${file_path}', 'Browser')
        ];
    }
    getKeyboardActionsKeywords() {
        return [
            new KeywordTreeItem('Keyboard Key', vscode.TreeItemCollapsibleState.None, 'Keyboard Key    press    ${key}', 'Browser'),
            new KeywordTreeItem('Keyboard Input', vscode.TreeItemCollapsibleState.None, 'Keyboard Input    insertText    ${text}', 'Browser')
        ];
    }
    getElementPropertiesKeywords() {
        return [
            new KeywordTreeItem('Get Text', vscode.TreeItemCollapsibleState.None, 'Get Text    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Property', vscode.TreeItemCollapsibleState.None, 'Get Property    ${selector}    ${property}', 'Browser'),
            new KeywordTreeItem('Get Attribute', vscode.TreeItemCollapsibleState.None, 'Get Attribute    ${selector}    ${attribute}', 'Browser'),
            new KeywordTreeItem('Get Element Count', vscode.TreeItemCollapsibleState.None, 'Get Element Count    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Elements', vscode.TreeItemCollapsibleState.None, 'Get Elements    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Bounding Box', vscode.TreeItemCollapsibleState.None, 'Get Bounding Box    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Style', vscode.TreeItemCollapsibleState.None, 'Get Style    ${selector}    ${key}', 'Browser')
        ];
    }
    getPageInformationKeywords() {
        return [
            new KeywordTreeItem('Get Title', vscode.TreeItemCollapsibleState.None, 'Get Title', 'Browser'),
            new KeywordTreeItem('Get Url', vscode.TreeItemCollapsibleState.None, 'Get Url', 'Browser'),
            new KeywordTreeItem('Get Page Source', vscode.TreeItemCollapsibleState.None, 'Get Page Source', 'Browser'),
            new KeywordTreeItem('Get Viewport Size', vscode.TreeItemCollapsibleState.None, 'Get Viewport Size', 'Browser')
        ];
    }
    getWaitingKeywords() {
        return [
            new KeywordTreeItem('Wait For Elements State', vscode.TreeItemCollapsibleState.None, 'Wait For Elements State    ${selector}    visible    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Condition', vscode.TreeItemCollapsibleState.None, 'Wait For Condition    ${condition}    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Response', vscode.TreeItemCollapsibleState.None, 'Wait For Response    ${url_pattern}    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Request', vscode.TreeItemCollapsibleState.None, 'Wait For Request    ${url_pattern}    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Load State', vscode.TreeItemCollapsibleState.None, 'Wait For Load State    load    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Function', vscode.TreeItemCollapsibleState.None, 'Wait For Function    ${function}    timeout=10s', 'Browser')
        ];
    }
    getScreenshotsKeywords() {
        return [
            new KeywordTreeItem('Take Screenshot', vscode.TreeItemCollapsibleState.None, 'Take Screenshot    ${filename}', 'Browser'),
            new KeywordTreeItem('Take Screenshot Of Element', vscode.TreeItemCollapsibleState.None, 'Take Screenshot Of Element    ${selector}    ${filename}', 'Browser'),
            new KeywordTreeItem('Print Pdf', vscode.TreeItemCollapsibleState.None, 'Print Pdf    ${filename}', 'Browser')
        ];
    }
    getScrollingKeywords() {
        return [
            new KeywordTreeItem('Scroll To Element', vscode.TreeItemCollapsibleState.None, 'Scroll To Element    ${selector}', 'Browser'),
            new KeywordTreeItem('Scroll By', vscode.TreeItemCollapsibleState.None, 'Scroll By    ${x}    ${y}', 'Browser'),
            new KeywordTreeItem('Scroll To', vscode.TreeItemCollapsibleState.None, 'Scroll To    ${x}    ${y}', 'Browser')
        ];
    }
    getAlertsKeywords() {
        return [
            new KeywordTreeItem('Handle Future Dialogs', vscode.TreeItemCollapsibleState.None, 'Handle Future Dialogs    action=accept', 'Browser'),
            new KeywordTreeItem('Get Alert Message', vscode.TreeItemCollapsibleState.None, 'Get Alert Message', 'Browser')
        ];
    }
    getNetworkKeywords() {
        return [
            new KeywordTreeItem('Add Cookie', vscode.TreeItemCollapsibleState.None, 'Add Cookie    ${name}    ${value}    url=${url}', 'Browser'),
            new KeywordTreeItem('Get Cookies', vscode.TreeItemCollapsibleState.None, 'Get Cookies', 'Browser'),
            new KeywordTreeItem('Delete All Cookies', vscode.TreeItemCollapsibleState.None, 'Delete All Cookies', 'Browser')
        ];
    }
    getLocalStorageKeywords() {
        return [
            new KeywordTreeItem('Local Storage Set Item', vscode.TreeItemCollapsibleState.None, 'Local Storage Set Item    ${key}    ${value}', 'Browser'),
            new KeywordTreeItem('Local Storage Get Item', vscode.TreeItemCollapsibleState.None, 'Local Storage Get Item    ${key}', 'Browser'),
            new KeywordTreeItem('Local Storage Remove Item', vscode.TreeItemCollapsibleState.None, 'Local Storage Remove Item    ${key}', 'Browser'),
            new KeywordTreeItem('Local Storage Clear', vscode.TreeItemCollapsibleState.None, 'Local Storage Clear', 'Browser')
        ];
    }
    getAssertionsKeywords() {
        return [
            new KeywordTreeItem('Get Element Should Be Visible', vscode.TreeItemCollapsibleState.None, 'Get Element Should Be Visible    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Element Should Not Be Visible', vscode.TreeItemCollapsibleState.None, 'Get Element Should Not Be Visible    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Text Should Be', vscode.TreeItemCollapsibleState.None, 'Get Text Should Be    ${selector}    ${expected}', 'Browser'),
            new KeywordTreeItem('Get Title Should Be', vscode.TreeItemCollapsibleState.None, 'Get Title Should Be    ${expected}', 'Browser'),
            new KeywordTreeItem('Get Url Should Be', vscode.TreeItemCollapsibleState.None, 'Get Url Should Be    ${expected}', 'Browser')
        ];
    }
    getBuiltInKeywords() {
        return [
            new KeywordTreeItem('Log', vscode.TreeItemCollapsibleState.None, 'Log    ${message}', 'BuiltIn'),
            new KeywordTreeItem('Log To Console', vscode.TreeItemCollapsibleState.None, 'Log To Console    ${message}', 'BuiltIn'),
            new KeywordTreeItem('Set Variable', vscode.TreeItemCollapsibleState.None, 'Set Variable    ${value}', 'BuiltIn'),
            new KeywordTreeItem('Should Be Equal', vscode.TreeItemCollapsibleState.None, 'Should Be Equal    ${first}    ${second}', 'BuiltIn'),
            new KeywordTreeItem('Should Contain', vscode.TreeItemCollapsibleState.None, 'Should Contain    ${container}    ${item}', 'BuiltIn'),
            new KeywordTreeItem('Should Not Be Empty', vscode.TreeItemCollapsibleState.None, 'Should Not Be Empty    ${item}', 'BuiltIn'),
            new KeywordTreeItem('Length Should Be', vscode.TreeItemCollapsibleState.None, 'Length Should Be    ${item}    ${length}', 'BuiltIn'),
            new KeywordTreeItem('Run Keyword If', vscode.TreeItemCollapsibleState.None, 'Run Keyword If    ${condition}    ${keyword}', 'BuiltIn'),
            new KeywordTreeItem('Run Keyword And Return Status', vscode.TreeItemCollapsibleState.None, 'Run Keyword And Return Status    ${keyword}', 'BuiltIn'),
            new KeywordTreeItem('Sleep', vscode.TreeItemCollapsibleState.None, 'Sleep    ${time}', 'BuiltIn'),
            new KeywordTreeItem('Wait Until Keyword Succeeds', vscode.TreeItemCollapsibleState.None, 'Wait Until Keyword Succeeds    ${retry}    ${retry_interval}    ${keyword}', 'BuiltIn'),
            new KeywordTreeItem('Convert To String', vscode.TreeItemCollapsibleState.None, 'Convert To String    ${item}', 'BuiltIn'),
            new KeywordTreeItem('Convert To Integer', vscode.TreeItemCollapsibleState.None, 'Convert To Integer    ${item}', 'BuiltIn'),
            new KeywordTreeItem('Create List', vscode.TreeItemCollapsibleState.None, 'Create List    ${item1}    ${item2}', 'BuiltIn'),
            new KeywordTreeItem('Create Dictionary', vscode.TreeItemCollapsibleState.None, 'Create Dictionary    ${key1}=${value1}    ${key2}=${value2}', 'BuiltIn'),
            new KeywordTreeItem('Fail', vscode.TreeItemCollapsibleState.None, 'Fail    ${message}', 'BuiltIn'),
            new KeywordTreeItem('Pass Execution', vscode.TreeItemCollapsibleState.None, 'Pass Execution    ${message}', 'BuiltIn')
        ];
    }
    getCollectionsKeywords() {
        return [
            new KeywordTreeItem('Append To List', vscode.TreeItemCollapsibleState.None, 'Append To List    ${list}    ${value}', 'Collections'),
            new KeywordTreeItem('Get From List', vscode.TreeItemCollapsibleState.None, 'Get From List    ${list}    ${index}', 'Collections'),
            new KeywordTreeItem('Get Length', vscode.TreeItemCollapsibleState.None, 'Get Length    ${item}', 'Collections'),
            new KeywordTreeItem('List Should Contain Value', vscode.TreeItemCollapsibleState.None, 'List Should Contain Value    ${list}    ${value}', 'Collections'),
            new KeywordTreeItem('Remove From List', vscode.TreeItemCollapsibleState.None, 'Remove From List    ${list}    ${index}', 'Collections'),
            new KeywordTreeItem('Sort List', vscode.TreeItemCollapsibleState.None, 'Sort List    ${list}', 'Collections'),
            new KeywordTreeItem('Get Dictionary Keys', vscode.TreeItemCollapsibleState.None, 'Get Dictionary Keys    ${dictionary}', 'Collections'),
            new KeywordTreeItem('Get Dictionary Values', vscode.TreeItemCollapsibleState.None, 'Get Dictionary Values    ${dictionary}', 'Collections'),
            new KeywordTreeItem('Set To Dictionary', vscode.TreeItemCollapsibleState.None, 'Set To Dictionary    ${dictionary}    ${key}    ${value}', 'Collections'),
            new KeywordTreeItem('Dictionary Should Contain Key', vscode.TreeItemCollapsibleState.None, 'Dictionary Should Contain Key    ${dictionary}    ${key}', 'Collections'),
            new KeywordTreeItem('Count Values In List', vscode.TreeItemCollapsibleState.None, 'Count Values In List    ${list}    ${value}', 'Collections'),
            new KeywordTreeItem('Reverse List', vscode.TreeItemCollapsibleState.None, 'Reverse List    ${list}', 'Collections')
        ];
    }
    getStringKeywords() {
        return [
            new KeywordTreeItem('Convert To Lowercase', vscode.TreeItemCollapsibleState.None, 'Convert To Lowercase    ${string}', 'String'),
            new KeywordTreeItem('Convert To Uppercase', vscode.TreeItemCollapsibleState.None, 'Convert To Uppercase    ${string}', 'String'),
            new KeywordTreeItem('Get Length', vscode.TreeItemCollapsibleState.None, 'Get Length    ${string}', 'String'),
            new KeywordTreeItem('Should Be String', vscode.TreeItemCollapsibleState.None, 'Should Be String    ${item}', 'String'),
            new KeywordTreeItem('Should Not Be String', vscode.TreeItemCollapsibleState.None, 'Should Not Be String    ${item}', 'String'),
            new KeywordTreeItem('Split String', vscode.TreeItemCollapsibleState.None, 'Split String    ${string}    ${separator}', 'String'),
            new KeywordTreeItem('Strip String', vscode.TreeItemCollapsibleState.None, 'Strip String    ${string}', 'String'),
            new KeywordTreeItem('Replace String', vscode.TreeItemCollapsibleState.None, 'Replace String    ${string}    ${search_for}    ${replace_with}', 'String'),
            new KeywordTreeItem('Get Substring', vscode.TreeItemCollapsibleState.None, 'Get Substring    ${string}    ${start}    ${end}', 'String'),
            new KeywordTreeItem('Should Start With', vscode.TreeItemCollapsibleState.None, 'Should Start With    ${string}    ${start}', 'String'),
            new KeywordTreeItem('Should End With', vscode.TreeItemCollapsibleState.None, 'Should End With    ${string}    ${end}', 'String'),
            new KeywordTreeItem('Should Match Regexp', vscode.TreeItemCollapsibleState.None, 'Should Match Regexp    ${string}    ${pattern}', 'String')
        ];
    }
    getDateTimeKeywords() {
        return [
            new KeywordTreeItem('Get Current Date', vscode.TreeItemCollapsibleState.None, 'Get Current Date', 'DateTime'),
            new KeywordTreeItem('Add Time To Date', vscode.TreeItemCollapsibleState.None, 'Add Time To Date    ${date}    ${time}', 'DateTime'),
            new KeywordTreeItem('Subtract Time From Date', vscode.TreeItemCollapsibleState.None, 'Subtract Time From Date    ${date}    ${time}', 'DateTime'),
            new KeywordTreeItem('Convert Date', vscode.TreeItemCollapsibleState.None, 'Convert Date    ${date}    result_format=%Y-%m-%d', 'DateTime'),
            new KeywordTreeItem('Convert Time', vscode.TreeItemCollapsibleState.None, 'Convert Time    ${time}', 'DateTime'),
            new KeywordTreeItem('Get Time', vscode.TreeItemCollapsibleState.None, 'Get Time    epoch', 'DateTime'),
            new KeywordTreeItem('Subtract Date From Date', vscode.TreeItemCollapsibleState.None, 'Subtract Date From Date    ${date1}    ${date2}', 'DateTime')
        ];
    }
    getOperatingSystemKeywords() {
        return [
            new KeywordTreeItem('Create Directory', vscode.TreeItemCollapsibleState.None, 'Create Directory    ${path}', 'OperatingSystem'),
            new KeywordTreeItem('Create File', vscode.TreeItemCollapsibleState.None, 'Create File    ${path}    ${content}', 'OperatingSystem'),
            new KeywordTreeItem('File Should Exist', vscode.TreeItemCollapsibleState.None, 'File Should Exist    ${path}', 'OperatingSystem'),
            new KeywordTreeItem('Directory Should Exist', vscode.TreeItemCollapsibleState.None, 'Directory Should Exist    ${path}', 'OperatingSystem'),
            new KeywordTreeItem('Copy File', vscode.TreeItemCollapsibleState.None, 'Copy File    ${source}    ${destination}', 'OperatingSystem'),
            new KeywordTreeItem('Move File', vscode.TreeItemCollapsibleState.None, 'Move File    ${source}    ${destination}', 'OperatingSystem'),
            new KeywordTreeItem('Remove File', vscode.TreeItemCollapsibleState.None, 'Remove File    ${path}', 'OperatingSystem'),
            new KeywordTreeItem('Remove Directory', vscode.TreeItemCollapsibleState.None, 'Remove Directory    ${path}    recursive=True', 'OperatingSystem'),
            new KeywordTreeItem('Get File', vscode.TreeItemCollapsibleState.None, 'Get File    ${path}', 'OperatingSystem'),
            new KeywordTreeItem('Append To File', vscode.TreeItemCollapsibleState.None, 'Append To File    ${path}    ${content}', 'OperatingSystem'),
            new KeywordTreeItem('List Directory', vscode.TreeItemCollapsibleState.None, 'List Directory    ${path}', 'OperatingSystem'),
            new KeywordTreeItem('Get Environment Variable', vscode.TreeItemCollapsibleState.None, 'Get Environment Variable    ${name}', 'OperatingSystem'),
            new KeywordTreeItem('Set Environment Variable', vscode.TreeItemCollapsibleState.None, 'Set Environment Variable    ${name}    ${value}', 'OperatingSystem')
        ];
    }
    getProcessKeywords() {
        return [
            new KeywordTreeItem('Run Process', vscode.TreeItemCollapsibleState.None, 'Run Process    ${command}    shell=True', 'Process'),
            new KeywordTreeItem('Start Process', vscode.TreeItemCollapsibleState.None, 'Start Process    ${command}    shell=True    alias=${alias}', 'Process'),
            new KeywordTreeItem('Wait For Process', vscode.TreeItemCollapsibleState.None, 'Wait For Process    ${handle}    timeout=1 min', 'Process'),
            new KeywordTreeItem('Terminate Process', vscode.TreeItemCollapsibleState.None, 'Terminate Process    ${handle}', 'Process'),
            new KeywordTreeItem('Kill Process', vscode.TreeItemCollapsibleState.None, 'Kill Process    ${handle}', 'Process'),
            new KeywordTreeItem('Get Process Result', vscode.TreeItemCollapsibleState.None, 'Get Process Result    ${handle}', 'Process'),
            new KeywordTreeItem('Process Should Be Stopped', vscode.TreeItemCollapsibleState.None, 'Process Should Be Stopped    ${handle}', 'Process'),
            new KeywordTreeItem('Process Should Be Running', vscode.TreeItemCollapsibleState.None, 'Process Should Be Running    ${handle}', 'Process')
        ];
    }
    getXMLKeywords() {
        return [
            new KeywordTreeItem('Parse XML', vscode.TreeItemCollapsibleState.None, 'Parse XML    ${source}', 'XML'),
            new KeywordTreeItem('Get Element', vscode.TreeItemCollapsibleState.None, 'Get Element    ${source}    ${xpath}', 'XML'),
            new KeywordTreeItem('Get Elements', vscode.TreeItemCollapsibleState.None, 'Get Elements    ${source}    ${xpath}', 'XML'),
            new KeywordTreeItem('Get Element Text', vscode.TreeItemCollapsibleState.None, 'Get Element Text    ${source}    ${xpath}', 'XML'),
            new KeywordTreeItem('Get Element Attribute', vscode.TreeItemCollapsibleState.None, 'Get Element Attribute    ${source}    ${name}    ${xpath}', 'XML'),
            new KeywordTreeItem('Element Should Exist', vscode.TreeItemCollapsibleState.None, 'Element Should Exist    ${source}    ${xpath}', 'XML'),
            new KeywordTreeItem('Element Text Should Be', vscode.TreeItemCollapsibleState.None, 'Element Text Should Be    ${source}    ${expected}    ${xpath}', 'XML'),
            new KeywordTreeItem('Save XML', vscode.TreeItemCollapsibleState.None, 'Save XML    ${source}    ${path}', 'XML')
        ];
    }
}
//# sourceMappingURL=extension.js.map