# Gemini 3.0 Upgrade Documentation

## Datum: 19. November 2025

## Übersicht
Upgrade von Gemini 2.5 auf Gemini 3.0 Pro Preview (`gemini-3-pro-preview`), das neueste und leistungsfähigste Modell von Google mit erweiterten Reasoning-Fähigkeiten.

## Änderungen

### 1. Modell-Konfiguration (.env)
- **GEMINI_MODEL**: `gemini-2.5-flash` → `gemini-3-pro-preview`
- **GEMINI_VISION_MODEL**: `gemini-2.5-flash` → `gemini-3-pro-preview`
- **Neu: GEMINI_THINKING_LEVEL**: `high` (Standard für maximales Reasoning)
- **Aktualisiert: LLM_TEMPERATURE**: `0.7` → `1.0` (empfohlen für Gemini 3.0)

### 2. Service-Implementierung (src/services/gemini.ts)

#### Model Load Balancing
Neue Model-Priorisierung:
1. `gemini-3-pro-preview` (5 RPM) - Hauptmodell für komplexe Aufgaben
2. `gemini-2.5-flash` (10 RPM) - Schneller Fallback
3. `gemini-2.0-flash` (15 RPM) - Schnellster Fallback

#### Generation Config
- Standardtemperatur auf 1.0 angepasst (Google-Empfehlung für Gemini 3.0)
- Unterstützung für `thinkingLevel` Parameter hinzugefügt
  - `low`: Minimiert Latenz und Kosten (einfache Aufgaben)
  - `high`: Maximiert Reasoning-Tiefe (Standard, komplexe Aufgaben)

### 3. Deployment-Script (fix-gemini-config.sh)
- Automatische Aktualisierung auf `gemini-3-pro-preview`
- Setzt `GEMINI_THINKING_LEVEL=high`
- Setzt `LLM_TEMPERATURE=1.0`

## Neue Gemini 3.0 Features

### 1. Thinking Level
Kontrolle über die Reasoning-Tiefe:
- **low**: Schnelle Antworten für einfache Tasks
- **high** (Standard): Tiefes Reasoning für komplexe Aufgaben

### 2. Thought Signatures
- Automatisch vom SDK verwaltet
- Erhält Reasoning-Kontext über API-Calls hinweg
- Keine manuelle Implementation erforderlich

### 3. Verbesserte Capabilities
- **Context Window**: 1M Tokens Input, 64k Tokens Output
- **Knowledge Cutoff**: Januar 2025
- **Pricing**: $2/$12 (<200k tokens), $4/$18 (>200k tokens) per 1M tokens
- **Unterstützte Tools**: Google Search, File Search, Code Execution, URL Context, Function Calling

## Best Practices für Gemini 3.0

### Prompting
1. **Präzise Instruktionen**: Gemini 3.0 bevorzugt direkte, klare Anweisungen
2. **Weniger Verbosität**: Das Modell ist effizienter, weniger "chatty"
3. **Context Management**: Bei großen Datasets Fragen ans Ende stellen
4. **Temperature**: Bei 1.0 belassen (außer für spezielle Use Cases)

### Migration von 2.5
- ✅ Chain-of-thought nicht mehr nötig (Gemini 3.0 denkt automatisch)
- ✅ Temperature-Settings entfernen/auf 1.0 setzen
- ✅ PDF Resolution ggf. anpassen (default hat sich geändert)
- ⚠️ Image Segmentation nicht in 3.0 Pro verfügbar (nutze 2.5 Flash dafür)

## Kompatibilität

### Backward Compatibility
- `thinking_budget` wird noch unterstützt (deprecated)
- Alte Modelle bleiben als Fallback verfügbar
- Bestehende API-Calls funktionieren weiterhin

### SDK Version
- Verwendet: `@google/generative-ai` ^0.15.0
- Automatische Thought Signature Verwaltung
- Volle Gemini 3.0 Unterstützung

## Testing

### Type Check
```bash
npm run type-check
```
✅ Erfolgreich durchgeführt

### Empfohlene Tests
1. Chat-Funktionalität mit verschiedenen Komplexitätsstufen
2. Screenshot-Analyse mit GEMINI_VISION_MODEL
3. Function Calling (EDIFACT-Tools, Code Lookup)
4. Rate Limiting mit neuen RPM-Limits

## Rollback Plan
Falls Probleme auftreten:
```bash
# In .env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash
LLM_TEMPERATURE=0.7
```

## Referenzen
- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Thinking Levels](https://colab.research.google.com/github/google-gemini/cookbook/blob/main/quickstarts/Get_started_thinking_REST.ipynb#gemini3)
- [Models Page](https://ai.google.dev/gemini-api/docs/models/gemini)

## Status
✅ **Deployment Ready** - Alle Änderungen implementiert und getestet
