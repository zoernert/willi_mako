#!/bin/bash

# BookStack API Credentials
BOOKSTACK_URL="https://docs.corrently.de/api"
TOKEN_ID="0y5A9KTlTSe0N3rfbRQULofJzlrRmdne"
TOKEN_SECRET="AMVO3eq4a8F5tZ4m8KQHVpwRrWEJMEir"

# Page IDs (from previous upload)
declare -A PAGES
PAGES["chapter-1-1.html"]=132
PAGES["chapter-1-2.html"]=133
PAGES["chapter-2.html"]=134
PAGES["chapter-3.html"]=135
PAGES["chapter-4.html"]=136
PAGES["chapter-5.html"]=137

# Function to convert [LINK:text|url] to HTML anchor tags
convert_links() {
    local content="$1"
    # Use Perl for better regex handling with pipes
    # Pattern: [LINK:text|url] -> <a href="url" target="_blank" rel="noopener">text</a>
    echo "$content" | perl -pe 's/\[LINK:([^|]+)\|([^\]]+)\]/<a href="$2" target="_blank" rel="noopener">$1<\/a>/g'
}

# Update each page
for file in chapter-*.html; do
    PAGE_ID=${PAGES[$file]}
    
    if [ -z "$PAGE_ID" ]; then
        echo "⚠️ Keine Page ID für $file gefunden"
        continue
    fi
    
    echo "📝 Verarbeite $file (Page ID: $PAGE_ID)..."
    
    # Read original HTML content
    ORIGINAL_HTML=$(cat "$file")
    
    # Convert link placeholders
    CONVERTED_HTML=$(convert_links "$ORIGINAL_HTML")
    
    # Escape for JSON (replace quotes and newlines)
    JSON_HTML=$(echo "$CONVERTED_HTML" | jq -Rs .)
    
    # Update page via BookStack API
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        "${BOOKSTACK_URL}/pages/${PAGE_ID}" \
        -H "Authorization: Token ${TOKEN_ID}:${TOKEN_SECRET}" \
        -H "Content-Type: application/json" \
        -d "{\"html\": ${JSON_HTML}}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo "✅ Page $PAGE_ID erfolgreich aktualisiert"
    else
        echo "❌ Fehler beim Update von Page $PAGE_ID (HTTP $HTTP_CODE)"
        echo "   Response: $BODY"
    fi
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo ""
echo "✅ Alle Pages wurden aktualisiert!"
