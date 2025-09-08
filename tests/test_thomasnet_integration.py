"""
Comprehensive Test Suite for Thomasnet Integration
Tests all functions in thomasnet-integration.py
"""

import unittest
import json
import os
import sys
import tempfile
import subprocess
from unittest.mock import patch, mock_open, MagicMock
from pathlib import Path

# Add the parent directory to the path to import the module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from thomasnet_integration import (
    run_thomasnet_scraper,
    get_available_states,
    get_available_services,
    main
)


class TestThomasnetIntegration(unittest.TestCase):
    """Test cases for Thomasnet integration functions"""

    def setUp(self):
        """Set up test fixtures before each test method"""
        self.test_state = "California"
        self.test_service = "CNC Machining"
        self.test_sort_order = "Ascending"
        self.test_max_results = 100
        self.test_delay = 2

    def tearDown(self):
        """Clean up after each test method"""
        pass

    @patch('subprocess.run')
    @patch('os.path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_run_thomasnet_scraper_success(self, mock_file, mock_exists, mock_run):
        """Test successful scraper execution"""
        # Mock subprocess result
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = "CSV saved to: /path/to/test.csv\n"
        mock_run.return_value.stderr = ""
        
        # Mock file existence
        mock_exists.return_value = True
        
        # Mock CSV content
        csv_content = "Company,Website,State,Service\nTest Company,https://test.com,CA,CNC Machining"
        mock_file.return_value.__enter__.return_value.readlines.return_value = [
            "Company,Website,State,Service\n",
            "Test Company,https://test.com,CA,CNC Machining\n"
        ]
        
        result = run_thomasnet_scraper(
            self.test_state, 
            self.test_service, 
            self.test_sort_order, 
            self.test_max_results, 
            self.test_delay
        )
        
        # Verify result
        self.assertTrue(result['success'])
        self.assertEqual(result['count'], 1)
        self.assertEqual(result['csv_file'], '/path/to/test.csv')
        self.assertEqual(len(result['prospects']), 1)
        self.assertEqual(result['prospects'][0]['company'], 'Test Company')
        
        # Verify subprocess was called correctly
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        self.assertIn('--state', call_args)
        self.assertIn(self.test_state, call_args)
        self.assertIn('--service', call_args)
        self.assertIn(self.test_service, call_args)

    @patch('subprocess.run')
    def test_run_thomasnet_scraper_scraper_not_found(self, mock_run):
        """Test scraper execution when scraper file doesn't exist"""
        with patch('pathlib.Path.exists', return_value=False):
            result = run_thomasnet_scraper(
                self.test_state, 
                self.test_service
            )
            
            self.assertIn('error', result)
            self.assertEqual(result['error'], 'Thomasnet scraper not found')

    @patch('subprocess.run')
    def test_run_thomasnet_scraper_subprocess_failure(self, mock_run):
        """Test scraper execution when subprocess fails"""
        mock_run.return_value.returncode = 1
        mock_run.return_value.stderr = "Scraper error"
        
        result = run_thomasnet_scraper(
            self.test_state, 
            self.test_service
        )
        
        self.assertIn('error', result)
        self.assertIn('Scraper failed', result['error'])

    @patch('subprocess.run')
    def test_run_thomasnet_scraper_no_csv_generated(self, mock_run):
        """Test scraper execution when no CSV is generated"""
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = "No CSV output\n"
        
        result = run_thomasnet_scraper(
            self.test_state, 
            self.test_service
        )
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'No CSV file generated')

    @patch('subprocess.run')
    @patch('os.path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_run_thomasnet_scraper_csv_parsing_error(self, mock_file, mock_exists, mock_run):
        """Test scraper execution with CSV parsing error"""
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = "CSV saved to: /path/to/test.csv\n"
        
        mock_exists.return_value = True
        mock_file.side_effect = IOError("File read error")
        
        result = run_thomasnet_scraper(
            self.test_state, 
            self.test_service
        )
        
        self.assertIn('error', result)

    @patch('builtins.open', new_callable=mock_open)
    @patch('pathlib.Path.exists')
    def test_get_available_states_success(self, mock_exists, mock_file):
        """Test successful retrieval of available states"""
        mock_exists.return_value = True
        
        # Mock constants.py content
        constants_content = '''
state_slug_map = {
    "Alabama": ("alabama", "AL"),
    "California": ("california", "CA"),
    "New York": ("new-york", "NY")
}
'''
        mock_file.return_value.__enter__.return_value.read.return_value = constants_content
        
        states = get_available_states()
        
        expected_states = ["Alabama", "California", "New York"]
        self.assertEqual(sorted(states), expected_states)

    @patch('pathlib.Path.exists')
    def test_get_available_states_file_not_found(self, mock_exists):
        """Test state retrieval when constants file doesn't exist"""
        mock_exists.return_value = False
        
        states = get_available_states()
        
        self.assertEqual(states, [])

    @patch('builtins.open', new_callable=mock_open)
    @patch('pathlib.Path.exists')
    def test_get_available_states_parse_error(self, mock_exists, mock_file):
        """Test state retrieval with file parsing error"""
        mock_exists.return_value = True
        mock_file.side_effect = IOError("File read error")
        
        with patch('sys.stderr') as mock_stderr:
            states = get_available_states()
            
            self.assertEqual(states, [])
            mock_stderr.write.assert_called()

    @patch('builtins.open', new_callable=mock_open)
    @patch('pathlib.Path.exists')
    def test_get_available_services_success(self, mock_exists, mock_file):
        """Test successful retrieval of available services"""
        mock_exists.return_value = True
        
        # Mock constants.py content
        constants_content = '''
service_slug_map = {
    "CNC Machining": "cnc-machining",
    "Robotic Welding": "robotic-welding",
    "Precision Grinding": "precision-grinding"
}
'''
        mock_file.return_value.__enter__.return_value.read.return_value = constants_content
        
        services = get_available_services()
        
        expected_services = ["CNC Machining", "Precision Grinding", "Robotic Welding"]
        self.assertEqual(sorted(services), expected_services)

    @patch('pathlib.Path.exists')
    def test_get_available_services_file_not_found(self, mock_exists):
        """Test service retrieval when constants file doesn't exist"""
        mock_exists.return_value = False
        
        services = get_available_services()
        
        self.assertEqual(services, [])

    @patch('builtins.open', new_callable=mock_open)
    @patch('pathlib.Path.exists')
    def test_get_available_services_parse_error(self, mock_exists, mock_file):
        """Test service retrieval with file parsing error"""
        mock_exists.return_value = True
        mock_file.side_effect = IOError("File read error")
        
        with patch('sys.stderr') as mock_stderr:
            services = get_available_services()
            
            self.assertEqual(services, [])
            mock_stderr.write.assert_called()

    @patch('sys.argv', ['thomasnet_integration.py', 'scrape', 'California', 'CNC Machining'])
    @patch('run_thomasnet_scraper')
    @patch('builtins.print')
    def test_main_scrape_command(self, mock_print, mock_scraper):
        """Test main function with scrape command"""
        mock_scraper.return_value = {"success": True, "prospects": []}
        
        main()
        
        mock_scraper.assert_called_once_with('California', 'CNC Machining', 'Ascending', 100, 2)
        mock_print.assert_called_once()

    @patch('sys.argv', ['thomasnet_integration.py', 'scrape', 'California', 'CNC Machining', 'Descending', '50', '3'])
    @patch('run_thomasnet_scraper')
    @patch('builtins.print')
    def test_main_scrape_command_with_options(self, mock_print, mock_scraper):
        """Test main function with scrape command and all options"""
        mock_scraper.return_value = {"success": True, "prospects": []}
        
        main()
        
        mock_scraper.assert_called_once_with('California', 'CNC Machining', 'Descending', 50, 3)
        mock_print.assert_called_once()

    @patch('sys.argv', ['thomasnet_integration.py', 'states'])
    @patch('get_available_states')
    @patch('builtins.print')
    def test_main_states_command(self, mock_print, mock_states):
        """Test main function with states command"""
        mock_states.return_value = ['Alabama', 'California', 'New York']
        
        main()
        
        mock_states.assert_called_once()
        mock_print.assert_called_once()

    @patch('sys.argv', ['thomasnet_integration.py', 'services'])
    @patch('get_available_services')
    @patch('builtins.print')
    def test_main_services_command(self, mock_print, mock_services):
        """Test main function with services command"""
        mock_services.return_value = ['CNC Machining', 'Robotic Welding']
        
        main()
        
        mock_services.assert_called_once()
        mock_print.assert_called_once()

    @patch('sys.argv', ['thomasnet_integration.py'])
    @patch('builtins.print')
    def test_main_no_command(self, mock_print):
        """Test main function with no command"""
        main()
        
        expected_output = json.dumps({"error": "No command specified"})
        mock_print.assert_called_once_with(expected_output)

    @patch('sys.argv', ['thomasnet_integration.py', 'scrape', 'California'])
    @patch('builtins.print')
    def test_main_scrape_insufficient_args(self, mock_print):
        """Test main function with scrape command but insufficient arguments"""
        main()
        
        expected_output = json.dumps({"error": "Missing required arguments: state service"})
        mock_print.assert_called_once_with(expected_output)

    @patch('sys.argv', ['thomasnet_integration.py', 'unknown'])
    @patch('builtins.print')
    def test_main_unknown_command(self, mock_print):
        """Test main function with unknown command"""
        main()
        
        expected_output = json.dumps({"error": "Unknown command: unknown"})
        mock_print.assert_called_once_with(expected_output)

    def test_csv_parsing_with_various_formats(self):
        """Test CSV parsing with different data formats"""
        test_csv_content = [
            "Company,Website,State,Service,Revenue,Employees\n",
            "Test Company 1,https://test1.com,CA,CNC Machining,$10M,50\n",
            "Test Company 2,https://test2.com,NY,Robotic Welding,$5M,25\n",
            "Test Company 3,https://test3.com,TX,Precision Grinding,$15M,100\n"
        ]
        
        with patch('subprocess.run') as mock_run, \
             patch('os.path.exists', return_value=True), \
             patch('builtins.open', mock_open(read_data=''.join(test_csv_content))):
            
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "CSV saved to: /path/to/test.csv\n"
            
            result = run_thomasnet_scraper("California", "CNC Machining")
            
            self.assertTrue(result['success'])
            self.assertEqual(result['count'], 3)
            self.assertEqual(len(result['prospects']), 3)
            
            # Check first prospect
            prospect1 = result['prospects'][0]
            self.assertEqual(prospect1['company'], 'Test Company 1')
            self.assertEqual(prospect1['website'], 'https://test1.com')
            self.assertEqual(prospect1['state'], 'CA')
            self.assertEqual(prospect1['service'], 'CNC Machining')
            self.assertEqual(prospect1['revenue'], '$10M')
            self.assertEqual(prospect1['employees'], '50')

    def test_csv_parsing_with_empty_lines(self):
        """Test CSV parsing with empty lines"""
        test_csv_content = [
            "Company,Website,State,Service\n",
            "Test Company,https://test.com,CA,CNC Machining\n",
            "\n",  # Empty line
            "Another Company,https://another.com,NY,Robotic Welding\n",
            "\n"   # Empty line
        ]
        
        with patch('subprocess.run') as mock_run, \
             patch('os.path.exists', return_value=True), \
             patch('builtins.open', mock_open(read_data=''.join(test_csv_content))):
            
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "CSV saved to: /path/to/test.csv\n"
            
            result = run_thomasnet_scraper("California", "CNC Machining")
            
            self.assertTrue(result['success'])
            self.assertEqual(result['count'], 2)
            self.assertEqual(len(result['prospects']), 2)

    def test_csv_parsing_with_missing_headers(self):
        """Test CSV parsing when no data rows exist"""
        test_csv_content = [
            "Company,Website,State,Service\n"
        ]
        
        with patch('subprocess.run') as mock_run, \
             patch('os.path.exists', return_value=True), \
             patch('builtins.open', mock_open(read_data=''.join(test_csv_content))):
            
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "CSV saved to: /path/to/test.csv\n"
            
            result = run_thomasnet_scraper("California", "CNC Machining")
            
            self.assertTrue(result['success'])
            self.assertEqual(result['count'], 0)
            self.assertEqual(len(result['prospects']), 0)


if __name__ == '__main__':
    # Create a test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestThomasnetIntegration)
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print(f"{'='*50}")
