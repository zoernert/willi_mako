// Willi-Mako Chrome Extension - Content Script
// Handles page interaction and image detection

class WilliMakoContentScript {
    constructor() {
        this.isInitialized = false;
        this.imageObserver = null;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open
        });

        // Observe images on the page for potential energy market codes
        this.observeImages();
        
        // Add keyboard shortcuts
        this.addKeyboardShortcuts();
        
        this.isInitialized = true;
        console.log('Willi-Mako content script initialized');
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'findImages':
                this.findEnergyMarketImages(sendResponse);
                break;
                
            case 'highlightCodes':
                this.highlightDetectedCodes(request.codes);
                sendResponse({success: true});
                break;
                
            case 'captureElement':
                this.captureSpecificElement(request.selector, sendResponse);
                break;
                
            case 'getPageContext':
                this.getPageContext(sendResponse);
                break;
        }
    }

    findEnergyMarketImages(callback) {
        const images = document.querySelectorAll('img');
        const relevantImages = [];

        images.forEach((img, index) => {
            // Check if image might contain energy market codes
            const alt = img.alt?.toLowerCase() || '';
            const src = img.src?.toLowerCase() || '';
            const title = img.title?.toLowerCase() || '';
            
            const energyKeywords = [
                'melo', 'malo', 'eic', 'bdew', 'marktpartner', 'energiemarkt',
                'stromzähler', 'gaszähler', 'messstelle', 'netzbetreiber',
                'lieferant', 'bilanzkreis', 'marktlokation', 'messlokation'
            ];

            const isRelevant = energyKeywords.some(keyword => 
                alt.includes(keyword) || src.includes(keyword) || title.includes(keyword)
            );

            if (isRelevant || img.naturalWidth > 200) { // Include larger images
                relevantImages.push({
                    index,
                    src: img.src,
                    alt: img.alt,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    isRelevant
                });
            }
        });

        callback({
            total: images.length,
            relevant: relevantImages
        });
    }

    highlightDetectedCodes(codes) {
        // Remove previous highlights
        this.removeHighlights();

        if (!codes || codes.length === 0) return;

        // Create highlight overlay
        const overlay = document.createElement('div');
        overlay.id = 'willi-mako-highlight-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999999;
        `;

        // Highlight each detected code in the page text
        codes.forEach(code => {
            this.highlightTextInPage(code.value, overlay);
        });

        document.body.appendChild(overlay);

        // Remove highlights after 5 seconds
        setTimeout(() => {
            this.removeHighlights();
        }, 5000);
    }

    highlightTextInPage(text, overlay) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;

        while (node = walker.nextNode()) {
            if (node.textContent.includes(text)) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(textNode => {
            const parent = textNode.parentElement;
            if (parent && !parent.closest('#willi-mako-highlight-overlay')) {
                const rect = parent.getBoundingClientRect();
                
                const highlight = document.createElement('div');
                highlight.className = 'willi-mako-highlight';
                highlight.style.cssText = `
                    position: absolute;
                    top: ${rect.top + window.scrollY}px;
                    left: ${rect.left + window.scrollX}px;
                    width: ${rect.width}px;
                    height: ${rect.height}px;
                    background-color: rgba(20, 122, 80, 0.3);
                    border: 2px solid #147a50;
                    border-radius: 4px;
                    animation: willi-mako-pulse 2s infinite;
                `;

                overlay.appendChild(highlight);
            }
        });
    }

    removeHighlights() {
        const overlay = document.getElementById('willi-mako-highlight-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    async captureSpecificElement(selector, callback) {
        try {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error('Element nicht gefunden');
            }

            // Scroll element into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Wait for scroll to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Highlight element temporarily
            const originalStyle = element.style.outline;
            element.style.outline = '3px solid #147a50';

            setTimeout(() => {
                element.style.outline = originalStyle;
            }, 2000);

            callback({
                success: true,
                element: {
                    tagName: element.tagName,
                    className: element.className,
                    id: element.id,
                    text: element.textContent.substring(0, 100)
                }
            });

        } catch (error) {
            callback({
                success: false,
                error: error.message
            });
        }
    }

    getPageContext(callback) {
        const context = {
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            hasEnergyKeywords: this.checkForEnergyKeywords(),
            imageCount: document.querySelectorAll('img').length,
            formCount: document.querySelectorAll('form').length,
            tables: this.findDataTables()
        };

        callback(context);
    }

    checkForEnergyKeywords() {
        const text = document.body.textContent.toLowerCase();
        const keywords = [
            'melo', 'malo', 'eic', 'bdew', 'marktpartner', 'energiemarkt',
            'stromzähler', 'gaszähler', 'messstelle', 'netzbetreiber',
            'lieferant', 'bilanzkreis', 'marktlokation', 'messlokation',
            'stammdaten', 'marktregister', 'energieversorger'
        ];

        return keywords.some(keyword => text.includes(keyword));
    }

    findDataTables() {
        const tables = document.querySelectorAll('table');
        const dataTables = [];

        tables.forEach((table, index) => {
            const rows = table.querySelectorAll('tr');
            if (rows.length > 2) { // Must have header + at least 2 data rows
                const headers = Array.from(table.querySelectorAll('th, tr:first-child td'))
                    .map(cell => cell.textContent.trim().toLowerCase());
                
                const hasEnergyData = headers.some(header => 
                    header.includes('melo') || header.includes('malo') || 
                    header.includes('eic') || header.includes('bdew') ||
                    header.includes('code') || header.includes('nummer')
                );

                if (hasEnergyData) {
                    dataTables.push({
                        index,
                        rowCount: rows.length,
                        columnCount: table.querySelectorAll('tr:first-child td, tr:first-child th').length,
                        headers: headers
                    });
                }
            }
        });

        return dataTables;
    }

    observeImages() {
        // Observe new images being added to the page
        this.imageObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const images = node.tagName === 'IMG' ? [node] : node.querySelectorAll('img');
                        
                        images.forEach((img) => {
                            img.addEventListener('load', () => {
                                // Check if this image might contain energy market data
                                this.analyzeImageContext(img);
                            });
                        });
                    }
                });
            });
        });

        this.imageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    analyzeImageContext(img) {
        // Quick context analysis for newly loaded images
        const context = {
            alt: img.alt,
            src: img.src,
            surroundingText: this.getSurroundingText(img),
            inTable: !!img.closest('table'),
            inForm: !!img.closest('form')
        };

        // Could notify background script about interesting images
        if (this.hasEnergyContext(context)) {
            console.log('Potential energy market image detected:', context);
        }
    }

    getSurroundingText(element) {
        const parent = element.parentElement;
        if (!parent) return '';
        
        return parent.textContent.substring(0, 200);
    }

    hasEnergyContext(context) {
        const text = (context.alt + ' ' + context.surroundingText).toLowerCase();
        const keywords = ['melo', 'malo', 'eic', 'bdew', 'code', 'nummer', 'markt'];
        
        return keywords.some(keyword => text.includes(keyword));
    }

    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+W - Open Willi-Mako extension
            if (e.ctrlKey && e.shiftKey && e.key === 'W') {
                e.preventDefault();
                chrome.runtime.sendMessage({action: 'openPopup'});
            }
        });
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new WilliMakoContentScript();
    });
} else {
    new WilliMakoContentScript();
}

// Add CSS for highlights
const style = document.createElement('style');
style.textContent = `
    @keyframes willi-mako-pulse {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.02); }
        100% { opacity: 0.6; transform: scale(1); }
    }
    
    .willi-mako-highlight {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style);
