# FAQ Create API Endpunkt

## Übersicht

Der API-Endpunkt `/api/faqs` ermöglicht es, neue FAQ-Einträge über einen POST-Request zu erstellen. Der Endpunkt ist durch Bearer-Token-Authentifizierung geschützt.

**✨ Neue FAQs werden automatisch in die Qdrant Vector Database indiziert** für semantische Suche und KI-gestützte Abfragen.

## Authentifizierung

Der Endpunkt benötigt einen Bearer Token im Authorization-Header:

```
Authorization: Bearer str0mda0
```

## Endpunkt

**URL:** `POST /api/faqs`

**Content-Type:** `application/json`

## Request Body

### Erforderliche Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `question` | string | Die Frage (wird als Titel des FAQ-Eintrags verwendet) |
| `answer` | string | Die ausführliche Antwort im Markdown-Format (kann Links enthalten) |

### Optionale Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `context` | string | Plain-Text Version der Antwort für Suche/Semantic Matching. **Wird automatisch aus `answer` generiert wenn nicht angegeben** |
| `tags` | string[] oder string | Tag(s) zur Kategorisierung (Standard: `["Energiewirtschaft"]`) |
| `description` | string | Kurzbeschreibung (Standard: wird aus der Frage generiert) |
| `additional_info` | string | Zusätzliche Informationen |

### Hinweis zum `context` Feld

Das `context` Feld wird für die **semantische Suche** und **Volltextsuche** verwendet. Es sollte eine **reine Text-Version ohne Markdown-Syntax** sein:

- **Wenn `context` übergeben wird**: Wird direkt verwendet
- **Wenn `context` NICHT übergeben wird**: Wird automatisch aus `answer` generiert durch:
  - Entfernen von Markdown-Headers (`#`, `##`, etc.)
  - Entfernen von **Bold** und *Italic* Formatierung
  - Entfernen von Links (behält nur den Linktext)
  - Entfernen von Code-Blöcken und Inline-Code
  - Entfernen von Listen-Markern

**Empfehlung**: Für beste Suchergebnisse können Sie einen optimierten `context` mitliefern, der die wichtigsten Suchbegriffe enthält.

### Beispiel Request Body

```json
{
  "question": "Was ist der Unterschied zwischen Arbeitspreis und Grundpreis?",
  "answer": "## Arbeitspreis vs. Grundpreis\n\nDer **Arbeitspreis** ist der Preis pro verbrauchter Kilowattstunde (kWh) Strom oder Gas. Er wird mit dem tatsächlichen Verbrauch multipliziert.\n\nDer **Grundpreis** ist eine feste monatliche oder jährliche Gebühr, die unabhängig vom Verbrauch anfällt. Sie deckt Kosten wie:\n\n- Zählermessung\n- Abrechnung\n- Netznutzung (Grundgebühr)\n\n### Berechnung\n\nGesamtkosten = (Verbrauch in kWh × Arbeitspreis) + Grundpreis\n\n### Weitere Informationen\n\nMehr Details finden Sie unter [Preisbestandteile](https://example.com/preise).",
  "context": "Der Arbeitspreis ist der Preis pro verbrauchter Kilowattstunde kWh Strom oder Gas. Der Grundpreis ist eine feste monatliche oder jährliche Gebühr unabhängig vom Verbrauch. Gesamtkosten berechnen sich aus Verbrauch mal Arbeitspreis plus Grundpreis.",
  "tags": ["Energiewirtschaft", "Preise", "Grundlagen"],
  "description": "Erklärung der Unterschiede zwischen Arbeitspreis und Grundpreis in der Energieabrechnung"
}
```

**Hinweis**: Im obigen Beispiel ist `context` optional. Wenn weggelassen, wird er automatisch aus `answer` generiert.

## Response

