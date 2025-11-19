#!/bin/bash

# Bulk Delete Documents Script
# Usage: ./bulk-delete-documents.sh [document_ids...]
# 
# Dieses Script hilft dabei, mehrere Dokumente zu löschen ohne das Rate Limit zu erreichen.
# Es fügt automatisch Pausen zwischen den Requests ein.

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Konfiguration
API_URL="http://localhost:3003/api/workspace/documents"
DELAY_SECONDS=2  # Pause zwischen Requests (kann angepasst werden)

# Prüfe ob jq installiert ist
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq ist nicht installiert. JSON-Parsing ist limitiert.${NC}"
fi

# Funktion zum Löschen eines einzelnen Dokuments
delete_document() {
    local doc_id=$1
    local token=$2
    
    echo -e "${YELLOW}Lösche Dokument: ${doc_id}${NC}"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X DELETE \
        -H "Authorization: Bearer ${token}" \
        "${API_URL}/${doc_id}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 204 ] || [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Erfolgreich gelöscht${NC}"
        return 0
    elif [ "$http_code" -eq 429 ]; then
        echo -e "${RED}✗ Rate Limit erreicht (429)${NC}"
        return 1
    else
        echo -e "${RED}✗ Fehler: HTTP ${http_code}${NC}"
        [ -n "$body" ] && echo "Response: $body"
        return 1
    fi
}

# Hauptfunktion
main() {
    # Prüfe ob Token als Umgebungsvariable gesetzt ist
    if [ -z "$AUTH_TOKEN" ]; then
        echo -e "${RED}Fehler: AUTH_TOKEN Umgebungsvariable nicht gesetzt${NC}"
        echo ""
        echo "Bitte setzen Sie die Variable:"
        echo "  export AUTH_TOKEN='your_jwt_token_here'"
        echo ""
        echo "Sie finden Ihren Token in:"
        echo "  - Browser DevTools -> Application -> Local Storage -> auth_token"
        echo "  - Oder in der Response nach dem Login"
        exit 1
    fi
    
    # Prüfe ob Dokument-IDs übergeben wurden
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <document_id_1> [document_id_2] [document_id_3] ..."
        echo ""
        echo "Beispiel:"
        echo "  $0 doc-uuid-1 doc-uuid-2 doc-uuid-3"
        echo ""
        echo "Oder mit Datei:"
        echo "  $0 \$(cat document_ids.txt)"
        exit 1
    fi
    
    local total=$#
    local success=0
    local failed=0
    
    echo -e "${GREEN}=== Bulk Document Delete ===${NC}"
    echo "Anzahl Dokumente: $total"
    echo "Delay zwischen Requests: ${DELAY_SECONDS}s"
    echo ""
    
    # Durchlaufe alle Dokument-IDs
    local count=0
    for doc_id in "$@"; do
        count=$((count + 1))
        echo -e "${YELLOW}[$count/$total]${NC}"
        
        if delete_document "$doc_id" "$AUTH_TOKEN"; then
            success=$((success + 1))
        else
            failed=$((failed + 1))
            
            # Bei Rate Limit: längere Pause
            if [ $? -eq 1 ]; then
                echo -e "${YELLOW}Warte 15 Sekunden wegen Rate Limit...${NC}"
                sleep 15
                
                # Retry
                echo "Retry..."
                if delete_document "$doc_id" "$AUTH_TOKEN"; then
                    success=$((success + 1))
                    failed=$((failed - 1))
                fi
            fi
        fi
        
        # Pause zwischen Requests (außer beim letzten)
        if [ $count -lt $total ]; then
            sleep $DELAY_SECONDS
        fi
        
        echo ""
    done
    
    # Zusammenfassung
    echo -e "${GREEN}=== Zusammenfassung ===${NC}"
    echo "Erfolgreich: $success"
    echo "Fehlgeschlagen: $failed"
    echo "Total: $total"
}

# Script ausführen
main "$@"
