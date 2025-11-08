# Message Analyzer API V2 Integration

## Übersicht

Die Message Analyzer Endpunkte wurden erfolgreich zur **API V2** hinzugefügt. Die API V2 bietet verbesserte Authentifizierung, Rate-Limiting und einheitliche Response-Strukturen.

## API-Endpunkte

### Base URL
```
/api/v2/message-analyzer
```

### Authentifizierung
Alle Endpunkte erfordern einen JWT Bearer Token:
```http
Authorization: Bearer <your-jwt-token>
```

Token erhalten:
```bash
POST /api/v2/auth/token
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

## Endpunkt-Übersicht

### 1. POST /analyze
**Strukturelle Analyse einer EDIFACT-Nachricht**

**Request:**
```json
{
  "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Dies ist eine MSCONS-Nachricht...",
    "plausibilityChecks": ["..."],
    "structuredData": {
      "segments": [
        {
          "tag": "UNH",
          "elements": ["00000000001111", "MSCONS:D:11A:UN:2.6e"],
          "original": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e",
          "description": "Message header",
          "resolvedCodes": {}
        }
      ]
    },
    "format": "EDIFACT"
  }
}
```

### 2. POST /explanation
**KI-generierte verständliche Erklärung**

**Request:**
```json
{
  "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\n..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": "Diese MSCONS-Nachricht enthält Zählerstände...",
    "success": true
  }
}
```

### 3. POST /chat
**Interaktiver Chat über EDIFACT-Nachricht**

**Request:**
```json
{
  "message": "In welchem Zeitfenster ist der Verbrauch am höchsten?",
  "chatHistory": [
    {
      "role": "user",
      "content": "Was ist das für eine Nachricht?"
    },
    {
      "role": "assistant",
      "content": "Das ist eine MSCONS-Nachricht..."
    }
  ],
  "currentEdifactMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\n..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Der höchste Verbrauch liegt im Zeitfenster von 18:00-19:00 Uhr mit 1.234,5 kWh.",
    "timestamp": "2025-11-08T12:34:56.789Z"
  }
}
```

### 4. POST /modify
**Nachricht modifizieren**

**Request:**
```json
{
  "instruction": "Erhöhe den Verbrauch in jedem Zeitfenster um 10%",
  "currentMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\n..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modifiedMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nQTY+220:1358.023:KWH\n...",
    "isValid": true,
    "timestamp": "2025-11-08T12:34:56.789Z"
  }
}
```

### 5. POST /validate
**Nachricht validieren**

**Request:**
```json
{
  "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\n..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": ["Segmentanzahl sollte mit UNT übereinstimmen"],
    "messageType": "MSCONS",
    "segmentCount": 12
  }
}
```

## Rate Limiting

API V2 verwendet Token-Bucket-basiertes Rate Limiting:

- **Standard**: 20 Requests pro Minute
- **Capacity**: Konfigurierbar via `API_V2_RATE_LIMIT_CAPACITY`
- **Refill**: Konfigurierbar via `API_V2_RATE_LIMIT_REFILL`

Bei Überschreitung:
```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

## OpenAPI-Spezifikation

Die vollständige OpenAPI-Spezifikation ist verfügbar unter:
```
GET /api/v2/openapi.json
```

### Version: 0.7.0
Fügt EDIFACT Message Analyzer Endpunkte hinzu (Analyse, Chat, Modifikation, Validierung).

## Beispiel: cURL

### Kompletter Workflow

```bash
# 1. Token holen
TOKEN=$(curl -X POST http://localhost:3009/api/v2/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.accessToken')

# 2. Nachricht analysieren
curl -X POST http://localhost:3009/api/v2/message-analyzer/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }' | jq '.'

# 3. Erklärung generieren
curl -X POST http://localhost:3009/api/v2/message-analyzer/explanation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }' | jq '.data.explanation'

# 4. Chat starten
curl -X POST http://localhost:3009/api/v2/message-analyzer/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Welche Marktpartner sind beteiligt?",
    "chatHistory": [],
    "currentEdifactMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nNAD+MS+++9900123456789::293\nNAD+MR+++9900987654321::293\nUNT+3+00000000001111"
  }' | jq '.data.response'

# 5. Nachricht modifizieren
curl -X POST http://localhost:3009/api/v2/message-analyzer/modify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "instruction": "Ändere die Nachrichtennummer auf 9999999999",
    "currentMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }' | jq '.data.modifiedMessage'

# 6. Validierung durchführen
curl -X POST http://localhost:3009/api/v2/message-analyzer/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }' | jq '.'
```

