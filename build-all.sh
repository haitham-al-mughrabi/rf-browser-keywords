#!/bin/bash

# Unified build script for both PyCharm and VSCode extensions
# Robot Framework Keywords Explorer

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}${BOLD}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Function to print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info message
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Parse command line arguments
BUILD_PYCHARM=false
BUILD_VSCODE=false
SHOW_HELP=false

if [ $# -eq 0 ]; then
    # No arguments, build both
    BUILD_PYCHARM=true
    BUILD_VSCODE=true
else
    for arg in "$@"; do
        case $arg in
            --pycharm)
                BUILD_PYCHARM=true
                ;;
            --vscode)
                BUILD_VSCODE=true
                ;;
            --all)
                BUILD_PYCHARM=true
                BUILD_VSCODE=true
                ;;
            --help|-h)
                SHOW_HELP=true
                ;;
            *)
                echo -e "${RED}Unknown option: $arg${NC}"
                SHOW_HELP=true
                ;;
        esac
    done
fi

# Show help
if [ "$SHOW_HELP" = true ]; then
    echo ""
    echo -e "${BOLD}Robot Framework Keywords Explorer - Build Script${NC}"
    echo ""
    echo "Usage: ./build-all.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --pycharm    Build PyCharm/IntelliJ plugin only"
    echo "  --vscode     Build VSCode extension only"
    echo "  --all        Build both extensions (default)"
    echo "  --help, -h   Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./build-all.sh              # Build both extensions"
    echo "  ./build-all.sh --pycharm    # Build PyCharm plugin only"
    echo "  ./build-all.sh --vscode     # Build VSCode extension only"
    echo ""
    exit 0
fi

# Main build process
print_header "Robot Framework Keywords Explorer - Build All"

START_TIME=$(date +%s)
BUILD_SUCCESS=true
PYCHARM_SUCCESS=false
VSCODE_SUCCESS=false

# Build PyCharm plugin
if [ "$BUILD_PYCHARM" = true ]; then
    print_header "Building PyCharm/IntelliJ Plugin"

    if [ -f "build-pycharm.sh" ]; then
        ./build-pycharm.sh
        if [ $? -eq 0 ]; then
            PYCHARM_SUCCESS=true
            print_success "PyCharm plugin built successfully"
        else
            BUILD_SUCCESS=false
            print_error "PyCharm plugin build failed"
        fi
    else
        print_error "build-pycharm.sh not found"
        BUILD_SUCCESS=false
    fi
fi

# Build VSCode extension
if [ "$BUILD_VSCODE" = true ]; then
    print_header "Building VSCode Extension"

    if [ -f "build-vscode.sh" ]; then
        ./build-vscode.sh
        if [ $? -eq 0 ]; then
            VSCODE_SUCCESS=true
            print_success "VSCode extension built successfully"
        else
            BUILD_SUCCESS=false
            print_error "VSCode extension build failed"
        fi
    else
        print_error "build-vscode.sh not found"
        BUILD_SUCCESS=false
    fi
fi

# Calculate build time
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))

# Print summary
echo ""
print_header "Build Summary"

if [ "$BUILD_PYCHARM" = true ]; then
    if [ "$PYCHARM_SUCCESS" = true ]; then
        PLUGIN_FILE=$(find build/distributions -name "*.zip" 2>/dev/null | head -n 1)
        if [ -n "$PLUGIN_FILE" ]; then
            print_success "PyCharm Plugin: $(basename $PLUGIN_FILE)"
            print_info "  Location: $PLUGIN_FILE"
        fi
    else
        print_error "PyCharm Plugin: Build Failed"
    fi
fi

if [ "$BUILD_VSCODE" = true ]; then
    if [ "$VSCODE_SUCCESS" = true ]; then
        EXTENSION_FILE=$(find . -maxdepth 1 -name "*.vsix" 2>/dev/null | head -n 1)
        if [ -n "$EXTENSION_FILE" ]; then
            print_success "VSCode Extension: $(basename $EXTENSION_FILE)"
            print_info "  Location: $EXTENSION_FILE"
        fi
    else
        print_error "VSCode Extension: Build Failed"
    fi
fi

echo ""
print_info "Total build time: ${BUILD_TIME}s"
echo ""

# Final status
if [ "$BUILD_SUCCESS" = true ]; then
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo -e "${GREEN}${BOLD}  All Builds Completed Successfully! ✓${NC}"
    echo -e "${GREEN}${BOLD}========================================${NC}"
    echo ""

    # Installation quick reference
    echo -e "${YELLOW}Quick Installation:${NC}"
    echo ""
    if [ "$PYCHARM_SUCCESS" = true ] && [ -n "$PLUGIN_FILE" ]; then
        echo -e "${BLUE}PyCharm/IntelliJ:${NC}"
        echo "  Settings → Plugins → ⚙️ → Install from Disk → Select plugin file"
        echo ""
    fi
    if [ "$VSCODE_SUCCESS" = true ] && [ -n "$EXTENSION_FILE" ]; then
        echo -e "${BLUE}VSCode:${NC}"
        echo "  code --install-extension $(basename $EXTENSION_FILE)"
        echo "  OR"
        echo "  Extensions → ... → Install from VSIX → Select extension file"
        echo ""
    fi

    exit 0
else
    echo -e "${RED}${BOLD}========================================${NC}"
    echo -e "${RED}${BOLD}  Some Builds Failed ✗${NC}"
    echo -e "${RED}${BOLD}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Please check the error messages above${NC}"
    echo ""
    exit 1
fi