### Erfolgreiche Antwort (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Was ist der Unterschied zwischen Arbeitspreis und Grundpreis?",
    "description": "Erklärung der Unterschiede zwischen Arbeitspreis und Grundpreis in der Energieabrechnung",
    "context": "## Arbeitspreis vs. Grundpreis...",
    "answer": "## Arbeitspreis vs. Grundpreis...",
    "additional_info": null,
    "tags": ["Energiewirtschaft", "Preise", "Grundlagen"],
    "view_count": 0,
    "is_active": true,
    "is_public": true,
    "created_at": "2025-10-06T10:30:00.000Z",
    "updated_at": "2025-10-06T10:30:00.000Z"
  }
}
```

### Fehler-Antworten

#### 400 Bad Request - Fehlende Pflichtfelder

```json
{
  "success": false,
  "error": "Question and answer are required",
  "code": "MISSING_REQUIRED_FIELDS"
}
```

#### 401 Unauthorized - Token fehlt

```json
{
  "success": false,
  "error": "Access token required",
  "code": "TOKEN_MISSING"
}
```

#### 403 Forbidden - Ungültiger Token

```json
{
  "success": false,
  "error": "Invalid token",
  "code": "TOKEN_INVALID"
}
```

## Verwendungsbeispiele

### cURL

```bash
curl -X POST https://stromhaltig.de/api/faqs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer str0mda0" \
  -d '{
    "question": "Was ist der Unterschied zwischen Arbeitspreis und Grundpreis?",
    "answer": "## Arbeitspreis vs. Grundpreis\n\nDer **Arbeitspreis** ist der Preis pro verbrauchter Kilowattstunde (kWh)...",
    "tags": ["Energiewirtschaft", "Preise"],
    "description": "Erklärung der Unterschiede zwischen Arbeitspreis und Grundpreis"
  }'
```

### JavaScript (Fetch API)

```javascript
const createFAQ = async (question, answer, tags = []) => {
  const response = await fetch('https://stromhaltig.de/api/faqs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer str0mda0'
    },
    body: JSON.stringify({
      question,
      answer,
      tags,
      description: `FAQ-Eintrag zu: ${question}`
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create FAQ');
  }
  
  return response.json();
};

// Verwendung
try {
  const result = await createFAQ(
    'Was ist die EEG-Umlage?',
    `## EEG-Umlage

Die **EEG-Umlage** (Erneuerbare-Energien-Gesetz-Umlage) war bis 2022 ein Bestandteil des Strompreises...

[Mehr Informationen beim BDEW](https://example.com)`,
    ['Energiewirtschaft', 'EEG', 'Umlagen']
  );
  
  console.log('FAQ erstellt:', result.data.id);
} catch (error) {
  console.error('Fehler beim Erstellen:', error.message);
}
```

### Python (requests)

```python
import requests

def create_faq(question: str, answer: str, tags: list = None):
    """Erstellt einen neuen FAQ-Eintrag"""
    
    url = 'https://stromhaltig.de/api/faqs'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer str0mda0'
    }
    
    data = {
        'question': question,
        'answer': answer,
        'tags': tags or ['Energiewirtschaft'],
        'description': f'FAQ-Eintrag zu: {question}'
    }
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    
    return response.json()

# Verwendung
try:
    result = create_faq(
        question='Was ist der Netznutzungsentgelt?',
        answer='''## Netznutzungsentgelt

Das **Netznutzungsentgelt** ist die Gebühr für die Nutzung des Stromnetzes...

### Bestandteile
- Netzentgelt
- Messentgelt
- Abrechnungsentgelt

[Weitere Details](https://example.com)
''',
        tags=['Energiewirtschaft', 'Netz', 'Entgelte']
    )
    
    print(f"FAQ erstellt: {result['data']['id']}")
except requests.exceptions.HTTPError as e:
    print(f"Fehler: {e.response.json()}")
```

## Hinweise zur Antwort (Markdown)

Die `answer` unterstützt vollständiges Markdown:

- **Überschriften**: `## Überschrift`
- **Fettdruck**: `**fett**`
- **Kursiv**: `*kursiv*`
- **Listen**: `- Listenpunkt` oder `1. Nummeriert`
- **Links**: `[Linktext](https://example.com)`
- **Code**: `` `inline` `` oder Code-Blöcke mit ``` 
- **Tabellen**: Markdown-Tabellen

### Beispiel mit Links

```markdown
## Energiepreise

