# Sales CRM v1.0.1 - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [User Interface](#user-interface)
6. [Data Management](#data-management)
7. [Prospecting System](#prospecting-system)
8. [Call Mode](#call-mode)
9. [Script Management](#script-management)
10. [Thomasnet Integration](#thomasnet-integration)
11. [API Reference](#api-reference)
12. [Troubleshooting](#troubleshooting)
13. [Development](#development)

---

## Overview

**Sales CRM v1.0.1** is a comprehensive Chrome extension-based Customer Relationship Management system designed for sales teams. It features lead management, prospecting capabilities, call mode functionality, and integration with Thomasnet for automated lead generation.

### Key Capabilities
- **Lead Management**: Complete CRUD operations for sales leads
- **Prospecting Pipeline**: 3-stage workflow (Unreviewed → Finalized → Unqualified)
- **Call Mode**: Streamlined calling interface with scripts and notes
- **Thomasnet Integration**: Automated scraping of manufacturing companies
- **Data Import/Export**: CSV support for bulk operations
- **Analytics**: Real-time dashboards and reporting

---

## System Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB (client-side database)
- **Extension**: Chrome Extension Manifest V3
- **Backend**: Python Flask server (for Thomasnet scraping)
- **Scraping**: Selenium WebDriver with Chrome

### File Structure
```
custom_crm/
├── manifest.json              # Chrome extension manifest
├── popup.html                 # Main UI interface
├── app.js                     # Core application logic
├── styles.css                 # Styling and responsive design
├── background.js              # Extension background script
├── thomasnet-server.py        # Python Flask server for scraping
├── thomasnet-scraper/         # Scraping module
│   ├── run_scraper.py         # Command-line scraper
│   └── app/                   # Original scraper code
├── requirements.txt           # Python dependencies
├── start-scraper.sh          # Server startup script
└── docs/                     # Documentation files
```

### Data Flow
1. **User Input** → **UI Layer** (popup.html)
2. **Business Logic** → **App Layer** (app.js)
3. **Data Persistence** → **IndexedDB** (client-side)
4. **External Data** → **Python Server** → **Scraper** → **CRM**

---

## Features

### 1. Lead Management
- **Add/Edit/Delete Leads**: Full CRUD operations
- **Lead Status Tracking**: Prospect, Qualified, Unqualified, Converted
- **Queue Management**: Custom queues for lead organization
- **Search & Filter**: Advanced filtering by multiple criteria
- **Bulk Operations**: Mass updates and deletions

### 2. Prospecting System
- **3-Stage Pipeline**: Unreviewed → Finalized → Unqualified
- **Thomasnet Integration**: Automated company scraping
- **CSV Import/Export**: Bulk data operations
- **Review Interface**: Streamlined prospect evaluation
- **Bulk Actions**: Mass approve/reject/delete operations

### 3. Call Mode
- **Streamlined Interface**: Focused calling environment
- **Script Management**: Customizable call scripts
- **Call Logging**: Track call outcomes and notes
- **Keyboard Shortcuts**: Efficient navigation
- **Analytics**: Call statistics and success rates

### 4. Analytics & Reporting
- **Real-time Dashboards**: Live data visualization
- **Lead Analytics**: Comprehensive lead metrics
- **Call Statistics**: Performance tracking
- **Export Capabilities**: Data export in multiple formats

---

## Installation & Setup

### Prerequisites
- Chrome browser (latest version)
- Python 3.7+ (for Thomasnet scraping)
- Internet connection (for scraping functionality)

### Chrome Extension Setup
1. **Load Extension**:
   - Open Chrome → Extensions → Developer mode
   - Click "Load unpacked" → Select `custom_crm` folder
   - Pin extension to toolbar

2. **Permissions**:
   - Storage access (for IndexedDB)
   - Active tab access (for call mode)
   - Host permissions for Thomasnet

### Python Server Setup
1. **Install Dependencies**:
   ```bash
   cd /path/to/custom_crm
   pip3 install -r requirements.txt
   ```

2. **Start Server**:
   ```bash
   # Option 1: Use startup script
   ./start-scraper.sh
   
   # Option 2: Manual start
   python3 thomasnet-server.py 8080
   ```

3. **Verify Installation**:
   ```bash
   curl http://localhost:8080/health
   # Should return: {"status": "ok"}
   ```

---

## User Interface

### Main Navigation
The CRM features a tab-based navigation system:

#### 1. Dashboard Tab
- **Lead Analytics Widget**: Total leads, new this week, queue status
- **Quick Actions**: Add lead, import data, run scraper
- **Recent Activity**: Latest lead updates and call logs
- **Performance Metrics**: Key performance indicators

#### 2. Leads Tab
- **Lead Table**: Sortable, filterable lead list
- **Search Bar**: Real-time search across all fields
- **Filter Controls**: Status, queue, industry, state filters
- **Bulk Actions**: Select multiple leads for batch operations
- **Pagination**: Handle large datasets efficiently

#### 3. Prospecting Tab
- **Scraper Configuration**: Thomasnet scraping parameters
- **Pipeline Overview**: 3-stage prospect pipeline
- **Prospect Table**: Manage scraped prospects
- **Review Interface**: Evaluate and categorize prospects

#### 4. Call Mode Tab
- **Call Interface**: Streamlined calling environment
- **Script Selector**: Choose from available call scripts
- **Notes Section**: Real-time note taking
- **Call Logging**: Record call outcomes

### Responsive Design
- **Mobile-First**: Optimized for various screen sizes
- **Touch-Friendly**: Large buttons and touch targets
- **Adaptive Layout**: Adjusts to different viewport sizes
- **Accessibility**: Keyboard navigation and screen reader support

---

## Data Management

### IndexedDB Schema

#### Leads Store
```javascript
{
  id: Number,              // Auto-increment primary key
  company: String,         // Company name
  contact: String,         // Contact person
  phone: String,           // Phone number
  email: String,           // Email address
  website: String,         // Company website
  state: String,           // State/Province
  industry: String,        // Industry sector
  source: String,          // Lead source
  status: String,          // Lead status
  queue: String,           // Queue assignment
  lastCalled: Date,        // Last call date
  callOutcome: String,     // Last call result
  notes: String,           // Additional notes
  dateAdded: Date,         // Creation timestamp
  dateModified: Date       // Last modification
}
```

#### Prospects Store
```javascript
{
  id: Number,              // Auto-increment primary key
  company: String,         // Company name
  website: String,         // Company website
  state: String,           // State/Province
  service: String,         // Service type
  revenue: String,         // Revenue information
  employees: String,       // Employee count
  contact: String,         // Contact person
  email: String,           // Email address
  phone: String,           // Phone number
  industry: String,        // Industry sector
  notes: String,           // Additional notes
  stage: String,           // Pipeline stage
  dateAdded: Date,         // Creation timestamp
  dateModified: Date       // Last modification
}
```

#### Call Logs Store
```javascript
{
  id: String,              // Unique identifier
  leadId: Number,          // Associated lead ID
  leadName: String,        // Lead company name
  outcome: String,         // Call outcome
  notes: String,           // Call notes
  followUpDate: Date,      // Follow-up date
  nextAction: String,      // Next action required
  timestamp: Date,         // Call timestamp
  duration: Number         // Call duration (seconds)
}
```

### Data Operations

#### CRUD Operations
```javascript
// Create
await crm.addLead(leadData);

// Read
const leads = await crm.getAllLeads();
const lead = await crm.getLeadById(id);

// Update
await crm.updateLead(id, updatedData);

// Delete
await crm.deleteLead(id);
```

#### Bulk Operations
```javascript
// Bulk update
await crm.bulkUpdateLeads(selectedIds, updateData);

// Bulk delete
await crm.bulkDeleteLeads(selectedIds);

// Bulk import
await crm.importLeads(csvData);
```

---

## Prospecting System

### Pipeline Stages

#### 1. Unreviewed
- **Purpose**: New prospects awaiting review
- **Actions**: Review, approve, reject, delete
- **Bulk Operations**: Mass approve/reject/delete

#### 2. Finalized
- **Purpose**: Approved prospects ready for CRM import
- **Actions**: Import to leads, delete, export
- **Integration**: Automatic lead creation

#### 3. Unqualified
- **Purpose**: Rejected prospects
- **Actions**: Delete, export for analysis
- **Retention**: Keep for future reference

### Thomasnet Integration

#### Scraper Configuration
```javascript
{
  state: "California",           // Target state
  service: "CNC Machining",      // Service type
  sortOrder: "Ascending",        // Sort order
  maxResults: 100,              // Maximum results
  delay: 2000                   // Delay between requests
}
```

#### Scraping Process
1. **Server Request**: CRM sends parameters to Python server
2. **Web Scraping**: Selenium scrapes Thomasnet website
3. **Data Extraction**: Company info, contact details, descriptions
4. **Data Processing**: Clean and format scraped data
5. **CRM Integration**: Import prospects to unreviewed stage

#### Supported Services
- CNC Machining
- Welding Services
- Metal Finishing
- Precision Grinding
- Additive Manufacturing
- And 20+ other manufacturing services

### CSV Import/Export

#### Import Format
```csv
Lead,State,Website,Phones,Status,Reason
"ABC Manufacturing","CA","https://abc.com","(555) 123-4567","Prospect",""
```

#### Export Options
- **Leads Export**: All lead data with current filters
- **Prospects Export**: Scraped prospect data
- **Call Logs Export**: Call history and outcomes
- **Custom Export**: User-defined field selection

---

## Call Mode

### Interface Overview
Call Mode provides a distraction-free environment for making sales calls:

#### Key Components
- **Lead Display**: Current lead information
- **Script Panel**: Active call script
- **Notes Section**: Real-time note taking
- **Call Actions**: Call, copy phone, visit website
- **Navigation**: Next/previous/random lead selection

#### Keyboard Shortcuts
- `Escape`: Exit call mode
- `→` (Right Arrow): Next lead
- `←` (Left Arrow): Previous lead
- `Space`: Initiate call
- `Ctrl+C`: Copy phone number
- `Ctrl+R`: Random lead

### Call Scripts

#### Default Scripts
1. **Cold Call - Basic**: Standard cold calling approach
2. **Follow Up - Standard**: Follow-up conversation template
3. **Objection - Budget**: Handle budget concerns
4. **Closing - Soft Close**: Gentle closing approach

#### Script Management
- **Create Custom Scripts**: Add your own call scripts
- **Categorize Scripts**: Organize by type (cold-call, follow-up, etc.)
- **Edit Scripts**: Modify existing scripts
- **Copy Scripts**: Quick copy to clipboard

#### Script Format
```javascript
{
  id: "script-id",
  name: "Script Name",
  type: "cold-call",
  content: "Script content with [placeholders]",
  tags: ["tag1", "tag2"],
  dateCreated: "2024-01-01T00:00:00Z",
  dateModified: "2024-01-01T00:00:00Z"
}
```

### Call Logging

#### Call Outcomes
- **Meeting Set**: Successful meeting scheduled
- **Follow Up**: Requires follow-up call
- **Not Interested**: Lead not interested
- **Wrong Number**: Invalid contact information
- **Voicemail**: Left voicemail message
- **No Answer**: No response to call

#### Follow-up Management
- **Follow-up Dates**: Schedule future calls
- **Next Actions**: Define required actions
- **Notes**: Detailed call notes
- **Outcome Tracking**: Monitor call success rates

---

## Script Management

### Script Types
1. **Cold Call**: Initial outreach scripts
2. **Follow Up**: Follow-up conversation templates
3. **Objection Handling**: Address common objections
4. **Closing**: Closing conversation scripts

### Script Editor Features
- **Rich Text Editing**: Format script content
- **Placeholder Support**: Dynamic content insertion
- **Tag System**: Organize and categorize scripts
- **Version Control**: Track script modifications
- **Import/Export**: Share scripts between users

### Placeholder Variables
- `[Name]`: Contact person's name
- `[Company]`: Your company name
- `[Company Name]`: Lead's company name
- `[Service/Product]`: Your service or product
- `[Industry]`: Lead's industry
- `[Date/Time]`: Previous interaction date

---

## Thomasnet Integration

### Server Architecture

#### Flask Server (thomasnet-server.py)
```python
# Endpoints
GET  /health              # Health check
POST /scrape              # Scrape Thomasnet data
```

#### Request Format
```json
{
  "state": "California",
  "service": "CNC Machining",
  "sort_order": "Ascending",
  "max_results": 100,
  "delay": 2000
}
```

#### Response Format
```json
[
  {
    "company": "ABC Manufacturing Inc.",
    "website": "https://www.abc.com",
    "state": "CA",
    "service": "CNC Machining",
    "phone": "(555) 123-4567",
    "notes": "Company description..."
  }
]
```

### Scraping Process

#### 1. URL Construction
```python
url = f"https://www.thomasnet.com/suppliers/usa/{service_slug}"
```

#### 2. Page Navigation
- Open Thomasnet search results
- Wait for page load
- Extract company listings
- Navigate through pagination

#### 3. Data Extraction
- Company names
- Website URLs
- Contact information
- Business descriptions
- Service categories

#### 4. Data Processing
- Clean and normalize data
- Validate contact information
- Format for CRM import
- Remove duplicates

### Error Handling
- **Network Errors**: Retry with exponential backoff
- **Rate Limiting**: Respect website limits
- **Data Validation**: Ensure data quality
- **Fallback Mechanisms**: Graceful degradation

---

## API Reference

### Core Methods

#### Lead Management
```javascript
// Add new lead
async addLead(leadData)

// Get all leads
async getAllLeads()

// Get lead by ID
async getLeadById(id)

// Update lead
async updateLead(id, data)

// Delete lead
async deleteLead(id)

// Search leads
async searchLeads(query, filters)
```

#### Prospecting
```javascript
// Get prospects
async getProspects()

// Add prospect
async addProspect(prospectData)

// Update prospect stage
async updateProspectStage(id, stage)

// Bulk approve prospects
async bulkApproveProspects(ids)

// Import prospects from CSV
async importProspects(csvData)
```

#### Call Mode
```javascript
// Enter call mode
async enterCallMode()

// Exit call mode
exitCallMode()

// Next lead
callModeNextLead()

// Previous lead
callModePreviousLead()

// Log call
async saveCallCompletion(callData)
```

#### Script Management
```javascript
// Load scripts
async loadScripts()

// Save script
async saveScript(scriptData)

// Delete script
async deleteScript(id)

// Select script
selectScript(scriptId)
```

### Storage Methods

#### IndexedDB Operations
```javascript
// Save to storage
async saveToStorage(storeName, data)

// Get from storage
async getFromStorage(storeName)

// Clear storage
async clearStorage(storeName)
```

#### CSV Operations
```javascript
// Parse CSV
parseCSV(csvData)

// Convert to CSV
convertToCSV(data)

// Export CSV
exportCSV(data, filename)
```

---

## Troubleshooting

### Common Issues

#### 1. Extension Not Loading
**Symptoms**: Extension doesn't appear in Chrome
**Solutions**:
- Check manifest.json syntax
- Verify file permissions
- Reload extension in Chrome
- Check console for errors

#### 2. Data Not Persisting
**Symptoms**: Data disappears after refresh
**Solutions**:
- Check IndexedDB permissions
- Verify storage quota
- Clear browser cache
- Check for JavaScript errors

#### 3. Thomasnet Scraper Not Working
**Symptoms**: Scraper returns no results
**Solutions**:
- Verify Python server is running
- Check network connectivity
- Update Selenium WebDriver
- Check Thomasnet website changes

#### 4. Call Mode Issues
**Symptoms**: Call mode not functioning
**Solutions**:
- Check Chrome permissions
- Verify microphone access
- Update extension permissions
- Check for JavaScript errors

### Debug Mode

#### Enable Debug Logging
```javascript
// In browser console
localStorage.setItem('crm_debug', 'true');
```

#### View Logs
```javascript
// Check console for debug messages
console.log('CRM Debug Mode Enabled');
```

#### Reset Data
```javascript
// Clear all data (use with caution)
await crm.clearAllData();
```

---

## Development

### Setting Up Development Environment

#### 1. Clone Repository
```bash
git clone <repository-url>
cd custom_crm
```

#### 2. Install Dependencies
```bash
# Python dependencies
pip3 install -r requirements.txt

# Node.js dependencies (if using build tools)
npm install
```

#### 3. Load Extension
- Open Chrome → Extensions
- Enable Developer mode
- Click "Load unpacked"
- Select project folder

### Code Structure

#### Main Classes
- **SalesCRM**: Core application class
- **CallMode**: Call mode functionality
- **ScriptManager**: Script management
- **ProspectingManager**: Prospecting system
- **DataManager**: Data operations

#### Key Methods
- **initDatabase()**: Initialize IndexedDB
- **setupEventListeners()**: Bind event handlers
- **updateUI()**: Refresh user interface
- **saveData()**: Persist data changes

### Adding New Features

#### 1. Update HTML
Add new UI elements to `popup.html`

#### 2. Add CSS
Style new elements in `styles.css`

#### 3. Implement JavaScript
Add functionality to `app.js`

#### 4. Update Database
Modify IndexedDB schema if needed

#### 5. Test Thoroughly
Verify functionality across different scenarios

### Contributing

#### Code Style
- Use ES6+ features
- Follow consistent naming conventions
- Add comments for complex logic
- Maintain error handling

#### Testing
- Test all user interactions
- Verify data persistence
- Check responsive design
- Test error scenarios

#### Documentation
- Update this documentation
- Add inline code comments
- Document new features
- Update API reference

---

## Support

### Getting Help
- Check this documentation first
- Review console errors
- Test in incognito mode
- Clear browser cache

### Reporting Issues
- Describe the problem clearly
- Include steps to reproduce
- Provide console error messages
- Specify browser version

### Feature Requests
- Describe the desired feature
- Explain the use case
- Consider implementation complexity
- Provide mockups if possible

---

## Changelog

### Version 1.0.1
- Added Thomasnet scraper integration
- Implemented 3-stage prospecting pipeline
- Added call mode functionality
- Created script management system
- Enhanced CSV import/export
- Improved responsive design
- Added comprehensive error handling

### Version 1.0.0
- Initial release
- Basic lead management
- IndexedDB storage
- Chrome extension architecture
- CSV import/export
- Search and filtering

---

## License

This project is proprietary software. All rights reserved.

---

*Last updated: January 2024*
*Version: 1.0.1*
