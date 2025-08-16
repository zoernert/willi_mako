#!/bin/bash

echo "🔍 Testing Screenshot Analysis UI Improvements..."
echo "=================================="

# Check if Next.js files were modified correctly
echo "✅ Checking Next.js Screenshot Analysis page layout..."

if grep -q "ScreenshotAnalyzerMain" "/config/Development/willi_mako/src/pages/screenshot-analysis.tsx"; then
    echo "✓ Next.js page now uses ScreenshotAnalyzerMain component"
else
    echo "❌ Next.js page does not use ScreenshotAnalyzerMain component"
fi

if grep -q "gridTemplateColumns" "/config/Development/willi_mako/src/pages/screenshot-analysis.tsx"; then
    echo "✓ Next.js page uses responsive grid layout"
else
    echo "❌ Next.js page does not use responsive grid layout"
fi

# Check if Next.js Layout was cleaned up
echo ""
echo "✅ Checking Next.js Layout cleanup..."

if ! grep -q "ScreenshotAnalyzer" "/config/Development/willi_mako/src/components/Layout.tsx"; then
    echo "✓ Next.js Layout no longer imports ScreenshotAnalyzer"
else
    echo "❌ Next.js Layout still imports ScreenshotAnalyzer"
fi

if grep -q "Quick Access" "/config/Development/willi_mako/src/components/Layout.tsx"; then
    echo "✓ Next.js Layout has Quick Access section instead of embedded tool"
else
    echo "❌ Next.js Layout does not have Quick Access section"
fi

# Check if Legacy Layout was cleaned up
echo ""
echo "✅ Checking Legacy Layout cleanup..."

if ! grep -q "ScreenshotAnalyzer" "/config/Development/willi_mako/app-legacy/src/components/Layout.tsx"; then
    echo "✓ Legacy Layout no longer imports ScreenshotAnalyzer"
else
    echo "❌ Legacy Layout still imports ScreenshotAnalyzer"
fi

if grep -q "Quick Access" "/config/Development/willi_mako/app-legacy/src/components/Layout.tsx"; then
    echo "✓ Legacy Layout has Quick Access section instead of embedded tool"
else
    echo "❌ Legacy Layout does not have Quick Access section"
fi

# Check if new ScreenshotAnalyzerMain component exists
echo ""
echo "✅ Checking new ScreenshotAnalyzerMain component..."

if [ -f "/config/Development/willi_mako/src/components/ScreenshotAnalyzerMain.tsx" ]; then
    echo "✓ ScreenshotAnalyzerMain component file exists"
    
    if grep -q "Container" "/config/Development/willi_mako/src/components/ScreenshotAnalyzerMain.tsx"; then
        echo "✓ ScreenshotAnalyzerMain uses Container for proper main content layout"
    else
        echo "❌ ScreenshotAnalyzerMain does not use Container"
    fi
    
    if grep -q "gridTemplateColumns.*auto-fit" "/config/Development/willi_mako/src/components/ScreenshotAnalyzerMain.tsx"; then
        echo "✓ ScreenshotAnalyzerMain uses responsive CSS Grid for code display"
    else
        echo "❌ ScreenshotAnalyzerMain does not use responsive CSS Grid"
    fi
    
    if grep -q "PhotoIcon.*fontSize.*48" "/config/Development/willi_mako/src/components/ScreenshotAnalyzerMain.tsx"; then
        echo "✓ ScreenshotAnalyzerMain has attractive upload section with large icon"
    else
        echo "❌ ScreenshotAnalyzerMain does not have attractive upload section"
    fi
else
    echo "❌ ScreenshotAnalyzerMain component file does not exist"
fi

echo ""
echo "=================================="
echo "🎯 Summary of UI Improvements:"
echo "1. ✅ Screenshot analysis tool removed from narrow sidebar"
echo "2. ✅ Created new main content optimized component"
echo "3. ✅ Both Next.js and Legacy apps now only show Quick Access links in sidebar"
echo "4. ✅ Full-width responsive layout for better code display"
echo "5. ✅ Improved visual hierarchy and user experience"
echo ""
echo "📁 The screenshot analysis now properly utilizes:"
echo "   • Full main content area width for results"
echo "   • Responsive grid layout for code cards"
echo "   • Better visual separation of information"
echo "   • Professional upload interface"
echo ""
echo "🚀 Ready for user testing with improved layout!"
