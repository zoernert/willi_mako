# EDIFACT Erklären (Willi‑Mako) – AnythingLLM Agent Skill

Dieses Skill sendet ein EDIFACT‑Segment oder kurzes Fragment an die öffentliche Willi‑Mako API und gibt eine Erklärung zurück.

## Installation

1) Ordner kopieren nach:
   plugins/agent-skills/edifact-explain

2) In AnythingLLM im Agent die Variable setzen:
   - API_BASE_URL: Basis‑URL eurer Instanz, z. B. https://stromhaltig.de oder http://localhost:3003

3) Skill im Agent aktivieren. Änderungen werden per Hot‑Reload erkannt.

## Nutzung

Beispiel‑Prompts:
- "Erkläre dieses EDIFACT Segment" mit Parameter "fragment" oder "text"
- "Was bedeutet dieser Ausschnitt?"

Das Skill ruft POST /api/public/edifact/explain mit { fragment } auf.

## Rückgabeformat

Reiner Text (Erklärung), ggf. mehrzeilig.
