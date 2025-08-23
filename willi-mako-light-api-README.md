# Willi-Mako-Light API

Ein einfacher HTTP-Service, der eine vereinfachte API für die Willi-Mako Chat-Funktionalität anbietet. Der Service ermöglicht das einfache Testen der Chat-Funktion via curl oder andere HTTP-Clients.

## Features

- Automatische Authentifizierung mit festen Anmeldedaten
- Einfache Endpunkte für Chat-Anfragen
- Detaillierte Protokollierung von API-Interaktionen und Antwort-Metriken
- Unterstützung für GET- und POST-Anfragen
- Einfacher Start über npm-Befehle (`npm run light-api`)

## Installation

1. Abhängigkeiten installieren:

```bash
npm install express morgan body-parser axios dotenv
```

2. Script ausführbar machen:

```bash
chmod +x willi-mako-light-api.js
```

## Starten des Services

Verwenden Sie einen der folgenden Befehle, um den Service zu starten:

### 1. Über npm (empfohlen):

```bash
npm run light-api
```

Für die Entwicklung mit automatischem Neustart bei Änderungen:

```bash
npm run light-api:dev
```

### 2. Mit dem Start-Script:

```bash
./start-willi-mako-light-api.sh
```

### 3. Direkter Start:

```bash
node willi-mako-light-api.js
```

Der Service läuft standardmäßig auf Port 3719.

## Endpunkte

### GET /

Gibt den Status der API und Informationen zu den verfügbaren Endpunkten zurück.

**Beispiel:**
```bash
curl http://localhost:3719/
```

### POST /chat

Sendet eine Chat-Anfrage mit einem JSON-Body. Der Endpunkt unterstützt mehrere Anfrage-Formate:

1. Einfaches Format mit `query` Parameter:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"query":"Was bedeutet GPKE?"}' http://localhost:3719/chat
```

2. Frontend-kompatibles Format mit `content` und `contextSettings`:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"content":"Was bedeutet GPKE?","contextSettings":{"useWorkspaceOnly":false,"workspacePriority":"medium","includeUserDocuments":true,"includeUserNotes":true,"includeSystemKnowledge":true,"includeM2CRoles":true}}' http://localhost:3719/chat
```

### GET /chat/query/:query

Sendet eine Chat-Anfrage direkt in der URL.

**Beispiel:**
```bash
curl http://localhost:3719/chat/query/Was%20bedeutet%20GPKE?
```

### GET /logs

Listet alle verfügbaren Log-Dateien auf.

**Beispiel:**
```bash
curl http://localhost:3719/logs
```

### GET /logs/:date

Ruft die Logs eines bestimmten Tages ab (im Format YYYY-MM-DD).

**Beispiel:**
```bash
curl http://localhost:3719/logs/2023-09-18
```

## Beispiel für Frontend-kompatible Anfragen

Der Willi-Mako-Light API Service unterstützt auch das gleiche Anfragemuster, das vom Frontend verwendet wird. Hier ist ein Beispiel, wie Sie eine Anfrage im gleichen Format wie das Frontend senden können:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"content":"Welche Inhalte sind in einer Invoic Nachricht?","contextSettings":{"useWorkspaceOnly":false,"workspacePriority":"medium","includeUserDocuments":true,"includeUserNotes":true,"includeSystemKnowledge":true,"includeM2CRoles":true}}' \
  http://localhost:3719/chat
```

Dieses Format ist identisch mit dem, das vom Frontend verwendet wird, nur dass Sie nicht den Chat-ID-Teil und die Authentifizierung angeben müssen, da der Service dies automatisch für Sie erledigt.

## Antwortformat

Die API gibt Antworten im folgenden Format zurück:

```json
{
  "success": true,
  "query": "Was bedeutet GPKE?",
  "answer": "GPKE steht für \"Geschäftsprozesse zur Kundenbelieferung mit Elektrizität\"...",
  "metrics": {
    "responseTime": 1234,
    "messageType": "normal",
    "hasCs30Response": false,
    "cs30SourceCount": 0,
    "hasEnhancedQuery": true,
    "vectorSearchScore": 0.85,
    "sourceCount": 3,
    "characterCount": 500
  },
  "sources": [...],
  "cs30Sources": [...],
  "enhancedQuery": "Was bedeutet der Prozess GPKE in der Energieversorgung?",
  "logs": {
    "request": {...},
    "response": {...}
  }
}
```

### Unterstützung für Klarstellungsanfragen

Wenn die Anfrage zu unspezifisch ist, gibt die API eine Klarstellungsanfrage zurück:

```json
{
  "success": true,
  "query": "Was ist die GPKE",
  "answer": "Für eine präzisere Antwort benötige ich weitere Informationen:\n\n1. Auf welchen Energieträger bezieht sich Ihre Frage?\n   Optionen: Strom, Gas, Beide\n\n2. Aus welcher Sicht möchten Sie die Information?\n   Optionen: Energielieferant, Netzbetreiber, Messstellenbetreiber, Stadtwerke, Endkunde\n\n...",
  "metrics": {
    "responseTime": 64,
    "messageType": "clarification",
    "hasCs30Response": false,
    "cs30SourceCount": 0,
    "hasEnhancedQuery": false,
    "vectorSearchScore": null,
    "sourceCount": 0,
    "characterCount": 567
  },
  "logs": {...}
}
```

In diesem Fall enthält das Feld `answer` die Klarstellungsfragen, die der Benutzer beantworten sollte, um eine präzisere Antwort zu erhalten. Das Feld `messageType` hat den Wert "clarification", um anzuzeigen, dass es sich um eine Klarstellungsanfrage handelt.

## Logging

Der Service protokolliert alle Anfragen und Antworten in JSON-Dateien im Verzeichnis `logs`. Die Log-Dateien enthalten detaillierte Informationen zu den API-Interaktionen, einschließlich:

- Anfragen und Antworten
- Antwortzeiten
- Metriken (z.B. Anzahl der Quellen, Vector-Search-Score)
- Fehlerinformationen

Die Log-Dateien können für die Optimierung und Qualitätsverbesserung des Systems verwendet werden.

## Testen des Services

Verwenden Sie einen der folgenden Befehle, um den Service zu testen:

### 1. Über npm (empfohlen):

```bash
npm run light-api:test
```

### 2. Direkter Aufruf des Test-Scripts:

```bash
./test-willi-mako-light-api.sh
```

Dies führt eine Reihe von Testanfragen aus und zeigt die Ergebnisse an.
