Change Request: BDEW/EIC Code-Nachschlagefunktion und KI-Integration


   - CR-ID: CR-CODE-LOOKUP-001
   - Datum: 2025-07-24
   - Autor: Gemini AI Assistant
   - Status: Vorgeschlagen

  1. Zusammenfassung


  Dieses Dokument beschreibt die Konzeption und Implementierung einer zentralen Nachschlagefunktion für BDEW- und EIC-Codes. Diese Funktion wird als eigenständiges
  Modul implementiert und tief in bestehende Systemkomponenten wie den KI-Chat und den Nachrichten-Analysator integriert. Ziel ist es, die Effizienz der
  Sachbearbeiter durch schnellen, kontextbezogenen Zugriff auf Codedaten zu steigern.


  2. Hintergrund und Business Value


  Sachbearbeiter in der Marktkommunikation benötigen täglich Zugriff auf BDEW- und EIC-Listen, um Marktpartner zu identifizieren. Derzeit geschieht dies über
  externe Tools oder Listen, was ineffizient und fehleranfällig ist. Das Projekt verfügt bereits über die Import-Skripte importBDEWCodes.js und importEICCodes.js,
  welche die notwendigen Daten in den Tabellen bdewcodes und eic bereitstellen. Diese Datenbasis wird bisher nicht aktiv genutzt.


  Business Value:
   - Effizienzsteigerung: Reduziert die Zeit für manuelle Code-Recherchen um bis zu 90%.
   - Fehlerreduktion: Direkter Zugriff auf validierte Daten minimiert Fehler bei der Identifikation von Marktpartnern.
   - Prozessbeschleunigung: Der Nachrichten-Analysator wird durch die direkte Auflösung von Codes erheblich aufgewertet und beschleunigt die Fallbearbeitung.
   - Wissensmanagement: Der KI-Chat wird zu einem echten Experten für Codelisten, was die Einarbeitung neuer Mitarbeiter vereinfacht und Rückfragen reduziert.


  3. User Stories


  Story 1: Dedizierte Code-Suche
  Als Sachbearbeiter
  möchte ich eine dedizierte Suchoberfläche, um BDEW- und EIC-Codes nach Name, Code oder Typ schnell durchsuchen zu können,
  damit ich nicht mehr auf externe Listen oder Webseiten angewiesen bin.


  Story 2: KI-gestützte Abfrage
  Als Sachbearbeiter
  möchte ich dem KI-Chat Fragen wie "Wer ist der Netzbetreiber mit dem Code 990000100001?" stellen können,
  damit ich direkt im Chat-Kontext eine schnelle und präzise Antwort erhalte.


  Story 3: Intelligenter Nachrichten-Analysator
  Als Sachbearbeiter
  möchte ich, dass im Nachrichten-Analysator neben den BDEW- und EIC-Codes automatisch der Klarname des Marktpartners angezeigt wird,
  damit ich den Inhalt einer Nachricht sofort und ohne manuelle Zuordnung verstehe.

  4. Vorgeschlagene Änderungen (Technische Spezifikation)


  Die Implementierung folgt der etablierten modularen Architektur des Projekts.

  4.1. Datenbank


  Die erforderlichen Tabellen bdewcodes und eic werden bereits durch die bestehenden Skripte importBDEWCodes.js und importEICCodes.js erstellt. Diese Skripte
  implementieren bereits eine search_vector-Spalte mit einem GIN-Index für eine performante Volltextsuche. Diese bestehende Struktur wird die Grundlage für das neue
  Modul sein. Es sind keine Schema-Änderungen erforderlich.


  4.2. Backend (/src)


  4.2.1. Neues Modul: codelookup


  Es wird ein neues Modul src/modules/codelookup/ erstellt, das der bestehenden Architektur folgt.


   - Verzeichnisstruktur:


   1   src/modules/codelookup/
   2   ├── interfaces/
   3   │   ├── codelookup.interface.ts
   4   │   └── codelookup.repository.interface.ts
   5   ├── repositories/
   6   │   └── postgres-codelookup.repository.ts
   7   └── services/
   8       └── codelookup.service.ts



   - `codelookup.repository.ts`: Implementiert die Datenbankabfragen. Die Suche nutzt die search_vector-Spalte.
     - Beispiel-Query für die Suche:


   1     SELECT code, company_name, code_type, valid_from, valid_to
   2     FROM bdewcodes
   3     WHERE search_vector @@ to_tsquery('german', $1)
   4     LIMIT 20;
   5     -- Äquivalente Query für die 'eic' Tabelle.



   - `codelookup.service.ts`: Enthält die Business-Logik, um beide Tabellen zu durchsuchen und die Ergebnisse zu aggregieren.
     - searchCodes(query: string): Promise<CodeSearchResult[]>: Führt die Suche in beiden Tabellen aus und gibt ein kombiniertes, einheitliches Ergebnis zurück.


  4.2.2. Neue API-Route


   - Datei: src/routes/codes.ts
   - Endpoint: GET /api/v1/codes/search
   - Query-Parameter: q (der Suchbegriff)
   - Funktion: Nimmt eine Suchanfrage entgegen, ruft den codelookup.service auf und gibt die Ergebnisse zurück.
   - Integration: Die neue Route wird in src/server.ts registriert.


  4.2.3. Erweiterung des KI-Chat-Service


   - Datei: src/services/gemini.ts
   - Änderung: Der Gemini-Service wird um ein "Tool" bzw. eine "Function" erweitert, die es dem LLM erlaubt, die neue Code-Suchfunktion aufzurufen.
   - Tool-Definition (Beispiel):


    1   {
    2     "name": "lookup_energy_code",
    3     "description": "Sucht nach deutschen BDEW- oder EIC-Energiewirtschaftscodes. Nützlich, um herauszufinden, welches Unternehmen zu einem bestimmten 
      Code gehört.",
    4     "parameters": {
    5       "type": "object",
    6       "properties": {
    7         "code": {
    8           "type": "string",
    9           "description": "Der BDEW- oder EIC-Code, nach dem gesucht werden soll."
   10         }
   11       },
   12       "required": ["code"]
   13     }
   14   }

   - Workflow:
     1. Benutzer fragt den Chat nach einem Code.
     2. Das LLM erkennt die Absicht und entscheidet, das lookup_energy_code-Tool zu verwenden.
     3. Das Backend fängt den Tool-Aufruf ab und ruft codelookup.service.searchCodes(code) auf.
     4. Das Suchergebnis wird an das LLM zurückgegeben.
     5. Das LLM formuliert eine menschenlesbare Antwort basierend auf dem Ergebnis.


  4.2.4. Erweiterung des Nachrichten-Analysators


   - Betroffenes Modul: src/modules/message-analyzer/
   - Datei: message-analyzer.service.ts (oder äquivalent)
   - Änderung:
     1. Nach dem Parsen der EDIFACT/XML-Nachricht werden alle erkannten BDEW- und EIC-Codes extrahiert.
     2. Für jeden gefundenen Code wird der codelookup.service.searchCodes(code) aufgerufen.
     3. Das zurückgegebene Analyse-Objekt wird um die aufgelösten Namen erweitert.
   - Beispiel-Ergebnis (alt vs. neu):
     - Alt: { segment: 'NAD', party: 'MR', code: '990000100001' }
     - Neu: { segment: 'NAD', party: 'MR', code: '990000100001', resolvedName: 'Stadtwerke Musterstadt GmbH' }

  4.3. Frontend (/client)


  4.3.1. Neuer API-Service


   - Datei: client/src/services/codeLookupApi.ts
   - Funktion: searchCodes(query: string): Promise<CodeSearchResult[]>
   - Implementierung: Nutzt den bestehenden apiClient, um den neuen Backend-Endpunkt GET /api/v1/codes/search aufzurufen.

  4.3.2. Neue UI-Komponente für die Code-Suche


   - Komponente: client/src/components/CodeLookup/CodeSearch.tsx
   - UI-Elemente:
       - Ein TextField von Material-UI für die Suchanfrage.
       - Eine Table oder List von Material-UI zur Anzeige der Ergebnisse.
       - Spalten: Code, Name des Unternehmens, Code-Typ, Gültig von, Gültig bis.
   - Integration: Die Komponente wird auf einer neuen Seite unter dem Pfad /lookup eingebunden, die über die Hauptnavigation erreichbar ist.


  4.3.3. Anpassung der Nachrichten-Analyse-UI


   - Betroffene Komponente: client/src/pages/MessageAnalyzer.tsx (oder äquivalent)
   - Änderung: Die Komponente wird so angepasst, dass sie das neue Feld resolvedName aus der API-Antwort ausliest und direkt neben dem Code anzeigt. Dies kann z.B.
     durch einen Tooltip oder eine zusätzliche Spalte in der Ergebnisdarstellung geschehen.

  5. Auswirkungen und Risiken


   - Backend: Geringes Risiko. Die Änderungen sind modular und betreffen keine kritischen Kernfunktionen. Bestehende Services werden nur erweitert.
   - Frontend: Geringes Risiko. Neue, isolierte Komponenten und minimale Anpassungen an einer bestehenden Komponente.
   - Datenbank: Kein Risiko, da keine Schema-Änderungen erforderlich sind.
   - Abhängigkeiten: Keine neuen externen Bibliotheken erforderlich.

  6. Rollback-Plan


   - Backend: Der neue API-Endpunkt kann deaktiviert werden. Die Erweiterungen in gemini.ts und message-analyzer.service.ts können durch Git-Revert rückgängig gemacht
     werden.
   - Frontend: Die neue Seite /lookup kann aus dem Router entfernt werden. Die Anpassungen in der MessageAnalyzer-Komponente können zurückgesetzt werden.
