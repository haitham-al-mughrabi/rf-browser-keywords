import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const projectProvider = new RobotFrameworkKeywordProvider('project');
    const officialProvider = new RobotFrameworkKeywordProvider('official');
    const variablesProvider = new VariablesProvider();
    const documentationProvider = new DocumentationProvider();
    vscode.window.registerTreeDataProvider('rfProjectKeywords', projectProvider);
    vscode.window.registerTreeDataProvider('rfOfficialKeywords', officialProvider);
    vscode.window.registerTreeDataProvider('rfVariables', variablesProvider);
    vscode.window.registerTreeDataProvider('rfDocumentation', documentationProvider);

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
                // Generate Robot Framework format
                const robotKeywordCall = generateRobotFrameworkKeywordCall(
                    item.label || 'Unknown Keyword',
                    item.implementation,
                    item.library
                );
                const keywordWithNewline = robotKeywordCall + '\n';
                editor.edit(editBuilder => {
                    editBuilder.insert(position, keywordWithNewline);
                });
                vscode.window.showInformationMessage(`Inserted: ${item.label}`);
            }
        }
    });

    vscode.commands.registerCommand('rfKeywords.insertKeywordWithDialog', async (item: KeywordTreeItem) => {
        if (item.implementation) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const position = editor.selection.active;

                // Extract parameters from the keyword
                const parameters = extractKeywordParameters(item.implementation);

                if (!parameters || parameters.length === 0) {
                    // No parameters, just insert the keyword directly
                    const keywordCall = item.label || 'Unknown Keyword';
                    editor.edit(editBuilder => {
                        editBuilder.insert(position, keywordCall + '\n');
                    });
                    vscode.window.showInformationMessage(`Inserted: ${item.label}`);
                    return;
                }

                // Show parameter input dialog
                const parameterValues = await showParameterInputDialog(item.label || 'Unknown Keyword', parameters);

                if (parameterValues !== null) {
                    // Generate keyword call with user-provided values
                    const robotKeywordCall = generateRobotFrameworkKeywordCallWithValues(
                        item.label || 'Unknown Keyword',
                        parameters,
                        parameterValues
                    );
                    const keywordWithNewline = robotKeywordCall + '\n';
                    editor.edit(editBuilder => {
                        editBuilder.insert(position, keywordWithNewline);
                    });
                    vscode.window.showInformationMessage(`Inserted: ${item.label} with custom parameters`);
                }
            }
        }
    });

    vscode.commands.registerCommand('rfKeywords.copyKeyword', (item: KeywordTreeItem) => {
        if (item.implementation) {
            // Generate Robot Framework format
            const robotKeywordCall = generateRobotFrameworkKeywordCall(
                item.label || 'Unknown Keyword',
                item.implementation,
                item.library
            );
            vscode.env.clipboard.writeText(robotKeywordCall);
            vscode.window.showInformationMessage(`Copied: ${item.label}`);
        }
    });

    // New command that shows documentation
    vscode.commands.registerCommand('rfKeywords.showKeywordDetails', async (item: KeywordTreeItem) => {
        if (item.implementation) {
            // Show documentation
            await documentationProvider.showKeywordDocumentation(item);

            vscode.window.showInformationMessage(`Loaded: ${item.label} into documentation`);
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


    vscode.commands.registerCommand('rfKeywords.importFile', async (item: KeywordTreeItem) => {
        await importLibraryOrResource(item);
    });

    vscode.commands.registerCommand('rfKeywords.openFile', async (item: KeywordTreeItem) => {
        if (item.filePath && fs.existsSync(item.filePath)) {
            const document = await vscode.workspace.openTextDocument(item.filePath);
            await vscode.window.showTextDocument(document);
        } else {
            vscode.window.showErrorMessage(`Unable to open file: ${item.filePath || 'File path not found'}`);
        }
    });

    // Variable commands
    vscode.commands.registerCommand('rfVariables.insertVariable', (item: VariableTreeItem) => {
        if (item.variable) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
                const wrapVariables = config.get('wrapVariables', true);
                const variableName = wrapVariables ? `${item.variable.name}` : item.variable.name;

                const position = editor.selection.active;
                const variableToInsert = variableName.includes('${') ? variableName : (wrapVariables ? `\${${variableName}}` : variableName);
                const variableWithNewline = variableToInsert + '\n';

                editor.edit(editBuilder => {
                    editBuilder.insert(position, variableWithNewline);
                });
                vscode.window.showInformationMessage(`Inserted: ${variableToInsert}`);
            }
        }
    });

    vscode.commands.registerCommand('rfVariables.copyVariable', (item: VariableTreeItem) => {
        if (item.variable) {
            const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
            const wrapVariables = config.get('wrapVariables', true);
            const variableName = wrapVariables ? `${item.variable.name}` : item.variable.name;

            const variableToCopy = variableName.includes('${') ? variableName : (wrapVariables ? `\${${variableName}}` : variableName);

            vscode.env.clipboard.writeText(variableToCopy);
            vscode.window.showInformationMessage(`Copied: ${variableToCopy}`);
        }
    });

    vscode.commands.registerCommand('rfVariables.importFile', async (item: VariableTreeItem) => {
        await importVariableFile(item);
    });

    vscode.commands.registerCommand('rfVariables.openFile', async (item: VariableTreeItem) => {
        const targetFilePath = item.filePath || (item.variable && item.variable.filePath);
        if (targetFilePath && fs.existsSync(targetFilePath)) {
            const document = await vscode.workspace.openTextDocument(targetFilePath);
            await vscode.window.showTextDocument(document);
        }
    });

    vscode.commands.registerCommand('rfVariables.showVariableDetails', async (item: VariableTreeItem) => {
        if (item.variable) {
            // Show variable documentation in the documentation view
            await documentationProvider.showVariableDocumentation(item);
            vscode.window.showInformationMessage(`Loaded: ${item.label} into documentation`);
        }
    });

    vscode.commands.registerCommand('rfVariables.refresh', async () => {
        vscode.window.showInformationMessage('Scanning workspace for variables...');
        await scanWorkspaceVariables();
        variablesProvider.refresh();
    });

    // Documentation commands
    vscode.commands.registerCommand('rfDocumentation.showKeywordDoc', async (item: KeywordTreeItem) => {
        if (item) {
            await documentationProvider.showKeywordDocumentation(item);
            vscode.window.showInformationMessage(`Showing documentation for: ${item.label}`);
        } else {
            vscode.window.showWarningMessage('No keyword selected for documentation');
        }
    });

    vscode.commands.registerCommand('rfDocumentation.copyDocumentation', () => {
        const documentation = documentationProvider.getCurrentDocumentation();
        if (documentation) {
            const argText = documentation.arguments ? documentation.arguments.map((arg: any) => `- ${arg.name}: ${arg.type}${arg.defaultValue ? ` (default: ${arg.defaultValue})` : ''}`).join('\n') : 'None';
            const docText = `${documentation.name} (${documentation.library})\n\n${documentation.documentation}\n\nArguments:\n${argText}\n\nSource: ${documentation.source}`;
            vscode.env.clipboard.writeText(docText);
            vscode.window.showInformationMessage('Copied documentation to clipboard');
        } else {
            vscode.window.showWarningMessage('No documentation available to copy');
        }
    });

    vscode.commands.registerCommand('rfDocumentation.clear', () => {
        documentationProvider.clearDocumentation();
        vscode.window.showInformationMessage('Cleared documentation view');
    });

    vscode.commands.registerCommand('rfKeywords.searchKeywords', async () => {
        await searchKeywords(projectProvider, officialProvider);
    });

    vscode.commands.registerCommand('rfVariables.searchVariables', async () => {
        await searchVariables(variablesProvider);
    });

    vscode.commands.registerCommand('rfKeywords.clearSearch', () => {
        projectProvider.clearSearch();
        officialProvider.clearSearch();
        vscode.window.showInformationMessage('Search cleared. Showing all keywords.');
    });

    vscode.commands.registerCommand('rfVariables.clearSearch', () => {
        variablesProvider.clearSearch();
        vscode.window.showInformationMessage('Search cleared. Showing all variables.');
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
    // Support different import patterns: @keyword, @robot.api.deco.keyword, etc.
    const keywordPattern = '(?:@(?:robot\\.api\\.deco\\.)?keyword|@keyword)';

    // Pattern 1: @keyword("Keyword Name") with custom name (fixed to not jump across methods)
    const keywordDecoratorRegex = new RegExp(`${keywordPattern}\\s*\\(\\s*['\"](.*?)['\"].*?\\)\\s*\\n\\s*def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(`, 'g');
    // Pattern 2: @keyword (simple decorator) - handles @keyword, @keyword(), and variations
    const simpleKeywordDecoratorRegex = new RegExp(`${keywordPattern}\\s*(?:\\(\\s*\\))?\\s*\\n\\s*def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(`, 'g');
    // Pattern 3: Regular public methods (fallback) - more flexible multiline support
    const methodRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:/gm;

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

    // Keywords extraction logic

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
    simpleKeywordDecoratorRegex.lastIndex = 0; // Reset before use

    while ((match = simpleKeywordDecoratorRegex.exec(content)) !== null) {
        const methodName = match[1];

        if (processedKeywords.has(methodName)) {
            continue;
        }
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
                description: keywordWithArgs.documentation || `${fileExtension === '.resource' ? 'Resource' : 'Robot'} keyword from ${fileName}${fileExtension}`,
                documentation: keywordWithArgs.documentation,
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

function extractKeywordArguments(keywordLine: string, allLines: string[], currentIndex: number): { name: string, implementation: string, documentation?: string } {
    const keywordName = keywordLine.trim();
    const args: string[] = [];
    let documentation = '';

    // Look for [Arguments] and [Documentation] in the next few lines
    let foundArguments = false;
    let foundDocumentation = false;
    let docLines: string[] = [];

    for (let i = currentIndex + 1; i < Math.min(currentIndex + 30, allLines.length); i++) {
        const line = allLines[i].trim();
        const originalLine = allLines[i];

        // Stop if we hit another keyword or section
        if ((!originalLine.startsWith(' ') && !originalLine.startsWith('\t') && line !== '') ||
            line.match(/^\*+/)) {
            break;
        }

        // Check for [Documentation] tag
        if (line.match(/^\[Documentation\]/i)) {
            foundDocumentation = true;
            const docLine = line.replace(/^\[Documentation\]/i, '').trim();
            if (docLine) {
                docLines.push(docLine);
            }
            continue;
        }

        // If we found [Documentation], look for continuation lines with ...
        if (foundDocumentation && line.startsWith('...')) {
            const continuationLine = line.replace(/^\.\.\./, '').trim();
            if (continuationLine) {
                docLines.push(continuationLine);
            }
            continue;
        }

        // If we found [Documentation] but this line doesn't start with ..., we're done with documentation
        if (foundDocumentation && !line.startsWith('...') && line !== '') {
            foundDocumentation = false;
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
            foundArguments = false;
        }
    }

    // Join documentation lines
    if (docLines.length > 0) {
        documentation = docLines.join(' ').trim();
    }

    // Create implementation with arguments
    const implementation = args.length > 0
        ? `${keywordName}    ${args.join('    ')}`
        : keywordName;

    return {
        name: keywordName,
        implementation: implementation,
        documentation: documentation || undefined
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

export function deactivate() { }

class KeywordTreeItem extends vscode.TreeItem {
    public readonly name?: string;
    public readonly documentation?: string;
    public readonly description?: string;
    public readonly source?: string;
    public readonly filePath?: string;
    public readonly tags?: string[];
    public readonly returnType?: string;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly implementation?: string,
        public readonly library?: string,
        keywordData?: any
    ) {
        super(label, collapsibleState);

        // Store additional keyword data if provided
        if (keywordData) {
            this.name = keywordData.name;
            this.documentation = keywordData.documentation;
            this.description = keywordData.description;
            this.source = keywordData.source;
            this.filePath = keywordData.filePath;
            this.tags = keywordData.tags;
            this.returnType = keywordData.returnType;
        }

        if (implementation) {
            this.tooltip = `${this.label}: Click to copy, Right-click for more options`;
            // Use the keyword documentation as description if available, otherwise fallback to library
            this.description = this.documentation || library;
            this.contextValue = 'keyword';
            this.command = {
                command: 'rfKeywords.showKeywordDetails',
                title: 'Show Keyword Details',
                arguments: [this]
            };

            // Add styling and icons based on configuration
            const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
            if (config.get('showIcons', true)) {
                this.iconPath = this.getKeywordIcon();
            }

        } else {
            this.tooltip = `${this.label} library keywords`;
            this.contextValue = library || 'library';

            // Set appropriate icons and commands for different file types
            const isFile = this.label.endsWith('.py') || this.label.endsWith('.robot') || this.label.endsWith('.resource');

            if (this.label.endsWith('.py')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
                // Keep the library context value for import functionality
                this.contextValue = library || 'Python Library';
            } else if (this.label.endsWith('.robot')) {
                this.iconPath = new vscode.ThemeIcon('robot');
                this.contextValue = library || 'Robot Keywords';
            } else if (this.label.endsWith('.resource')) {
                this.iconPath = new vscode.ThemeIcon('symbol-module');
                this.contextValue = library || 'Resource Keywords';
            } else {
                this.iconPath = new vscode.ThemeIcon('folder');
            }

            // Add "Open File" command for file items only
            if (isFile && this.filePath) {
                this.command = {
                    command: 'rfKeywords.openFile',
                    title: 'Open File',
                    arguments: [this]
                };
                this.tooltip = `${this.label} - Click to open file`;
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
    public readonly filePath?: string;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly variable?: any,
        public readonly folderPath?: string,
        filePath?: string
    ) {
        super(label, collapsibleState);

        this.filePath = filePath;

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

            // Set appropriate icons and commands for different file types
            const isFile = this.label.endsWith('.py') || this.label.endsWith('.robot') || this.label.endsWith('.resource');

            if (this.label.endsWith('.py')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
                this.contextValue = 'pythonVariableFile';
            } else if (this.label.endsWith('.robot')) {
                this.iconPath = new vscode.ThemeIcon('robot');
                this.contextValue = 'robotVariableFile';
            } else if (this.label.endsWith('.resource')) {
                this.iconPath = new vscode.ThemeIcon('symbol-module');
                this.contextValue = 'resourceVariableFile';
            } else {
                this.iconPath = new vscode.ThemeIcon('folder');
            }

            // Add "Open File" command for file items only
            if (isFile && this.filePath) {
                this.command = {
                    command: 'rfVariables.openFile',
                    title: 'Open File',
                    arguments: [this]
                };
                this.tooltip = `${this.label} - Click to open file`;
            }
        }
    }
}



class DocumentationTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly documentationData?: any,
        public readonly itemType: 'keyword' | 'section' | 'argument' | 'tag' | 'source' | 'description' = 'description'
    ) {
        super(label, collapsibleState);

        this.contextValue = itemType;

        // Set icons based on item type
        switch (itemType) {
            case 'keyword':
                this.iconPath = new vscode.ThemeIcon('symbol-method');
                break;
            case 'section':
                this.iconPath = new vscode.ThemeIcon('symbol-namespace');
                break;
            case 'argument':
                this.iconPath = new vscode.ThemeIcon('symbol-parameter');
                break;
            case 'tag':
                this.iconPath = new vscode.ThemeIcon('tag');
                break;
            case 'source':
                this.iconPath = new vscode.ThemeIcon('file-code');
                break;
            case 'description':
            default:
                this.iconPath = new vscode.ThemeIcon('note');
                break;
        }

        // Set tooltip based on type
        if (documentationData) {
            switch (itemType) {
                case 'keyword':
                    this.tooltip = `${documentationData.name} from ${documentationData.library}`;
                    break;
                case 'argument':
                    this.tooltip = `Argument: ${documentationData.name} (${documentationData.type || 'any'})`;
                    break;
                case 'source':
                    this.tooltip = `Source: ${documentationData.filePath}`;
                    break;
                default:
                    this.tooltip = this.label;
                    break;
            }
        } else {
            this.tooltip = this.label;
        }
    }
}

async function searchKeywords(projectProvider: RobotFrameworkKeywordProvider, officialProvider: RobotFrameworkKeywordProvider): Promise<void> {
    const searchTerm = await vscode.window.showInputBox({
        prompt: 'Search for keywords',
        placeHolder: 'Enter keyword name or part of it...'
    });

    if (!searchTerm) return;

    // Apply search filter to both providers
    projectProvider.setSearchTerm(searchTerm);
    officialProvider.setSearchTerm(searchTerm);

    vscode.window.showInformationMessage(`Showing keywords matching "${searchTerm}". Click on any result to insert it.`);
}

async function searchVariables(variablesProvider: VariablesProvider): Promise<void> {
    const searchTerm = await vscode.window.showInputBox({
        prompt: 'Search for variables',
        placeHolder: 'Enter variable name or part of it...'
    });

    if (!searchTerm) return;

    // Apply search filter to variables provider
    variablesProvider.setSearchTerm(searchTerm);

    vscode.window.showInformationMessage(`Showing variables matching "${searchTerm}". Click on any result to insert it.`);
}

interface FolderNode {
    name: string;
    children: Map<string, FolderNode>;
    files: Map<string, any[]>;
}

function getAllOfficialKeywords(): Array<{name: string, library: string, implementation: string}> {
    const keywords: Array<{name: string, library: string, implementation: string}> = [];

    // Browser Library keywords
    const browserKeywords = [
        { name: 'New Browser', library: 'Browser Library', implementation: 'New Browser    ${browser}' },
        { name: 'New Context', library: 'Browser Library', implementation: 'New Context' },
        { name: 'New Page', library: 'Browser Library', implementation: 'New Page    ${url}' },
        { name: 'Go To', library: 'Browser Library', implementation: 'Go To    ${url}' },
        { name: 'Click', library: 'Browser Library', implementation: 'Click    ${selector}' },
        { name: 'Fill Text', library: 'Browser Library', implementation: 'Fill Text    ${selector}    ${text}' },
        { name: 'Get Text', library: 'Browser Library', implementation: 'Get Text    ${selector}' },
        { name: 'Wait For Elements State', library: 'Browser Library', implementation: 'Wait For Elements State    ${selector}    visible' },
        { name: 'Take Screenshot', library: 'Browser Library', implementation: 'Take Screenshot    ${filename}' },
        { name: 'Close Browser', library: 'Browser Library', implementation: 'Close Browser' },
        { name: 'Get Element Count', library: 'Browser Library', implementation: 'Get Element Count    ${selector}' },
        { name: 'Hover', library: 'Browser Library', implementation: 'Hover    ${selector}' },
        { name: 'Type Text', library: 'Browser Library', implementation: 'Type Text    ${selector}    ${text}' },
        { name: 'Press Keys', library: 'Browser Library', implementation: 'Press Keys    ${selector}    ${key}' },
        { name: 'Wait For Load State', library: 'Browser Library', implementation: 'Wait For Load State    ${state}' }
    ];

    // BuiltIn Library keywords
    const builtinKeywords = [
        { name: 'Log', library: 'BuiltIn Library', implementation: 'Log    ${message}' },
        { name: 'Set Variable', library: 'BuiltIn Library', implementation: 'Set Variable    ${value}' },
        { name: 'Should Be Equal', library: 'BuiltIn Library', implementation: 'Should Be Equal    ${first}    ${second}' },
        { name: 'Should Contain', library: 'BuiltIn Library', implementation: 'Should Contain    ${container}    ${item}' },
        { name: 'Sleep', library: 'BuiltIn Library', implementation: 'Sleep    ${time}' },
        { name: 'Fail', library: 'BuiltIn Library', implementation: 'Fail    ${message}' },
        { name: 'Pass Execution', library: 'BuiltIn Library', implementation: 'Pass Execution    ${message}' },
        { name: 'Run Keyword If', library: 'BuiltIn Library', implementation: 'Run Keyword If    ${condition}    ${keyword}' },
        { name: 'Should Be True', library: 'BuiltIn Library', implementation: 'Should Be True    ${condition}' },
        { name: 'Should Not Be Equal', library: 'BuiltIn Library', implementation: 'Should Not Be Equal    ${first}    ${second}' },
        { name: 'Length Should Be', library: 'BuiltIn Library', implementation: 'Length Should Be    ${item}    ${length}' },
        { name: 'Create List', library: 'BuiltIn Library', implementation: 'Create List    ${item1}    ${item2}' }
    ];

    // Collections Library keywords
    const collectionsKeywords = [
        { name: 'Append To List', library: 'Collections Library', implementation: 'Append To List    ${list}    ${value}' },
        { name: 'Get From List', library: 'Collections Library', implementation: 'Get From List    ${list}    ${index}' },
        { name: 'List Should Contain Value', library: 'Collections Library', implementation: 'List Should Contain Value    ${list}    ${value}' },
        { name: 'Sort List', library: 'Collections Library', implementation: 'Sort List    ${list}' }
    ];

    // String Library keywords
    const stringKeywords = [
        { name: 'Get Length', library: 'String Library', implementation: 'Get Length    ${string}' },
        { name: 'Should Start With', library: 'String Library', implementation: 'Should Start With    ${string}    ${start}' },
        { name: 'Should End With', library: 'String Library', implementation: 'Should End With    ${string}    ${end}' },
        { name: 'Replace String', library: 'String Library', implementation: 'Replace String    ${string}    ${search}    ${replace}' }
    ];

    keywords.push(...browserKeywords, ...builtinKeywords, ...collectionsKeywords, ...stringKeywords);
    return keywords;
}

class RobotFrameworkKeywordProvider implements vscode.TreeDataProvider<KeywordTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeywordTreeItem | undefined | null | void> = new vscode.EventEmitter<KeywordTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeywordTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private searchTerm: string = '';

    constructor(private viewType: 'project' | 'official') { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSearchTerm(term: string): void {
        this.searchTerm = term.toLowerCase();
        this._onDidChangeTreeData.fire();
    }

    clearSearch(): void {
        this.searchTerm = '';
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: KeywordTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: KeywordTreeItem): Thenable<KeywordTreeItem[]> {
        if (!element) {
            if (this.searchTerm) {
                // Return search results directly when searching
                return Promise.resolve(this.getSearchResults());
            } else {
                // Normal tree view
                if (this.viewType === 'project') {
                    return Promise.resolve(this.getProjectKeywordCategories());
                } else {
                    return Promise.resolve(this.getOfficialKeywordCategories());
                }
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
                if ((element as any).folderNode !== undefined) {
                    // This is a hierarchical folder, return its contents
                    return Promise.resolve(this.getFolderNodeContents((element as any).folderNode));
                } else if ((element as any).folderPath !== undefined) {
                    // Legacy flat folder, return files in this folder
                    return Promise.resolve(this.getFilesInFolder((element as any).folderPath));
                } else {
                    // This is a file, return keywords in this file
                    return Promise.resolve(this.getKeywordsForFile(element.label));
                }
        }
    }

    private getSearchResults(): KeywordTreeItem[] {
        const results: KeywordTreeItem[] = [];

        if (this.viewType === 'project') {
            // Search in project keywords
            const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
            const customKeywords = config.get('customKeywords', []) as any[];

            customKeywords.forEach(keyword => {
                if (keyword.name.toLowerCase().includes(this.searchTerm)) {
                    results.push(new KeywordTreeItem(
                        keyword.name,
                        vscode.TreeItemCollapsibleState.None,
                        keyword.implementation,
                        keyword.library || 'Custom',
                        'keyword'
                    ));
                }
            });
        } else {
            // Search in official keywords
            const officialKeywords = getAllOfficialKeywords();
            officialKeywords.forEach(keyword => {
                if (keyword.name.toLowerCase().includes(this.searchTerm)) {
                    results.push(new KeywordTreeItem(
                        keyword.name,
                        vscode.TreeItemCollapsibleState.None,
                        keyword.implementation,
                        keyword.library,
                        'keyword'
                    ));
                }
            });
        }

        if (results.length === 0) {
            return [new KeywordTreeItem(
                `No keywords found matching "${this.searchTerm}"`,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'Empty'
            )];
        }

        return results;
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
        // Build hierarchical folder structure
        const folderTree = this.buildFolderTree(customKeywords);
        const items = this.createFolderTreeItems(folderTree);

        // Add manually created keywords under "Custom Keywords" if any exist
        const manualKeywords = customKeywords.filter(keyword => !keyword.source);
        if (manualKeywords.length > 0) {
            items.push(new KeywordTreeItem(
                'Custom Keywords',
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'Manual'
            ));
        }

        return items;
    }

    private buildFolderTree(customKeywords: any[]): FolderNode {
        const root: FolderNode = { name: 'Root', children: new Map(), files: new Map() };

        customKeywords.forEach(keyword => {
            if (keyword.source === 'python' || keyword.source === 'robot') {
                let folderPath = keyword.folderPath || 'Root';

                // Normalize folder path
                if (folderPath === '.' || folderPath === '') {
                    folderPath = 'Root';
                }

                const fileName = keyword.library;

                // Split path into parts and build tree
                if (folderPath === 'Root') {
                    // Add directly to root
                    if (!root.files.has(fileName)) {
                        root.files.set(fileName, []);
                    }
                    root.files.get(fileName)!.push(keyword);
                } else {
                    // Navigate/create folder structure
                    const pathParts = folderPath.split(/[\/\\]/);
                    let currentNode = root;

                    for (const part of pathParts) {
                        if (!currentNode.children.has(part)) {
                            currentNode.children.set(part, { name: part, children: new Map(), files: new Map() });
                        }
                        currentNode = currentNode.children.get(part)!;
                    }

                    // Add file to the final folder
                    if (!currentNode.files.has(fileName)) {
                        currentNode.files.set(fileName, []);
                    }
                    currentNode.files.get(fileName)!.push(keyword);
                }
            }
        });

        return root;
    }

    private createFolderTreeItems(folderNode: FolderNode, parentPath: string = ''): KeywordTreeItem[] {
        const items: KeywordTreeItem[] = [];

        // Create folder items for child folders (skip root level display)
        const sortedFolders = Array.from(folderNode.children.keys()).sort();
        for (const folderName of sortedFolders) {
            const childNode = folderNode.children.get(folderName)!;
            const currentPath = parentPath ? `${parentPath}/${folderName}` : folderName;

            const folderItem = new KeywordTreeItem(
                folderName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'Folder'
            );

            // Store the full path and node reference for later retrieval
            (folderItem as any).folderPath = currentPath;
            (folderItem as any).folderNode = childNode;
            items.push(folderItem);
        }

        // Add files directly to this level (only for root level initially)
        if (parentPath === '') {
            items.push(...this.createFileItemsFromNode(folderNode));
        }

        return items;
    }

    private createFileItemsFromNode(folderNode: FolderNode): KeywordTreeItem[] {
        const fileItems: KeywordTreeItem[] = [];

        // Sort files alphabetically
        const sortedFiles = Array.from(folderNode.files.keys()).sort();

        sortedFiles.forEach(fileName => {
            const keywords = folderNode.files.get(fileName)!;

            // Determine file type and display name
            let displayName = fileName;
            let libraryType = 'library';

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

            // Create a file-level item with file path information
            const firstKeyword = keywords[0];
            const fileInfo = {
                filePath: firstKeyword.filePath,
                source: firstKeyword.source,
                fileType: firstKeyword.fileType
            };

            fileItems.push(new KeywordTreeItem(
                displayName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                libraryType,
                fileInfo // Pass file information for Open File functionality
            ));
        });

        return fileItems;
    }

    private getFolderNodeContents(folderNode: FolderNode): KeywordTreeItem[] {
        const items: KeywordTreeItem[] = [];

        // Add subfolders first
        const sortedFolders = Array.from(folderNode.children.keys()).sort();
        for (const folderName of sortedFolders) {
            const childNode = folderNode.children.get(folderName)!;

            const folderItem = new KeywordTreeItem(
                folderName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                'Folder'
            );

            // Store node reference for navigation
            (folderItem as any).folderNode = childNode;
            items.push(folderItem);
        }

        // Add files in this folder
        items.push(...this.createFileItemsFromNode(folderNode));

        return items;
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

            // Create a file-level item with file path information
            const firstKeyword = keywords[0];
            const fileInfo = {
                filePath: firstKeyword.filePath,
                source: firstKeyword.source,
                fileType: firstKeyword.fileType
            };

            fileItems.push(new KeywordTreeItem(
                displayName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                libraryType,
                fileInfo // Pass file information for Open File functionality
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
                baseFileName,
                keyword  // Pass the full keyword object
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
                keyword.library || 'Custom',
                keyword  // Pass the full keyword object
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
    private searchTerm: string = '';

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSearchTerm(term: string): void {
        this.searchTerm = term.toLowerCase();
        this._onDidChangeTreeData.fire();
    }

    clearSearch(): void {
        this.searchTerm = '';
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: VariableTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: VariableTreeItem): Thenable<VariableTreeItem[]> {
        if (!element) {
            if (this.searchTerm) {
                // Return search results directly when searching
                return Promise.resolve(this.getVariableSearchResults());
            } else {
                // Normal tree view
                return Promise.resolve(this.getVariableCategories());
            }
        }

        // Check if this is a folder or file
        if ((element as any).folderNode !== undefined) {
            // This is a hierarchical folder, return its contents
            return Promise.resolve(this.getVariableFolderNodeContents((element as any).folderNode));
        } else if (element.folderPath !== undefined && !element.filePath) {
            // Legacy flat folder, return files in this folder
            return Promise.resolve(this.getFilesInFolder(element.folderPath));
        } else {
            // This is a file, return variables in this file
            return Promise.resolve(this.getVariablesForFile(element.label));
        }
    }

    private getVariableSearchResults(): VariableTreeItem[] {
        const results: VariableTreeItem[] = [];
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const discoveredVariables = config.get('discoveredVariables', []) as any[];

        discoveredVariables.forEach(variable => {
            if (variable.name.toLowerCase().includes(this.searchTerm)) {
                results.push(new VariableTreeItem(
                    variable.name,
                    vscode.TreeItemCollapsibleState.None,
                    variable,
                    'variable'
                ));
            }
        });

        if (results.length === 0) {
            return [new VariableTreeItem(
                `No variables found matching "${this.searchTerm}"`,
                vscode.TreeItemCollapsibleState.None,
                null,
                'empty',
                undefined // no file path for search result message
            )];
        }

        return results;
    }

    private getVariableCategories(): VariableTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const discoveredVariables = config.get('discoveredVariables', []) as any[];

        if (discoveredVariables.length === 0) {
            return [new VariableTreeItem(
                'No variables found',
                vscode.TreeItemCollapsibleState.None,
                undefined, // no variable data
                undefined, // no folder path
                undefined  // no file path for empty state message
            )];
        }

        return this.getFileBasedCategories(discoveredVariables);
    }

    private getFileBasedCategories(variables: any[]): VariableTreeItem[] {
        // Build hierarchical folder structure
        const folderTree = this.buildVariableFolderTree(variables);
        const items = this.createVariableFolderTreeItems(folderTree);

        return items;
    }

    private buildVariableFolderTree(variables: any[]): FolderNode {
        const root: FolderNode = { name: 'Root', children: new Map(), files: new Map() };

        variables.forEach(variable => {
            if (variable.source === 'python' || variable.source === 'robot') {
                let folderPath = variable.folderPath || 'Root';

                // Normalize folder path
                if (folderPath === '.' || folderPath === '') {
                    folderPath = 'Root';
                }

                const fileName = variable.fileName;

                // Split path into parts and build tree
                if (folderPath === 'Root') {
                    // Add directly to root
                    if (!root.files.has(fileName)) {
                        root.files.set(fileName, []);
                    }
                    root.files.get(fileName)!.push(variable);
                } else {
                    // Navigate/create folder structure
                    const pathParts = folderPath.split(/[\/\\]/);
                    let currentNode = root;

                    for (const part of pathParts) {
                        if (!currentNode.children.has(part)) {
                            currentNode.children.set(part, { name: part, children: new Map(), files: new Map() });
                        }
                        currentNode = currentNode.children.get(part)!;
                    }

                    // Add file to the final folder
                    if (!currentNode.files.has(fileName)) {
                        currentNode.files.set(fileName, []);
                    }
                    currentNode.files.get(fileName)!.push(variable);
                }
            }
        });

        return root;
    }

    private createVariableFolderTreeItems(folderNode: FolderNode, parentPath: string = ''): VariableTreeItem[] {
        const items: VariableTreeItem[] = [];

        // Create folder items for child folders (skip root level display)
        const sortedFolders = Array.from(folderNode.children.keys()).sort();
        for (const folderName of sortedFolders) {
            const childNode = folderNode.children.get(folderName)!;
            const currentPath = parentPath ? `${parentPath}/${folderName}` : folderName;

            const folderItem = new VariableTreeItem(
                folderName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                currentPath, // folder path
                undefined    // no file path for folder items
            );

            // Store the full path and node reference for later retrieval
            (folderItem as any).folderNode = childNode;
            items.push(folderItem);
        }

        // Add files directly to this level (only for root level initially)
        if (parentPath === '') {
            items.push(...this.createVariableFileItemsFromNode(folderNode));
        }

        return items;
    }

    private createVariableFileItemsFromNode(folderNode: FolderNode): VariableTreeItem[] {
        const fileItems: VariableTreeItem[] = [];

        // Sort files alphabetically
        const sortedFiles = Array.from(folderNode.files.keys()).sort();

        sortedFiles.forEach(fileName => {
            const variables = folderNode.files.get(fileName)!;

            // Determine file type and display name
            let displayName = fileName;
            let fileType = 'Variables';

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

            // Get the file path from the first variable in this file
            const firstVariable = variables[0];
            const targetFilePath = firstVariable.filePath;

            const fileItem = new VariableTreeItem(
                displayName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined, // no specific variable, this is a file container
                undefined, // no folder path for file items
                targetFilePath // pass the file path
            );

            // Set context value for menus
            fileItem.contextValue = fileType === 'Python Variables' ? 'pythonVariableFile' :
                                  fileType === 'Resource Variables' ? 'resourceVariableFile' : 'robotVariableFile';

            fileItems.push(fileItem);
        });

        return fileItems.sort((a, b) => a.label.localeCompare(b.label));
    }

    private getVariableFolderNodeContents(folderNode: FolderNode): VariableTreeItem[] {
        const items: VariableTreeItem[] = [];

        // Add subfolders first
        const sortedFolders = Array.from(folderNode.children.keys()).sort();
        for (const folderName of sortedFolders) {
            const childNode = folderNode.children.get(folderName)!;

            const folderItem = new VariableTreeItem(
                folderName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined,
                undefined, // no folder path for hierarchical folders
                undefined  // no file path for folder items
            );

            // Store node reference for navigation
            (folderItem as any).folderNode = childNode;
            items.push(folderItem);
        }

        // Add files in this folder
        items.push(...this.createVariableFileItemsFromNode(folderNode));

        return items;
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

            // Get the file path from the first variable in this file
            const firstVariable = variables[0];
            const targetFilePath = firstVariable.filePath;

            fileItems.push(new VariableTreeItem(
                displayName,
                vscode.TreeItemCollapsibleState.Collapsed,
                undefined, // no specific variable, this is a file container
                folderPath,
                targetFilePath // pass the file path
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



class DocumentationProvider implements vscode.TreeDataProvider<DocumentationTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DocumentationTreeItem | undefined | null | void> = new vscode.EventEmitter<DocumentationTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DocumentationTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DocumentationTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DocumentationTreeItem): Thenable<DocumentationTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }

        // Return children based on element type
        switch (element.itemType) {
            case 'keyword':
                return Promise.resolve(this.getKeywordSections());
            case 'section':
                return Promise.resolve(this.getSectionItems(element.label));
            default:
                return Promise.resolve([]);
        }
    }

    private getRootItems(): DocumentationTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const currentKeyword = config.get('currentDocumentationKeyword') as any;

        if (!currentKeyword) {
            return [new DocumentationTreeItem(
                'No keyword selected for documentation',
                vscode.TreeItemCollapsibleState.None
            )];
        }

        return [new DocumentationTreeItem(
            `${currentKeyword.name} (${currentKeyword.library})`,
            vscode.TreeItemCollapsibleState.Expanded,
            currentKeyword,
            'keyword'
        )];
    }

    private getKeywordSections(): DocumentationTreeItem[] {
        const sections: DocumentationTreeItem[] = [];

        sections.push(new DocumentationTreeItem(
            'Description',
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            'section'
        ));

        sections.push(new DocumentationTreeItem(
            'Arguments',
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            'section'
        ));

        sections.push(new DocumentationTreeItem(
            'Source Information',
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            'section'
        ));

        sections.push(new DocumentationTreeItem(
            'Tags',
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            'section'
        ));

        return sections;
    }

    private getSectionItems(sectionName: string): DocumentationTreeItem[] {
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        const currentKeyword = config.get('currentDocumentationKeyword') as any;

        if (!currentKeyword) {
            return [];
        }

        switch (sectionName) {
            case 'Description':
                return this.getDescriptionItems(currentKeyword);
            case 'Arguments':
                return this.getArgumentItems(currentKeyword);
            case 'Source Information':
                return this.getSourceItems(currentKeyword);
            case 'Tags':
                return this.getTagItems(currentKeyword);
            default:
                return [];
        }
    }

    private getDescriptionItems(keyword: any): DocumentationTreeItem[] {
        const items: DocumentationTreeItem[] = [];

        // Split documentation into lines for better display
        const documentation = keyword.documentation || 'No documentation available';
        const lines = documentation.split('\n').filter((line: string) => line.trim());

        if (lines.length === 0) {
            return [new DocumentationTreeItem(
                'No documentation available',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'description'
            )];
        }

        // If single line, show as is; if multiple lines, show each line
        if (lines.length === 1) {
            return [new DocumentationTreeItem(
                lines[0],
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'description'
            )];
        }

        return lines.map((line: string, index: number) => new DocumentationTreeItem(
            `${index + 1}. ${line}`,
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'description'
        ));
    }

    private getArgumentItems(keyword: any): DocumentationTreeItem[] {
        if (!keyword.arguments || keyword.arguments.length === 0) {
            return [new DocumentationTreeItem(
                'No arguments',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'argument'
            )];
        }

        return keyword.arguments.map((arg: any) => {
            const argInfo = typeof arg === 'string' ? { name: arg, type: 'any' } : arg;
            const label = argInfo.defaultValue ?
                `${argInfo.name}=${argInfo.defaultValue} (${argInfo.type || 'any'})` :
                `${argInfo.name} (${argInfo.type || 'any'})`;

            return new DocumentationTreeItem(
                label,
                vscode.TreeItemCollapsibleState.None,
                argInfo,
                'argument'
            );
        });
    }

    private getSourceItems(keyword: any): DocumentationTreeItem[] {
        const items: DocumentationTreeItem[] = [];

        if (keyword.library) {
            items.push(new DocumentationTreeItem(
                `Library: ${keyword.library}`,
                vscode.TreeItemCollapsibleState.None,
                keyword,
                'source'
            ));
        }

        if (keyword.filePath) {
            items.push(new DocumentationTreeItem(
                `File: ${path.basename(keyword.filePath)}`,
                vscode.TreeItemCollapsibleState.None,
                keyword,
                'source'
            ));
        }

        if (keyword.source) {
            items.push(new DocumentationTreeItem(
                `Source Type: ${keyword.source}`,
                vscode.TreeItemCollapsibleState.None,
                keyword,
                'source'
            ));
        }

        if (keyword.returnType) {
            items.push(new DocumentationTreeItem(
                `Returns: ${keyword.returnType}`,
                vscode.TreeItemCollapsibleState.None,
                keyword,
                'source'
            ));
        }

        return items.length > 0 ? items : [new DocumentationTreeItem(
            'No source information available',
            vscode.TreeItemCollapsibleState.None,
            undefined,
            'source'
        )];
    }

    private getTagItems(keyword: any): DocumentationTreeItem[] {
        if (!keyword.tags || keyword.tags.length === 0) {
            return [new DocumentationTreeItem(
                'No tags',
                vscode.TreeItemCollapsibleState.None,
                undefined,
                'tag'
            )];
        }

        return keyword.tags.map((tag: string) => new DocumentationTreeItem(
            tag,
            vscode.TreeItemCollapsibleState.None,
            { tag },
            'tag'
        ));
    }

    async setCurrentKeyword(keyword: any): Promise<void> {
        // Extract comprehensive documentation
        const documentationData = await this.extractKeywordDocumentation(keyword);

        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('currentDocumentationKeyword', documentationData, vscode.ConfigurationTarget.Global);
        this.refresh();
    }


    private async extractKeywordDocumentation(keyword: any): Promise<any> {
        // Enhanced documentation extraction
        const documentation = {
            name: keyword.name || keyword.label,
            library: keyword.library || 'Unknown',
            documentation: keyword.documentation || keyword.description || 'No documentation available',
            arguments: [] as any[],
            source: keyword.source || 'unknown',
            filePath: keyword.filePath || '',
            returnType: keyword.returnType || null,
            tags: keyword.tags || []
        };

        // Extract arguments from implementation if available
        if (keyword.implementation) {
            const extractedArgs = this.extractArgumentsFromImplementation(keyword.implementation);
            documentation.arguments = extractedArgs;
        }

        // Try to extract more documentation from source file if available, but only if we don't have good documentation already
        if (keyword.filePath && fs.existsSync(keyword.filePath) &&
            (!keyword.documentation || documentation.documentation === 'No documentation available')) {
            try {
                const fileDoc = await this.extractDocumentationFromFile(keyword.filePath, keyword.name || keyword.label);
                if (fileDoc && fileDoc.documentation) {
                    // Use file documentation only if we don't have better documentation already
                    documentation.documentation = fileDoc.documentation;
                    documentation.arguments = fileDoc.arguments || documentation.arguments;
                    documentation.returnType = fileDoc.returnType || documentation.returnType;
                    documentation.tags = fileDoc.tags || documentation.tags;
                }
            } catch (error) {
                console.warn('Failed to extract documentation from file:', keyword.filePath, error);
            }
        }

        // If we still don't have good documentation, try to parse from implementation
        if (documentation.documentation === 'No documentation available' && keyword.implementation) {
            // Look for Robot Framework [Documentation] section
            const docMatch = keyword.implementation.match(/\[Documentation\]\s*(.*?)(?:\n\s*\[|\n\s*\w|\n\s*$)/s);
            if (docMatch) {
                documentation.documentation = docMatch[1].trim().replace(/\n\s*\.\.\.\s*/g, ' ');
            }
        }

        return documentation;
    }

    private extractArgumentsFromImplementation(implementation: string): any[] {
        // Extract from [Arguments] section only - don't guess from placeholders
        const argumentsMatch = implementation.match(/\[Arguments\]\s*(.*?)(?:\n|$)/i);
        if (argumentsMatch) {
            const args = argumentsMatch[1].trim().split(/\s+/).filter(arg => arg.trim());
            return args.map(arg => {
                const match = arg.match(/\$\{([^}]+)\}(?:=(.*))?/);
                if (match) {
                    return {
                        name: match[1],
                        type: 'any',
                        defaultValue: match[2] || null
                    };
                }
                return { name: arg, type: 'any' };
            });
        }

        // Return empty array if no explicit [Arguments] section found
        return [];
    }

    private async extractDocumentationFromFile(filePath: string, keywordName: string): Promise<any | null> {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const content = fs.readFileSync(filePath, 'utf-8');

            if (filePath.endsWith('.py')) {
                return this.extractPythonDocumentation(content, keywordName);
            } else if (filePath.endsWith('.robot') || filePath.endsWith('.resource')) {
                return this.extractRobotDocumentation(content, keywordName);
            }
        } catch (error) {
            console.error('Error extracting documentation from file:', error);
        }

        return null;
    }

    private extractPythonDocumentation(content: string, keywordName: string): any | null {
        // Look for function/method definition and docstring
        const functionRegex = new RegExp(`def\\s+${keywordName}\\s*\\([^)]*\\):[\\s\\S]*?(?=def\\s|class\\s|$)`, 'i');
        const match = content.match(functionRegex);

        if (match) {
            const functionContent = match[0];

            // Extract docstring
            const docstringMatch = functionContent.match(/"""([^"]*)"""|'''([^']*)'''/s);
            const documentation = docstringMatch ? (docstringMatch[1] || docstringMatch[2]).trim() : null;

            // Extract parameters from function signature
            const paramsMatch = functionContent.match(/def\s+\w+\s*\(([^)]*)\)/);
            let args: any[] = [];

            if (paramsMatch) {
                const params = paramsMatch[1].split(',').map(p => p.trim()).filter(p => p && p !== 'self');
                args = params.map(param => {
                    const [name, defaultValue] = param.split('=').map(p => p.trim());
                    return {
                        name: name.replace(/^\*+/, ''), // Remove *args, **kwargs indicators
                        type: 'any',
                        defaultValue: defaultValue || null
                    };
                });
            }

            return {
                documentation,
                arguments: args,
                returnType: null, // Could be enhanced to parse return type hints
                tags: []
            };
        }

        return null;
    }

    private extractRobotDocumentation(content: string, keywordName: string): any | null {
        // Look for keyword definition in Robot Framework file
        const keywordRegex = new RegExp(`^${keywordName}\\s*$[\\s\\S]*?(?=^\\w|$)`, 'gm');
        const match = content.match(keywordRegex);

        if (match) {
            const keywordContent = match[0];

            // Extract [Documentation]
            const docMatch = keywordContent.match(/\[Documentation\]\s*(.*?)(?:\n\s*\[|\n\s*\w|\n\s*$)/s);
            const documentation = docMatch ? docMatch[1].trim().replace(/\n\s*\.\.\.\s*/g, ' ') : null;

            // Extract [Arguments]
            const argsMatch = keywordContent.match(/\[Arguments\]\s*(.*?)(?:\n|$)/);
            let args: any[] = [];

            if (argsMatch) {
                const argsList = argsMatch[1].trim().split(/\s+/);
                args = argsList.map(arg => {
                    const match = arg.match(/\$\{([^}]+)\}(?:=(.*))?/);
                    if (match) {
                        return {
                            name: match[1],
                            type: 'any',
                            defaultValue: match[2] || null
                        };
                    }
                    return { name: arg, type: 'any' };
                });
            }

            // Extract [Tags]
            const tagsMatch = keywordContent.match(/\[Tags\]\s*(.*?)(?:\n|$)/);
            const tags = tagsMatch ? tagsMatch[1].trim().split(/\s+/) : [];

            // Extract [Return]
            const returnMatch = keywordContent.match(/\[Return\]\s*(.*?)(?:\n|$)/);
            const returnType = returnMatch ? returnMatch[1].trim() : null;

            return {
                documentation,
                arguments: args,
                returnType,
                tags
            };
        }

        return null;
    }

    // Store current documentation for commands
    private currentDocumentation: any = null;

    async showKeywordDocumentation(keyword: any): Promise<void> {
        this.currentDocumentation = await this.extractKeywordDocumentation(keyword);
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('currentDocumentationKeyword', this.currentDocumentation, vscode.ConfigurationTarget.Global);
        this.refresh();
    }

    async showVariableDocumentation(variableItem: VariableTreeItem): Promise<void> {
        this.currentDocumentation = await this.extractVariableDocumentation(variableItem);
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        await config.update('currentDocumentationKeyword', this.currentDocumentation, vscode.ConfigurationTarget.Global);
        this.refresh();
    }

    private async extractVariableDocumentation(variableItem: VariableTreeItem): Promise<any> {
        const variable = variableItem.variable;

        if (!variable) {
            return {
                name: variableItem.label,
                library: 'Unknown',
                documentation: 'Variable details not available',
                arguments: [],
                source: 'unknown',
                filePath: '',
                returnType: null,
                tags: [],
                type: 'Variable',
                value: 'Unknown'
            };
        }

        const documentation = {
            name: variable.name || variableItem.label,
            library: variable.fileName || 'Unknown File',
            documentation: `Variable of type ${variable.type || 'Unknown'} from ${variable.source || 'unknown source'}`,
            arguments: [],
            source: variable.source || 'unknown',
            filePath: variable.filePath || '',
            returnType: variable.type || 'Unknown',
            tags: [],
            type: 'Variable',
            value: variable.value || 'Unknown'
        };

        // Try to extract more documentation from source file if available
        if (variable.filePath && fs.existsSync(variable.filePath)) {
            try {
                const fileDoc = await this.extractVariableDocumentationFromFile(variable.filePath, variable.name);
                if (fileDoc && fileDoc.documentation) {
                    documentation.documentation = fileDoc.documentation;
                    documentation.value = fileDoc.value || documentation.value;
                    documentation.type = fileDoc.type || documentation.returnType;
                }
            } catch (error) {
                console.error('Error extracting variable documentation from file:', error);
            }
        }

        return documentation;
    }

    private async extractVariableDocumentationFromFile(filePath: string, variableName: string): Promise<any> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const fileExtension = path.extname(filePath);

            if (fileExtension === '.py') {
                return this.extractPythonVariableDocumentation(content, variableName);
            } else if (fileExtension === '.robot' || fileExtension === '.resource') {
                return this.extractRobotVariableDocumentation(content, variableName);
            }

            return null;
        } catch (error) {
            console.error('Error reading file for variable documentation:', error);
            return null;
        }
    }

    private extractPythonVariableDocumentation(content: string, variableName: string): any {
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Look for variable assignment
            if (line.includes(`${variableName} =`)) {
                let documentation = '';
                let value = line.split('=')[1]?.trim() || 'Unknown';

                // Check for comment on same line or lines above
                if (line.includes('#')) {
                    documentation = line.split('#')[1]?.trim() || '';
                } else {
                    // Look for comments in previous lines
                    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                        const prevLine = lines[j].trim();
                        if (prevLine.startsWith('#')) {
                            documentation = prevLine.substring(1).trim() + (documentation ? ' ' + documentation : '');
                        } else if (prevLine !== '') {
                            break;
                        }
                    }
                }

                // Determine type from value
                let type = 'String';
                if (value.match(/^\d+$/)) {
                    type = 'Integer';
                } else if (value.match(/^\d*\.\d+$/)) {
                    type = 'Float';
                } else if (value.match(/^(True|False)$/)) {
                    type = 'Boolean';
                } else if (value.startsWith('[') && value.endsWith(']')) {
                    type = 'List';
                } else if (value.startsWith('{') && value.endsWith('}')) {
                    type = 'Dictionary';
                }

                return {
                    documentation: documentation || `Python variable: ${variableName}`,
                    value: value,
                    type: type
                };
            }
        }

        return null;
    }

    private extractRobotVariableDocumentation(content: string, variableName: string): any {
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

            // Look for variable definition
            if (line.includes(variableName)) {
                const parts = line.split(/\s{2,}/); // Split by multiple spaces
                let documentation = '';
                let value = 'Unknown';

                if (parts.length > 1) {
                    value = parts.slice(1).join(' ');
                }

                // Check for comment
                if (line.includes('#')) {
                    documentation = line.split('#')[1]?.trim() || '';
                }

                // Determine type from variable syntax
                let type = 'Scalar';
                if (variableName.startsWith('@{')) {
                    type = 'List';
                } else if (variableName.startsWith('&{')) {
                    type = 'Dictionary';
                } else if (variableName.startsWith('${')) {
                    type = 'Scalar';
                }

                return {
                    documentation: documentation || `Robot Framework variable: ${variableName}`,
                    value: value,
                    type: type
                };
            }
        }

        return null;
    }

    getCurrentDocumentation(): any {
        return this.currentDocumentation;
    }

    clearDocumentation(): void {
        this.currentDocumentation = null;
        const config = vscode.workspace.getConfiguration('robotFrameworkKeywords');
        config.update('currentDocumentationKeyword', null, vscode.ConfigurationTarget.Global);
        this.refresh();
    }
}

