# FAQ Create API Endpunkt

## Übersicht

Der API-Endpunkt `/api/faqs` ermöglicht es, neue FAQ-Einträge über einen POST-Request zu erstellen. Der Endpunkt ist durch Bearer-Token-Authentifizierung geschützt.

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
| `tags` | string[] oder string | Tag(s) zur Kategorisierung (Standard: `["Energiewirtschaft"]`) |
| `description` | string | Kurzbeschreibung (Standard: wird aus der Frage generiert) |
| `additional_info` | string | Zusätzliche Informationen |

### Beispiel Request Body

```json
{
  "question": "Was ist der Unterschied zwischen Arbeitspreis und Grundpreis?",
  "answer": "## Arbeitspreis vs. Grundpreis\n\nDer **Arbeitspreis** ist der Preis pro verbrauchter Kilowattstunde (kWh) Strom oder Gas. Er wird mit dem tatsächlichen Verbrauch multipliziert.\n\nDer **Grundpreis** ist eine feste monatliche oder jährliche Gebühr, die unabhängig vom Verbrauch anfällt. Sie deckt Kosten wie:\n\n- Zählermessung\n- Abrechnung\n- Netznutzung (Grundgebühr)\n\n### Berechnung\n\nGesamtkosten = (Verbrauch in kWh × Arbeitspreis) + Grundpreis\n\n### Weitere Informationen\n\nMehr Details finden Sie unter [Preisbestandteile](https://example.com/preise).",
  "tags": ["Energiewirtschaft", "Preise", "Grundlagen"],
  "description": "Erklärung der Unterschiede zwischen Arbeitspreis und Grundpreis in der Energieabrechnung"
}
```

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
- `context`: Kopie der Antwort (für Semantic Search)
- `answer`: Die Markdown-Antwort
- `additional_info`: Zusätzliche Informationen
- `tags`: JSONB Array
- `is_active`: true (Standard)
- `is_public`: true (Standard)
- `view_count`: 0 (wird automatisch erhöht)
- `created_at`, `updated_at`: Timestamps

## Sicherheit

⚠️ **Wichtig**: Der Bearer Token `str0mda0` sollte:
- Nur in sicheren Umgebungen verwendet werden
- Nicht in öffentlichen Repositories committet werden
- Über Umgebungsvariablen verwaltet werden (wenn möglich)
- Regelmäßig rotiert werden

In einer Produktionsumgebung sollte der Token als Umgebungsvariable konfiguriert werden.
