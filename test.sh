#!/bin/bash

# Custom CRM Test Execution Script
# This script runs all tests for the Custom CRM application

set -e  # Exit on any error

echo "🚀 Custom CRM Test Suite"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run JavaScript tests
run_js_tests() {
    print_status $BLUE "Running JavaScript tests..."
    
    if ! command_exists node; then
        print_status $RED "❌ Node.js not found. Please install Node.js to run JavaScript tests."
        return 1
    fi
    
    if ! command_exists npm; then
        print_status $RED "❌ npm not found. Please install npm to run JavaScript tests."
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_status $YELLOW "📦 Creating package.json for JavaScript tests..."
        cat > package.json << EOF
{
  "name": "custom-crm-tests",
  "version": "1.0.0",
  "description": "Test suite for Custom CRM",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "@testing-library/jest-dom": "^5.16.0"
  }
}
EOF
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status $YELLOW "📦 Installing JavaScript test dependencies..."
        npm install
    fi
    
    # Run Jest tests
    print_status $BLUE "🧪 Executing JavaScript tests with Jest..."
    if npm test; then
        print_status $GREEN "✅ JavaScript tests passed!"
        return 0
    else
        print_status $RED "❌ JavaScript tests failed!"
        return 1
    fi
}

# Function to run Python tests
run_python_tests() {
    print_status $BLUE "Running Python tests..."
    
    if ! command_exists python3; then
        print_status $RED "❌ Python 3 not found. Please install Python 3 to run Python tests."
        return 1
    fi
    
    # Check if required Python packages are installed
    print_status $YELLOW "🔍 Checking Python dependencies..."
    
    # Install required packages if not present
    python3 -c "import selenium" 2>/dev/null || {
        print_status $YELLOW "📦 Installing selenium..."
        pip3 install selenium
    }
    
    python3 -c "import requests" 2>/dev/null || {
        print_status $YELLOW "📦 Installing requests..."
        pip3 install requests
    }
    
    python3 -c "import bs4" 2>/dev/null || {
        print_status $YELLOW "📦 Installing beautifulsoup4..."
        pip3 install beautifulsoup4
    }
    
    # Run Python tests
    print_status $BLUE "🧪 Executing Python tests with unittest..."
    if python3 -m unittest discover tests -p "test_*.py" -v; then
        print_status $GREEN "✅ Python tests passed!"
        return 0
    else
        print_status $RED "❌ Python tests failed!"
        return 1
    fi
}

# Function to run comprehensive test suite
run_comprehensive_tests() {
    print_status $BLUE "Running comprehensive test suite..."
    
    if python3 tests/run_tests.py; then
        print_status $GREEN "✅ Comprehensive test suite completed!"
        return 0
    else
        print_status $RED "❌ Comprehensive test suite failed!"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  js, javascript    Run only JavaScript tests"
    echo "  py, python        Run only Python tests"
    echo "  all, comprehensive Run all tests (default)"
    echo "  help, -h, --help  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Run all tests"
    echo "  $0 js             # Run only JavaScript tests"
    echo "  $0 python         # Run only Python tests"
    echo "  $0 comprehensive  # Run comprehensive test suite"
}

# Main execution
main() {
    local test_type=${1:-all}
    
    case $test_type in
        "js"|"javascript")
            run_js_tests
            ;;
        "py"|"python")
            run_python_tests
            ;;
        "all"|"comprehensive")
            run_comprehensive_tests
            ;;
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            print_status $RED "❌ Unknown option: $test_type"
            show_help
            exit 1
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "app.js" ] || [ ! -d "tests" ]; then
    print_status $RED "❌ Please run this script from the Custom CRM root directory"
    exit 1
fi

# Run main function with all arguments
main "$@"
