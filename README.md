# Robot Framework Browser Keywords Extension

A VS Code extension that provides a tree view of Robot Framework Browser library keywords and allows you to insert them into your Robot files with a single click.

## Features

- **Tree View**: Shows common Browser library keywords in the Explorer panel
- **One-Click Insert**: Click any keyword to insert its implementation at the cursor position
- **Smart Templates**: Keywords include parameter placeholders using `${variable}` syntax

## How to Use

1. Open a `.robot` file in VS Code
2. Look for the "RF Browser Keywords" panel in the Explorer view
3. Click on any keyword to insert it at your cursor position
4. Replace the `${placeholder}` values with your actual values

## Development

To test this extension:

1. Install dependencies: `npm install`
2. Compile TypeScript: `npm run compile`
3. Press F5 to launch Extension Development Host
4. Open a `.robot` file in the new window
5. Look for "RF Browser Keywords" in the Explorer panel

## Keywords Included

- Open Browser
- Click
- Fill Text
- Get Text
- Wait For Elements State

More keywords can be easily added by modifying the `getBrowserKeywords()` method in `src/extension.ts`.