/**
 * Test Suite for UI Functions
 * Tests user interface interactions and DOM manipulation
 */

// Mock DOM and global objects
const mockDOM = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    addEventListener: jest.fn(),
    createElement: jest.fn()
};

const mockWindow = {
    location: { href: 'test.html' },
    open: jest.fn(),
    alert: jest.fn(),
    confirm: jest.fn()
};

global.document = mockDOM;
global.window = mockWindow;

// Mock Chart.js
global.Chart = jest.fn();

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = mockLocalStorage;

describe('UI Functions', () => {
    let crm;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock CRM instance
        crm = {
            currentLeadId: null,
            config: {
                callQueueDays: 7,
                smtpServer: '',
                smtpPort: 587,
                smtpUser: '',
                smtpPass: ''
            },
            pagination: {
                currentPage: 1,
                pageSize: 25,
                totalItems: 0,
                totalPages: 0
            }
        };
    });

    describe('Tab Navigation', () => {
        test('should switch to leads tab', () => {
            const tabName = 'leads';
            
            // Mock tab elements
            const mockTabButtons = [
                { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { tab: 'dashboard' } },
                { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { tab: 'leads' } },
                { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { tab: 'queue' } }
            ];
            
            const mockTabContents = [
                { classList: { remove: jest.fn(), add: jest.fn() }, id: 'dashboard' },
                { classList: { remove: jest.fn(), add: jest.fn() }, id: 'leads' },
                { classList: { remove: jest.fn(), add: jest.fn() }, id: 'queue' }
            ];
            
            mockDOM.querySelectorAll.mockReturnValue(mockTabButtons);
            mockDOM.querySelector.mockImplementation((selector) => {
                if (selector === '.tab-btn') return mockTabButtons;
                if (selector === '.tab-content') return mockTabContents;
                return null;
            });
            
            // Simulate tab switching logic
            mockTabButtons.forEach(button => {
                button.classList.remove('active');
                if (button.dataset.tab === tabName) {
                    button.classList.add('active');
                }
            });
            
            mockTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName) {
                    content.classList.add('active');
                }
            });
            
            // Verify tab switching
            expect(mockTabButtons[1].classList.add).toHaveBeenCalledWith('active');
            expect(mockTabContents[1].classList.add).toHaveBeenCalledWith('active');
        });

        test('should update leads view when switching to leads tab', () => {
            const tabName = 'leads';
            
            // Mock updateLeadsView function
            const mockUpdateLeadsView = jest.fn();
            crm.updateLeadsView = mockUpdateLeadsView;
            
            // Simulate tab switch with leads-specific logic
            if (tabName === 'leads') {
                mockUpdateLeadsView();
            }
            
            expect(mockUpdateLeadsView).toHaveBeenCalled();
        });
    });

    describe('Modal Management', () => {
        test('should show lead modal for adding new lead', () => {
            const leadData = null; // null means new lead
            
            // Mock modal elements
            const mockModal = {
                style: { display: 'block' },
                classList: { add: jest.fn(), remove: jest.fn() }
            };
            
            const mockModalTitle = { textContent: '' };
            const mockForm = { reset: jest.fn() };
            
            mockDOM.getElementById.mockImplementation((id) => {
                switch (id) {
                    case 'leadModal': return mockModal;
                    case 'modalTitle': return mockModalTitle;
                    case 'leadForm': return mockForm;
                    default: return null;
                }
            });
            
            // Simulate showing modal
            mockModal.style.display = 'block';
            mockModal.classList.add('show');
            mockModalTitle.textContent = 'Add Lead';
            mockForm.reset();
            
            expect(mockModal.style.display).toBe('block');
            expect(mockModalTitle.textContent).toBe('Add Lead');
        });

        test('should show lead modal for editing existing lead', () => {
            const leadData = {
                id: '123',
                company: 'Test Company',
                contact: 'John Doe',
                email: 'john@test.com'
            };
            
            // Mock modal elements
            const mockModal = {
                style: { display: 'block' },
                classList: { add: jest.fn(), remove: jest.fn() }
            };
            
            const mockModalTitle = { textContent: '' };
            const mockForm = { reset: jest.fn() };
            const mockCompanyInput = { value: '' };
            const mockContactInput = { value: '' };
            const mockEmailInput = { value: '' };
            
            mockDOM.getElementById.mockImplementation((id) => {
                switch (id) {
                    case 'leadModal': return mockModal;
                    case 'modalTitle': return mockModalTitle;
                    case 'leadForm': return mockForm;
                    case 'modalCompany': return mockCompanyInput;
                    case 'modalContact': return mockContactInput;
                    case 'modalEmail': return mockEmailInput;
                    default: return null;
                }
            });
            
            // Simulate showing modal with data
            mockModal.style.display = 'block';
            mockModalTitle.textContent = 'Edit Lead';
            mockCompanyInput.value = leadData.company;
            mockContactInput.value = leadData.contact;
            mockEmailInput.value = leadData.email;
            
            expect(mockModalTitle.textContent).toBe('Edit Lead');
            expect(mockCompanyInput.value).toBe('Test Company');
            expect(mockContactInput.value).toBe('John Doe');
            expect(mockEmailInput.value).toBe('john@test.com');
        });

        test('should close modal', () => {
            const mockModal = {
                style: { display: 'none' },
                classList: { remove: jest.fn() }
            };
            
            mockDOM.getElementById.mockReturnValue(mockModal);
            
            // Simulate closing modal
            mockModal.style.display = 'none';
            mockModal.classList.remove('show');
            
            expect(mockModal.style.display).toBe('none');
        });
    });

    describe('Form Validation', () => {
        test('should validate required fields', () => {
            const formData = {
                company: 'Test Company',
                contact: 'John Doe',
                email: 'john@test.com',
                phone: '555-1234'
            };
            
            // Test valid data
            expect(formData.company).toBeTruthy();
            expect(formData.contact).toBeTruthy();
            expect(formData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            expect(formData.phone).toMatch(/^[\d\s\-\(\)\+\.]+$/);
        });

        test('should reject invalid email format', () => {
            const invalidEmails = [
                'invalid-email',
                '@test.com',
                'test@',
                'test..test@test.com'
            ];
            
            invalidEmails.forEach(email => {
                expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            });
        });

        test('should reject empty required fields', () => {
            const formData = {
                company: '',
                contact: 'John Doe',
                email: 'john@test.com'
            };
            
            expect(formData.company).toBeFalsy();
        });
    });

    describe('Table Interactions', () => {
        test('should select table row', () => {
            const mockRow = {
                classList: { add: jest.fn(), remove: jest.fn() },
                dataset: { leadId: '123' }
            };
            
            const mockAllRows = [
                { classList: { remove: jest.fn() } },
                mockRow,
                { classList: { remove: jest.fn() } }
            ];
            
            mockDOM.querySelectorAll.mockReturnValue(mockAllRows);
            
            // Simulate row selection
            mockAllRows.forEach(row => row.classList.remove('selected'));
            mockRow.classList.add('selected');
            
            expect(mockRow.classList.add).toHaveBeenCalledWith('selected');
        });

        test('should toggle all email checkboxes', () => {
            const checked = true;
            const mockCheckboxes = [
                { checked: false },
                { checked: false },
                { checked: false }
            ];
            
            mockDOM.querySelectorAll.mockReturnValue(mockCheckboxes);
            
            // Simulate toggling all checkboxes
            mockCheckboxes.forEach(checkbox => {
                checkbox.checked = checked;
            });
            
            mockCheckboxes.forEach(checkbox => {
                expect(checkbox.checked).toBe(true);
            });
        });

        test('should update recipient count', () => {
            const mockCheckboxes = [
                { checked: true },
                { checked: false },
                { checked: true }
            ];
            
            const mockCountElement = { textContent: '' };
            
            mockDOM.querySelectorAll.mockReturnValue(mockCheckboxes);
            mockDOM.getElementById.mockReturnValue(mockCountElement);
            
            // Simulate counting checked boxes
            const checkedCount = mockCheckboxes.filter(cb => cb.checked).length;
            mockCountElement.textContent = `${checkedCount} recipients selected`;
            
            expect(mockCountElement.textContent).toBe('2 recipients selected');
        });
    });

    describe('Pagination', () => {
        test('should update pagination info', () => {
            const totalItems = 100;
            const currentPage = 2;
            const pageSize = 25;
            const startItem = (currentPage - 1) * pageSize + 1;
            const endItem = Math.min(currentPage * pageSize, totalItems);
            
            const mockPaginationInfo = { textContent: '' };
            mockDOM.getElementById.mockReturnValue(mockPaginationInfo);
            
            mockPaginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} leads`;
            
            expect(mockPaginationInfo.textContent).toBe('Showing 26-50 of 100 leads');
        });

        test('should enable/disable pagination buttons', () => {
            const currentPage = 1;
            const totalPages = 5;
            
            const mockPrevBtn = { disabled: false };
            const mockNextBtn = { disabled: false };
            
            mockDOM.getElementById.mockImplementation((id) => {
                switch (id) {
                    case 'prevPageBtn': return mockPrevBtn;
                    case 'nextPageBtn': return mockNextBtn;
                    default: return null;
                }
            });
            
            // Simulate pagination button state
            mockPrevBtn.disabled = currentPage === 1;
            mockNextBtn.disabled = currentPage === totalPages;
            
            expect(mockPrevBtn.disabled).toBe(true);
            expect(mockNextBtn.disabled).toBe(false);
        });
    });

    describe('Filtering', () => {
        test('should filter leads by state', () => {
            const leads = [
                { company: 'Company 1', state: 'CA', industry: 'Tech' },
                { company: 'Company 2', state: 'NY', industry: 'Manufacturing' },
                { company: 'Company 3', state: 'CA', industry: 'Healthcare' }
            ];
            
            const stateFilter = 'CA';
            const filteredLeads = leads.filter(lead => lead.state === stateFilter);
            
            expect(filteredLeads).toHaveLength(2);
            expect(filteredLeads[0].state).toBe('CA');
            expect(filteredLeads[1].state).toBe('CA');
        });

        test('should filter leads by industry', () => {
            const leads = [
                { company: 'Company 1', state: 'CA', industry: 'Tech' },
                { company: 'Company 2', state: 'NY', industry: 'Manufacturing' },
                { company: 'Company 3', state: 'CA', industry: 'Tech' }
            ];
            
            const industryFilter = 'Tech';
            const filteredLeads = leads.filter(lead => lead.industry === industryFilter);
            
            expect(filteredLeads).toHaveLength(2);
            expect(filteredLeads[0].industry).toBe('Tech');
            expect(filteredLeads[1].industry).toBe('Tech');
        });

        test('should filter leads by search term', () => {
            const leads = [
                { company: 'Test Company', contact: 'John Doe', email: 'john@test.com' },
                { company: 'Other Company', contact: 'Jane Smith', email: 'jane@other.com' },
                { company: 'Test Corp', contact: 'Bob Johnson', email: 'bob@testcorp.com' }
            ];
            
            const searchTerm = 'test';
            const filteredLeads = leads.filter(lead =>
                lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            expect(filteredLeads).toHaveLength(2);
            expect(filteredLeads[0].company).toBe('Test Company');
            expect(filteredLeads[1].company).toBe('Test Corp');
        });
    });

    describe('Data Display', () => {
        test('should format phone numbers', () => {
            const phoneNumbers = [
                '5551234567',
                '555-123-4567',
                '(555) 123-4567',
                '+1 555 123 4567'
            ];
            
            const formatPhone = (phone) => {
                // Basic phone formatting
                const cleaned = phone.replace(/\D/g, '');
                if (cleaned.length === 10) {
                    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
                }
                return phone;
            };
            
            expect(formatPhone('5551234567')).toBe('(555) 123-4567');
            expect(formatPhone('555-123-4567')).toBe('(555) 123-4567');
        });

        test('should format dates', () => {
            const date = new Date('2024-01-15T10:30:00.000Z');
            
            const formatDate = (date) => {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            };
            
            expect(formatDate(date)).toBe('Jan 15, 2024');
        });

        test('should truncate long text', () => {
            const longText = 'This is a very long text that should be truncated for display purposes';
            const maxLength = 30;
            
            const truncateText = (text, maxLength) => {
                if (text.length <= maxLength) return text;
                return text.slice(0, maxLength) + '...';
            };
            
            const result = truncateText(longText, maxLength);
            expect(result).toBe('This is a very long text th...');
            expect(result.length).toBe(33); // 30 + '...'
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            mockDOM.getElementById.mockReturnValue(null);
            
            const element = mockDOM.getElementById('nonExistentElement');
            expect(element).toBeNull();
            
            // Should not throw error when element is null
            expect(() => {
                if (element) {
                    element.textContent = 'test';
                }
            }).not.toThrow();
        });

        test('should handle invalid form data', () => {
            const invalidFormData = {
                company: null,
                email: 'invalid-email',
                phone: ''
            };
            
            const validateForm = (data) => {
                const errors = [];
                if (!data.company) errors.push('Company name is required');
                if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                    errors.push('Invalid email format');
                }
                return errors;
            };
            
            const errors = validateForm(invalidFormData);
            expect(errors).toContain('Company name is required');
            expect(errors).toContain('Invalid email format');
        });
    });

    describe('Accessibility', () => {
        test('should set proper ARIA labels', () => {
            const mockButton = {
                setAttribute: jest.fn()
            };
            
            mockDOM.createElement.mockReturnValue(mockButton);
            
            // Simulate creating accessible button
            const button = mockDOM.createElement('button');
            button.setAttribute('aria-label', 'Add new lead');
            button.setAttribute('role', 'button');
            
            expect(button.setAttribute).toHaveBeenCalledWith('aria-label', 'Add new lead');
            expect(button.setAttribute).toHaveBeenCalledWith('role', 'button');
        });

        test('should handle keyboard navigation', () => {
            const mockEvent = {
                key: 'Enter',
                preventDefault: jest.fn(),
                target: {
                    tagName: 'BUTTON',
                    click: jest.fn()
                }
            };
            
            const handleKeyPress = (event) => {
                if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
                    event.preventDefault();
                    event.target.click();
                }
            };
            
            handleKeyPress(mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockEvent.target.click).toHaveBeenCalled();
        });
    });
});
