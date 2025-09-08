# Custom CRM Test Suite

This directory contains comprehensive tests for all functions in the Custom CRM application, covering both JavaScript frontend and Python backend components.

## Test Structure

```
tests/
├── README.md                           # This file
├── test_config.py                      # Test configuration and utilities
├── run_tests.py                        # Main test runner
├── test-sales-crm.js                   # JavaScript CRM class tests
├── test_ui_functions.js                # UI interaction tests
├── test_thomasnet_integration.py       # Python integration tests
├── test_thomasnet_scraper.py           # Python scraper tests
├── test_data_processing.py             # Data processing tests
└── jest.setup.js                       # Jest configuration (auto-generated)
```

## Test Coverage

### JavaScript Tests (Frontend)
- **SalesCRM Class**: Core CRM functionality, database operations, lead management
- **UI Functions**: User interface interactions, form validation, table operations
- **Event Handlers**: User interactions, modal management, filtering
- **Data Display**: Formatting, pagination, statistics calculation

### Python Tests (Backend)
- **Thomasnet Integration**: API communication, data parsing, error handling
- **Scraper Functions**: Web scraping, data extraction, CSV processing
- **Data Processing**: Validation, transformation, file operations
- **Utility Functions**: Helper functions, data cleaning, formatting

## Running Tests

### Prerequisites

1. **Node.js and npm** (for JavaScript tests)
2. **Python 3.7+** (for Python tests)
3. **Required Python packages**:
   ```bash
   pip install selenium requests beautifulsoup4
   ```

### Quick Start

Run all tests with the comprehensive test runner:

```bash
cd /Users/alexbringuel/Development/custom_crm
python tests/run_tests.py
```

### Individual Test Suites

#### JavaScript Tests
```bash
# Install dependencies
npm install

# Run JavaScript tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

#### Python Tests
```bash
# Run all Python tests
python -m unittest discover tests -p "test_*.py" -v

# Run specific test file
python -m unittest tests.test_thomasnet_integration -v

# Run with coverage
pip install coverage
coverage run -m unittest discover tests -p "test_*.py"
coverage report
coverage html
```

## Test Configuration

### JavaScript Configuration
- **Test Framework**: Jest
- **Environment**: jsdom (simulates browser environment)
- **Mocking**: DOM APIs, IndexedDB, Chart.js
- **Coverage**: HTML and LCOV reports

### Python Configuration
- **Test Framework**: unittest
- **Mocking**: unittest.mock for external dependencies
- **Coverage**: Optional coverage.py integration

## Test Data

The test suite includes comprehensive mock data for:
- **Leads**: Sample lead records with various states and industries
- **Prospects**: Scraped prospect data in different stages
- **Call Logs**: Call outcome records and notes
- **Meetings**: Scheduled meeting data
- **Configuration**: Settings and preferences

## Mock Data Generators

Utility functions for generating test data:
- `generate_test_lead(overrides=None)`: Create test lead records
- `generate_test_prospect(overrides=None)`: Create test prospect records
- `generate_test_call_log(lead_id, overrides=None)`: Create test call logs
- `generate_test_meeting(lead_id, overrides=None)`: Create test meetings

## Data Validation

Built-in validation functions for test data:
- `DataValidator.validate_lead(lead)`: Validate lead data structure
- `DataValidator.validate_prospect(prospect)`: Validate prospect data
- `DataValidator.validate_call_log(call_log)`: Validate call log data
- `DataValidator.validate_meeting(meeting)`: Validate meeting data

## Test Utilities

Helper functions for testing:
- `TestUtilities.create_temp_file(content, suffix)`: Create temporary files
- `TestUtilities.cleanup_temp_file(filepath)`: Clean up temporary files
- `TestUtilities.assert_dict_contains_keys(dict, keys)`: Assert dictionary keys
- `TestUtilities.assert_valid_email(email)`: Validate email format
- `TestUtilities.assert_valid_phone(phone)`: Validate phone format
- `TestUtilities.assert_valid_url(url)`: Validate URL format

## Test Categories

### Unit Tests
- Individual function testing
- Isolated component testing
- Mock dependency testing

### Integration Tests
- End-to-end workflow testing
- Database integration testing
- API integration testing

### UI Tests
- User interaction testing
- Form validation testing
- Display logic testing

### Data Tests
- Data validation testing
- Data transformation testing
- File operation testing

## Test Results

The test runner provides detailed results including:
- **Pass/Fail counts** for each test category
- **Success rates** and overall statistics
- **Execution time** and performance metrics
- **Error details** and failure reasons
- **Coverage reports** (when enabled)

## Continuous Integration

The test suite is designed to work with CI/CD pipelines:
- **Exit codes**: Proper exit codes for CI systems
- **JSON output**: Machine-readable test results
- **Coverage reports**: Automated coverage tracking
- **Parallel execution**: Support for parallel test runs

## Debugging Tests

### JavaScript Tests
```bash
# Run specific test file
npx jest test-sales-crm.js --verbose

# Run with debugging
npx jest --detectOpenHandles --forceExit

# Run single test
npx jest --testNamePattern="should add new lead"
```

### Python Tests
```bash
# Run with verbose output
python -m unittest tests.test_thomasnet_integration -v

# Run single test method
python -m unittest tests.test_thomasnet_integration.TestThomasnetIntegration.test_run_thomasnet_scraper_success -v

# Run with debugging
python -m pdb -m unittest tests.test_thomasnet_integration
```

## Adding New Tests

### JavaScript Tests
1. Create test file: `test_[feature].js`
2. Import required modules and mocks
3. Write test cases using Jest syntax
4. Add to test runner configuration

### Python Tests
1. Create test file: `test_[module].py`
2. Import unittest and required modules
3. Create test class inheriting from `unittest.TestCase`
4. Write test methods starting with `test_`

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock Dependencies**: Use mocks for external dependencies
3. **Clear Naming**: Use descriptive test names
4. **Assertions**: Use specific assertions for better error messages
5. **Setup/Teardown**: Properly clean up test data
6. **Coverage**: Aim for high test coverage
7. **Documentation**: Document complex test scenarios

## Troubleshooting

### Common Issues

1. **Module Import Errors**: Ensure all dependencies are installed
2. **Mock Issues**: Check mock setup and teardown
3. **Async Tests**: Use proper async/await patterns
4. **File Paths**: Use absolute paths for file operations
5. **Environment Variables**: Set required environment variables

### Getting Help

1. Check test output for specific error messages
2. Review mock configurations
3. Verify test data setup
4. Check file permissions and paths
5. Review test documentation

## Performance

The test suite is optimized for:
- **Fast execution**: Parallel test runs where possible
- **Minimal setup**: Efficient test data generation
- **Clean teardown**: Proper resource cleanup
- **Memory efficiency**: Minimal memory footprint

## Contributing

When adding new tests:
1. Follow existing patterns and conventions
2. Include comprehensive test cases
3. Add proper documentation
4. Update this README if needed
5. Ensure all tests pass before submitting

## License

This test suite is part of the Custom CRM project and follows the same license terms.
