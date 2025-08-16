#!/bin/bash

# Test script for Willi-Mako Chrome Extension
# This script validates the extension structure and provides installation instructions

echo "🔍 Willi-Mako Chrome Extension - Validation & Test"
echo "================================================="

# Check if chrome-extension directory exists
if [ ! -d "chrome-extension" ]; then
    echo "❌ chrome-extension directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

cd chrome-extension

echo ""
echo "📁 Checking Extension Files..."
echo "------------------------------"

# Check required files
required_files=(
    "manifest.json"
    "popup.html"
    "popup.css"
    "popup.js"
    "background.js"
    "content.js"
    "README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - Found"
    else
        echo "❌ $file - Missing"
    fi
done

echo ""
echo "📂 Checking Icons Directory..."
echo "-----------------------------"

if [ -d "icons" ]; then
    echo "✅ icons directory - Found"
    
    required_icons=(
        "icon16.png"
        "icon32.png"
        "icon48.png"
        "icon128.png"
    )
    
    for icon in "${required_icons[@]}"; do
        if [ -f "icons/$icon" ]; then
            echo "✅ icons/$icon - Found"
        else
            echo "⚠️  icons/$icon - Missing (needs to be created)"
        fi
    done
else
    echo "❌ icons directory - Missing"
fi

echo ""
echo "🔧 Validating manifest.json..."
echo "-----------------------------"

if [ -f "manifest.json" ]; then
    # Check if manifest.json is valid JSON
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "✅ manifest.json - Valid JSON format"
        
        # Check required fields
        required_fields=(
            "manifest_version"
            "name"
            "version"
            "description"
            "permissions"
            "action"
            "icons"
            "background"
        )
        
        for field in "${required_fields[@]}"; do
            if grep -q "\"$field\"" manifest.json; then
                echo "✅ $field - Present in manifest"
            else
                echo "❌ $field - Missing from manifest"
            fi
        done
    else
        echo "❌ manifest.json - Invalid JSON format"
    fi
else
    echo "❌ manifest.json - File not found"
fi

echo ""
echo "🌐 Checking API Configuration..."
echo "-------------------------------"

if [ -f "popup.js" ]; then
    api_url=$(grep -o 'https://stromhaltig.de/api/analyze-screenshot' popup.js)
    if [ -n "$api_url" ]; then
        echo "✅ API URL configured: $api_url"
    else
        echo "⚠️  API URL not found in popup.js"
    fi
else
    echo "❌ popup.js not found"
fi

echo ""
echo "📋 Installation Instructions"
echo "==========================="
echo ""
echo "1. 🖼️  Create Extension Icons:"
echo "   - Create PNG files in icons/ directory"
echo "   - Sizes: 16x16, 32x32, 48x48, 128x128 pixels"
echo "   - Use Willi-Mako branding (green #147a50)"
echo ""
echo "2. 🔧 Load Extension in Chrome:"
echo "   - Open Chrome and go to chrome://extensions/"
echo "   - Enable 'Developer mode' (top right)"
echo "   - Click 'Load unpacked'"
echo "   - Select the chrome-extension directory"
echo ""
echo "3. 🧪 Test Extension:"
echo "   - Click the extension icon in browser toolbar"
echo "   - Test screenshot capture functionality"
echo "   - Test clipboard paste functionality"
echo "   - Verify API connection to stromhaltig.de"
echo ""
echo "4. 📦 Package for Distribution:"
echo "   - Zip the chrome-extension directory"
echo "   - Upload to Chrome Web Store Developer Dashboard"
echo "   - Fill out store listing with screenshots and description"
echo ""
echo "🔗 Useful Links:"
echo "---------------"
echo "📖 Extension Documentation: ./README.md"
echo "🌐 Web Version: https://stromhaltig.de/screenshot-analysis"
echo "🏪 Chrome Web Store: https://chrome.google.com/webstore/category/extensions"
echo "👨‍💻 Developer Console: https://chrome.google.com/webstore/developer/dashboard"
echo ""

# Test API endpoint availability
echo "🌍 Testing API Endpoint..."
echo "-------------------------"
if command -v curl &> /dev/null; then
    api_status=$(curl -s -o /dev/null -w "%{http_code}" https://stromhaltig.de/api/analyze-screenshot --connect-timeout 5)
    if [ "$api_status" = "405" ] || [ "$api_status" = "200" ]; then
        echo "✅ API endpoint reachable (HTTP $api_status)"
    else
        echo "⚠️  API endpoint status: HTTP $api_status"
    fi
else
    echo "⚠️  curl not available - cannot test API endpoint"
fi

echo ""
echo "✨ Extension validation complete!"
echo "================================"

# Summary
echo ""
echo "📊 Summary:"
missing_files=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        ((missing_files++))
    fi
done

missing_icons=0
for icon in "icon16.png" "icon32.png" "icon48.png" "icon128.png"; do
    if [ ! -f "icons/$icon" ]; then
        ((missing_icons++))
    fi
done

if [ $missing_files -eq 0 ] && [ $missing_icons -eq 0 ]; then
    echo "🎉 Extension is ready for installation!"
elif [ $missing_files -eq 0 ] && [ $missing_icons -gt 0 ]; then
    echo "⚠️  Extension code is complete, but $missing_icons icon(s) need to be created"
else
    echo "❌ Extension has $missing_files missing files and $missing_icons missing icons"
fi

echo ""
echo "Next steps:"
if [ $missing_icons -gt 0 ]; then
    echo "1. Create missing icon files with Willi-Mako branding"
fi
echo "2. Load extension in Chrome Developer Mode"
echo "3. Test all functionality"
echo "4. Prepare for Chrome Web Store submission"
echo ""
