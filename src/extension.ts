import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const projectProvider = new RobotFrameworkKeywordProvider('project');
    const officialProvider = new RobotFrameworkKeywordProvider('official');
    const variablesProvider = new VariablesProvider();
    vscode.window.registerTreeDataProvider('rfProjectKeywords', projectProvider);
    vscode.window.registerTreeDataProvider('rfOfficialKeywords', officialProvider);
    vscode.window.registerTreeDataProvider('rfVariables', variablesProvider);

    // Clear old keywords and scan workspace for keywords on activation
    const clearAndScan = async () => {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('customKeywords', [], vscode.ConfigurationTarget.Global);
        await scanWorkspaceKeywords();
        projectProvider.refresh();
        officialProvider.refresh();
        variablesProvider.refresh();
    };
    clearAndScan();

    vscode.commands.registerCommand('rfKeywords.insertKeyword', (item: KeywordTreeItem) => {
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

    vscode.commands.registerCommand('rfKeywords.copyKeyword', (item: KeywordTreeItem) => {
        if (item.implementation) {
            vscode.env.clipboard.writeText(item.implementation);
            vscode.window.showInformationMessage(`Copied: ${item.label}`);
        }
    });

    vscode.commands.registerCommand('rfKeywords.customizeKeyword', async (item: KeywordTreeItem) => {
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

    vscode.commands.registerCommand('rfKeywords.refresh', async () => {
        vscode.window.showInformationMessage('Scanning workspace for keywords...');
        // Clear existing custom keywords to force fresh scan
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('customKeywords', [], vscode.ConfigurationTarget.Global);
        await scanWorkspaceKeywords();
        projectProvider.refresh();
        officialProvider.refresh();
        variablesProvider.refresh();
    });

    vscode.commands.registerCommand('rfKeywords.editKeywordDefaults', async () => {
        await editKeywordDefaults();
    });

    vscode.commands.registerCommand('rfKeywords.addCustomKeyword', async () => {
        await addCustomKeyword();
        projectProvider.refresh();
        officialProvider.refresh();
        variablesProvider.refresh();
    });

    vscode.commands.registerCommand('rfKeywords.importFile', async (item: KeywordTreeItem) => {
        await importLibraryOrResource(item);
    });

    // Variable commands
    vscode.commands.registerCommand('rfVariables.insertVariable', (item: VariableTreeItem) => {
        if (item.variable) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const position = editor.selection.active;
                const variableWithNewline = item.variable.name + '\n';
                editor.edit(editBuilder => {
                    editBuilder.insert(position, variableWithNewline);
                });
                vscode.window.showInformationMessage(`Inserted: ${item.variable.name}`);
            }
        }
    });

    vscode.commands.registerCommand('rfVariables.copyVariable', (item: VariableTreeItem) => {
        if (item.variable) {
            vscode.env.clipboard.writeText(item.variable.name);
            vscode.window.showInformationMessage(`Copied: ${item.variable.name}`);
        }
    });

    vscode.commands.registerCommand('rfVariables.importFile', async (item: VariableTreeItem) => {
        await importVariableFile(item);
    });

    vscode.commands.registerCommand('rfVariables.refresh', async () => {
        vscode.window.showInformationMessage('Scanning workspace for variables...');
        await scanWorkspaceVariables();
        variablesProvider.refresh();
    });
}

async function importLibraryOrResource(item: KeywordTreeItem): Promise<void> {
    if (!item.label) {
        vscode.window.showErrorMessage('No file selected for import');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active Robot Framework file to import into');
        return;
    }

    // Get the file information from the tree item
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const customKeywords = config.get('customKeywords', []) as any[];

    // Find the actual file path for this library
    const baseFileName = item.label.replace(/\.(py|robot|resource)$/, '');
    console.log('Looking for file:', baseFileName);
    console.log('Available keywords:', customKeywords.map(k => `${k.library} (${k.source})`));

    const matchingKeyword = customKeywords.find(keyword =>
        keyword.library === baseFileName &&
        (keyword.source === 'python' || keyword.source === 'robot')
    );

    if (!matchingKeyword) {
        // Try alternative matching - look for any keyword that contains this name
        const alternativeMatch = customKeywords.find(keyword =>
            keyword.filePath && keyword.filePath.includes(baseFileName) &&
            (keyword.source === 'python' || keyword.source === 'robot')
        );

        if (alternativeMatch) {
            console.log('Found alternative match:', alternativeMatch.filePath);
            // Use the alternative match
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const workspacePath = workspaceFolders[0].uri.fsPath;
            const relativeTargetPath = path.relative(workspacePath, alternativeMatch.filePath);

            // Determine import type based on file extension
            const isPythonFile = alternativeMatch.filePath.endsWith('.py');
            const importType = isPythonFile ? 'Library' : 'Resource';
            const importStatement = `${importType}    ${relativeTargetPath}`;

            // Check if import already exists
            const existingImport = checkExistingImport(editor, importType, relativeTargetPath);
            if (existingImport.exists) {
                const action = await vscode.window.showWarningMessage(
                    `Import already exists at line ${existingImport.line}: "${existingImport.statement}"`,
                    'Show Line', 'OK'
                );

                if (action === 'Show Line') {
                    // Navigate to the existing import line
                    const position = new vscode.Position(existingImport.line! - 1, 0);
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                }
                return;
            }

            // Insert the import statement in the Settings section
            await insertImportStatement(editor, importStatement);
            vscode.window.showInformationMessage(`Imported: ${importStatement}`);
            return;
        }

        vscode.window.showErrorMessage(`Could not find file path for import. Looking for: "${baseFileName}" in ${customKeywords.length} keywords`);
        return;
    }

    // Get relative path from current file to the library/resource
    const currentFilePath = editor.document.uri.fsPath;
    const currentFileDir = path.dirname(currentFilePath);
    const targetFilePath = matchingKeyword.filePath;

    // Get workspace folder to calculate relative path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const relativeTargetPath = path.relative(workspacePath, targetFilePath);

    // Determine import type based on file extension
    const isPythonFile = targetFilePath.endsWith('.py');
    const importType = isPythonFile ? 'Library' : 'Resource';
    const importStatement = `${importType}    ${relativeTargetPath}`;

    // Check if import already exists
    const existingImport = checkExistingImport(editor, importType, relativeTargetPath);
    if (existingImport.exists) {
        const action = await vscode.window.showWarningMessage(
            `Import already exists at line ${existingImport.line}: "${existingImport.statement}"`,
            'Show Line', 'OK'
        );

        if (action === 'Show Line') {
            // Navigate to the existing import line
            const position = new vscode.Position(existingImport.line! - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        return;
    }

    // Insert the import statement in the Settings section
    await insertImportStatement(editor, importStatement);

    vscode.window.showInformationMessage(`Imported: ${importStatement}`);
}

async function importVariableFile(item: VariableTreeItem): Promise<void> {
    if (!item.label) {
        vscode.window.showErrorMessage('No file selected for import');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active Robot Framework file to import into');
        return;
    }

    // Get the file information from the tree item
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const discoveredVariables = config.get('discoveredVariables', []) as any[];

    // Find the actual file path for this variable file
    const baseFileName = item.label.replace(/\.(py|robot|resource)$/, '');
    console.log('Looking for variable file:', baseFileName);

    const matchingVariable = discoveredVariables.find(variable =>
        variable.fileName === baseFileName &&
        (variable.source === 'python' || variable.source === 'robot')
    );

    if (!matchingVariable) {
        vscode.window.showErrorMessage(`Could not find file path for variable import: "${baseFileName}"`);
        return;
    }

    // Get workspace folder to calculate relative path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const relativeTargetPath = path.relative(workspacePath, matchingVariable.filePath);

    // Determine import type based on file extension
    const isPythonFile = matchingVariable.filePath.endsWith('.py');
    const importType = isPythonFile ? 'Variables' : 'Resource';
    const importStatement = `${importType}    ${relativeTargetPath}`;

    // Check if import already exists
    const existingImport = checkExistingImport(editor, importType, relativeTargetPath);
    if (existingImport.exists) {
        const action = await vscode.window.showWarningMessage(
            `Import already exists at line ${existingImport.line}: "${existingImport.statement}"`,
            'Show Line', 'OK'
        );

        if (action === 'Show Line') {
            // Navigate to the existing import line
            const position = new vscode.Position(existingImport.line! - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        return;
    }

    // Insert the import statement in the Settings section
    await insertImportStatement(editor, importStatement);

    vscode.window.showInformationMessage(`Imported: ${importStatement}`);
}

async function insertImportStatement(editor: vscode.TextEditor, importStatement: string): Promise<void> {
    const document = editor.document;
    const text = document.getText();
    const lines = text.split('\n');

    let settingsStartLine = -1;
    let settingsEndLine = -1;
    let lastImportLine = -1;

    // Find the Settings section
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.match(/^\*+\s*Settings?\s*\**/i)) {
            settingsStartLine = i;
            continue;
        }

        if (settingsStartLine !== -1 && line.match(/^\*+\s*(Test Cases?|Keywords?|Variables?|Tasks?)\s*\**/i)) {
            settingsEndLine = i;
            break;
        }

        // Track import statements
        if (settingsStartLine !== -1 && settingsEndLine === -1) {
            if (line.match(/^(Library|Resource|Variables)\s+/i)) {
                lastImportLine = i;
            }
        }
    }

    let insertLine: number;

    if (settingsStartLine === -1) {
        // No Settings section exists, create one at the top
        const settingsSection = `*** Settings ***\n${importStatement}\n\n`;
        const insertPosition = new vscode.Position(0, 0);
        await editor.edit(editBuilder => {
            editBuilder.insert(insertPosition, settingsSection);
        });
        return;
    }

    if (lastImportLine !== -1) {
        // Insert after the last import statement
        insertLine = lastImportLine + 1;
    } else {
        // Insert right after the Settings header
        insertLine = settingsStartLine + 1;
    }

    const insertPosition = new vscode.Position(insertLine, 0);
    const importWithNewline = `${importStatement}\n`;

    await editor.edit(editBuilder => {
        editBuilder.insert(insertPosition, importWithNewline);
    });
}

function checkExistingImport(editor: vscode.TextEditor, importType: string, importPath: string): { exists: boolean; line?: number; statement?: string } {
    const document = editor.document;
    const text = document.getText();
    const lines = text.split('\n');

    let inSettingsSection = false;
    let settingsEndLine = -1;

    // Parse the Settings section to find existing imports
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for Settings section
        if (line.match(/^\*+\s*Settings?\s*\**/i)) {
            inSettingsSection = true;
            continue;
        }

        // Check for other sections (end of Settings)
        if (inSettingsSection && line.match(/^\*+\s*(Test Cases?|Keywords?|Variables?|Tasks?)\s*\**/i)) {
            settingsEndLine = i;
            break;
        }

        // If we're in the Settings section, check for matching imports
        if (inSettingsSection && settingsEndLine === -1) {
            // Match import statements: Library/Resource/Variables    path
            const importMatch = line.match(/^(Library|Resource|Variables)\s+(.+)$/i);
            if (importMatch) {
                const existingImportType = importMatch[1];
                const existingImportPath = importMatch[2].trim();

                // Check for exact match (case-insensitive)
                if (existingImportType.toLowerCase() === importType.toLowerCase() &&
                    existingImportPath === importPath) {
                    return {
                        exists: true,
                        line: i + 1, // Convert to 1-based line number
                        statement: line
                    };
                }

                // Also check for path variations (with/without file extension, relative paths)
                const normalizeImportPath = (path: string) => {
                    // Remove file extension for comparison
                    const withoutExt = path.replace(/\.(py|robot|resource)$/, '');
                    // Normalize path separators
                    return withoutExt.replace(/\\/g, '/').toLowerCase();
                };

                if (existingImportType.toLowerCase() === importType.toLowerCase() &&
                    normalizeImportPath(existingImportPath) === normalizeImportPath(importPath)) {
                    return {
                        exists: true,
                        line: i + 1,
                        statement: line
                    };
                }
            }
        }
    }

    return { exists: false };
}

async function customizeKeywordParameters(item: KeywordTreeItem): Promise<string | undefined> {
    const implementation = item.implementation!;
    const placeholders = implementation.match(/\$\{[^}]+\}/g) || [];

    if (placeholders.length === 0) {
        return implementation;
    }

    let customizedKeyword = implementation;
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const defaultValues = config.get('defaultValues', {}) as Record<string, string>;

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

function getBuiltInDefault(paramName: string): string {
    const builtInDefaults: Record<string, string> = {
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

async function editKeywordDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const currentDefaults = config.get('defaultValues', {}) as Record<string, string>;

    const result = await vscode.window.showQuickPick([
        { label: '$(add) Add New Default', action: 'add' },
        { label: '$(edit) Edit Existing Defaults', action: 'edit' },
        { label: '$(trash) Reset to Defaults', action: 'reset' }
    ], {
        placeHolder: 'Choose an action for keyword defaults'
    });

    if (!result) return;

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

async function addNewDefault(currentDefaults: Record<string, string>): Promise<void> {
    const paramName = await vscode.window.showInputBox({
        prompt: 'Enter parameter name (without ${} brackets)',
        placeHolder: 'e.g., url, selector, text'
    });

    if (!paramName) return;

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

async function editExistingDefaults(currentDefaults: Record<string, string>): Promise<void> {
    const items = Object.entries(currentDefaults).map(([key, value]) => ({
        label: key,
        description: value,
        key: key,
        value: value
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select parameter to edit'
    });

    if (!selected) return;

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

async function resetDefaults(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
        'Reset all keyword defaults to built-in values?',
        { modal: true },
        'Reset'
    );

    if (confirmed === 'Reset') {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('defaultValues', undefined, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Keyword defaults reset to built-in values');
    }
}

async function addCustomKeyword(): Promise<void> {
    const name = await vscode.window.showInputBox({
        prompt: 'Enter keyword name',
        placeHolder: 'e.g., My Custom Keyword'
    });

    if (!name) return;

    const implementation = await vscode.window.showInputBox({
        prompt: 'Enter keyword implementation',
        placeHolder: 'e.g., My Custom Keyword    ${param1}    ${param2}'
    });

    if (!implementation) return;

    const library = await vscode.window.showInputBox({
        prompt: 'Enter library name',
        placeHolder: 'e.g., Custom, MyLibrary',
        value: 'Custom'
    });

    if (!library) return;

    const description = await vscode.window.showInputBox({
        prompt: 'Enter description (optional)',
        placeHolder: 'Brief description of what this keyword does'
    });

    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const customKeywords = config.get('customKeywords', []) as any[];

    customKeywords.push({
        name,
        implementation,
        library,
        description: description || ''
    });

    await config.update('customKeywords', customKeywords, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Added custom keyword: ${name}`);
}

async function scanWorkspaceKeywords(): Promise<void> {
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const shouldScan = config.get('scanCustomKeywords', true);

    if (!shouldScan) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const discoveredKeywords: any[] = [];

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
            // Use configurable scan paths
            const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
            const scanPaths = config.get('projectScanPaths', [
                'Libraries/**/*.py',
                'POM/**/*.{robot,resource}',
                'Utilities/**/*.{py,robot,resource}',
                'Resources/**/*.{py,robot,resource}',
                '*.resource'
            ]) as string[];

            await scanWithGlobPatterns(basePath, scanPaths, discoveredKeywords);
        }
    }


    if (discoveredKeywords.length > 0) {
        // Merge with existing custom keywords
        const existingKeywords = config.get('customKeywords', []) as any[];
        const mergedKeywords = mergeKeywords(existingKeywords, discoveredKeywords);

        await config.update('customKeywords', mergedKeywords, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Discovered ${discoveredKeywords.length} keywords from workspace`);
    } else {
        vscode.window.showInformationMessage('No keywords found in workspace');
    }

    // Also scan for variables
    await scanWorkspaceVariables();
}

async function scanWorkspaceVariables(): Promise<void> {
    const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
    const shouldScan = config.get('scanVariables', true);

    if (!shouldScan) return;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const discoveredVariables: any[] = [];

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
            const scanPaths = config.get('projectScanPaths', [
                'Libraries/**/*.py',
                'POM/**/*.{robot,resource}',
                'Utilities/**/*.{py,robot,resource}',
                'Resources/**/*.{py,robot,resource}',
                '*.resource'
            ]) as string[];

            await scanVariablesWithGlobPatterns(basePath, scanPaths, discoveredVariables);
        }
    }

    // Store discovered variables
    await config.update('discoveredVariables', discoveredVariables, vscode.ConfigurationTarget.Global);
    console.log(`Discovered ${discoveredVariables.length} variables from workspace`);
}

async function scanVariablesWithGlobPatterns(basePath: string, patterns: string[], variables: any[]): Promise<void> {
    for (const pattern of patterns) {
        try {
            if (pattern.includes('Libraries/**/*.py')) {
                await scanPythonVariables(path.join(basePath, 'Libraries'), variables, basePath);
            } else if (pattern.includes('POM/**/*')) {
                await scanRobotVariables(path.join(basePath, 'POM'), variables, basePath);
            } else if (pattern.includes('Utilities/**/*')) {
                await scanUtilitiesVariables(path.join(basePath, 'Utilities'), variables, basePath);
            } else if (pattern.includes('Resources/**/*')) {
                await scanResourcesVariables(path.join(basePath, 'Resources'), variables, basePath);
            } else if (pattern === '*.resource') {
                await scanRootVariableFiles(basePath, variables, basePath);
            }
        } catch (error) {
            console.error(`Error scanning variables for pattern ${pattern}:`, error);
        }
    }
}

async function scanPythonVariables(librariesPath: string, variables: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(librariesPath)) {
        return;
    }

    try {
        const files = await getAllPythonFiles(librariesPath);

        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedVariables = extractPythonVariables(content, filePath, basePath);
            variables.push(...extractedVariables);
        }
    } catch (error) {
        console.error('Error scanning Python variables:', error);
    }
}

async function scanRobotVariables(variablesPath: string, variables: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(variablesPath)) {
        return;
    }

    try {
        const files = await getAllRobotFiles(variablesPath);

        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedVariables = extractRobotVariables(content, filePath, basePath);
            variables.push(...extractedVariables);
        }
    } catch (error) {
        console.error('Error scanning Robot variables:', error);
    }
}

