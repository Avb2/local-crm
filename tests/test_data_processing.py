"""
Test Suite for Data Processing Functions
Tests CSV processing, data validation, and data transformation
"""

import unittest
import csv
import json
import tempfile
import os
from unittest.mock import patch, mock_open
from pathlib import Path

# Mock dependencies
import sys
sys.modules['selenium'] = unittest.mock.MagicMock()
sys.modules['requests'] = unittest.mock.MagicMock()
sys.modules['bs4'] = unittest.mock.MagicMock()

class TestCSVProcessing(unittest.TestCase):
    """Test cases for CSV processing functions"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.sample_csv_data = [
            {
                'Company': 'Test Company 1',
                'Website': 'https://test1.com',
                'State': 'CA',
                'Service': 'CNC Machining',
                'Revenue': '$10M',
                'Employees': '50',
                'Contact': 'John Doe',
                'Email': 'john@test1.com',
                'Phone': '555-0001',
                'Industry': 'Manufacturing',
                'Notes': 'Test company 1'
            },
            {
                'Company': 'Test Company 2',
                'Website': 'https://test2.com',
                'State': 'NY',
                'Service': 'Robotic Welding',
                'Revenue': '$5M',
                'Employees': '25',
                'Contact': 'Jane Smith',
                'Email': 'jane@test2.com',
                'Phone': '555-0002',
                'Industry': 'Manufacturing',
                'Notes': 'Test company 2'
            }
        ]
    
    def test_csv_to_json_conversion(self):
        """Test converting CSV data to JSON format"""
        def csv_to_json(csv_data):
            """Convert CSV data to JSON format"""
            json_data = []
            for row in csv_data:
                # Convert keys to lowercase and replace spaces with underscores
                json_row = {}
                for key, value in row.items():
                    new_key = key.lower().replace(' ', '_')
                    json_row[new_key] = value
                json_data.append(json_row)
            return json_data
        
        result = csv_to_json(self.sample_csv_data)
        
        self.assertEqual(len(result), 2)
        self.assertIn('company', result[0])
        self.assertIn('website', result[0])
        self.assertIn('state', result[0])
        self.assertEqual(result[0]['company'], 'Test Company 1')
        self.assertEqual(result[0]['website'], 'https://test1.com')
    
    def test_csv_validation(self):
        """Test CSV data validation"""
        def validate_csv_data(csv_data):
            """Validate CSV data structure and content"""
            errors = []
            
            if not csv_data:
                errors.append("No data provided")
                return errors
            
            required_fields = ['Company', 'Website', 'State', 'Service']
            
            for i, row in enumerate(csv_data):
                for field in required_fields:
                    if field not in row or not row[field]:
                        errors.append(f"Row {i+1}: Missing required field '{field}'")
                
                # Validate email format
                if 'Email' in row and row['Email']:
                    email = row['Email']
                    if '@' not in email or '.' not in email.split('@')[-1]:
                        errors.append(f"Row {i+1}: Invalid email format '{email}'")
                
                # Validate website format
                if 'Website' in row and row['Website']:
                    website = row['Website']
                    if not website.startswith(('http://', 'https://')):
                        errors.append(f"Row {i+1}: Invalid website format '{website}'")
            
            return errors
        
        # Test valid data
        errors = validate_csv_data(self.sample_csv_data)
        self.assertEqual(len(errors), 0)
        
        # Test invalid data
        invalid_data = [
            {
                'Company': 'Test Company',
                'Website': 'invalid-website',
                'State': 'CA',
                'Service': 'CNC Machining',
                'Email': 'invalid-email'
            }
        ]
        
        errors = validate_csv_data(invalid_data)
        self.assertGreater(len(errors), 0)
        self.assertTrue(any('Invalid email format' in error for error in errors))
        self.assertTrue(any('Invalid website format' in error for error in errors))
    
    def test_csv_deduplication(self):
        """Test removing duplicate entries from CSV data"""
        def deduplicate_csv_data(csv_data, key_fields=['Company', 'Email']):
            """Remove duplicate entries based on key fields"""
            seen = set()
            unique_data = []
            
            for row in csv_data:
                # Create a key from the specified fields
                key = tuple(str(row.get(field, '')).lower() for field in key_fields)
                
                if key not in seen:
                    seen.add(key)
                    unique_data.append(row)
            
            return unique_data
        
        # Test with duplicate data
        duplicate_data = self.sample_csv_data + [
            {
                'Company': 'Test Company 1',  # Duplicate
                'Website': 'https://test1.com',
                'State': 'CA',
                'Service': 'CNC Machining',
                'Email': 'john@test1.com'  # Duplicate
            }
        ]
        
        result = deduplicate_csv_data(duplicate_data)
        self.assertEqual(len(result), 2)  # Should remove duplicate
        self.assertEqual(len(self.sample_csv_data), 2)
    
    def test_csv_cleaning(self):
        """Test cleaning CSV data"""
        def clean_csv_data(csv_data):
            """Clean CSV data by trimming whitespace and standardizing formats"""
            cleaned_data = []
            
            for row in csv_data:
                cleaned_row = {}
                for key, value in row.items():
                    if isinstance(value, str):
                        # Trim whitespace
                        cleaned_value = value.strip()
                        
                        # Standardize phone numbers
                        if key.lower() in ['phone', 'telephone']:
                            cleaned_value = ''.join(filter(str.isdigit, cleaned_value))
                            if len(cleaned_value) == 10:
                                cleaned_value = f"({cleaned_value[:3]}) {cleaned_value[3:6]}-{cleaned_value[6:]}"
                        
                        # Standardize email
                        if key.lower() == 'email':
                            cleaned_value = cleaned_value.lower()
                        
                        # Standardize website URLs
                        if key.lower() in ['website', 'url']:
                            if cleaned_value and not cleaned_value.startswith(('http://', 'https://')):
                                cleaned_value = f"https://{cleaned_value}"
                        
                        cleaned_row[key] = cleaned_value
                    else:
                        cleaned_row[key] = value
                
                cleaned_data.append(cleaned_row)
            
            return cleaned_data
        
        dirty_data = [
            {
                'Company': '  Test Company  ',
                'Email': '  JOHN@TEST.COM  ',
                'Phone': '555-123-4567',
                'Website': 'test.com'
            }
        ]
        
        result = clean_csv_data(dirty_data)
        
        self.assertEqual(result[0]['Company'], 'Test Company')
        self.assertEqual(result[0]['Email'], 'john@test.com')
        self.assertEqual(result[0]['Phone'], '(555) 123-4567')
        self.assertEqual(result[0]['Website'], 'https://test.com')


class TestDataValidation(unittest.TestCase):
    """Test cases for data validation functions"""
    
    def test_email_validation(self):
        """Test email address validation"""
        def is_valid_email(email):
            """Validate email address format"""
            import re
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            return bool(re.match(pattern, email))
        
        valid_emails = [
            'test@example.com',
            'user.name@domain.co.uk',
            'test+tag@example.org',
            'user123@test-domain.com'
        ]
        
        invalid_emails = [
            'invalid-email',
            '@example.com',
            'test@',
            'test..test@example.com',
            'test@.com',
            'test@example.'
        ]
        
        for email in valid_emails:
            with self.subTest(email=email):
                self.assertTrue(is_valid_email(email))
        
        for email in invalid_emails:
            with self.subTest(email=email):
                self.assertFalse(is_valid_email(email))
    
    def test_phone_validation(self):
        """Test phone number validation"""
        def is_valid_phone(phone):
            """Validate phone number format"""
            import re
            # Remove all non-digit characters
            digits = re.sub(r'\D', '', phone)
            # Check if it's a valid length (10 or 11 digits)
            return len(digits) in [10, 11]
        
        valid_phones = [
            '555-123-4567',
            '(555) 123-4567',
            '555.123.4567',
            '5551234567',
            '+1 555 123 4567',
            '1-555-123-4567'
        ]
        
        invalid_phones = [
            '123',
            '555-123',
            'abc-def-ghij',
            '555-123-45678',
            ''
        ]
        
        for phone in valid_phones:
            with self.subTest(phone=phone):
                self.assertTrue(is_valid_phone(phone))
        
        for phone in invalid_phones:
            with self.subTest(phone=phone):
                self.assertFalse(is_valid_phone(phone))
    
    def test_url_validation(self):
        """Test URL validation"""
        def is_valid_url(url):
            """Validate URL format"""
            import re
            pattern = r'^https?://[^\s/$.?#].[^\s]*$'
            return bool(re.match(pattern, url))
        
        valid_urls = [
            'https://example.com',
            'http://test.org',
            'https://subdomain.example.com/path',
            'https://example.com:8080/path?query=value'
        ]
        
        invalid_urls = [
            'example.com',
            'ftp://example.com',
            'https://',
            'not-a-url',
            ''
        ]
        
        for url in valid_urls:
            with self.subTest(url=url):
                self.assertTrue(is_valid_url(url))
        
        for url in invalid_urls:
            with self.subTest(url=url):
                self.assertFalse(is_valid_url(url))
    
    def test_data_completeness(self):
        """Test data completeness validation"""
        def validate_data_completeness(data, required_fields):
            """Validate that all required fields are present and non-empty"""
            missing_fields = []
            
            for field in required_fields:
                if field not in data or not data[field]:
                    missing_fields.append(field)
            
            return missing_fields
        
        test_data = {
            'company': 'Test Company',
            'email': 'test@example.com',
            'phone': '555-1234',
            'state': 'CA'
        }
        
        required_fields = ['company', 'email', 'phone', 'state', 'industry']
        missing = validate_data_completeness(test_data, required_fields)
        
        self.assertEqual(len(missing), 1)
        self.assertIn('industry', missing)


class TestDataTransformation(unittest.TestCase):
    """Test cases for data transformation functions"""
    
    def test_lead_data_transformation(self):
        """Test transforming raw data to lead format"""
        def transform_to_lead(raw_data):
            """Transform raw data to standardized lead format"""
            lead = {
                'id': str(hash(raw_data.get('Company', ''))),
                'company': raw_data.get('Company', ''),
                'contact': raw_data.get('Contact', ''),
                'email': raw_data.get('Email', ''),
                'phone': raw_data.get('Phone', ''),
                'state': raw_data.get('State', ''),
                'industry': raw_data.get('Industry', ''),
                'website': raw_data.get('Website', ''),
                'notes': raw_data.get('Notes', ''),
                'dateAdded': '2024-01-01T00:00:00.000Z',
                'lastCalled': None
            }
            return lead
        
        raw_data = {
            'Company': 'Test Company',
            'Contact': 'John Doe',
            'Email': 'john@test.com',
            'Phone': '555-1234',
            'State': 'CA',
            'Industry': 'Technology',
            'Website': 'https://test.com',
            'Notes': 'Test lead'
        }
        
        lead = transform_to_lead(raw_data)
        
        self.assertEqual(lead['company'], 'Test Company')
        self.assertEqual(lead['contact'], 'John Doe')
        self.assertEqual(lead['email'], 'john@test.com')
        self.assertIsNotNone(lead['id'])
        self.assertIsNotNone(lead['dateAdded'])
    
    def test_prospect_data_transformation(self):
        """Test transforming raw data to prospect format"""
        def transform_to_prospect(raw_data):
            """Transform raw data to standardized prospect format"""
            prospect = {
                'id': str(hash(raw_data.get('Company', ''))),
                'company': raw_data.get('Company', ''),
                'website': raw_data.get('Website', ''),
                'state': raw_data.get('State', ''),
                'service': raw_data.get('Service', ''),
                'revenue': raw_data.get('Revenue', ''),
                'employees': raw_data.get('Employees', ''),
                'contact': raw_data.get('Contact', ''),
                'email': raw_data.get('Email', ''),
                'phone': raw_data.get('Phone', ''),
                'industry': raw_data.get('Industry', ''),
                'notes': raw_data.get('Notes', ''),
                'stage': 'unreviewed',
                'decision': '',
                'dateAdded': '2024-01-01T00:00:00.000Z'
            }
            return prospect
        
        raw_data = {
            'Company': 'Prospect Company',
            'Website': 'https://prospect.com',
            'State': 'NY',
            'Service': 'CNC Machining',
            'Revenue': '$10M',
            'Employees': '50',
            'Contact': 'Jane Smith',
            'Email': 'jane@prospect.com',
            'Phone': '555-5678',
            'Industry': 'Manufacturing',
            'Notes': 'Prospect notes'
        }
        
        prospect = transform_to_prospect(raw_data)
        
        self.assertEqual(prospect['company'], 'Prospect Company')
        self.assertEqual(prospect['service'], 'CNC Machining')
        self.assertEqual(prospect['stage'], 'unreviewed')
        self.assertIsNotNone(prospect['id'])
    
    def test_data_aggregation(self):
        """Test aggregating data for statistics"""
        def aggregate_lead_data(leads):
            """Aggregate lead data for statistics"""
            stats = {
                'total_leads': len(leads),
                'states': {},
                'industries': {},
                'new_this_week': 0,
                'never_called': 0
            }
            
            one_week_ago = '2024-01-08T00:00:00.000Z'  # Mock date
            
            for lead in leads:
                # Count by state
                state = lead.get('state', 'Unknown')
                stats['states'][state] = stats['states'].get(state, 0) + 1
                
                # Count by industry
                industry = lead.get('industry', 'Unknown')
                stats['industries'][industry] = stats['industries'].get(industry, 0) + 1
                
                # Count new this week
                if lead.get('dateAdded', '') > one_week_ago:
                    stats['new_this_week'] += 1
                
                # Count never called
                if not lead.get('lastCalled'):
                    stats['never_called'] += 1
            
            return stats
        
        leads = [
            {
                'state': 'CA',
                'industry': 'Technology',
                'dateAdded': '2024-01-15T00:00:00.000Z',
                'lastCalled': None
            },
            {
                'state': 'NY',
                'industry': 'Manufacturing',
                'dateAdded': '2024-01-10T00:00:00.000Z',
                'lastCalled': '2024-01-12T00:00:00.000Z'
            },
            {
                'state': 'CA',
                'industry': 'Technology',
                'dateAdded': '2024-01-05T00:00:00.000Z',
                'lastCalled': None
            }
        ]
        
        stats = aggregate_lead_data(leads)
        
        self.assertEqual(stats['total_leads'], 3)
        self.assertEqual(stats['states']['CA'], 2)
        self.assertEqual(stats['states']['NY'], 1)
        self.assertEqual(stats['industries']['Technology'], 2)
        self.assertEqual(stats['industries']['Manufacturing'], 1)
        self.assertEqual(stats['new_this_week'], 1)
        self.assertEqual(stats['never_called'], 2)


class TestFileOperations(unittest.TestCase):
    """Test cases for file operations"""
    
    def test_csv_file_reading(self):
        """Test reading CSV files"""
        def read_csv_file(file_path):
            """Read CSV file and return data"""
            data = []
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    data.append(row)
            return data
        
        # Create temporary CSV file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            writer = csv.DictWriter(temp_file, fieldnames=['Company', 'Email', 'State'])
            writer.writeheader()
            writer.writerow({'Company': 'Test Company', 'Email': 'test@example.com', 'State': 'CA'})
            temp_file_path = temp_file.name
        
        try:
            data = read_csv_file(temp_file_path)
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]['Company'], 'Test Company')
            self.assertEqual(data[0]['Email'], 'test@example.com')
            self.assertEqual(data[0]['State'], 'CA')
        finally:
            os.unlink(temp_file_path)
    
    def test_json_file_operations(self):
        """Test JSON file operations"""
        def save_json_file(data, file_path):
            """Save data to JSON file"""
            with open(file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(data, jsonfile, indent=2)
        
        def load_json_file(file_path):
            """Load data from JSON file"""
            with open(file_path, 'r', encoding='utf-8') as jsonfile:
                return json.load(jsonfile)
        
        test_data = {
            'leads': [
                {'id': '1', 'company': 'Test Company', 'email': 'test@example.com'}
            ],
            'settings': {'callQueueDays': 7}
        }
        
        # Create temporary JSON file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            temp_file_path = temp_file.name
        
        try:
            # Save data
            save_json_file(test_data, temp_file_path)
            self.assertTrue(os.path.exists(temp_file_path))
            
            # Load data
            loaded_data = load_json_file(temp_file_path)
            self.assertEqual(loaded_data, test_data)
            self.assertEqual(len(loaded_data['leads']), 1)
            self.assertEqual(loaded_data['settings']['callQueueDays'], 7)
        finally:
            os.unlink(temp_file_path)


if __name__ == '__main__':
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_suite.addTest(unittest.makeSuite(TestCSVProcessing))
    test_suite.addTest(unittest.makeSuite(TestDataValidation))
    test_suite.addTest(unittest.makeSuite(TestDataTransformation))
    test_suite.addTest(unittest.makeSuite(TestFileOperations))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print(f"{'='*50}")
