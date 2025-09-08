// Background script for Sales CRM Extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Sales CRM Extension installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openWebsite') {
        chrome.tabs.create({ url: request.url });
        sendResponse({ success: true });
    }
    
    if (request.action === 'copyToClipboard') {
        // Note: Chrome extensions can't directly access clipboard in background script
        // This would need to be handled in the popup or content script
        sendResponse({ success: true });
    }
});

// Keep the service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('Sales CRM Extension started');
});
