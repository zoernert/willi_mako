# Willi-Mako Chat Metrics und Optimierung

Dieses Dokument beschreibt die Metriken, die durch das Chat-Test-CLI-Tool erfasst werden, und wie diese zur Optimierung des Willi-Mako-Systems verwendet werden können.

## Erfasste Metriken

Das CLI-Tool erfasst folgende Metriken für jede Chat-Anfrage:

### 1. Antwortzeiten

- **responseTime**: Die Zeit in Millisekunden, die die API benötigt, um eine Antwort zu liefern.
  - Durchschnittliche Antwortzeit
  - Maximale Antwortzeit
  - Minimale Antwortzeit

### 2. Vector-Search-Metriken

- **vectorSearchScore**: Der Ähnlichkeitswert (Similarity Score) der gefundenen Dokumente.
  - Werte näher an 1.0 bedeuten höhere Relevanz
  - Niedrige Werte (< 0.6) können auf fehlende relevante Inhalte hinweisen
- **sourceCount**: Die Anzahl der gefundenen Quellen für eine Anfrage.
  - Höhere Werte bedeuten mehr Kontextinformationen
  - Wert 0 bedeutet, dass keine relevanten Quellen gefunden wurden

### 3. Erweiterte Anfragen

- **hasEnhancedQuery**: Ob die Anfrage durch das System erweitert wurde.
- **enhancedQuery**: Die erweiterte Version der ursprünglichen Anfrage.

### 4. CS30-spezifische Metriken

- **hasCs30Response**: Ob eine spezifische CS30-Antwort generiert wurde.
- **cs30SourceCount**: Die Anzahl der CS30-spezifischen Quellen.
- **cs30Sources**: Die Liste der CS30-Quellen mit ihren Scores.

### 5. Antwortqualität

- **characterCount**: Die Länge der Antwort in Zeichen.

## Interpretation der Metriken

### Vector-Search-Score

Der Vector-Search-Score ist ein Maß für die semantische Ähnlichkeit zwischen der Anfrage und den gefundenen Dokumenten. Die Interpretation kann wie folgt erfolgen:

- **> 0.85**: Ausgezeichnete Übereinstimmung
- **0.75 - 0.85**: Gute Übereinstimmung
- **0.6 - 0.75**: Mäßige Übereinstimmung
- **< 0.6**: Schwache Übereinstimmung, möglicherweise irrelevante Ergebnisse

Wenn viele Anfragen niedrige Scores aufweisen, könnte dies bedeuten:

1. Die Wissensbasis enthält nicht die relevanten Informationen
2. Die Embedding-Qualität ist nicht optimal
3. Die Suchanfragen müssen besser formuliert werden

### Antwortzeiten

Die Antwortzeiten können wie folgt interpretiert werden:

- **< 1000ms**: Ausgezeichnete Leistung
- **1000ms - 2000ms**: Gute Leistung
- **2000ms - 5000ms**: Mäßige Leistung, könnte verbessert werden
- **> 5000ms**: Schlechte Leistung, Optimierung erforderlich

### Quelle-Nullanfragen

Anfragen, für die keine Quellen gefunden wurden, sind besonders wichtig zu identifizieren. Diese deuten auf Lücken in der Wissensbasis hin.

## Optimierungsstrategien

Basierend auf den erfassten Metriken können folgende Optimierungsstrategien angewendet werden:

### 1. Wissensbasis erweitern

Identifizieren Sie Anfragen mit:
- Keinen gefundenen Quellen
- Niedrigen Vector-Search-Scores

Für diese Anfragen sollten neue Inhalte zur Wissensbasis hinzugefügt werden.

### 2. Embedding-Qualität verbessern

Wenn viele relevante Dokumente niedrige Scores aufweisen:
- Überprüfen Sie das verwendete Embedding-Modell
- Testen Sie alternative Embedding-Strategien
- Optimieren Sie die Vorverarbeitung der Dokumente

### 3. Anfrageerweiterung optimieren

Analysieren Sie die erweiterten Anfragen und deren Auswirkung auf die Suchergebnisse:
- Verbessern Sie die Prompt-Strategien für die Anfrageerweiterung
- Passen Sie die Parameter an (z.B. Temperatur, max_tokens)

### 4. API-Leistung optimieren

Bei langsamen Antwortzeiten:
- Identifizieren Sie Engpässe in der API
- Optimieren Sie Datenbankabfragen
- Implementieren Sie Caching-Strategien
- Skalieren Sie die Infrastruktur

### 5. Schwellenwerte anpassen

Basierend auf den Ergebnissen könnten die Schwellenwerte angepasst werden:
- Vector-Search-Score-Schwellenwert erhöhen/verringern
- Anzahl der zurückgegebenen Quellen anpassen

## Workflow zur kontinuierlichen Verbesserung

1. **Datensammlung**: Führen Sie regelmäßig Tests mit repräsentativen Anfragen durch
2. **Analyse**: Analysieren Sie die Logs und identifizieren Sie Problembereiche
3. **Optimierung**: Implementieren Sie Verbesserungen basierend auf den Erkenntnissen
4. **Validierung**: Führen Sie Tests erneut durch, um die Wirksamkeit der Änderungen zu überprüfen

## Beispiel für eine Analyse

```
Analyzing log file: willi-mako-chat-2025-08-23T12-00-00.000Z.log.json
Timestamp: 8/23/2025, 12:00:00 PM
Total entries: 45

Total queries: 15
Average response time: 1850.23ms
Average source count: 2.53
Average vector search score: 0.7234
Enhanced queries: 10 (66.67%)
CS30 responses: 4 (26.67%)

Individual query analysis:

Query 1: Wie lege ich einen neuen Vertrag in CS30 an?
Response time: 2134ms
Source count: 3
Vector search score: 0.8324
Enhanced query: Yes
CS30 response: Yes
```

### Interpretation:

- Die durchschnittliche Antwortzeit von 1850ms ist akzeptabel, könnte aber verbessert werden
- Der durchschnittliche Vector-Search-Score von 0.7234 ist gut, aber nicht ausgezeichnet
- 66.67% der Anfragen wurden erweitert, was auf eine gute Nutzung der Anfrageerweiterung hinweist
- 26.67% der Anfragen hatten CS30-spezifische Antworten
- Die erste Anfrage hat einen guten Vector-Search-Score und 3 Quellen, was auf gute Relevanz hinweist

## Fazit

Die systematische Erfassung und Analyse von Chat-Metriken ermöglicht eine datengestützte Optimierung des Willi-Mako-Systems. Durch die kontinuierliche Überwachung und Verbesserung dieser Metriken kann die Qualität und Leistung des Systems kontinuierlich gesteigert werden.
