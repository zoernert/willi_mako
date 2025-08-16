#!/bin/bash

# Automatisches Icon-Generierungs-Script für Willi-Mako Chrome Extension
# Erstellt PNG-Icons aus SVG-Vorlagen mit verschiedenen Online-Services

echo "🎨 Willi-Mako Icon Generator"
echo "============================="

# Check if icon-templates directory exists
if [ ! -d "chrome-extension/icon-templates" ]; then
    echo "❌ icon-templates directory not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo ""
echo "📋 Verfügbare SVG-Vorlagen:"
echo "---------------------------"
ls -la chrome-extension/icon-templates/*.svg 2>/dev/null | awk '{print "✅ " $9}' || echo "❌ Keine SVG-Vorlagen gefunden"

echo ""
echo "🌐 Online-Services für Icon-Erstellung:"
echo "======================================="

echo ""
echo "1. 🎨 CloudConvert (Empfohlen)"
echo "   Website: https://cloudconvert.com/svg-to-png"
echo "   Schritte:"
echo "   - SVG-Datei hochladen"
echo "   - Größe auf 128x128, 48x48, 32x32, 16x16 einstellen"
echo "   - Als PNG herunterladen"

echo ""
echo "2. 🖼️  SVG-to-PNG Online"
echo "   Website: https://svgtopng.com"
echo "   - Einfaches Drag & Drop"
echo "   - Automatische Größenanpassung"

echo ""
echo "3. 🎭 Canva Icon Creator"
echo "   Website: https://www.canva.com"
echo "   - Neues Design erstellen (128x128px)"
echo "   - Hintergrund: Grün (#147a50)"
echo "   - Blitz-Symbol hinzufügen (weiß)"

echo ""
echo "4. ⚡ Favicon Generator (Emoji-basiert)"
echo "   Website: https://favicon.io/favicon-generator/"
echo "   Einstellungen:"
echo "   - Text: ⚡"
echo "   - Hintergrund: #147a50"
echo "   - Textfarbe: #ffffff"
echo "   - Schrift: Arial/Roboto Bold"

echo ""
echo "5. 🛠️  RealFaviconGenerator"
echo "   Website: https://realfavicongenerator.net"
echo "   - Master-Bild hochladen (SVG oder PNG)"
echo "   - Chrome Extension Icons generieren"

echo ""
echo "📐 Benötigte Icon-Größen:"
echo "========================"
echo "✅ icon16.png  - 16x16 pixels  (Browser Toolbar)"
echo "✅ icon32.png  - 32x32 pixels  (Extension Management)"
echo "✅ icon48.png  - 48x48 pixels  (Extension Details)"
echo "✅ icon128.png - 128x128 pixels (Chrome Web Store)"

echo ""
echo "🎯 Willi-Mako Design-Vorgaben:"
echo "=============================="
echo "🟢 Primärfarbe:    #147a50 (Willi-Mako Grün)"
echo "🟢 Sekundärfarbe:  #1a8f5f (Heller)"
echo "🟢 Akzentfarbe:    #0d5538 (Dunkler)"
echo "⚪ Symbol:         #ffffff (Weiß)"
echo "💙 Akzent:         #f0f9ff (Hellblau)"

echo ""
echo "🚀 Schnellstart-Anleitung:"
echo "=========================="
echo "1. Öffnen Sie: https://cloudconvert.com/svg-to-png"
echo "2. Laden Sie chrome-extension/icon-templates/icon-modern.svg hoch"
echo "3. Stellen Sie Größe auf 128x128 ein"
echo "4. Konvertieren und als icon128.png herunterladen"
echo "5. Wiederholen für Größen: 48x48, 32x32, 16x16"
echo "6. Dateien nach chrome-extension/icons/ verschieben"

echo ""
echo "🧪 Nach Icon-Erstellung testen:"
echo "==============================="
echo "./test-chrome-extension.sh"

echo ""
echo "📱 Alternative für macOS/Linux (mit ImageMagick):"
echo "================================================"
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick ist installiert!"
    echo ""
    echo "Automatische Konvertierung ausführen:"
    echo "cd chrome-extension/icon-templates"
    echo "convert icon-modern.svg -resize 128x128 ../icons/icon128.png"
    echo "convert icon-modern.svg -resize 48x48 ../icons/icon48.png"
    echo "convert icon-modern.svg -resize 32x32 ../icons/icon32.png"
    echo "convert icon-modern.svg -resize 16x16 ../icons/icon16.png"
    
    echo ""
    read -p "Möchten Sie die Icons jetzt automatisch generieren? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Generiere Icons..."
        cd chrome-extension/icon-templates
        
        # Create icons directory if it doesn't exist
        mkdir -p ../icons
        
        # Convert SVG to PNG in different sizes
        convert icon-modern.svg -resize 128x128 ../icons/icon128.png
        convert icon-modern.svg -resize 48x48 ../icons/icon48.png
        convert icon-modern.svg -resize 32x32 ../icons/icon32.png
        convert icon-modern.svg -resize 16x16 ../icons/icon16.png
        
        echo "✅ Icons erfolgreich generiert!"
        echo "📁 Gespeichert in: chrome-extension/icons/"
        
        cd ../..
        echo ""
        echo "🧪 Teste Extension-Struktur..."
        ./test-chrome-extension.sh
    fi
else
    echo "⚠️  ImageMagick nicht installiert."
    echo "   Installation:"
    echo "   - macOS: brew install imagemagick"
    echo "   - Ubuntu: sudo apt-get install imagemagick"
    echo "   - Windows: https://imagemagick.org/script/download.php#windows"
fi

echo ""
echo "✨ Icon-Generator Skript abgeschlossen!"
echo "======================================"
