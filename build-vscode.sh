#!/bin/bash

# Build script for VSCode Extension
# Robot Framework Keywords Explorer

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VSCode Extension Build Script${NC}"
echo -e "${BLUE}  Robot Framework Keywords Explorer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Node.js is installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
    echo "Please install Node.js 16.x or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"

# Check if VSCE is installed
if ! command -v vsce &> /dev/null; then
    echo ""
    echo -e "${YELLOW}VSCE (VSCode Extension Manager) not found${NC}"
    echo -e "${YELLOW}Installing @vscode/vsce globally...${NC}"
    npm install -g @vscode/vsce

    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install VSCE${NC}"
        echo -e "${YELLOW}Trying with npx instead...${NC}"
        USE_NPX=true
    else
        echo -e "${GREEN}✓ VSCE installed successfully${NC}"
        USE_NPX=false
    fi
else
    echo -e "${GREEN}✓ VSCE found: $(vsce --version)${NC}"
    USE_NPX=false
fi

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Compile TypeScript
echo ""
echo -e "${YELLOW}Compiling TypeScript...${NC}"
npm run compile

if [ $? -ne 0 ]; then
    echo -e "${RED}TypeScript compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ TypeScript compiled successfully${NC}"

# Package the extension
echo ""
echo -e "${YELLOW}Packaging VSCode extension...${NC}"

if [ "$USE_NPX" = true ]; then
    npx vsce package
else
    vsce package
fi

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Build Successful! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # Get the extension file
    EXTENSION_FILE=$(find . -maxdepth 1 -name "*.vsix" | head -n 1)

    if [ -n "$EXTENSION_FILE" ]; then
        EXTENSION_SIZE=$(du -h "$EXTENSION_FILE" | awk '{print $1}')
        EXTENSION_NAME=$(basename "$EXTENSION_FILE")

        echo -e "${BLUE}Extension Details:${NC}"
        echo -e "  Name: $EXTENSION_NAME"
        echo -e "  Size: $EXTENSION_SIZE"
        echo -e "  Location: ${GREEN}$EXTENSION_FILE${NC}"
        echo ""

        # Extract version from package.json
        VERSION=$(grep '"version"' package.json | head -1 | awk -F '"' '{print $4}')

        echo -e "${BLUE}Installation Instructions:${NC}"
        echo ""
        echo -e "${YELLOW}Method 1: Command Line${NC}"
        echo -e "  code --install-extension $EXTENSION_NAME"
        echo ""
        echo -e "${YELLOW}Method 2: VSCode UI${NC}"
        echo -e "  1. Open VSCode"
        echo -e "  2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)"
        echo -e "  3. Click '...' menu → Install from VSIX"
        echo -e "  4. Select: ${GREEN}$EXTENSION_FILE${NC}"
        echo ""
        echo -e "${YELLOW}Method 3: Development Mode${NC}"
        echo -e "  1. Open this folder in VSCode"
        echo -e "  2. Press F5 to launch Extension Development Host"
        echo ""

        echo -e "${GREEN}Extension version $VERSION is ready for installation!${NC}"
    else
        echo -e "${RED}Warning: Extension file (.vsix) not found${NC}"
    fi
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Build Failed ✗${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above${NC}"
    exit 1
fi
