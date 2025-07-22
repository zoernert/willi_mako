# Feature Request: AI-Powered Process Flow Visualization in Chat

## Beschreibung
This feature introduces an intelligent visualization component within the chat interface. When an AI-generated response describes a market communication process (like GPKE, WiM, etc.), the system will automatically detect this and generate an interactive, dynamic flowchart to visually represent the process flow. This provides users with both a textual explanation and a clear, easy-to-understand diagram of the process steps, roles, and message flows.

## Business Value
- **Enhanced Comprehension:** Visual flowcharts make complex, multi-step processes significantly easier and faster to understand than text-only descriptions.
- **Reduced Onboarding Time:** New clerks can quickly grasp the fundamentals of standard market processes, reducing training time and costs.
- **Error Reduction:** A clear visual representation of the correct sequence of actions and messages helps prevent procedural errors in daily work.
- **Increased User Engagement:** Transforms the chat from a simple Q&A tool into an interactive learning and analysis platform.

## User Stories
### Story 1
**Als** Sachbearbeiter
**möchte ich** zusätzlich zur textlichen Erklärung eines Prozesses (z.B. "Lieferantenwechsel") eine visuelle Darstellung als Flowchart sehen
**damit** ich die Abfolge der Schritte, die beteiligten Marktpartner und die ausgetauschten Nachrichten auf einen Blick erfassen kann.

**Akzeptanzkriterien:**
- [ ] Wenn eine Chat-Antwort einen Prozess beschreibt, wird unterhalb des Textes ein Flowchart-Diagramm angezeigt.
- [ ] Das Diagramm enthält Knoten für jeden Prozessschritt oder Marktpartner.
- [ ] Kanten (Pfeile) verbinden die Knoten und zeigen die Prozessrichtung an, beschriftet mit der jeweiligen Nachricht (z.B. "UTILMD").
- [ ] Das Diagramm ist interaktiv (schwenk- und zoombar).

### Story 2
**Als** System
**möchte ich** eine textliche Prozessbeschreibung vom LLM in eine strukturierte Knoten-und-Kanten-Darstellung umwandeln
**damit** das Frontend diese Daten zur Generierung eines visuellen Graphen verwenden kann.

**Akzeptanzkriterien:**
- [ ] Das Backend identifiziert, wenn eine generierte Chat-Antwort einen Prozessablauf enthält.
- [ ] Das Backend sendet eine Folgeanfrage an das LLM, um den Text in ein JSON-Format mit `nodes` und `edges` zu konvertieren.
- [ ] Die API-Antwort für eine Chat-Nachricht wird um ein optionales Feld `flowchartData` erweitert.

## Requirements
### Funktionale Anforderungen
- [ ] **Backend:**
    - [ ] Der `POST /api/chat/chats/:chatId/messages` Endpunkt in `src/routes/chat.ts` wird erweitert.
    - [ ] Nach der Generierung einer textlichen Antwort durch `gemini.ts` wird eine "Post-Processing"-Stufe eingeführt.
    - [ ] Diese Stufe sendet die Antwort an das LLM mit einem spezifischen Prompt, um zu prüfen, ob es sich um einen Prozess handelt und diesen ggf. in ein strukturiertes JSON-Format (Nodes und Edges) zu extrahieren.
    - [ ] **Prompt-Beispiel:** `"Du bist ein Experte für die Analyse von Geschäftsprozessen. Konvertiere den folgenden Text in ein JSON-Objekt mit 'nodes' und 'edges', das für die 'reactflow'-Bibliothek geeignet ist. Identifiziere die Marktpartner als Knoten und die Nachrichten als Kanten. Text: ..."`.
    - [ ] Die API-Antwort wird so modifiziert, dass sie `assistantMessage.metadata.flowchartData` enthalten kann.
- [ ] **Frontend:**
    - [ ] Die `reactflow`-Bibliothek wird als neue Dependency zum `client`-Projekt hinzugefügt.
    - [ ] Eine neue Komponente `client/src/components/Chat/ProcessFlowChart.tsx` wird erstellt.
    - [ ] Diese Komponente nimmt `nodes` und `edges` als Props entgegen und rendert den Graphen mit `reactflow`.
    - [ ] Die Komponente wird so gestaltet, dass sie sich nahtlos in das bestehende Material-UI-Theme einfügt (Farben, Schriftarten, Rahmenradien).
    - [ ] Die `Chat.tsx`-Seite in `client/src/pages/Chat.tsx` wird angepasst, um zu prüfen, ob eine Nachricht `metadata.flowchartData` enthält.
    - [ ] Wenn `flowchartData` vorhanden ist, wird die `ProcessFlowChart`-Komponente unterhalb des Markdown-Textes der Nachricht gerendert.

### Nicht-funktionale Anforderungen
- [ ] **Performance:** Die Generierung des Flowcharts ist ein sekundärer Schritt. Die textliche Antwort sollte dem Benutzer sofort angezeigt werden, während das Flowchart asynchron nachgeladen werden kann, um die gefühlte Performance nicht zu beeinträchtigen.
- [ ] **Usability:** Das Flowchart muss klar lesbar und auf Desktop- und Mobilgeräten einfach zu bedienen sein (Panning und Zooming).
- [ ] **Styling:** Das Design der Knoten und Kanten muss professionell sein und dem Farbschema (`primary: '#147a50'`) und der Typografie ("Inter" Font) der Anwendung entsprechen.
