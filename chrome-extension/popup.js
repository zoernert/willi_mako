// Willi-Mako Chrome Extension - Screenshot Analysis
// Main popup logic for screenshot capture and analysis

class ScreenshotAnalyzer {
    constructor() {
        this.apiUrl = 'https://stromhaltig.de/api/analyze-screenshot';
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // New screenshot button
        document.getElementById('newScreenshot').addEventListener('click', () => {
            this.captureNewScreenshot();
        });

        // Paste from clipboard button
        document.getElementById('pasteImage').addEventListener('click', () => {
            this.pasteFromClipboard();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.pasteFromClipboard();
            }
        });
    }

    async captureNewScreenshot() {
        try {
            this.showLoading();
            
            // Use Chrome's screenshotting API
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('Kein aktiver Tab gefunden');
            }

            // Capture visible tab
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png',
                quality: 100
            });

            await this.analyzeScreenshot(dataUrl);
        } catch (error) {
            console.error('Screenshot capture error:', error);
            this.showError(`Fehler beim Erstellen des Screenshots: ${error.message}`);
        }
    }

    async pasteFromClipboard() {
        try {
            this.showLoading();

            // Try to read from clipboard
            const clipboardItems = await navigator.clipboard.read();
            let imageData = null;

            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        imageData = await this.blobToDataUrl(blob);
                        break;
                    }
                }
                if (imageData) break;
            }

            if (!imageData) {
                throw new Error('Kein Bild in der Zwischenablage gefunden. Kopieren Sie zuerst ein Screenshot.');
            }

            await this.analyzeScreenshot(imageData);
        } catch (error) {
            console.error('Clipboard paste error:', error);
            if (error.name === 'NotAllowedError') {
                this.showError('Zugriff auf Zwischenablage verweigert. Bitte erlauben Sie den Zugriff.');
            } else {
                this.showError(`Fehler beim Einfügen: ${error.message}`);
            }
        }
    }

    async analyzeScreenshot(dataUrl) {
        try {
            // Validate image size
            const blob = await this.dataUrlToBlob(dataUrl);
            if (blob.size > this.maxFileSize) {
                throw new Error(`Bild ist zu groß (${Math.round(blob.size / 1024 / 1024)}MB). Maximum: 10MB`);
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('image', blob, 'screenshot.png');

            // Send to API
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    // Don't set Content-Type, let browser set it with boundary
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Server-Fehler: ${response.status}`);
            }

            this.displayResults(result);
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(`Fehler bei der Analyse: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(data) {
        this.hideLoading();
        this.hideError();
        
        const resultsDiv = document.getElementById('results');
        resultsDiv.classList.remove('hidden');

        // Display extracted codes (API sendet 'codes', nicht 'extractedCodes')
        if (data.codes && data.codes.length > 0) {
            this.displayExtractedCodes(data.codes);
        }

        // Display BDEW information (API sendet 'bdewPartnerInfo', nicht 'bdewInfo')
        if (data.bdewPartnerInfo) {
            this.displayBdewInfo(data.bdewPartnerInfo);
        }

        // Display additional information
        if (data.additionalInfo && Object.keys(data.additionalInfo).length > 0) {
            this.displayAdditionalInfo(data.additionalInfo);
        }

        // If no useful data was extracted
        if ((!data.codes || data.codes.length === 0) && 
            !data.bdewPartnerInfo && 
            (!data.additionalInfo || Object.keys(data.additionalInfo).length === 0)) {
            this.showError('Keine Energiewirtschafts-Codes im Screenshot erkannt. Versuchen Sie ein anderes Bild.');
        }
    }

    displayExtractedCodes(codes) {
        const section = document.getElementById('extractedCodes');
        const list = document.getElementById('codesList');
        
        list.innerHTML = '';
        
        codes.forEach((code, index) => {
            const codeDiv = document.createElement('div');
            codeDiv.className = `code-item ${code.type.toLowerCase()}`;
            codeDiv.title = `${this.getCodeDescription(code.type)} - Klicken zum Kopieren`;
            
            // Code type badge
            const typeSpan = document.createElement('span');
            typeSpan.className = `code-type code-type-${code.type.toLowerCase()}`;
            typeSpan.textContent = code.type;
            
            // Code value
            const valueSpan = document.createElement('span');
            valueSpan.className = 'code-value';
            valueSpan.textContent = code.value;
            
            // Confidence percentage
            if (code.confidence) {
                const confidenceSpan = document.createElement('span');
                confidenceSpan.className = 'code-confidence';
                confidenceSpan.textContent = `${Math.round(code.confidence * 100)}%`;
                codeDiv.appendChild(confidenceSpan);
            }
            
            codeDiv.appendChild(typeSpan);
            codeDiv.appendChild(valueSpan);
            
            // Add click handler to copy to clipboard
            codeDiv.addEventListener('click', () => {
                this.copyToClipboard(code.value);
                this.showTemporaryFeedback(codeDiv, 'Kopiert!');
            });
            
            list.appendChild(codeDiv);
        });
        
        section.classList.remove('hidden');
    }

    getCodeDescription(type) {
        const descriptions = {
            'MaLo': 'Marktlokations-ID',
            'MeLo': 'Messlokations-ID', 
            'EIC': 'Energy Identification Code',
            'BDEW': 'BDEW Code-Nummer'
        };
        return descriptions[type] || type;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard:', text);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(text);
        });
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }

    showTemporaryFeedback(element, message) {
        const originalText = element.title;
        element.title = message;
        element.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        
        setTimeout(() => {
            element.title = originalText;
            element.style.backgroundColor = '';
        }, 1500);
    }

    displayBdewInfo(bdewInfo) {
        const section = document.getElementById('bdewInfo');
        const details = document.getElementById('bdewDetails');
        
        details.innerHTML = '';
        
        Object.entries(bdewInfo).forEach(([key, value]) => {
            if (value) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'info-item';
                
                const labelSpan = document.createElement('span');
                labelSpan.className = 'info-label';
                labelSpan.textContent = this.formatLabel(key);
                
                const valueSpan = document.createElement('span');
                valueSpan.className = 'info-value';
                valueSpan.textContent = value;
                
                infoDiv.appendChild(labelSpan);
                infoDiv.appendChild(valueSpan);
                details.appendChild(infoDiv);
            }
        });
        
        section.classList.remove('hidden');
    }

    displayAdditionalInfo(additionalInfo) {
        const section = document.getElementById('additionalInfo');
        const details = document.getElementById('additionalDetails');
        
        details.innerHTML = '';
        
        Object.entries(additionalInfo).forEach(([key, value]) => {
            if (value) {
                const infoDiv = document.createElement('div');
                infoDiv.className = 'info-item';
                
                const labelSpan = document.createElement('span');
                labelSpan.className = 'info-label';
                labelSpan.textContent = this.formatLabel(key);
                
                const valueSpan = document.createElement('span');
                valueSpan.className = 'info-value';
                valueSpan.textContent = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
                
                infoDiv.appendChild(labelSpan);
                infoDiv.appendChild(valueSpan);
                details.appendChild(infoDiv);
            }
        });
        
        section.classList.remove('hidden');
    }

    formatLabel(key) {
        const labelMap = {
            'name': 'Name',
            'address': 'Adresse',
            'city': 'Stadt',
            'zipCode': 'PLZ',
            'country': 'Land',
            'phone': 'Telefon',
            'email': 'E-Mail',
            'website': 'Website',
            'businessType': 'Geschäftstyp',
            'marketRole': 'Marktrolle',
            'energyType': 'Energieart',
            'contactPerson': 'Ansprechpartner',
            'department': 'Abteilung'
        };
        return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('results').classList.add('hidden');
        this.hideError();
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorDiv.classList.remove('hidden');
        
        this.hideLoading();
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }

    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async dataUrlToBlob(dataUrl) {
        const response = await fetch(dataUrl);
        return response.blob();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ScreenshotAnalyzer();
});

// Handle extension initialization
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeCurrentTab') {
        // Can be triggered from context menu or keyboard shortcut
        document.getElementById('newScreenshot').click();
    }
});
