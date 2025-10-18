# Change Request: Tooling-Service Attachment Support (Option 2)

## Zusammenfassung
Dieses Change Request Dokument beschreibt die Erweiterung des Tooling-Services um die in "Option 2" definierte Attachment-Verarbeitung für den Endpunkt `/api/v2/tools/generate-script`. Entwickler können ab sofort MSCONS- oder andere textbasierte Beispieldateien direkt als Attachments übergeben. Der Service teilt die Inhalte automatisch in gewichtete Prompt-Snippets auf, reichert den Kontext mit Pseudocode-Leitfäden an und sorgt für robuste Rate-Limit-Wiederholungen.

## Ausgangslage & Zielsetzung
- **Problem:** Ohne Dateianhänge fehlten der Skript-Generierung wichtige Referenzen (z. B. EDIFACT-MSCONS), wodurch das LLM unvollständige oder nicht ausführbare Node.js-Skripte lieferte.
- **Ziel:** Möglichkeit schaffen, textbasierte Dateien als Attachments einzuspeisen, automatisch in Referenzsnippets zu transformieren, das Prompting mit bestehenden Referenzen zu kombinieren und resiliente LLM-Neuversuche nach Rate-Limits sicherzustellen.

## Umfang der Umsetzung
1. **API & Typen**
   - `GenerateToolScriptRequest` akzeptiert jetzt ein optionales Feld `attachments`.
   - Neues DTO `ToolScriptAttachment` (Dateiname, Inhalt, MIME-Type, Beschreibung, Gewicht).
   - OpenAPI-Dokumentation ergänzt (Schemas für Attachments, Referenzen, Testcases).
2. **Service-Logik (`tooling.service.ts`)**
  - Normalisierung mit Validierung: ≤4 Attachments, max. 1 MB Text je Datei, 4 MB je Anfrage.
  - Chunking pro Attachment (bis 3 Chunks, 600–1 800 Zeichen) und Gewichtung.
  - Automatische Umwandlung in Prompt-Referenzen inkl. Header-Metadaten.
  - EDIFACT-Anhänge werden segmentweise (`'` → Zeilenumbruch) formatiert, damit das LLM reale Segmentgrenzen erkennt.
  - Merge mit bestehenden Referenzen und Sortierung nach Gewicht.
  - Verbesserte Rate-Limit-Erholung (bis 2 zusätzliche Wartezyklen, Statusupdates & Warnungen).
  - Pseudocode-Retrieval für relevante EDIFACT-Typen (MSCONS etc.) mit deduplizierten Snippets.
3. **Routes & Validierung**
   - `POST /api/v2/tools/generate-script` reicht Attachments und Testcases an den Service weiter.
4. **Dokumentation**
   - Dieses Change Request Dokument.

## Nutzungsleitfaden für Client-Teams
- **Endpunkt:** `POST /api/v2/tools/generate-script`
- **Neues Feld:**
  ```json
  {
    "attachments": [
      {
        "filename": "beispiel.mscons",
        "content": "UNH+...",
        "mimeType": "application/edifact",
        "description": "MSCONS Tagesprofil 2024-01-01",
        "weight": 7
      }
    ]
  }
  ```
- **Anforderungen:**
  - Nur UTF‑8-Textdateien (MSCONS, CSV, JSON, etc.).
  - Gewicht (1–10) optional; Standardwert 5.
  - Pro Anfrage max. 4 Dateien, jeweils ≤1 MB (gesamt ≤4 MB).
- **Ausgabe:** Generierte Skripte enthalten weiterhin CommonJS-Code unter `script.code`. Kontext-Snippets listen Attachment-Teile als `origin: "reference"`.

## Auswirkungen & Vorteile
- Skripte können EDIFACT- oder CSV-Beispiele exakt nachvollziehen.
- Reduktion der Nachbearbeitungszeit dank präziserer Generierung.
- Robuste Wiederholungen bei temporären LLM-Rate-Limits.
- Verbesserte Pseudocode-Nutzung für MSCONS & andere Nachrichtentypen.

## Risiken & Gegenmaßnahmen
- **Große Dateien:** Eingebaute Limits verhindern Speicherüberlauf; Antwort enthält Fehlermeldung mit `attachments_total_too_large`.
- **Nicht-Textdaten:** MIME-Type-Prüfung optional; Empfehlung, Binärdateien extern zu speichern und Auszüge als Text zu liefern.
- **Leistungsimpact:** Chunking begrenzt je Attachment auf 3 Referenzen; Sortierung priorisiert wichtigste Snippets.

## Validierung & Tests
- Type-Check derzeit ausstehend (npm im Zielsystem nicht verfügbar). Lokale Ausführung empfohlen:
  - `npm run type-check`
  - `npm run build:next`
- Manuelle Prüfung: Testanfrage mit MSCONS-Datei (≤1 MB) gegen `/api/v2/tools/generate-script` senden und Ergebnis-Snippets kontrollieren.
  - Empfohlene Testgröße: vollständige Tagesprofile oder andere Beispiele bis 1 MB.

## Deploy-Checkliste
- [ ] Sicherstellen, dass Backend-Abhängigkeiten installiert (`npm install`).
- [ ] Type-Check und Build erfolgreich.
- [ ] Postman/REST-Test mit Attachments.
- [ ] Monitoring der Rate-Limit-Warnungen nach Rollout.

## Ansprechpartner
- **Backend/Tooling:** Team Marktkommunikation (Lead: M. Keller)
- **Product Owner:** S. Willi
- **Release-Fenster:** Q4 2024, Sprint 21
