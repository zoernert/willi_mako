#!/bin/bash

# BookStack Upload Script
# Veröffentlicht alle 6 EDIFACT-Kapitel auf docs.corrently.de

set -e

API_BASE="https://docs.corrently.de/api"
AUTH_HEADER="Authorization: Token 0y5A9KTlTSe0N3rfbRQULofJzlrRmdne:AMVO3eq4a8F5tZ4m8KQHVpwRrWEJMEir"
BOOK_ID=27

echo "📚 BookStack Upload gestartet..."
echo "Ziel: https://docs.corrently.de/books/${BOOK_ID}"
echo ""

# Function to create a page with HTML content
create_page() {
    local chapter_id=$1
    local name=$2
    local html_file=$3
    local priority=$4
    
    # Read HTML content and escape for JSON
    local html_content=$(cat "$html_file" | jq -Rs .)
    
    # Create page
    local response=$(curl -s -X POST "${API_BASE}/pages" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "{
            \"chapter_id\": ${chapter_id},
            \"name\": \"${name}\",
            \"html\": ${html_content},
            \"priority\": ${priority}
        }")
    
    local page_id=$(echo "$response" | jq -r '.id')
    
    if [ "$page_id" != "null" ]; then
        echo "  ✅ Page erstellt: ${name} (ID: ${page_id})"
    else
        echo "  ❌ Fehler beim Erstellen der Page: ${name}"
        echo "$response" | jq
    fi
}

# Kapitel 1: Was ist EDIFACT?
echo "📖 Kapitel 1: Was ist EDIFACT?"
CHAPTER1_RESPONSE=$(curl -s -X POST "${API_BASE}/chapters" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"book_id\": ${BOOK_ID},
        \"name\": \"Kapitel 1: Was ist EDIFACT?\",
        \"priority\": 1
    }")

CHAPTER1_ID=$(echo "$CHAPTER1_RESPONSE" | jq -r '.id')
echo "✅ Kapitel erstellt (ID: ${CHAPTER1_ID})"

create_page "$CHAPTER1_ID" "Was ist EDIFACT?" "chapter-1-1.html" 1

# Kapitel 2: EDIFACT-Struktur
echo ""
echo "📖 Kapitel 2: EDIFACT-Struktur"
CHAPTER2_RESPONSE=$(curl -s -X POST "${API_BASE}/chapters" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"book_id\": ${BOOK_ID},
        \"name\": \"Kapitel 2: Struktur einer EDIFACT-Nachricht\",
        \"priority\": 2
    }")

CHAPTER2_ID=$(echo "$CHAPTER2_RESPONSE" | jq -r '.id')
echo "✅ Kapitel erstellt (ID: ${CHAPTER2_ID})"

create_page "$CHAPTER2_ID" "Struktur einer EDIFACT-Nachricht" "chapter-1-2.html" 1

# Kapitel 3: UTILMD
echo ""
echo "📖 Kapitel 3: UTILMD"
CHAPTER3_RESPONSE=$(curl -s -X POST "${API_BASE}/chapters" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"book_id\": ${BOOK_ID},
        \"name\": \"Kapitel 3: UTILMD – Stammdaten\",
        \"priority\": 3
    }")

CHAPTER3_ID=$(echo "$CHAPTER3_RESPONSE" | jq -r '.id')
echo "✅ Kapitel erstellt (ID: ${CHAPTER3_ID})"

create_page "$CHAPTER3_ID" "UTILMD – Stammdaten und Prozessmeldungen" "chapter-2.html" 1

# Kapitel 4: MSCONS
echo ""
echo "📖 Kapitel 4: MSCONS"
CHAPTER4_RESPONSE=$(curl -s -X POST "${API_BASE}/chapters" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"book_id\": ${BOOK_ID},
        \"name\": \"Kapitel 4: MSCONS – Messwertübermittlung\",
        \"priority\": 4
    }")

CHAPTER4_ID=$(echo "$CHAPTER4_RESPONSE" | jq -r '.id')
echo "✅ Kapitel erstellt (ID: ${CHAPTER4_ID})"

create_page "$CHAPTER4_ID" "MSCONS – Messwertübermittlung verstehen" "chapter-3.html" 1

# Kapitel 5: APERAK
echo ""
echo "📖 Kapitel 5: APERAK"
CHAPTER5_RESPONSE=$(curl -s -X POST "${API_BASE}/chapters" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"book_id\": ${BOOK_ID},
        \"name\": \"Kapitel 5: APERAK – Fehlerbehandlung\",
        \"priority\": 5
    }")

CHAPTER5_ID=$(echo "$CHAPTER5_RESPONSE" | jq -r '.id')
echo "✅ Kapitel erstellt (ID: ${CHAPTER5_ID})"

create_page "$CHAPTER5_ID" "APERAK – Fehlerbehandlung und Bestätigungen" "chapter-4.html" 1

# Kapitel 6: Checkliste
echo ""
echo "📖 Kapitel 6: Checkliste"
CHAPTER6_RESPONSE=$(curl -s -X POST "${API_BASE}/chapters" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{
        \"book_id\": ${BOOK_ID},
        \"name\": \"Kapitel 6: Checkliste EDIFACT-Qualitätssicherung\",
        \"priority\": 6
    }")

CHAPTER6_ID=$(echo "$CHAPTER6_RESPONSE" | jq -r '.id')
echo "✅ Kapitel erstellt (ID: ${CHAPTER6_ID})"

create_page "$CHAPTER6_ID" "Checkliste EDIFACT-Qualitätssicherung" "chapter-5.html" 1

echo ""
echo "✅ Upload abgeschlossen!"
echo "📖 Buch ansehen: https://docs.corrently.de/books/${BOOK_ID}"
