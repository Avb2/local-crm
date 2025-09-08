# Sales CRM Chrome Extension

A professional CRM dashboard built as a Chrome extension for managing leads, call queues, and email campaigns.

## Features

- **Dashboard**: Overview with analytics, recent activity, and geographic/industry distribution
- **Lead Management**: Add, edit, delete, and organize leads with filtering and search
- **Call Queue**: Prioritized list of leads to call with notes tracking
- **Email Campaigns**: Mass email functionality with recipient selection
- **Data Import/Export**: CSV import/export and full data backup
- **Professional UI**: Modern, responsive design with intuitive navigation

## Installation

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the `custom_crm` folder
5. **Pin the extension** to your toolbar for easy access

## Usage

### Getting Started
1. Click the extension icon in your Chrome toolbar
2. The CRM will open in a new tab with a professional dashboard
3. Start by adding leads manually or importing from CSV

### Adding Leads
- Click the "Leads" tab
- Use "Add Lead" button or "Import CSV" for bulk import
- Fill in company information, contact details, and notes

### Call Queue Management
- Switch to "Call Queue" tab
- See prioritized leads based on last call date
- Use "Next to Call" card for current lead information
- Mark calls as completed with notes

### Email Campaigns
- Go to "Email" tab
- Filter recipients by state/industry
- Compose your message
- Select recipients and send (requires SMTP configuration)

### Settings
- Configure call queue days
- Set up SMTP for email functionality
- Export/import data for backup

## Data Storage

All data is stored locally in your browser using IndexedDB. No data is sent to external servers.

## CSV Import Format

Expected CSV columns:
- Lead (Company Name)
- Emails
- Industry
- State
- Website
- Phones
- Comments

## Technical Details

- Built with vanilla JavaScript, HTML5, and CSS3
- Uses IndexedDB for local data storage
- Chrome Extension Manifest V3
- Responsive design for various screen sizes
- Professional UI with Font Awesome icons

## Privacy

This extension stores all data locally in your browser. No personal information is transmitted to external servers.

## Support

This is a local-use extension. For issues or feature requests, modify the code directly.
# local-crm
