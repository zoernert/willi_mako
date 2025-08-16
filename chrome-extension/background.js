// Willi-Mako Chrome Extension - Background Service Worker
// Handles extension lifecycle, context menus, and keyboard shortcuts

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Willi-Mako Screenshot Analyzer installed:', details);
    
    // Create context menu
    chrome.contextMenus.create({
        id: 'analyze-screenshot',
        title: 'Mit Willi-Mako analysieren',
        contexts: ['page', 'image'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
    });

    // Set default settings
    chrome.storage.sync.set({
        autoAnalyze: false,
        apiEndpoint: 'https://stromhaltig.de/api/analyze-screenshot',
        maxFileSize: 10 * 1024 * 1024 // 10MB
    });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'analyze-screenshot') {
        // Take screenshot of current tab
        captureAndAnalyze(tab);
    }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'capture-analyze') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                captureAndAnalyze(tabs[0]);
            }
        });
    }
});

// Message handling from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'captureTab':
            handleCaptureTab(request, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'getSettings':
            chrome.storage.sync.get(null, (settings) => {
                sendResponse(settings);
            });
            return true;
            
        case 'saveSettings':
            chrome.storage.sync.set(request.settings, () => {
                sendResponse({success: true});
            });
            return true;
            
        case 'openExtensionPage':
            chrome.tabs.create({
                url: 'https://stromhaltig.de/chrome-extension'
            });
            break;
    }
});

async function handleCaptureTab(request, sendResponse) {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab) {
            throw new Error('No active tab found');
        }

        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 100
        });

        sendResponse({
            success: true,
            dataUrl: dataUrl,
            tabInfo: {
                title: tab.title,
                url: tab.url
            }
        });
    } catch (error) {
        console.error('Capture error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function captureAndAnalyze(tab) {
    try {
        // Capture the tab
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 100
        });

        // Open popup with captured image
        // This will trigger the popup to analyze the image
        chrome.action.openPopup();
        
        // Send message to popup with captured data
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: 'analyzeCapturedImage',
                dataUrl: dataUrl,
                tabInfo: {
                    title: tab.title,
                    url: tab.url
                }
            });
        }, 500);

    } catch (error) {
        console.error('Capture and analyze error:', error);
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Willi-Mako Screenshot-Analyse',
            message: `Fehler: ${error.message}`
        });
    }
}

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
    console.log('Extension update available');
    // Auto-reload if no critical operations are running
    chrome.runtime.reload();
});

// Track usage statistics (anonymous)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'trackUsage') {
        // Could send anonymous usage stats to improve the extension
        console.log('Usage tracked:', request.event);
    }
});

// Handle errors
chrome.runtime.onSuspend.addListener(() => {
    console.log('Extension suspending');
});

// Handle tab updates for auto-analysis (if enabled)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.storage.sync.get(['autoAnalyze'], (result) => {
            if (result.autoAnalyze && tab.url && tab.url.includes('energiemarkt')) {
                // Auto-analyze pages related to energy markets
                console.log('Auto-analyze triggered for:', tab.url);
            }
        });
    }
});