async function scanUtilitiesVariables(utilitiesPath: string, variables: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(utilitiesPath)) return;

    try {
        // Scan Python files in Utilities
        const pythonFiles = await getAllPythonFiles(utilitiesPath);
        for (const filePath of pythonFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedVariables = extractPythonVariables(content, filePath, basePath);
            variables.push(...extractedVariables);
        }

        // Scan Robot files in Utilities
        const robotFiles = await getAllRobotFiles(utilitiesPath);
        for (const filePath of robotFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedVariables = extractRobotVariables(content, filePath, basePath);
            variables.push(...extractedVariables);
        }
    } catch (error) {
        console.error('Error scanning Utilities variables:', error);
    }
}

async function scanResourcesVariables(resourcesPath: string, variables: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(resourcesPath)) return;

    try {
        // Scan Python files in Resources
        const pythonFiles = await getAllPythonFiles(resourcesPath);
        for (const filePath of pythonFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedVariables = extractPythonVariables(content, filePath, basePath);
            variables.push(...extractedVariables);
        }

        // Scan Robot/Resource files in Resources
        const robotFiles = await getAllRobotFiles(resourcesPath);
        for (const filePath of robotFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const extractedVariables = extractRobotVariables(content, filePath, basePath);
            variables.push(...extractedVariables);
        }
    } catch (error) {
        console.error('Error scanning Resources variables:', error);
    }
}

