#!/bin/bash

# EDIFACT Buch Publisher für docs.corrently.de
# Generiert und publiziert alle Kapitel via BookStack API

BOOK_ID=27
AUTH_HEADER="Authorization: Token 0y5A9KTlTSe0N3rfbRQULofJzlrRmdne:AMVO3eq4a8F5tZ4m8KQHVpwRrWEJMEir"
API_BASE="https://docs.corrently.de/api"

echo "📚 EDIFACT Buch Publisher gestartet..."
echo "🎯 Buch-ID: $BOOK_ID"
echo ""

# Kapitel 1: Grundlagen EDIFACT
echo "📖 Erstelle Kapitel 1: Grundlagen EDIFACT in der MaKo..."
CHAPTER1_RESPONSE=$(curl -s --request POST \
  --url "$API_BASE/chapters" \
  --header "$AUTH_HEADER" \
  --header 'Content-Type: application/json' \
  --data '{
    "book_id": '$BOOK_ID',
    "name": "Grundlagen EDIFACT in der MaKo",
    "description": "Einführung in EDIFACT-Strukturen und Segmente",
    "priority": 1
  }')

CHAPTER1_ID=$(echo $CHAPTER1_RESPONSE | jq -r '.id')
echo "✅ Kapitel 1 erstellt (ID: $CHAPTER1_ID)"

# Seite 1.1: Was ist EDIFACT? (Content bereits vorhanden in offsite-content-ready-to-publish.md)
echo "   📄 Erstelle Seite 1.1: Was ist EDIFACT..."

# Hinweis: Die vollständigen HTML-Inhalte sind zu lang für ein Shell-Script
# Stattdessen erstellen wir ein Python-Script für die API-Calls

echo ""
echo "⚠️  Wechsle zu Python-Script für bessere Handhabung..."
echo ""

# Python-Script wird jetzt erstellt
cat > /tmp/publish_edifact.py << 'PYTHON_SCRIPT'
import requests
import json

BOOK_ID = 27
API_BASE = "https://docs.corrently.de/api"
AUTH_TOKEN = "0y5A9KTlTSe0N3rfbRQULofJzlrRmdne:AMVO3eq4a8F5tZ4m8KQHVpwRrWEJMEir"
HEADERS = {
    "Authorization": f"Token {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# Kapitel-Daten aus Willi-Mako MCP (bereits generiert)
chapters_data = {
    "Kapitel 1":  {
        "name": "Grundlagen EDIFACT in der MaKo",
        "description": "Einführung in EDIFACT-Strukturen und Segmente",
        "pages": [
            {
                "name": "Was ist EDIFACT und warum wird es verwendet?",
                "content_file": "chapter1_1.html"
            },
            {
                "name": "Struktur einer EDIFACT-Nachricht (UNB, UNH, UNT, UNZ)",
                "content_file": "chapter1_2.html"
            }
        ]
    },
    "Kapitel 2": {
        "name": "UTILMD – Stammdaten und Prozessmeldungen",
        "description": "UTILMD im Detail mit Anwendungsfällen",
        "pages": [
            {
                "name": "UTILMD – Stammdaten und Prozessmeldungen im Detail",
                "content_file": "chapter2.html"
            }
        ]
    },
    "Kapitel 3": {
        "name": "MSCONS – Messwertübermittlung",
        "description": "MSCONS verstehen und nutzen",
        "pages": [
            {
                "name": "MSCONS – Messwertübermittlung verstehen und nutzen",
                "content_file": "chapter3.html"
            }
        ]
    }
}

print("📚 EDIFACT Buch Publisher (Python)")
print(f"🎯 Buch-ID: {BOOK_ID}")
print("")

# Erstelle Kapitel und Seiten
for chapter_key, chapter_data in chapters_data.items():
    print(f"📖 Erstelle {chapter_key}: {chapter_data['name']}...")
    
    # Erstelle Kapitel
    chapter_response = requests.post(
        f"{API_BASE}/chapters",
        headers=HEADERS,
        json={
            "book_id": BOOK_ID,
            "name": chapter_data["name"],
            "description": chapter_data["description"]
        }
    )
    
    if chapter_response.status_code in [200, 201]:
        chapter_id = chapter_response.json().get("id")
        print(f"✅ Kapitel erstellt (ID: {chapter_id})")
        
        # Erstelle Seiten
        for page in chapter_data["pages"]:
            print(f"   📄 Erstelle Seite: {page['name']}...")
            # Content wird separat geladen (siehe nächster Schritt)
            print(f"   ⏳ Content muss manuell aus MCP-Output übernommen werden")
    else:
        print(f"❌ Fehler beim Erstellen von {chapter_key}: {chapter_response.text}")

print("")
print("✅ Struktur angelegt!")
print("📝 Nächster Schritt: Content aus Willi-Mako MCP einfügen")

PYTHON_SCRIPT

python3 /tmp/publish_edifact.py

echo ""
echo "✅ Kapitel-Struktur angelegt!"
echo ""
echo "📝 Nächste Schritte:"
echo "1. Content aus MCP-Responses in BookStack Pages einfügen"
echo "2. Weitere Kapitel 4-5 mit Willi-Mako generieren"
echo "3. Backlinks zu stromhaltig.de validieren"
echo ""
