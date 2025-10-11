# API v2 – Phase 1 Implementierung

Diese Datei ergänzt `docs/API2.md` um konkrete Hinweise zur Umsetzung der ersten Phase.

## Feature-Flag
- `API_V2_ENABLED=true` schaltet die neuen Routen frei (`/api/v2/*`).
- Standard im `.env.example` ist `false`, damit Deployments opt-in bleiben.

## Verfügbare Endpunkte (Phase 1)
| Route | Methode | Beschreibung |
| --- | --- | --- |
| `/api/v2/auth/token` | POST | Erstellt ein JWT mit Laufzeit aus `API_V2_TOKEN_EXPIRES_IN` (Standard 30 Tage). |
| `/api/v2/sessions` | POST | Legt eine neue Session in MongoDB an, erstellt dabei automatisch einen verknüpften Legacy-Chat. |
| `/api/v2/sessions/{id}` | GET | Gibt Session-Metadaten zurück (nur Eigentümer). |
| `/api/v2/sessions/{id}` | DELETE | Entfernt Session + Mongo-Dokument. |
| `/api/v2/chat` | POST | Ruft den bestehenden Chatflow über Paritätsmodus auf. |
| `/api/v2/metrics` | GET | Liefert einfache JSON-Metriken (Requests, Fehler, Rate-Limits). |
| `/api/v2/openapi.json` | GET | Liefert die OpenAPI-Skizze für Phase 1. |

## Datenhaltung
- Sessions werden in der Collection `api_v2_sessions` gespeichert (MongoDB TTL-Index über `expiresAt`).
- Für jede Session entsteht ein Eintrag in `chats` (Postgres) mit `metadata.apiV2Session = true`.

## Tests & Tools
- `npm run test:api-v2` führt den minimalen Test-Client (`scripts/api-v2-test-client.ts`) aus.
- Die Middleware `apiV2RateLimiter` kann über `API_V2_RATE_LIMIT_DISABLED=true` deaktiviert werden.

## Weiterführende Schritte
- Contract-Tests können auf Basis von `/api/v2/openapi.json` erstellt werden.
- Metrics-Export (`/api/v2/metrics`) dient als Sammelstelle für Prometheus/Loki-Adapter.
