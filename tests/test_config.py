"""
Test Configuration and Setup
Configuration for running all tests in the CRM project
"""

import os
import sys
import unittest
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Test configuration
TEST_CONFIG = {
    'test_database_path': '/tmp/test_crm.db',
    'test_csv_path': '/tmp/test_data.csv',
    'test_export_path': '/tmp/test_export.json',
    'mock_data': {
        'leads': [
            {
                'id': '1',
                'company': 'Test Company 1',
                'contact': 'John Doe',
                'email': 'john@test1.com',
                'phone': '555-0001',
                'state': 'CA',
                'industry': 'Technology',
                'website': 'https://test1.com',
                'notes': 'Test lead 1',
                'dateAdded': '2024-01-01T00:00:00.000Z',
                'lastCalled': None
            },
            {
                'id': '2',
                'company': 'Test Company 2',
                'contact': 'Jane Smith',
                'email': 'jane@test2.com',
                'phone': '555-0002',
                'state': 'NY',
                'industry': 'Manufacturing',
                'website': 'https://test2.com',
                'notes': 'Test lead 2',
                'dateAdded': '2024-01-02T00:00:00.000Z',
                'lastCalled': '2024-01-15T00:00:00.000Z'
            }
        ],
        'call_logs': [
            {
                'id': '1',
                'leadId': '1',
                'outcome': 'meeting_set',
                'notes': 'Great conversation, meeting scheduled',
                'timestamp': '2024-01-15T10:00:00.000Z'
            }
        ],
        'meetings': [
            {
                'id': '1',
                'leadId': '1',
                'date': '2024-01-20',
                'time': '14:00',
                'notes': 'Product demo meeting',
                'status': 'upcoming'
            }
        ],
        'prospects': [
            {
                'id': '1',
                'company': 'Prospect Company 1',
                'website': 'https://prospect1.com',
                'state': 'CA',
                'service': 'CNC Machining',
                'revenue': '$10M',
                'employees': '50',
                'contact': 'Prospect Contact',
                'email': 'contact@prospect1.com',
                'phone': '555-1001',
                'industry': 'Manufacturing',
                'notes': 'Prospect notes',
                'stage': 'unreviewed',
                'decision': '',
                'dateAdded': '2024-01-01T00:00:00.000Z'
            }
        ]
    }
}

# Mock data generators
def generate_test_lead(overrides=None):
    """Generate a test lead with optional overrides"""
    lead = {
        'id': f'test_lead_{len(TEST_CONFIG["mock_data"]["leads"]) + 1}',
        'company': f'Test Company {len(TEST_CONFIG["mock_data"]["leads"]) + 1}',
        'contact': f'Contact {len(TEST_CONFIG["mock_data"]["leads"]) + 1}',
        'email': f'contact{len(TEST_CONFIG["mock_data"]["leads"]) + 1}@test.com',
        'phone': f'555-{len(TEST_CONFIG["mock_data"]["leads"]) + 1:04d}',
        'state': 'CA',
        'industry': 'Technology',
        'website': f'https://test{len(TEST_CONFIG["mock_data"]["leads"]) + 1}.com',
        'notes': f'Test lead {len(TEST_CONFIG["mock_data"]["leads"]) + 1}',
        'dateAdded': '2024-01-01T00:00:00.000Z',
        'lastCalled': None
    }
    
    if overrides:
        lead.update(overrides)
    
    return lead

def generate_test_prospect(overrides=None):
    """Generate a test prospect with optional overrides"""
    prospect = {
        'id': f'test_prospect_{len(TEST_CONFIG["mock_data"]["prospects"]) + 1}',
        'company': f'Prospect Company {len(TEST_CONFIG["mock_data"]["prospects"]) + 1}',
        'website': f'https://prospect{len(TEST_CONFIG["mock_data"]["prospects"]) + 1}.com',
        'state': 'CA',
        'service': 'CNC Machining',
        'revenue': '$10M',
        'employees': '50',
        'contact': f'Prospect Contact {len(TEST_CONFIG["mock_data"]["prospects"]) + 1}',
        'email': f'contact{len(TEST_CONFIG["mock_data"]["prospects"]) + 1}@prospect.com',
        'phone': f'555-{len(TEST_CONFIG["mock_data"]["prospects"]) + 1:04d}',
        'industry': 'Manufacturing',
        'notes': f'Prospect notes {len(TEST_CONFIG["mock_data"]["prospects"]) + 1}',
        'stage': 'unreviewed',
        'decision': '',
        'dateAdded': '2024-01-01T00:00:00.000Z'
    }
    
    if overrides:
        prospect.update(overrides)
    
    return prospect

def generate_test_call_log(lead_id, overrides=None):
    """Generate a test call log with optional overrides"""
    call_log = {
        'id': f'test_call_{len(TEST_CONFIG["mock_data"]["call_logs"]) + 1}',
        'leadId': lead_id,
        'outcome': 'meeting_set',
        'notes': f'Test call notes {len(TEST_CONFIG["mock_data"]["call_logs"]) + 1}',
        'timestamp': '2024-01-15T10:00:00.000Z'
    }
    
    if overrides:
        call_log.update(overrides)
    
    return call_log

def generate_test_meeting(lead_id, overrides=None):
    """Generate a test meeting with optional overrides"""
    meeting = {
        'id': f'test_meeting_{len(TEST_CONFIG["mock_data"]["meetings"]) + 1}',
        'leadId': lead_id,
        'date': '2024-01-20',
        'time': '14:00',
        'notes': f'Test meeting notes {len(TEST_CONFIG["mock_data"]["meetings"]) + 1}',
        'status': 'upcoming'
    }
    
    if overrides:
        meeting.update(overrides)
    
    return meeting

