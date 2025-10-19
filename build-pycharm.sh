#!/bin/bash

# Build script for PyCharm/IntelliJ Plugin
# Robot Framework Keywords Explorer

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  PyCharm Plugin Build Script${NC}"
echo -e "${BLUE}  Robot Framework Keywords Explorer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Java is installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${RED}Error: Java is not installed or not in PATH${NC}"
    echo "Please install JDK 17 or higher"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | awk -F '.' '{print $1}')
echo -e "${GREEN}✓ Java found: $(java -version 2>&1 | head -n 1)${NC}"

if [ "$JAVA_VERSION" -lt 17 ]; then
    echo -e "${RED}Error: Java 17 or higher is required${NC}"
    echo "Current version: $JAVA_VERSION"
    exit 1
fi

# Clean previous builds
echo ""
echo -e "${YELLOW}Cleaning previous builds...${NC}"
./gradlew clean

# Build the plugin
echo ""
echo -e "${YELLOW}Building PyCharm plugin...${NC}"
./gradlew build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Build Successful! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # Get the plugin file
    PLUGIN_FILE=$(find build/distributions -name "*.zip" | head -n 1)

    if [ -n "$PLUGIN_FILE" ]; then
        PLUGIN_SIZE=$(du -h "$PLUGIN_FILE" | awk '{print $1}')
        PLUGIN_NAME=$(basename "$PLUGIN_FILE")

        echo -e "${BLUE}Plugin Details:${NC}"
        echo -e "  Name: $PLUGIN_NAME"
        echo -e "  Size: $PLUGIN_SIZE"
        echo -e "  Location: ${GREEN}$PLUGIN_FILE${NC}"
        echo ""

        # Extract version from plugin file
        VERSION=$(echo "$PLUGIN_NAME" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

        echo -e "${BLUE}Installation Instructions:${NC}"
        echo -e "  1. Open PyCharm or IntelliJ IDEA"
        echo -e "  2. Go to Settings/Preferences → Plugins"
        echo -e "  3. Click ⚙️ → Install Plugin from Disk"
        echo -e "  4. Select: ${GREEN}$PLUGIN_FILE${NC}"
        echo -e "  5. Restart the IDE"
        echo ""

        echo -e "${YELLOW}Or test in development mode:${NC}"
        echo -e "  ./gradlew runIde"
        echo ""

        echo -e "${GREEN}Plugin version $VERSION is ready for installation!${NC}"
    else
        echo -e "${RED}Warning: Plugin file not found in build/distributions/${NC}"
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