## Fehlerbehandlung

### Standard-Fehlerformat
```json
{
  "success": false,
  "error": {
    "message": "Message content is required and must be a string.",
    "code": "VALIDATION_ERROR",
    "statusCode": 400
  }
}
```

### Häufige Fehler

| Code | Status | Beschreibung |
|------|--------|--------------|
| `VALIDATION_ERROR` | 400 | Fehlende oder ungültige Eingabedaten |
| `UNAUTHORIZED` | 401 | Fehlender oder ungültiger Token |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate Limit überschritten |
| `INTERNAL_ERROR` | 500 | Interner Serverfehler |

## Migration von Legacy-API

### Legacy (/api/message-analyzer)
```bash
POST /api/message-analyzer/analyze
POST /api/message-analyzer/ai-explanation
POST /api/message-analyzer/chat
POST /api/message-analyzer/modify
POST /api/message-analyzer/validate
```

### V2 (/api/v2/message-analyzer)
```bash
POST /api/v2/message-analyzer/analyze
POST /api/v2/message-analyzer/explanation  # Renamed!
POST /api/v2/message-analyzer/chat
POST /api/v2/message-analyzer/modify
POST /api/v2/message-analyzer/validate
```

### Unterschiede

1. **Authentifizierung**: V2 nutzt JWT statt Session-Cookies
2. **Endpunkt-Namen**: `/ai-explanation` → `/explanation`
3. **Response-Struktur**: V2 hat immer `{ success, data }` Wrapper
4. **Rate Limiting**: V2 nutzt Token Bucket statt einfaches Window
5. **Fehlerformat**: V2 nutzt standardisiertes Error-Format

## TypeScript Client

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3009/api/v2',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set token after login
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Message Analyzer Service
export const messageAnalyzerV2 = {
  async analyze(message: string) {
    const { data } = await client.post('/message-analyzer/analyze', { message });
    return data.data;
  },

  async explain(message: string) {
    const { data } = await client.post('/message-analyzer/explanation', { message });
    return data.data;
  },

  async chat(message: string, chatHistory: any[], currentEdifactMessage: string) {
    const { data } = await client.post('/message-analyzer/chat', {
      message,
      chatHistory,
      currentEdifactMessage,
    });
    return data.data;
  },

  async modify(instruction: string, currentMessage: string) {
    const { data } = await client.post('/message-analyzer/modify', {
      instruction,
      currentMessage,
    });
    return data.data;
  },

  async validate(message: string) {
    const { data } = await client.post('/message-analyzer/validate', { message });
    return data.data;
  },
};
```

## Metrics & Monitoring

API V2 sammelt automatisch Metriken:

```bash
GET /api/v2/metrics
```

Response:
```json
{
  "totalRequests": 1234,
  "activeRequests": 5,
  "requestsPerEndpoint": {
    "/message-analyzer/analyze": 456,
    "/message-analyzer/chat": 321,
    "/message-analyzer/modify": 123
  },
  "averageResponseTime": 234.5,
  "errorRate": 0.02
}
```

## Deployment

### Environment Variables

```bash
# Rate Limiting
API_V2_RATE_LIMIT_CAPACITY=20
API_V2_RATE_LIMIT_REFILL=20
API_V2_RATE_LIMIT_INTERVAL_MS=60000
API_V2_RATE_LIMIT_DISABLED=false

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
```

### Production Checklist

- ✅ JWT_SECRET gesetzt
- ✅ Rate Limiting aktiviert
- ✅ HTTPS erzwungen
- ✅ CORS konfiguriert
- ✅ Error Logging aktiviert
- ✅ Metrics-Endpoint gesichert

## Support

- **OpenAPI Spec**: `/api/v2/openapi.json`
- **Dokumentation**: `/docs/MESSAGE_ANALYZER_API_V2.md`
- **Issues**: GitHub Issues
- **Support**: support@stromhaltig.de

---

**Version**: 0.7.0  
**Letzte Aktualisierung**: 8. November 2025  
**Status**: ✅ Production Ready