# Test utilities
class TestUtilities:
    """Utility functions for testing"""
    
    @staticmethod
    def create_temp_file(content, suffix='.txt'):
        """Create a temporary file with content"""
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix=suffix, delete=False) as f:
            f.write(content)
            return f.name
    
    @staticmethod
    def cleanup_temp_file(filepath):
        """Clean up a temporary file"""
        import os
        if os.path.exists(filepath):
            os.unlink(filepath)
    
    @staticmethod
    def assert_dict_contains_keys(dictionary, required_keys):
        """Assert that a dictionary contains all required keys"""
        for key in required_keys:
            assert key in dictionary, f"Missing required key: {key}"
    
    @staticmethod
    def assert_valid_email(email):
        """Assert that an email address is valid"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        assert re.match(pattern, email), f"Invalid email format: {email}"
    
    @staticmethod
    def assert_valid_phone(phone):
        """Assert that a phone number is valid"""
        import re
        # Basic phone number validation
        pattern = r'^[\d\s\-\(\)\+\.]+$'
        assert re.match(pattern, phone), f"Invalid phone format: {phone}"
    
    @staticmethod
    def assert_valid_url(url):
        """Assert that a URL is valid"""
        import re
        pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        assert re.match(pattern, url), f"Invalid URL format: {url}"

# Test data validation
class DataValidator:
    """Data validation utilities for tests"""
    
    @staticmethod
    def validate_lead(lead):
        """Validate lead data structure and content"""
        required_fields = ['id', 'company', 'contact', 'email', 'phone', 'state', 'industry']
        TestUtilities.assert_dict_contains_keys(lead, required_fields)
        
        # Validate email format
        if lead.get('email'):
            TestUtilities.assert_valid_email(lead['email'])
        
        # Validate phone format
        if lead.get('phone'):
            TestUtilities.assert_valid_phone(lead['phone'])
        
        # Validate website format
        if lead.get('website'):
            TestUtilities.assert_valid_url(lead['website'])
        
        return True
    
    @staticmethod
    def validate_prospect(prospect):
        """Validate prospect data structure and content"""
        required_fields = ['id', 'company', 'website', 'state', 'service', 'stage']
        TestUtilities.assert_dict_contains_keys(prospect, required_fields)
        
        # Validate website format
        if prospect.get('website'):
            TestUtilities.assert_valid_url(prospect['website'])
        
        # Validate stage
        valid_stages = ['unreviewed', 'reviewed', 'finalized', 'unqualified']
        assert prospect['stage'] in valid_stages, f"Invalid stage: {prospect['stage']}"
        
        return True
    
    @staticmethod
    def validate_call_log(call_log):
        """Validate call log data structure and content"""
        required_fields = ['id', 'leadId', 'outcome', 'timestamp']
        TestUtilities.assert_dict_contains_keys(call_log, required_fields)
        
        # Validate outcome
        valid_outcomes = ['meeting_set', 'receptionist', 'not_interested', 'voicemail', 'spoke_w_contact', 'no_answer']
        assert call_log['outcome'] in valid_outcomes, f"Invalid outcome: {call_log['outcome']}"
        
        return True
    
    @staticmethod
    def validate_meeting(meeting):
        """Validate meeting data structure and content"""
        required_fields = ['id', 'leadId', 'date', 'time', 'status']
        TestUtilities.assert_dict_contains_keys(meeting, required_fields)
        
        # Validate status
        valid_statuses = ['upcoming', 'completed', 'cancelled']
        assert meeting['status'] in valid_statuses, f"Invalid status: {meeting['status']}"
        
        return True

# Test environment setup
def setup_test_environment():
    """Set up test environment"""
    # Create test directories if they don't exist
    test_dirs = ['/tmp/test_crm', '/tmp/test_csv', '/tmp/test_export']
    for test_dir in test_dirs:
        os.makedirs(test_dir, exist_ok=True)
    
    # Set up environment variables for testing
    os.environ['TEST_MODE'] = 'true'
    os.environ['TEST_DATABASE_PATH'] = TEST_CONFIG['test_database_path']
    
    return True

def cleanup_test_environment():
    """Clean up test environment"""
    import shutil
    
    # Remove test directories
    test_dirs = ['/tmp/test_crm', '/tmp/test_csv', '/tmp/test_export']
    for test_dir in test_dirs:
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
    
    # Clean up environment variables
    if 'TEST_MODE' in os.environ:
        del os.environ['TEST_MODE']
    if 'TEST_DATABASE_PATH' in os.environ:
        del os.environ['TEST_DATABASE_PATH']
    
    return True

# Test discovery
def discover_tests():
    """Discover all test modules in the tests directory"""
    test_dir = Path(__file__).parent
    test_modules = []
    
    for file_path in test_dir.glob('test_*.py'):
        if file_path.name != __file__.split('/')[-1]:  # Exclude this file
            module_name = file_path.stem
            test_modules.append(module_name)
    
    return test_modules

# Test runner configuration
def get_test_runner_config():
    """Get configuration for test runner"""
    return {
        'verbosity': 2,
        'buffer': True,
        'failfast': False,
        'tb_locals': True
    }

if __name__ == '__main__':
    # Setup test environment
    setup_test_environment()
    
    # Discover and run tests
    test_modules = discover_tests()
    print(f"Discovered test modules: {test_modules}")
    
    # Cleanup
    cleanup_test_environment()
