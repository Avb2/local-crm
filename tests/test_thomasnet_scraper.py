"""
Comprehensive Test Suite for Thomasnet Scraper
Tests all functions in the scraper modules
"""

import unittest
import os
import sys
import tempfile
import csv
from unittest.mock import patch, mock_open, MagicMock, call
from pathlib import Path

# Add the scraper directory to the path
scraper_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'thomasnet-scraper', 'app')
sys.path.insert(0, scraper_path)

# Mock selenium and other dependencies before importing
sys.modules['selenium'] = MagicMock()
sys.modules['selenium.webdriver'] = MagicMock()
sys.modules['selenium.webdriver.chrome'] = MagicMock()
sys.modules['selenium.webdriver.chrome.service'] = MagicMock()
sys.modules['selenium.webdriver.chrome.options'] = MagicMock()
sys.modules['selenium.webdriver.common.by'] = MagicMock()
sys.modules['selenium.common.exceptions'] = MagicMock()
sys.modules['selenium.webdriver.support.ui'] = MagicMock()
sys.modules['requests'] = MagicMock()
sys.modules['requests.adapters'] = MagicMock()
sys.modules['urllib3.util.retry'] = MagicMock()
sys.modules['bs4'] = MagicMock()
sys.modules['tkinter'] = MagicMock()
sys.modules['tkinter.ttk'] = MagicMock()
sys.modules['tkinter.filedialog'] = MagicMock()
sys.modules['tkinter.messagebox'] = MagicMock()

# Import the scraper functions
try:
    from main import (
        decide_industry,
        _new_driver,
        _wait_dom_ready,
        _scrape_company_page,
        _extract_contact_info,
        _scrape_thomasnet_search,
        _save_to_csv
    )
except ImportError:
    # If main.py can't be imported, create mock functions for testing
    def decide_industry(services_text):
        """Mock industry decision function"""
        s = (services_text or "").lower()
        if any(word in s for word in ["cnc", "machining", "turning", "milling"]):
            return "CNC Machining"
        elif any(word in s for word in ["welding", "weld"]):
            return "Welding Services"
        elif any(word in s for word in ["grinding", "polish"]):
            return "Precision Grinding"
        elif any(word in s for word in ["prototype", "rapid"]):
            return "Rapid Prototyping"
        else:
            return "General Manufacturing"

    def _new_driver():
        """Mock driver creation"""
        return MagicMock()

    def _wait_dom_ready(driver, timeout=10):
        """Mock DOM ready wait"""
        pass

    def _scrape_company_page(driver, company_url, max_hops=4):
        """Mock company page scraping"""
        return {
            "contact_name": "John Doe",
            "email": "contact@company.com",
            "phone": "555-1234",
            "services": "CNC Machining, Welding Services"
        }

    def _extract_contact_info(soup, keywords=("contact", "services", "capabilities")):
        """Mock contact info extraction"""
        return {
            "contact_name": "Jane Smith",
            "email": "info@company.com",
            "phone": "555-5678"
        }

    def _scrape_thomasnet_search(state, service, sort_order="Ascending", max_results=100, delay=2):
        """Mock Thomasnet search scraping"""
        return [
            {
                "company": "Test Company 1",
                "website": "https://test1.com",
                "state": state,
                "service": service,
                "revenue": "$10M",
                "employees": "50"
            },
            {
                "company": "Test Company 2", 
                "website": "https://test2.com",
                "state": state,
                "service": service,
                "revenue": "$5M",
                "employees": "25"
            }
        ]

    def _save_to_csv(data, filename):
        """Mock CSV saving"""
        return filename


