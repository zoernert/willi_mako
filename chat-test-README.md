# Willi-Mako Chat Test CLI

Eine Kommandozeilen-Anwendung zum Testen der Willi-Mako Chat API mit umfassender Protokollierung für Systemoptimierung und Qualitätsverbesserung.

## Funktionen

- Authentifizierung mit der Willi-Mako API
- Bearer-Token-Abruf
- Test-Chat-Ausführung
- Detaillierte Protokollierung von API-Interaktionen und Antwort-Metriken
- Interaktiver Modus für die Eingabe von Abfragen
- Batch-Modus für die Verarbeitung mehrerer Abfragen aus einer Datei

## Installation

1. Führen Sie das Installationsskript aus, um die erforderlichen Abhängigkeiten zu installieren:

```bash
./install-chat-test.sh
```

Alternativ können Sie die Abhängigkeiten manuell installieren:

```bash
npm install --save-dev axios commander chalk dotenv
```

## Verwendung

### Interaktiver Modus

Im interaktiven Modus können Sie Abfragen eingeben und die Antworten sofort sehen:

```bash
./willi-mako-chat-test.js -i
```

### Einzelne Abfrage ausführen

```bash
./willi-mako-chat-test.js --query "Was bedeutet GPKE?"
```

### Abfragen aus einer Datei ausführen

Sie können mehrere Abfragen aus einer JSON-Datei ausführen:

```bash
./willi-mako-chat-test.js --file test-queries.json
```

Die Datei sollte ein JSON-Array von Strings enthalten, z.B.:

```json
[
  "Wie lege ich einen neuen Vertrag in CS30 an?",
  "Was bedeutet GPKE?",
  "Wie melde ich einen Zählerwechsel?",
  "Was bedeutet die Fehlermeldung E225?"
]
```

### Vollständige Optionen

```
Options:
  -V, --version           output the version number
  -e, --email <email>     Email for authentication (default: "kontakt+demo@stromdao.com")
  -p, --password <password>  Password for authentication (default: "willi.mako")
  -q, --query <query>     Chat query to send
  -f, --file <path>       Path to JSON file with query list
  -i, --interactive       Interactive mode for entering queries
  -v, --verbose           Verbose output
  --api-url <url>         API base URL (default: "https://stromhaltig.de/api")
  -l, --log-dir <path>    Log directory (default: "./logs")
  -h, --help              display help for command
```

## Debug-Log-Dateien

Die Debug-Log-Dateien werden im Verzeichnis `logs` gespeichert. Jede Log-Datei enthält detaillierte Informationen zu den API-Interaktionen, einschließlich:

- Anfragen und Antworten
- Antwortzeiten
- Metriken (z.B. Anzahl der Quellen, Vector-Search-Score)
- Fehlerinformationen

Die Log-Dateien können für die Optimierung und Qualitätsverbesserung des Systems verwendet werden.

## Beispiel für eine Log-Datei

```json
[
  {
    "timestamp": "2025-08-23T12:00:00.000Z",
    "type": "info",
    "message": "Starting Willi-Mako Chat Test CLI",
    "data": {
      "email": "kontakt+demo@stromdao.com",
      "password": "willi.mako",
      "verbose": true,
      "apiUrl": "https://stromhaltig.de/api",
      "logDir": "./logs"
    }
  },
  {
    "timestamp": "2025-08-23T12:00:01.000Z",
    "type": "api",
    "message": "Authenticating user: kontakt+demo@stromdao.com"
  },
  {
    "timestamp": "2025-08-23T12:00:02.000Z",
    "type": "success",
    "message": "Authentication successful",
    "data": {
      "userId": "user-id",
      "role": "user"
    }
  },
  {
    "timestamp": "2025-08-23T12:00:03.000Z",
    "type": "api",
    "message": "Sending chat query: \"Was bedeutet GPKE?\"",
  },
  {
    "timestamp": "2025-08-23T12:00:05.000Z",
    "type": "success",
    "message": "Chat response received",
    "data": {
      "query": "Was bedeutet GPKE?",
      "answer": "GPKE steht für \"Geschäftsprozesse zur Kundenbelieferung mit Elektrizität\"...",
      "metrics": {
        "responseTime": 2000,
        "hasCs30Response": false,
        "cs30SourceCount": 0,
        "hasEnhancedQuery": true,
        "vectorSearchScore": 0.85,
        "sourceCount": 3,
        "characterCount": 500
      },
      "sources": [
        {
          "source_document": "BDEW Dokument",
          "content_type": "PDF",
          "score": 0.85
        },
        ...
      ],
      "enhancedQuery": "Was bedeutet der Prozess GPKE in der Energieversorgung und was ist dessen Funktion?"
    }
  }
]
```
