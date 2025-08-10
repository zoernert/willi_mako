# Willi MaKo MCP Service: API-Dokumentation

## 1. Einleitung

Der Willi MaKo MCP Service ist eine fortschrittliche API, die als **MCP Tool-Server** konzipiert wurde. Sie dient als Schnittstelle zu einer hochoptimierten Wissensdatenbank für den Kontext der deutschen Energie-Marktkommunikation (MaKo).

Der Service ist für die nahtlose Integration in moderne KI-Anwendungen und Frameworks wie n8n, Claude.ai oder LangChain ausgelegt. Er folgt dem **JSON-RPC 2.0**-basierten Protokoll, das von diesen Clients erwartet wird, und bietet erweiterte Funktionen wie **Tools**, **Templates (Prompts)** und **Resources**.

## 2. Architektur: Das Tool-Server-Protokoll

Im Gegensatz zu einer einfachen Retrieval-API implementiert dieser Service das vollständige MCP Tool-Server-Protokoll. Das bedeutet, ein Client interagiert mit dem Server in einem strukturierten, dreistufigen Prozess:

1.  **`POST /initialize` (Handshake):** Der Client stellt sich vor und fragt die grundlegenden Fähigkeiten des Servers ab (z.B. "Unterstützt du Tools? Unterstützt du Ressourcen?").
2.  **`POST /tools/list` (Tool-Erkennung):** Der Client fragt, welche spezifischen "Werkzeuge" der Server anbietet. Unser Server bietet das Werkzeug `search` an und beschreibt dessen Parameter (`query`, `top_k`) mithilfe eines JSON-Schemas.
3.  **`POST /tools/call` (Tool-Ausführung):** Der Client fordert den Server auf, ein bestimmtes Werkzeug (z.B. `search`) mit den vom Benutzer bereitgestellten Parametern auszuführen.

Diese Architektur ermöglicht eine dynamische und flexible Interaktion, bei der der Client die Fähigkeiten des Servers zur Laufzeit erlernen kann.

## 3. Die Wissensbasis: Ein optimierter Vektor-Store

Die hohe Qualität der Suchergebnisse wird durch eine fortschrittliche Datenaufbereitungs- und Vektor-Optimierungsstrategie sichergestellt. Der Service greift nicht auf eine simple Ansammlung von Text-Chunks zu, sondern auf eine reichhaltig annotierte und mehrschichtige Wissensbasis in einer Qdrant Vektor-Datenbank.

Eine vollständige Beschreibung der dahinterliegenden Pipeline finden Sie in der [DATENPIPELINE_BESCHREIBUNG.md](./DATENPIPELINE_BESCHREIBUNG.md).

## 4. API-Spezifikation (JSON-RPC 2.0)

Alle Anfragen und Antworten folgen dem JSON-RPC 2.0-Standard.

### 4.1. Haupt-Endpunkte

- **`POST /initialize`**: Startet den Protokoll-Handshake.
- **`POST /tools/list`**: Listet alle verfügbaren Tools und deren `inputSchema` auf.
- **`POST /tools/call`**: Führt ein benanntes Tool mit den übergebenen Argumenten aus.
- **`POST /prompts/list`**: Listet vordefinierte Prompt-Vorlagen auf.
- **`POST /resources/list`**: Listet durchsuchbare Daten-Ressourcen auf.

### 4.2. Root-Endpunkt (`/`)

Der Root-Endpunkt dient als primärer Discovery-Mechanismus. Er leitet `POST`-Anfragen an die korrekten Endpunkte weiter und liefert bei `GET`-Anfragen eine allgemeine Übersicht der Server-Fähigkeiten. **Clients sollten immer die Root-URL als Basis-URL verwenden.**

## 5. Nutzungsbeispiele mit `curl`

### Beispiel 1: Protokoll-Handshake

**Anfrage:**
```bash
curl -X POST https://mcp.stromhaltig.de/initialize \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```
**Antwort:**
Zeigt die Fähigkeiten des Servers an (Tools, Resources, Prompts).

### Beispiel 2: Tools auflisten

**Anfrage:**
```bash
curl -X POST https://mcp.stromhaltig.de/tools/list \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```
**Antwort:**
Liefert eine Liste der verfügbaren Tools, inklusive des `search`-Tools und seines `inputSchema`.

### Beispiel 3: Tool ausführen (Suche)

**Anfrage:**
```bash
curl -X POST https://mcp.stromhaltig.de/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search",
      "arguments": {
        "query": "Wie funktioniert der Lieferantenwechsel?",
        "top_k": 2
      }
    }
  }'
```
**Antwort:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "**Quelle:** knowledge/gpke.md\n**Score:** 0.647\n\n#### 1.1 AD Kündigung 1.4 AD Lieferbeginn. Dieser Geschäftsprozess stellt den Standard-**Lieferantenwechsel** dar...\n\n---\n\n**Quelle:** N/A\n**Score:** 0.646\n\n7. Austauschprozesse zwischen NB und LF zur Lieferantensummenzeit-\nreihe und -clearingliste...\n\n---\n"
      }
    ]
  }
}
```

## 6. Integration in n8n

Die Integration in n8n erfolgt über den **MCP Client Tool**-Node.

1.  **Credential erstellen:**
    -   Gehen Sie zu "Credentials" und erstellen Sie eine neue "MCP Client"-Credential.
    -   **Base URL**: Geben Sie die Root-URL des Servers ein: `https://mcp.stromhaltig.de`
    -   Speichern Sie die Credential.

2.  **MCP Client Tool Node konfigurieren:**
    -   Fügen Sie den "MCP Client Tool"-Node zu Ihrem Workflow hinzu.
    -   Wählen Sie die eben erstellte Credential aus.
    -   **Warten Sie einen Moment.** Der Node führt im Hintergrund den Discovery-Prozess (`/initialize`, `/tools/list`) aus.
    -   **Tool Selection**: Wählen Sie aus der nun gefüllten Dropdown-Liste das `search`-Tool aus.
    -   **Parameter**: Die Eingabefelder für `query` und `top_k` erscheinen nun dynamisch. Verbinden Sie diese mit den entsprechenden Eingabedaten Ihres Workflows.

Mit dieser Konfiguration kann n8n die Fähigkeiten des Servers dynamisch erkennen und korrekt mit ihm interagieren.