async function scanRootVariableFiles(rootPath: string, variables: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(rootPath)) return;

    try {
        const items = fs.readdirSync(rootPath);

        for (const item of items) {
            const itemPath = path.join(rootPath, item);
            const stat = fs.statSync(itemPath);

            if (!stat.isDirectory() && item.endsWith('.resource')) {
                const content = fs.readFileSync(itemPath, 'utf-8');
                const extractedVariables = extractRobotVariables(content, itemPath, basePath);
                variables.push(...extractedVariables);
            }
        }
    } catch (error) {
        console.error('Error scanning root variable files:', error);
    }
}

async function scanPythonKeywords(librariesPath: string, keywords: any[], basePath?: string): Promise<void> {
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
    } catch (error) {
        console.error('Error scanning Python keywords:', error);
    }
}

async function scanRobotKeywords(keywordsPath: string, keywords: any[], basePath?: string): Promise<void> {
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
    } catch (error) {
        console.error('Error scanning Robot keywords:', error);
    }
}

async function scanUtilitiesFolder(utilitiesPath: string, keywords: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(utilitiesPath)) return;

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
    } catch (error) {
        console.error('Error scanning Utilities folder:', error);
    }
}

async function scanResourcesFolder(resourcesPath: string, keywords: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(resourcesPath)) return;

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
    } catch (error) {
        console.error('Error scanning Resources folder:', error);
    }
}

