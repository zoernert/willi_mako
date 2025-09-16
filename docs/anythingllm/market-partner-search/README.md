# Marktpartnersuche (Willi‑Mako) – AnythingLLM Agent Skill

Dieses Custom‑Skill erlaubt die Suche nach Marktpartnern über die öffentliche Willi‑Mako API und gibt kompakte Treffer als Text zurück.

## Installation

1) Ordner kopieren in den AnythingLLM Storage‑Pfad unter:
   plugins/agent-skills/market-partner-search

2) In AnythingLLM im Agent die Variable setzen:
   - API_BASE_URL: Basis‑URL eurer Instanz, z. B. https://stromhaltig.de oder http://localhost:3003

3) Skill im Agent aktivieren. Änderungen werden per Hot‑Reload erkannt.

## Nutzung

Den Agent mit aktiviertem Skill befragen, z. B.:

- "Suche Marktpartner EWE"
- "Finde BDEW Code von Stadtwerke Musterstadt"
- "EIC 11XABCDEFGH1234"

Das Skill ruft GET /api/public/market-partners/search?q=…&limit=5 auf und gibt eine textuelle Ergebnisliste zurück.

## Rückgabeformat

Reiner Text (String), z. B.:

Top Ergebnisse zur Marktpartnersuche für "EWE":
1. EWE NETZ GmbH — 9900123456 (BDEW Code)
2. …

## Hinweise

- Die öffentliche API liefert bewusst nur kompakte Felder (code, companyName, codeType, source).
- Für internen Gebrauch stehen detailliertere Endpunkte unter /api/v1/codes/* zur Verfügung (authentifiziert).