function generateRobotFrameworkKeywordCall(keywordName: string, implementation: string, library?: string): string {
    // Extract parameters from the keyword implementation
    const parameters = extractKeywordParameters(implementation);

    if (!parameters || parameters.length === 0) {
        return keywordName;
    }

    let keywordCall = keywordName;
    const argumentLines: string[] = [];

    for (const param of parameters) {
        // Create meaningful placeholder based on parameter name
        const placeholder = `\${${param.name}}`;

        // Add comment about default value if it exists
        let comment = '';
        if (param.originalDefault) {
            comment = `    # default: ${param.originalDefault}`;
        }

        const argumentLine = `    ...    ${param.name}=${placeholder}${comment}`;
        argumentLines.push(argumentLine);
    }

    if (argumentLines.length > 0) {
        keywordCall += '\n' + argumentLines.join('\n');
    }

    return keywordCall;
}

async function showParameterInputDialog(keywordName: string, parameters: any[]): Promise<{[key: string]: string} | null> {
    const parameterValues: {[key: string]: string} = {};

    for (const param of parameters) {
        const defaultValue = param.originalDefault || param.default || '';
        const promptMessage = `Parameter: ${param.name}${defaultValue ? ` (default: ${defaultValue})` : ''}`;

        const userInput = await vscode.window.showInputBox({
            prompt: promptMessage,
            value: defaultValue,
            placeHolder: defaultValue || `Enter value for ${param.name}`,
            ignoreFocusOut: true
        });

        if (userInput === undefined) {
            // User cancelled the dialog
            return null;
        }

        parameterValues[param.name] = userInput;
    }

    return parameterValues;
}