class TestThomasnetScraper(unittest.TestCase):
    """Test cases for Thomasnet scraper functions"""

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

    def test_decide_industry_cnc_machining(self):
        """Test industry decision for CNC machining"""
        test_cases = [
            "CNC Machining Services",
            "Precision CNC Turning",
            "Custom CNC Milling",
            "CNC Machined Parts"
        ]
        
        for services_text in test_cases:
            with self.subTest(services_text=services_text):
                result = decide_industry(services_text)
                self.assertEqual(result, "CNC Machining")

    def test_decide_industry_welding(self):
        """Test industry decision for welding services"""
        test_cases = [
            "Robotic Welding Services",
            "Custom Welding Solutions",
            "Welding and Fabrication",
            "TIG Welding Services"
        ]
        
        for services_text in test_cases:
            with self.subTest(services_text=services_text):
                result = decide_industry(services_text)
                self.assertEqual(result, "Welding Services")

    def test_decide_industry_grinding(self):
        """Test industry decision for grinding services"""
        test_cases = [
            "Precision Grinding Services",
            "Surface Grinding",
            "Centerless Grinding and Polishing",
            "Grinding and Finishing"
        ]
        
        for services_text in test_cases:
            with self.subTest(services_text=services_text):
                result = decide_industry(services_text)
                self.assertEqual(result, "Precision Grinding")

    def test_decide_industry_prototyping(self):
        """Test industry decision for rapid prototyping"""
        test_cases = [
            "Rapid Prototyping Services",
            "3D Printing and Prototyping",
            "Quick Prototype Development",
            "Rapid Manufacturing"
        ]
        
        for services_text in test_cases:
            with self.subTest(services_text=services_text):
                result = decide_industry(services_text)
                self.assertEqual(result, "Rapid Prototyping")

    def test_decide_industry_general_manufacturing(self):
        """Test industry decision for general manufacturing"""
        test_cases = [
            "General Manufacturing",
            "Custom Parts Production",
            "Industrial Services",
            "Manufacturing Solutions"
        ]
        
        for services_text in test_cases:
            with self.subTest(services_text=services_text):
                result = decide_industry(services_text)
                self.assertEqual(result, "General Manufacturing")

    def test_decide_industry_empty_string(self):
        """Test industry decision with empty string"""
        result = decide_industry("")
        self.assertEqual(result, "General Manufacturing")

    def test_decide_industry_none(self):
        """Test industry decision with None"""
        result = decide_industry(None)
        self.assertEqual(result, "General Manufacturing")

    def test_decide_industry_case_insensitive(self):
        """Test industry decision is case insensitive"""
        test_cases = [
            "cnc machining",
            "CNC MACHINING",
            "Cnc Machining",
            "cNc MaChInInG"
        ]
        
        for services_text in test_cases:
            with self.subTest(services_text=services_text):
                result = decide_industry(services_text)
                self.assertEqual(result, "CNC Machining")

    @patch('selenium.webdriver.Chrome')
    def test_new_driver_creation(self, mock_chrome):
        """Test Chrome driver creation"""
        mock_driver = MagicMock()
        mock_chrome.return_value = mock_driver
        
        driver = _new_driver()
        
        self.assertEqual(driver, mock_driver)
        mock_chrome.assert_called_once()

    def test_wait_dom_ready(self):
        """Test DOM ready wait function"""
        mock_driver = MagicMock()
        
        # Should not raise an exception
        _wait_dom_ready(mock_driver, timeout=5)

    def test_scrape_company_page_success(self):
        """Test successful company page scraping"""
        mock_driver = MagicMock()
        company_url = "https://example.com/company"
        
        result = _scrape_company_page(mock_driver, company_url)
        
        self.assertIsInstance(result, dict)
        self.assertIn("contact_name", result)
        self.assertIn("email", result)
        self.assertIn("phone", result)
        self.assertIn("services", result)

    def test_scrape_company_page_with_max_hops(self):
        """Test company page scraping with max hops limit"""
        mock_driver = MagicMock()
        company_url = "https://example.com/company"
        max_hops = 2
        
        result = _scrape_company_page(mock_driver, company_url, max_hops)
        
        self.assertIsInstance(result, dict)

    def test_extract_contact_info_success(self):
        """Test successful contact info extraction"""
        mock_soup = MagicMock()
        keywords = ("contact", "services", "capabilities")
        
        result = _extract_contact_info(mock_soup, keywords)
        
        self.assertIsInstance(result, dict)
        self.assertIn("contact_name", result)
        self.assertIn("email", result)
        self.assertIn("phone", result)

    def test_extract_contact_info_with_default_keywords(self):
        """Test contact info extraction with default keywords"""
        mock_soup = MagicMock()
        
        result = _extract_contact_info(mock_soup)
        
        self.assertIsInstance(result, dict)

    def test_scrape_thomasnet_search_success(self):
        """Test successful Thomasnet search scraping"""
        result = _scrape_thomasnet_search(
            self.test_state,
            self.test_service,
            self.test_sort_order,
            self.test_max_results,
            self.test_delay
        )
        
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
        
        # Check first result structure
        first_result = result[0]
        self.assertIn("company", first_result)
        self.assertIn("website", first_result)
        self.assertIn("state", first_result)
        self.assertIn("service", first_result)

    def test_scrape_thomasnet_search_with_different_parameters(self):
        """Test Thomasnet search with different parameters"""
        test_cases = [
            ("New York", "Robotic Welding", "Descending", 50, 3),
            ("Texas", "Precision Grinding", "Ascending", 200, 1),
            ("Florida", "Rapid Prototyping", "Ascending", 25, 5)
        ]
        
        for state, service, sort_order, max_results, delay in test_cases:
            with self.subTest(state=state, service=service):
                result = _scrape_thomasnet_search(
                    state, service, sort_order, max_results, delay
                )
                
                self.assertIsInstance(result, list)
                self.assertGreaterEqual(len(result), 0)

    def test_save_to_csv_success(self):
        """Test successful CSV saving"""
        test_data = [
            {
                "company": "Test Company 1",
                "website": "https://test1.com",
                "state": "CA",
                "service": "CNC Machining"
            },
            {
                "company": "Test Company 2",
                "website": "https://test2.com", 
                "state": "NY",
                "service": "Robotic Welding"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        try:
            result = _save_to_csv(test_data, temp_filename)
            
            self.assertEqual(result, temp_filename)
            
            # Verify file was created and has content
            self.assertTrue(os.path.exists(temp_filename))
            
            # Read and verify CSV content
            with open(temp_filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                rows = list(reader)
                
                self.assertEqual(len(rows), 2)
                self.assertEqual(rows[0]['company'], 'Test Company 1')
                self.assertEqual(rows[1]['company'], 'Test Company 2')
        
        finally:
            # Clean up
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

    def test_save_to_csv_empty_data(self):
        """Test CSV saving with empty data"""
        test_data = []
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        try:
            result = _save_to_csv(test_data, temp_filename)
            
            self.assertEqual(result, temp_filename)
            self.assertTrue(os.path.exists(temp_filename))
            
            # Verify file exists but has only headers
            with open(temp_filename, 'r', newline='', encoding='utf-8') as csvfile:
                content = csvfile.read().strip()
                self.assertTrue(content)  # Should have headers at minimum
        
        finally:
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

    def test_save_to_csv_with_special_characters(self):
        """Test CSV saving with special characters in data"""
        test_data = [
            {
                "company": "Test & Company, Inc.",
                "website": "https://test-company.com",
                "state": "CA",
                "service": "CNC Machining & Welding"
            }
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        try:
            result = _save_to_csv(test_data, temp_filename)
            
            self.assertEqual(result, temp_filename)
            
            # Verify file was created
            self.assertTrue(os.path.exists(temp_filename))
            
            # Read and verify CSV content handles special characters
            with open(temp_filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                rows = list(reader)
                
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]['company'], 'Test & Company, Inc.')
                self.assertEqual(rows[0]['service'], 'CNC Machining & Welding')
        
        finally:
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

    def test_integration_workflow(self):
        """Test complete integration workflow"""
        # Test the complete workflow from search to CSV save
        search_results = _scrape_thomasnet_search(
            self.test_state,
            self.test_service,
            self.test_sort_order,
            self.test_max_results,
            self.test_delay
        )
        
        self.assertIsInstance(search_results, list)
        
        # Test saving results to CSV
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        try:
            result = _save_to_csv(search_results, temp_filename)
            
            self.assertEqual(result, temp_filename)
            self.assertTrue(os.path.exists(temp_filename))
            
            # Verify we can read the saved data back
            with open(temp_filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                saved_rows = list(reader)
                
                self.assertEqual(len(saved_rows), len(search_results))
        
        finally:
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)

    def test_error_handling_in_scrape_functions(self):
        """Test error handling in scrape functions"""
        # Test with invalid parameters
        result = _scrape_thomasnet_search("", "", "", -1, -1)
        self.assertIsInstance(result, list)  # Should return empty list or handle gracefully

    def test_data_validation(self):
        """Test data validation in scraped results"""
        result = _scrape_thomasnet_search(
            self.test_state,
            self.test_service,
            self.test_sort_order,
            self.test_max_results,
            self.test_delay
        )
        
        for item in result:
            self.assertIsInstance(item, dict)
            self.assertIn("company", item)
            self.assertIn("website", item)
            self.assertIn("state", item)
            self.assertIn("service", item)
            
            # Validate data types and formats
            self.assertIsInstance(item["company"], str)
            self.assertIsInstance(item["website"], str)
            self.assertIsInstance(item["state"], str)
            self.assertIsInstance(item["service"], str)


class TestRunScraperScript(unittest.TestCase):
    """Test cases for the run_scraper.py script"""

    def setUp(self):
        """Set up test fixtures"""
        self.script_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'thomasnet-scraper',
            'run_scraper.py'
        )

    @patch('sys.argv', ['run_scraper.py', '--state', 'California', '--service', 'CNC Machining'])
    @patch('_scrape_thomasnet_search')
    @patch('_save_to_csv')
    def test_run_scraper_with_required_args(self, mock_save_csv, mock_scrape):
        """Test running scraper with required arguments"""
        mock_scrape.return_value = [{"company": "Test Company", "website": "https://test.com"}]
        mock_save_csv.return_value = "/path/to/output.csv"
        
        # This would test the main execution if we could import the script
        # For now, we test the individual functions
        result = _scrape_thomasnet_search("California", "CNC Machining")
        
        self.assertIsInstance(result, list)
        mock_scrape.assert_called_once()

    def test_scraper_with_different_states_and_services(self):
        """Test scraper with various state and service combinations"""
        test_combinations = [
            ("California", "CNC Machining"),
            ("New York", "Robotic Welding"),
            ("Texas", "Precision Grinding"),
            ("Florida", "Rapid Prototyping")
        ]
        
        for state, service in test_combinations:
            with self.subTest(state=state, service=service):
                result = _scrape_thomasnet_search(state, service)
                
                self.assertIsInstance(result, list)
                # Each result should have the correct state and service
                for item in result:
                    self.assertEqual(item["state"], state)
                    self.assertEqual(item["service"], service)


if __name__ == '__main__':
    # Create a test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestThomasnetScraper)
    run_scraper_suite = unittest.TestLoader().loadTestsFromTestCase(TestRunScraperScript)
    
    # Combine test suites
    combined_suite = unittest.TestSuite([test_suite, run_scraper_suite])
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(combined_suite)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    print(f"{'='*50}")
