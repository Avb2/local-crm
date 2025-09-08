// Content script for Thomasnet scraping
console.log('Thomasnet content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapePage') {
        console.log('Scraping page...');
        const results = scrapeCurrentPage();
        sendResponse({ success: true, data: results });
    } else if (request.action === 'goToNextPage') {
        console.log('Going to next page...');
        const success = goToNextPage();
        sendResponse({ success: success });
    } else if (request.action === 'getPageInfo') {
        console.log('Getting page info...');
        const info = getPageInfo();
        sendResponse({ success: true, data: info });
    }
});

function scrapeCurrentPage() {
    console.log('Starting page scrape...');
    
    // Multiple selectors to try for company panels
    const panelSelectors = [
        'l-panel.search-result-supplier_searchResultSupplierPanel__HdR9H',
        '[data-testid*="supplier"]',
        '.search-result-supplier',
        '[class*="supplier"]',
        '[class*="result"]',
        'div[class*="search-result"]',
        'div[class*="company"]'
    ];
    
    let panels = [];
    for (const selector of panelSelectors) {
        panels = document.querySelectorAll(selector);
        console.log(`Tried selector "${selector}", found ${panels.length} panels`);
        if (panels.length > 0) break;
    }
    
    if (panels.length === 0) {
        console.log('No company panels found');
        return [];
    }
    
    console.log(`Found ${panels.length} company panels`);
    
    const results = [];
    for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const companyData = extractCompanyData(panel);
        if (companyData) {
            results.push(companyData);
        }
    }
    
    console.log(`Extracted ${results.length} companies`);
    return results;
}

function extractCompanyData(panel) {
    try {
        // Extract company name
        let name = '';
        const nameSelectors = [
            'div[data-sentry-component=SupplierNameLink] h2 button',
            'h2 button',
            'h3 button',
            'h2',
            'h3',
            '[class*="name"]',
            '[class*="title"]'
        ];
        
        for (const selector of nameSelectors) {
            const nameElement = panel.querySelector(selector);
            if (nameElement && nameElement.textContent.trim()) {
                name = nameElement.textContent.trim();
                break;
            }
        }
        
        if (!name) {
            console.log('No company name found');
            return null;
        }
        
        // Extract website
        let website = '';
        const websiteSelectors = [
            'div[data-sentry-component=TrimmedDescription] a',
            'a[href*="http"]',
            'a[href*="www"]',
            'a[href*=".com"]',
            'a[href*=".net"]',
            'a[href*=".org"]'
        ];
        
        for (const selector of websiteSelectors) {
            const linkElement = panel.querySelector(selector);
            if (linkElement && linkElement.href) {
                website = linkElement.href;
                break;
            }
        }
        
        // Extract contact info
        let contactText = '';
        const contactSelectors = [
            'div[data-sentry-component="SupplierContact"]',
            '.search-result__supplierContact',
            '[class*="contact"]',
            '[class*="phone"]',
            '[class*="address"]'
        ];
        
        for (const selector of contactSelectors) {
            const contactElement = panel.querySelector(selector);
            if (contactElement && contactElement.textContent) {
                contactText = contactElement.textContent;
                break;
            }
        }
        
        if (!contactText) {
            contactText = panel.textContent || '';
        }
        
        // Extract phone numbers
        const phoneStr = normalizePhones(contactText);
        
        // Extract state from contact text
        const state = extractState(contactText);
        
        return {
            name: name,
            website: website,
            phone: phoneStr,
            state: state,
            rawText: contactText
        };
        
    } catch (error) {
        console.error('Error extracting company data:', error);
        return null;
    }
}

function normalizePhones(text) {
    if (!text) return '';
    
    const phonePattern = /(?:\+?1[\s\-\.)]*)?(?:\(?\d{3}\)?)[\s\-\.)]*\d{3}[\s\-\.]*\d{4}/g;
    const phones = text.match(phonePattern) || [];
    
    const normalizedPhones = phones.map(phone => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        return phone;
    });
    
    return normalizedPhones.join('; ');
}

function extractState(text) {
    if (!text) return '';
    
    const statePattern = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i;
    const match = text.match(statePattern);
    return match ? match[0].toUpperCase() : '';
}

function goToNextPage() {
    try {
        // Look for next page button
        const nextSelectors = [
            'button[aria-label*="Next"]',
            'button[aria-label*="next"]',
            'a[aria-label*="Next"]',
            'a[aria-label*="next"]',
            'button[class*="next"]',
            'a[class*="next"]',
            'button[class*="pagination"]',
            'a[class*="pagination"]'
        ];
        
        for (const selector of nextSelectors) {
            const nextBtn = document.querySelector(selector);
            if (nextBtn && nextBtn.offsetParent !== null) { // Check if visible
                console.log(`Found next button with selector: ${selector}`);
                nextBtn.click();
                return true;
            }
        }
        
        console.log('No next page button found');
        return false;
    } catch (error) {
        console.error('Error going to next page:', error);
        return false;
    }
}

function getPageInfo() {
    return {
        url: window.location.href,
        title: document.title,
        hasNextPage: document.querySelector('button[aria-label*="Next"], a[aria-label*="Next"]') !== null
    };
}