async function scanWithGlobPatterns(basePath: string, patterns: string[], keywords: any[]): Promise<void> {
    // Simple pattern-based scanning using existing recursive functions
    for (const pattern of patterns) {
        try {
            if (pattern.includes('Libraries/**/*.py')) {
                await scanPythonKeywords(path.join(basePath, 'Libraries'), keywords, basePath);
            } else if (pattern.includes('POM/**/*')) {
                await scanRobotKeywords(path.join(basePath, 'POM'), keywords, basePath);
            } else if (pattern.includes('Utilities/**/*')) {
                await scanUtilitiesFolder(path.join(basePath, 'Utilities'), keywords, basePath);
            } else if (pattern.includes('Resources/**/*')) {
                await scanResourcesFolder(path.join(basePath, 'Resources'), keywords, basePath);
            } else if (pattern === '*.resource') {
                await scanRootResourceFiles(basePath, keywords, basePath);
            }
        } catch (error) {
            console.error(`Error scanning pattern ${pattern}:`, error);
        }
    }
}

async function scanRootResourceFiles(rootPath: string, keywords: any[], basePath?: string): Promise<void> {
    if (!fs.existsSync(rootPath)) return;

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
    } catch (error) {
        console.error('Error scanning root resource files:', error);
    }
}

async function getAllPythonFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    function scanDirectory(currentPath: string) {
        if (!fs.existsSync(currentPath)) return;

        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                scanDirectory(itemPath); // Recursive scan
            } else if (item.endsWith('.py')) {
                files.push(itemPath);
            }
        }
    }

    scanDirectory(dirPath);
    return files;
}

async function getAllRobotFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    function scanDirectory(currentPath: string) {
        if (!fs.existsSync(currentPath)) return;

        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                scanDirectory(itemPath); // Recursive scan
            } else if (item.endsWith('.robot') || item.endsWith('.resource')) {
                files.push(itemPath);
            }
        }
    }

    scanDirectory(dirPath);
    return files;
}

