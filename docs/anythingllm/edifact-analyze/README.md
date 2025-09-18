# EDIFACT Analyse (Willi‑Mako) – AnythingLLM Agent Skill

Dieses Skill sendet EDIFACT‑Nachrichten an die öffentliche Willi‑Mako API und gibt eine kompakte textuelle Zusammenfassung zurück.

## Installation

1) Ordner kopieren nach:
   plugins/agent-skills/edifact-analyze

2) In AnythingLLM im Agent die Variable setzen:
   - API_BASE_URL: Basis‑URL eurer Instanz, z. B. https://stromhaltig.de oder http://localhost:3003

3) Skill im Agent aktivieren. Änderungen werden per Hot‑Reload erkannt.

## Nutzung

Beispiel‑Prompts:
- "Analysiere diese EDIFACT Nachricht" und den Inhalt in das Parameterfeld "message" oder "text" einfügen
- "Prüfe folgende UTILMD Meldung"

Das Skill ruft POST /api/public/edifact/analyze mit { message } auf.

## Rückgabeformat

Reiner Text mit Zusammenfassung, optionalen Entitäten und Hinweisen.
