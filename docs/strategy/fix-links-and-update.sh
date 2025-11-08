#!/bin/bash

# Fix Links and Update Pages Script
# Konvertiert [LINK:text|url] zu HTML und aktualisiert die Pages

set -e

API_BASE="https://docs.corrently.de/api"
AUTH_HEADER="Authorization: Token 0y5A9KTlTSe0N3rfbRQULofJzlrRmdne:AMVO3eq4a8F5tZ4m8KQHVpwRrWEJMEir"

echo "🔧 Korrigiere Links und aktualisiere Pages..."
echo ""

# Function to process backlinks in HTML
process_backlinks() {
    local html_file=$1
    # Konvertiere [LINK:text|url] zu <a href="url" target="_blank" rel="noopener">text</a>
    sed -E 's|\[LINK:([^|]+)\|([^\]]+)\]|<a href="\2" target="_blank" rel="noopener">\1</a>|g' "$html_file"
}

# Function to update a page
update_page() {
    local page_id=$1
    local name=$2
    local html_file=$3
    
    echo "📝 Aktualisiere Page ${page_id}: ${name}"
    
    # Process backlinks and escape for JSON
    local html_content=$(process_backlinks "$html_file" | jq -Rs .)
    
    # Update page
    local response=$(curl -s -X PUT "${API_BASE}/pages/${page_id}" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${name}\",
            \"html\": ${html_content}
        }")
    
    local updated_id=$(echo "$response" | jq -r '.id')
    
    if [ "$updated_id" != "null" ]; then
        echo "  ✅ Page aktualisiert: ${name}"
    else
        echo "  ❌ Fehler beim Aktualisieren der Page: ${name}"
        echo "$response" | jq
    fi
}

# Update all pages
update_page 132 "Was ist EDIFACT?" "chapter-1-1.html"
update_page 133 "Struktur einer EDIFACT-Nachricht" "chapter-1-2.html"
update_page 134 "UTILMD – Stammdaten und Prozessmeldungen" "chapter-2.html"
update_page 135 "MSCONS – Messwertübermittlung verstehen" "chapter-3.html"
update_page 136 "APERAK – Fehlerbehandlung und Bestätigungen" "chapter-4.html"
update_page 137 "Checkliste EDIFACT-Qualitätssicherung" "chapter-5.html"

echo ""
echo "✅ Alle Pages wurden aktualisiert!"
echo "📖 Buch ansehen: https://docs.corrently.de/books/27"