function extractPythonKeywords(content: string, filePath: string, basePath?: string): any[] {
    const keywords: any[] = [];
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

    const processedKeywords = new Set<string>(); // To avoid duplicates

    // First, process @keyword("Custom Name") decorators
    let match;
    while ((match = keywordDecoratorRegex.exec(content)) !== null) {
        const customKeywordName = match[1];
        const methodName = match[2];

        if (processedKeywords.has(methodName)) continue;
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

        if (processedKeywords.has(methodName)) continue;
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

function addKeywordToResults(keywordName: string, implementation: string, fileName: string, filePath: string, folderPath: string, keywords: any[]) {
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

function extractRobotKeywords(content: string, filePath: string, basePath?: string): any[] {
    const keywords: any[] = [];
    const fileExtension = path.extname(filePath);
    const fileName = path.basename(filePath, fileExtension);

    // Look for Robot Framework keyword definitions
    const lines = content.split('\n');
    let inKeywordSection = false;
    let currentKeyword: any = null;

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

function extractKeywordArguments(keywordLine: string, allLines: string[], currentIndex: number): { name: string, implementation: string } {
    const keywordName = keywordLine.trim();
    const args: string[] = [];

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

function parseArgumentLine(argLine: string): string[] {
    if (!argLine.trim()) return [];

    // Split by spaces but keep together argument=defaultValue pairs
    const parts = argLine.split(/\s+/).filter(arg => arg.length > 0);
    return parts;
}

function extractPythonVariables(content: string, filePath: string, basePath?: string): any[] {
    const variables: any[] = [];
    const fileName = path.basename(filePath, '.py');

    // Get relative path from workspace for organization
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let relativePath = filePath;
    let folderPath = 'Root';

    if (workspaceFolders && workspaceFolders.length > 0) {
        const referencePath = basePath || workspaceFolders[0].uri.fsPath;
        relativePath = path.relative(referencePath, filePath);
        folderPath = path.dirname(relativePath);

        folderPath = folderPath.replace(/\\/g, '/');
        if (folderPath === '.') {
            folderPath = 'Root';
        }
    }

    // Extract Python variables - look for module-level assignments
    const lines = content.split('\n');
    let inClass = false;
    let inFunction = false;
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === '' || trimmedLine.startsWith('#')) {
            continue;
        }

        // Track if we're inside a class or function
        const currentIndent = line.length - line.trimStart().length;

        if (trimmedLine.startsWith('class ')) {
            inClass = true;
            indentLevel = currentIndent;
            continue;
        }

        if (trimmedLine.startsWith('def ')) {
            inFunction = true;
            indentLevel = currentIndent;
            continue;
        }

        // Reset flags when we go back to module level
        if (currentIndent <= indentLevel && (inClass || inFunction)) {
            inClass = false;
            inFunction = false;
        }

        // Only extract module-level variables (not inside class or function)
        if (!inClass && !inFunction) {
            // Look for variable assignments: VARIABLE = value
            const variableMatch = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
            if (variableMatch) {
                const varName = variableMatch[1];
                let varValue = variableMatch[2].trim();

                // Remove quotes if it's a string
                if ((varValue.startsWith('"') && varValue.endsWith('"')) ||
                    (varValue.startsWith("'") && varValue.endsWith("'"))) {
                    varValue = varValue.slice(1, -1);
                }

                variables.push({
                    name: varName,
                    value: varValue,
                    type: 'string',
                    source: 'python',
                    filePath: filePath,
                    folderPath: folderPath,
                    fileName: fileName
                });
            }
        }
    }

    return variables;
}

function extractRobotVariables(content: string, filePath: string, basePath?: string): any[] {
    const variables: any[] = [];
    const fileExtension = path.extname(filePath);
    const fileName = path.basename(filePath, fileExtension);

    // Get relative path from workspace for organization
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let relativePath = filePath;
    let folderPath = 'Root';

    if (workspaceFolders && workspaceFolders.length > 0) {
        const referencePath = basePath || workspaceFolders[0].uri.fsPath;
        relativePath = path.relative(referencePath, filePath);
        folderPath = path.dirname(relativePath);

        folderPath = folderPath.replace(/\\/g, '/');
        if (folderPath === '.') {
            folderPath = 'Root';
        }
    }

    // Look for Robot Framework variable definitions
    const lines = content.split('\n');
    let inVariableSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for Variables section
        if (line.match(/^\*+\s*(Variables?)\s*\**/i)) {
            inVariableSection = true;
            continue;
        }

        // Check for other sections
        if (line.match(/^\*+\s*(Test Cases?|Keywords?|Settings?|Tasks?)\s*\**/i)) {
            inVariableSection = false;
            continue;
        }

        if (!inVariableSection || line === '' || line.startsWith('#')) {
            continue;
        }

        // Parse variable definitions
        // ${VARIABLE}    value
        // @{LIST}        item1    item2    item3
        // &{DICT}        key1=value1    key2=value2
        const variableMatch = line.match(/^([\$@&]\{([^}]+)\})\s+(.+)$/);
        if (variableMatch) {
            const fullVarName = variableMatch[1];
            const varName = variableMatch[2];
            const varValue = variableMatch[3].trim();

            let varType = 'string';
            if (fullVarName.startsWith('@{')) {
                varType = 'list';
            } else if (fullVarName.startsWith('&{')) {
                varType = 'dict';
            }

            variables.push({
                name: fullVarName,
                value: varValue,
                type: varType,
                source: 'robot',
                filePath: filePath,
                folderPath: folderPath,
                fileName: fileName,
                fileType: fileExtension === '.resource' ? 'resource' : 'robot'
            });
        }
    }

    return variables;
}

function parseParameters(paramString: string): string[] {
    if (!paramString.trim()) return [];

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

function mergeKeywords(existing: any[], discovered: any[]): any[] {
    const merged = [...existing];

    for (const newKeyword of discovered) {
        // Check if keyword already exists (by name and source)
        const exists = existing.some(k =>
            k.name === newKeyword.name &&
            k.source === newKeyword.source &&
            k.filePath === newKeyword.filePath
        );

        if (!exists) {
            merged.push(newKeyword);
        }
    }

    return merged;
}

export function deactivate() {}

class KeywordTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly implementation?: string,
        public readonly library?: string
    ) {
        super(label, collapsibleState);

        if (implementation) {
            this.tooltip = `${this.label}: Click to copy, Right-click for more options`;
            this.description = library;
            this.contextValue = 'keyword';
            this.command = {
                command: 'rfKeywords.copyKeyword',
                title: 'Copy Keyword',
                arguments: [this]
            };

            // Add styling and icons based on configuration
            const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
            if (config.get('showIcons', true)) {
                this.iconPath = this.getKeywordIcon();
            }

        } else {
            this.tooltip = `${this.label} library keywords`;
            this.contextValue = 'library';

            // Set appropriate icons for different file types
            if (this.label.endsWith('.py')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
            } else if (this.label.endsWith('.robot')) {
                this.iconPath = new vscode.ThemeIcon('robot');
            } else if (this.label.endsWith('.resource')) {
                this.iconPath = new vscode.ThemeIcon('symbol-module');
            } else {
                this.iconPath = new vscode.ThemeIcon('folder');
            }
        }
    }

    private getKeywordIcon(): vscode.ThemeIcon {
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

class VariableTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly variable?: any,
        public readonly folderPath?: string
    ) {
        super(label, collapsibleState);

        if (variable) {
            this.tooltip = `${this.label}: ${variable.value}`;
            this.description = variable.value;
            this.contextValue = 'variable';
            this.command = {
                command: 'rfVariables.copyVariable',
                title: 'Copy Variable',
                arguments: [this]
            };

            // Add icons based on variable type
            if (variable.type === 'list') {
                this.iconPath = new vscode.ThemeIcon('list-unordered');
            } else if (variable.type === 'dict') {
                this.iconPath = new vscode.ThemeIcon('symbol-object');
            } else {
                this.iconPath = new vscode.ThemeIcon('symbol-variable');
            }
        } else {
            this.tooltip = `${this.label} variables`;
            this.contextValue = 'variableFile';

            // Set appropriate icons for different file types
            if (this.label.endsWith('.py')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
            } else if (this.label.endsWith('.robot')) {
                this.iconPath = new vscode.ThemeIcon('robot');
            } else if (this.label.endsWith('.resource')) {
                this.iconPath = new vscode.ThemeIcon('symbol-module');
            } else {
                this.iconPath = new vscode.ThemeIcon('folder');
            }
        }
    }
}