function generateRobotFrameworkKeywordCallWithValues(
    keywordName: string,
    parameters: any[],
    parameterValues: {[key: string]: string}
): string {
    if (!parameters || parameters.length === 0) {
        return keywordName;
    }

    let keywordCall = keywordName;
    const argumentLines: string[] = [];

    for (const param of parameters) {
        const value = parameterValues[param.name] || '';

        if (value.trim() !== '') {
            // Only include parameters that have values
            const argumentLine = `    ...    ${param.name}=${value}`;
            argumentLines.push(argumentLine);
        }
    }

    if (argumentLines.length > 0) {
        keywordCall += '\n' + argumentLines.join('\n');
    }

    return keywordCall;
}

function extractKeywordParameters(implementation: string): any[] {
    // First try to extract from [Arguments] section if it's a Robot Framework keyword
    // Handle both multi-line and single-line formats
    const argumentsMatch = implementation.match(/\[Arguments\]\s*(.*?)(?:\[|$)/i);
    if (argumentsMatch) {
        return parseRobotFrameworkArgumentsStandalone(argumentsMatch[1]);
    }

    // Fallback to placeholder extraction for other formats
    const placeholders = implementation.match(/\$\{[^}]+\}/g) || [];

    // Filter out common default values that shouldn't be parameters
    const commonDefaults = ['True', 'False', 'None', 'EMPTY', 'DEFAULT_WAIT_ELEMENT_STATE_TIMEOUT'];
    const filteredPlaceholders = placeholders.filter(placeholder => {
        const paramName = placeholder.replace(/\$\{|\}/g, '');
        return !commonDefaults.includes(paramName);
    });

    // Remove duplicates while preserving order
    const uniquePlaceholders = [...new Set(filteredPlaceholders)];

    return uniquePlaceholders.map(placeholder => {
        const paramName = placeholder.replace(/\$\{|\}/g, '');

        return {
            name: paramName,
            placeholder: placeholder,
            value: '', // Empty for direct insert/copy
            originalDefault: null,
            hidden: false // Initialize as visible
        };
    });
}

function parseRobotFrameworkArgumentsStandalone(argumentsLine: string): any[] {
    const parameters: any[] = [];

    // Clean up the arguments line - remove extra whitespace and "..." separators
    const cleanLine = argumentsLine.replace(/\.\.\./g, '').trim();

    // Split by whitespace and filter out empty strings
    const args = cleanLine.trim().split(/\s+/).filter(arg => arg.includes('${'));

    for (const arg of args) {
        // Handle ${param}=${default} or ${param} format
        const match = arg.match(/\$\{([^}]+)\}(?:=(.*))?/);
        if (match) {
            const paramName = match[1];
            let originalDefault = match[2] || null;

            // If the default value is another variable like ${True}, extract just the value
            if (originalDefault && originalDefault.startsWith('${') && originalDefault.endsWith('}')) {
                originalDefault = originalDefault.replace(/\$\{|\}/g, '');
            }

            parameters.push({
                name: paramName,
                placeholder: `\${${paramName}}`,
                value: '', // Empty for direct insert/copy
                originalDefault: originalDefault,
                hidden: false // Initialize as visible
            });
        }
    }

    return parameters;
}