Die Energiepreise setzen sich aus verschiedenen Komponenten zusammen:

1. [Arbeitspreis](/faq/arbeitspreis)
2. [Grundpreis](/faq/grundpreis)
3. [Netzentgelte](https://bundesnetzagentur.de)

Weitere Informationen finden Sie beim [BDEW](https://www.bdew.de).
```

## Datenbankschema

Der FAQ-Eintrag wird in der `faqs`-Tabelle mit folgenden Feldern gespeichert:

- `id`: UUID (automatisch generiert)
- `title`: Die Frage
- `description`: Kurzbeschreibung
- `context`: **Plain-Text Version der Antwort** für Suche/Semantic Matching (automatisch generiert wenn nicht übergeben)
- `answer`: **Markdown-formatierte Antwort** für die Anzeige
- `additional_info`: Zusätzliche Informationen
- `tags`: JSONB Array
- `is_active`: true (Standard)
- `is_public`: true (Standard)
- `view_count`: 0 (wird automatisch erhöht)
- `created_at`, `updated_at`: Timestamps

### Unterschied zwischen `context` und `answer`

| Feld | Zweck | Format | Verwendung |
|------|-------|--------|------------|
| `context` | Suche & Semantic Matching | Plain Text (kein Markdown) | Wird für Volltextsuche und Vector Search indiziert |
| `answer` | Anzeige für Benutzer | Markdown | Wird im Frontend mit Markdown-Rendering angezeigt |

**Best Practice**: Wenn Sie `context` nicht explizit übergeben, wird er automatisch aus `answer` durch Entfernen der Markdown-Syntax generiert.

## Qdrant Vector Database Indexierung

Nach erfolgreichem Erstellen des FAQs wird dieser **automatisch in die Qdrant Collection indiziert**:

### Technische Details

- **Collection**: `willi_mako` (oder gemäß `QDRANT_COLLECTION` Umgebungsvariable)
- **Embedding-Modell**: `text-embedding-004` (Google Gemini)
- **Chunking-Strategie**: 
  - Maximale Chunk-Größe: **1000 Zeichen**
  - Chunking auf Absatzgrenzen für besseren Kontext
  - Mehrere Chunks bei langen Antworten
- **Indexierte Felder**: Title, Description, Context, Answer, Additional Info
- **Payload Metadaten**:
  - `content_type`: "faq"
  - `faq_id`: UUID des FAQ-Eintrags
  - `title`, `description`, `tags`
  - `chunk_index`, `total_chunks`: Chunk-Position und Gesamtzahl
  - `text`: Der chunked Text
  - `chunk_type`: "faq_content"
  - `source`: "faq_api"
  - `created_at`: ISO Timestamp

### Vorteile der Qdrant-Indexierung

✅ **Semantische Suche**: FAQs werden anhand ihrer Bedeutung gefunden, nicht nur Keywords  
✅ **KI-Integration**: LLM kann relevante FAQ-Inhalte für Antworten nutzen  
✅ **Mehrsprachig**: Embedding-Modell versteht semantische Ähnlichkeiten  
✅ **Skalierbar**: Effiziente Vektorsuche auch bei tausenden FAQs  

### Non-Blocking Indexierung

Die Indexierung erfolgt **asynchron im Hintergrund**:
- Der API-Call gibt sofort nach dem DB-Insert eine Antwort zurück (201 Created)
- Die Qdrant-Indexierung läuft parallel ohne den Request zu blockieren
- Bei Indexierungs-Fehlern wird der FAQ trotzdem erfolgreich erstellt (Fehler werden geloggt)

## Sicherheit

⚠️ **Wichtig**: Der Bearer Token `str0mda0` sollte:
- Nur in sicheren Umgebungen verwendet werden
- Nicht in öffentlichen Repositories committet werden
- Über Umgebungsvariablen verwaltet werden (wenn möglich)
- Regelmäßig rotiert werden

In einer Produktionsumgebung sollte der Token als Umgebungsvariable konfiguriert werden.