class RobotFrameworkKeywordProvider implements vscode.TreeDataProvider<KeywordTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeywordTreeItem | undefined | null | void> = new vscode.EventEmitter<KeywordTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeywordTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private viewType: 'project' | 'official') {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: KeywordTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: KeywordTreeItem): Thenable<KeywordTreeItem[]> {
        if (!element) {
            if (this.viewType === 'project') {
                return Promise.resolve(this.getProjectKeywordCategories());
            } else {
                return Promise.resolve(this.getOfficialKeywordCategories());
            }
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
                if ((element as any).folderPath !== undefined) {
                    // This is a folder, return files in this folder
                    return Promise.resolve(this.getFilesInFolder((element as any).folderPath));
                } else {
                    // This is a file, return keywords in this file
                    return Promise.resolve(this.getKeywordsForFile(element.label));
                }
        }
    }


    private getProjectKeywordCategories(): KeywordTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []) as any[];

        if (customKeywords.length === 0) {
            return [new KeywordTreeItem(
                'No project keywords found',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'Empty'
            )];
        }

        return this.getFileBasedCategories(customKeywords);
    }

    private getOfficialKeywordCategories(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Browser Library', vscode.TreeItemCollapsibleState.Expanded),
            new KeywordTreeItem('BuiltIn Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Collections Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('String Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('DateTime Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('OperatingSystem Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('Process Library', vscode.TreeItemCollapsibleState.Collapsed),
            new KeywordTreeItem('XML Library', vscode.TreeItemCollapsibleState.Collapsed)
        ];
    }

    private getFileBasedCategories(customKeywords: any[]): KeywordTreeItem[] {
        const folderStructure = new Map<string, Map<string, any[]>>();

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

                const folderFiles = folderStructure.get(folderPath)!;
                if (!folderFiles.has(fileName)) {
                    folderFiles.set(fileName, []);
                }
                folderFiles.get(fileName)!.push(keyword);
            }
        });

        // Create tree structure
        const categories: KeywordTreeItem[] = [];

        // Sort folders alphabetically
        const sortedFolders = Array.from(folderStructure.keys()).sort();

        sortedFolders.forEach(folderPath => {
            const files = folderStructure.get(folderPath)!;

            // Create folder category with arrow notation for display
            const folderDisplayName = this.formatFolderName(folderPath);
            const folderItem = new KeywordTreeItem(
                folderDisplayName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'Folder'
            );

            // Store original folder path for later retrieval
            (folderItem as any).folderPath = folderPath;
            categories.push(folderItem);
        });

        // Add manually created keywords under "Custom Keywords" if any exist
        const manualKeywords = customKeywords.filter(keyword => !keyword.source);
        if (manualKeywords.length > 0) {
            categories.push(new KeywordTreeItem(
                'Custom Keywords',
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'Manual'
            ));
        }

        return categories;
    }

    private simplifFolderPath(folderPath: string): string {
        if (folderPath === '.' || folderPath === '' || folderPath === 'Root') {
            return 'Root';
        }

        // Dynamic POM pattern matching for all subdirectories
        const pomMatch = folderPath.match(/^POM\/Keywords\/(.+)$/i);
        if (pomMatch) {
            const subPath = pomMatch[1];
            // Convert UI/Generic -> UI Generic, API/Actions -> API Actions, etc.
            return subPath.replace(/\//g, ' ');
        }

        // Libraries patterns - keep Libraries as the main category
        if (folderPath.match(/^Libraries/i)) {
            const parts = folderPath.split(/[\/\\]/);
            if (parts.length > 1) {
                // Libraries/Utilities -> Libraries Utilities, Libraries/Other -> Libraries Other
                return parts.join(' ');
            }
            return 'Libraries';
        }

        // Resources patterns
        if (folderPath.match(/^Resources/i)) {
            const parts = folderPath.split(/[\/\\]/);
            if (parts.length > 1) {
                // Resources/Configurations -> Configurations, Resources/Setup -> Setup
                return parts.slice(1).join(' ');
            }
            return 'Resources';
        }

        // Simple patterns
        const simplePatterns = [
            { pattern: /^Utilities$/i, replacement: 'Utilities' }
        ];

        for (const { pattern, replacement } of simplePatterns) {
            if (pattern.test(folderPath)) {
                return replacement;
            }
        }

        // Fallback: take last meaningful parts
        const parts = folderPath.split(/[\/\\]/);
        if (parts.length > 2) {
            return parts.slice(-2).join(' ');
        }

        return folderPath.replace(/[\/\\]/g, ' ');
    }

    private formatFolderName(folderPath: string): string {
        if (folderPath === '.' || folderPath === '' || folderPath === 'Root') {
            return 'Root';
        }

        // Convert back to arrow notation for display
        return folderPath.replace(/[\/\\]/g, ' → ');
    }

    private getFilesInFolder(folderPath: string): KeywordTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []) as any[];

        // Get all files in this specific folder
        const filesInFolder = new Map<string, any[]>();

        customKeywords.forEach(keyword => {
            if (keyword.source === 'python' || keyword.source === 'robot') {
                let keywordFolderPath = keyword.folderPath || 'Root';

                // Normalize keyword folder path
                if (keywordFolderPath === '.' || keywordFolderPath === '') {
                    keywordFolderPath = 'Root';
                }

                if (keywordFolderPath === folderPath ||
                    (folderPath === 'Root' && (keywordFolderPath === '.' || keywordFolderPath === '' || keywordFolderPath === 'Root'))) {
                    const fileName = keyword.library;
                    if (!filesInFolder.has(fileName)) {
                        filesInFolder.set(fileName, []);
                    }
                    filesInFolder.get(fileName)!.push(keyword);
                }
            }
        });

        // Create file items
        const fileItems: KeywordTreeItem[] = [];
        filesInFolder.forEach((keywords, fileName) => {
            let displayName = fileName;
            let libraryType = 'Robot Keywords';

            // Add appropriate file extension if not present
            if (!fileName.includes('.')) {
                if (keywords[0].source === 'python') {
                    displayName = `${fileName}.py`;
                    libraryType = 'Python Library';
                } else if (keywords[0].fileType === 'resource') {
                    displayName = `${fileName}.resource`;
                    libraryType = 'Resource Keywords';
                } else {
                    displayName = `${fileName}.robot`;
                    libraryType = 'Robot Keywords';
                }
            } else {
                // File already has extension
                if (fileName.endsWith('.py')) {
                    libraryType = 'Python Library';
                } else if (fileName.endsWith('.resource')) {
                    libraryType = 'Resource Keywords';
                } else {
                    libraryType = 'Robot Keywords';
                }
            }

            fileItems.push(new KeywordTreeItem(
                displayName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                libraryType
            ));
        });

        return fileItems.sort((a, b) => a.label.localeCompare(b.label));
    }

    private getKeywordsForFile(fileName: string): KeywordTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []) as any[];

        // Remove file extension from the label for comparison
        const baseFileName = fileName.replace(/\.(py|robot|resource)$/, '');

        const fileKeywords = customKeywords.filter(keyword =>
            keyword.library === baseFileName &&
            (keyword.source === 'python' || keyword.source === 'robot')
        );

        return fileKeywords.map(keyword =>
            new KeywordTreeItem(
                keyword.name,
                vscode.TreeItemCollapsibleState.None,
                keyword.implementation,
                baseFileName
            )
        );
    }

    private getManualCustomKeywords(): KeywordTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const customKeywords = config.get('customKeywords', []) as any[];

        // Only return manually created keywords (no source property)
        const manualKeywords = customKeywords.filter(keyword => !keyword.source);

        return manualKeywords.map(keyword =>
            new KeywordTreeItem(
                keyword.name,
                vscode.TreeItemCollapsibleState.None,
                keyword.implementation,
                keyword.library || 'Custom'
            )
        );
    }

    private getBrowserSubcategories(): KeywordTreeItem[] {
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

    private getBrowserManagementKeywords(): KeywordTreeItem[] {
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

    private getNavigationKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Go To', vscode.TreeItemCollapsibleState.None, 'Go To    ${url}', 'Browser'),
            new KeywordTreeItem('Go Back', vscode.TreeItemCollapsibleState.None, 'Go Back', 'Browser'),
            new KeywordTreeItem('Go Forward', vscode.TreeItemCollapsibleState.None, 'Go Forward', 'Browser'),
            new KeywordTreeItem('Reload', vscode.TreeItemCollapsibleState.None, 'Reload', 'Browser')
        ];
    }

    private getElementInteractionKeywords(): KeywordTreeItem[] {
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

    private getTextInputKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Fill Text', vscode.TreeItemCollapsibleState.None, 'Fill Text    ${selector}    ${text}', 'Browser'),
            new KeywordTreeItem('Type Text', vscode.TreeItemCollapsibleState.None, 'Type Text    ${selector}    ${text}', 'Browser'),
            new KeywordTreeItem('Clear Text', vscode.TreeItemCollapsibleState.None, 'Clear Text    ${selector}', 'Browser'),
            new KeywordTreeItem('Press Keys', vscode.TreeItemCollapsibleState.None, 'Press Keys    ${selector}    ${key}', 'Browser')
        ];
    }

    private getFormElementsKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Check Checkbox', vscode.TreeItemCollapsibleState.None, 'Check Checkbox    ${selector}', 'Browser'),
            new KeywordTreeItem('Uncheck Checkbox', vscode.TreeItemCollapsibleState.None, 'Uncheck Checkbox    ${selector}', 'Browser'),
            new KeywordTreeItem('Select Options By', vscode.TreeItemCollapsibleState.None, 'Select Options By    ${selector}    text    ${value}', 'Browser'),
            new KeywordTreeItem('Deselect Options', vscode.TreeItemCollapsibleState.None, 'Deselect Options    ${selector}', 'Browser'),
            new KeywordTreeItem('Upload File', vscode.TreeItemCollapsibleState.None, 'Upload File    ${selector}    ${file_path}', 'Browser')
        ];
    }

    private getKeyboardActionsKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Keyboard Key', vscode.TreeItemCollapsibleState.None, 'Keyboard Key    press    ${key}', 'Browser'),
            new KeywordTreeItem('Keyboard Input', vscode.TreeItemCollapsibleState.None, 'Keyboard Input    insertText    ${text}', 'Browser')
        ];
    }

    private getElementPropertiesKeywords(): KeywordTreeItem[] {
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

    private getPageInformationKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Get Title', vscode.TreeItemCollapsibleState.None, 'Get Title', 'Browser'),
            new KeywordTreeItem('Get Url', vscode.TreeItemCollapsibleState.None, 'Get Url', 'Browser'),
            new KeywordTreeItem('Get Page Source', vscode.TreeItemCollapsibleState.None, 'Get Page Source', 'Browser'),
            new KeywordTreeItem('Get Viewport Size', vscode.TreeItemCollapsibleState.None, 'Get Viewport Size', 'Browser')
        ];
    }

    private getWaitingKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Wait For Elements State', vscode.TreeItemCollapsibleState.None, 'Wait For Elements State    ${selector}    visible    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Condition', vscode.TreeItemCollapsibleState.None, 'Wait For Condition    ${condition}    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Response', vscode.TreeItemCollapsibleState.None, 'Wait For Response    ${url_pattern}    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Request', vscode.TreeItemCollapsibleState.None, 'Wait For Request    ${url_pattern}    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Load State', vscode.TreeItemCollapsibleState.None, 'Wait For Load State    load    timeout=10s', 'Browser'),
            new KeywordTreeItem('Wait For Function', vscode.TreeItemCollapsibleState.None, 'Wait For Function    ${function}    timeout=10s', 'Browser')
        ];
    }

    private getScreenshotsKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Take Screenshot', vscode.TreeItemCollapsibleState.None, 'Take Screenshot    ${filename}', 'Browser'),
            new KeywordTreeItem('Take Screenshot Of Element', vscode.TreeItemCollapsibleState.None, 'Take Screenshot Of Element    ${selector}    ${filename}', 'Browser'),
            new KeywordTreeItem('Print Pdf', vscode.TreeItemCollapsibleState.None, 'Print Pdf    ${filename}', 'Browser')
        ];
    }

    private getScrollingKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Scroll To Element', vscode.TreeItemCollapsibleState.None, 'Scroll To Element    ${selector}', 'Browser'),
            new KeywordTreeItem('Scroll By', vscode.TreeItemCollapsibleState.None, 'Scroll By    ${x}    ${y}', 'Browser'),
            new KeywordTreeItem('Scroll To', vscode.TreeItemCollapsibleState.None, 'Scroll To    ${x}    ${y}', 'Browser')
        ];
    }

    private getAlertsKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Handle Future Dialogs', vscode.TreeItemCollapsibleState.None, 'Handle Future Dialogs    action=accept', 'Browser'),
            new KeywordTreeItem('Get Alert Message', vscode.TreeItemCollapsibleState.None, 'Get Alert Message', 'Browser')
        ];
    }

    private getNetworkKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Add Cookie', vscode.TreeItemCollapsibleState.None, 'Add Cookie    ${name}    ${value}    url=${url}', 'Browser'),
            new KeywordTreeItem('Get Cookies', vscode.TreeItemCollapsibleState.None, 'Get Cookies', 'Browser'),
            new KeywordTreeItem('Delete All Cookies', vscode.TreeItemCollapsibleState.None, 'Delete All Cookies', 'Browser')
        ];
    }

    private getLocalStorageKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Local Storage Set Item', vscode.TreeItemCollapsibleState.None, 'Local Storage Set Item    ${key}    ${value}', 'Browser'),
            new KeywordTreeItem('Local Storage Get Item', vscode.TreeItemCollapsibleState.None, 'Local Storage Get Item    ${key}', 'Browser'),
            new KeywordTreeItem('Local Storage Remove Item', vscode.TreeItemCollapsibleState.None, 'Local Storage Remove Item    ${key}', 'Browser'),
            new KeywordTreeItem('Local Storage Clear', vscode.TreeItemCollapsibleState.None, 'Local Storage Clear', 'Browser')
        ];
    }

    private getAssertionsKeywords(): KeywordTreeItem[] {
        return [
            new KeywordTreeItem('Get Element Should Be Visible', vscode.TreeItemCollapsibleState.None, 'Get Element Should Be Visible    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Element Should Not Be Visible', vscode.TreeItemCollapsibleState.None, 'Get Element Should Not Be Visible    ${selector}', 'Browser'),
            new KeywordTreeItem('Get Text Should Be', vscode.TreeItemCollapsibleState.None, 'Get Text Should Be    ${selector}    ${expected}', 'Browser'),
            new KeywordTreeItem('Get Title Should Be', vscode.TreeItemCollapsibleState.None, 'Get Title Should Be    ${expected}', 'Browser'),
            new KeywordTreeItem('Get Url Should Be', vscode.TreeItemCollapsibleState.None, 'Get Url Should Be    ${expected}', 'Browser')
        ];
    }

    private getBuiltInKeywords(): KeywordTreeItem[] {
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

    private getCollectionsKeywords(): KeywordTreeItem[] {
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

    private getStringKeywords(): KeywordTreeItem[] {
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

    private getDateTimeKeywords(): KeywordTreeItem[] {
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

    private getOperatingSystemKeywords(): KeywordTreeItem[] {
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

    private getProcessKeywords(): KeywordTreeItem[] {
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

    private getXMLKeywords(): KeywordTreeItem[] {
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

class VariablesProvider implements vscode.TreeDataProvider<VariableTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<VariableTreeItem | undefined | null | void> = new vscode.EventEmitter<VariableTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<VariableTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: VariableTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: VariableTreeItem): Thenable<VariableTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getVariableCategories());
        }

        // Check if this is a folder
        if ((element as any).folderPath !== undefined) {
            return Promise.resolve(this.getFilesInFolder((element as any).folderPath));
        } else {
            // This is a file, return variables in this file
            return Promise.resolve(this.getVariablesForFile(element.label));
        }
    }

    private getVariableCategories(): VariableTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const discoveredVariables = config.get('discoveredVariables', []) as any[];

        if (discoveredVariables.length === 0) {
            return [new VariableTreeItem(
                'No variables found',
                vscode.TreeItemCollapsibleState.None
            )];
        }

        return this.getFileBasedCategories(discoveredVariables);
    }

    private getFileBasedCategories(variables: any[]): VariableTreeItem[] {
        const folderStructure = new Map<string, Map<string, any[]>>();

        // Group variables by folder path and then by file
        variables.forEach(variable => {
            let folderPath = variable.folderPath || 'Root';

            // Normalize folder path
            if (folderPath === '.' || folderPath === '') {
                folderPath = 'Root';
            }

            const fileName = variable.fileName;

            if (!folderStructure.has(folderPath)) {
                folderStructure.set(folderPath, new Map());
            }

            const folderFiles = folderStructure.get(folderPath)!;
            if (!folderFiles.has(fileName)) {
                folderFiles.set(fileName, []);
            }
            folderFiles.get(fileName)!.push(variable);
        });

        // Create tree structure
        const categories: VariableTreeItem[] = [];

        // Sort folders alphabetically
        const sortedFolders = Array.from(folderStructure.keys()).sort();

        sortedFolders.forEach(folderPath => {
            const files = folderStructure.get(folderPath)!;

            // Create folder category
            const folderDisplayName = this.formatFolderName(folderPath);
            const folderItem = new VariableTreeItem(
                folderDisplayName,
                vscode.TreeItemCollapsibleState.Collapsed
            );

            // Store original folder path for later retrieval
            (folderItem as any).folderPath = folderPath;
            categories.push(folderItem);
        });

        return categories;
    }

    private formatFolderName(folderPath: string): string {
        if (folderPath === '.' || folderPath === '' || folderPath === 'Root') {
            return 'Root';
        }

        // Convert to arrow notation for display
        return folderPath.replace(/[\/\\]/g, ' → ');
    }

    private getFilesInFolder(folderPath: string): VariableTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const discoveredVariables = config.get('discoveredVariables', []) as any[];

        // Get all files in this specific folder
        const filesInFolder = new Map<string, any[]>();

        discoveredVariables.forEach(variable => {
            let variableFolderPath = variable.folderPath || 'Root';

            // Normalize variable folder path
            if (variableFolderPath === '.' || variableFolderPath === '') {
                variableFolderPath = 'Root';
            }

            if (variableFolderPath === folderPath ||
                (folderPath === 'Root' && (variableFolderPath === '.' || variableFolderPath === '' || variableFolderPath === 'Root'))) {
                const fileName = variable.fileName;
                if (!filesInFolder.has(fileName)) {
                    filesInFolder.set(fileName, []);
                }
                filesInFolder.get(fileName)!.push(variable);
            }
        });

        // Create file items
        const fileItems: VariableTreeItem[] = [];
        filesInFolder.forEach((variables, fileName) => {
            let displayName = fileName;
            let fileType = 'Variables';

            // Add appropriate file extension if not present
            if (!fileName.includes('.')) {
                if (variables[0].source === 'python') {
                    displayName = `${fileName}.py`;
                    fileType = 'Python Variables';
                } else if (variables[0].fileType === 'resource') {
                    displayName = `${fileName}.resource`;
                    fileType = 'Resource Variables';
                } else {
                    displayName = `${fileName}.robot`;
                    fileType = 'Robot Variables';
                }
            } else {
                // File already has extension
                if (fileName.endsWith('.py')) {
                    fileType = 'Python Variables';
                } else if (fileName.endsWith('.resource')) {
                    fileType = 'Resource Variables';
                } else {
                    fileType = 'Robot Variables';
                }
            }

            fileItems.push(new VariableTreeItem(
                displayName,
                vscode.TreeItemCollapsibleState.Collapsed
            ));
        });

        return fileItems.sort((a, b) => a.label.localeCompare(b.label));
    }

    private getVariablesForFile(fileName: string): VariableTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const discoveredVariables = config.get('discoveredVariables', []) as any[];

        // Remove file extension from the label for comparison
        const baseFileName = fileName.replace(/\.(py|robot|resource)$/, '');

        const fileVariables = discoveredVariables.filter(variable =>
            variable.fileName === baseFileName
        );

        return fileVariables.map(variable =>
            new VariableTreeItem(
                variable.name,
                vscode.TreeItemCollapsibleState.None,
                variable
            )
        );
    }
}