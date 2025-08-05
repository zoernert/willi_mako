# Anleitung zur Integration von Mermaid-Diagrammen in der RAG-Anwendung

Dieses Dokument beschreibt, wie die in Qdrant indizierten Mermaid-Prozessdiagramme von der RAG-Anwendung abgefragt und zur Laufzeit gerendert werden können.

## 1. Funktionsweise der Indizierung

Ein Skript, `src/mermaidIndexer.js`, führt die folgenden Schritte aus, um die Diagramme für die semantische Suche vorzubereiten:

1.  **Extraktion:** Es liest die Datei `knowledge/gpke.md` und extrahiert jeden Mermaid-Codeblock sowie die dazugehörige Überschrift.
2.  **KI-gestützte Anreicherung:** Für jedes Diagramm wird eine **hochwertige, KI-generierte Zusammenfassung** des dargestellten Geschäftsprozesses erstellt. Diese Zusammenfassung beschreibt den Zweck, die beteiligten Marktpartner und den Auslöser des Prozesses und ist reich an relevanten Schlüsselbegriffen.
3.  **Embedding:** Der Titel und die reichhaltige Zusammenfassung werden kombiniert. Aus diesem semantisch dichten Text wird ein Vektor-Embedding erzeugt.
4.  **Indizierung:** Der Vektor wird zusammen mit einer speziellen Payload, die den reinen Mermaid-Code und die beschreibenden Texte enthält, in der Qdrant-Collection gespeichert.

## 2. Struktur der Qdrant-Payload

Wenn ein Suchergebnis ein Mermaid-Diagramm ist, erkennen Sie dies an der Struktur seiner Payload. Achten Sie auf den `type`-Wert.

**Beispiel-Payload eines Diagramm-Chunks:**

```json
{
  "source": "knowledge/gpke.md",
  "type": "mermaid_diagram",
  "context_text": "#### 1.1 AD Kündigung",
  "mermaid_code": "graph TD\n    subgraph LFN [entspricht LFN]\n        A1[Kündigung starten] --> B(Kündigung)\n        E(Antwort) --> F[Antwort verarbeiten]\n        F --> F_end(( ))\n    end\n    ...",
  "content": "#### 1.1 AD Kündigung. Dieser Prozess beschreibt die Kündigung eines Stromliefervertrags durch den Lieferanten. Er wird angestoßen, wenn der Lieferant die Belieferung einer Marktlokation beenden möchte. Das Diagramm zeigt die notwendige Kommunikation zwischen dem alten Lieferanten (LFA) und dem neuen Lieferanten (LFN) zur Abwicklung der Kündigung."
}
```

**Wichtige Felder:**

*   `type: "mermaid_diagram"`: Ein eindeutiger Identifikator. Normale Text-Chunks haben diesen Typ nicht.
*   `mermaid_code: "..."`: Enthält den rohen, renderbaren Mermaid-Code als String.
*   `context_text: "..."`: Die ursprüngliche Überschrift aus dem Dokument, die als Titel für das Diagramm dienen kann.
*   `content: "..."`: Der **semantisch reichhaltige Text**, der für die Vektorsuche verwendet wird. Dieser Text ist ideal, um ihn als textuelle Antwort neben dem Diagramm anzuzeigen.

## 3. Abfrage und Verarbeitung in Node.js

Passen Sie Ihre Suchlogik an, um Diagramm-Chunks zu erkennen und entsprechend zu behandeln.

**Beispielhafter Ablauf:**

1.  Führen Sie Ihre semantische Suche wie gewohnt mit dem Qdrant-Client durch.
2.  Iterieren Sie durch die Ergebnisse.
3.  Prüfen Sie bei jedem Ergebnis, ob `result.payload.type === 'mermaid_diagram'`.
4.  Wenn ja, haben Sie ein Diagramm gefunden. Sie können den `mermaid_code` und den `content` an Ihr Frontend senden.

**(Der Node.js Beispiel-Code aus der vorherigen Version ist weiterhin gültig.)**

## 4. Fachliche Tipps für die optimale Nutzung

Die Kombination aus visuellen Diagrammen und textuellen Erklärungen ist ein mächtiges Werkzeug für die Endanwender. Hier sind einige Tipps, wie Sie diese optimal präsentieren können:

### Tipp 1: Diagramme als Top-Ergebnis priorisieren

Wenn eine Benutzeranfrage sowohl ein Diagramm als auch reine Text-Chunks mit hoher Relevanz zurückgibt, **präsentieren Sie das Diagramm prominent**, z.B. als erstes Ergebnis oder in einer eigenen, hervorgehobenen Box. Visuelle Prozessdarstellungen sind oft der beste Einstiegspunkt zum Verständnis eines komplexen Sachverhalts.

### Tipp 2: Text und Bild immer zusammen anzeigen

Rendern Sie nicht nur das Diagramm. Zeigen Sie immer den dazugehörigen Text aus dem `content`-Feld der Payload an. Dieser Text wurde von der KI speziell dafür generiert, den Prozess zu erklären.

**UI-Vorschlag:**
*   **Links:** Das gerenderte, interaktive Mermaid-Diagramm.
*   **Rechts:** Der Titel (`context_text`) und die textuelle Beschreibung (`content`).

Diese geteilte Ansicht ermöglicht es dem Benutzer, den Prozess gleichzeitig visuell zu verfolgen und die textuelle Erklärung zu lesen.

### Tipp 3: "Deep Dive" ermöglichen

Nutzen Sie die gefundenen Diagramme als Ausgangspunkt für weitere Suchen. Sie können unterhalb eines angezeigten Diagramms Buttons oder Links anbieten wie:

*   **"Zeige relevante Dokumentenabschnitte"**: Führen Sie eine neue Suche mit dem `content`-Text des Diagramms als Query durch, aber filtern Sie die Ergebnisse, um diesmal *keine* weiteren Diagramme zu erhalten (`must_not: [{ key: 'type', match: { value: 'mermaid_diagram' } }]`). So finden Sie die zugrundeliegenden Textpassagen in den PDF-Dokumenten.
*   **"Welche Nachrichtenformate werden hier verwendet?"**: Extrahieren Sie Schlüsselbegriffe aus dem Diagramm (z.B. `E_0400_Kündigung`) und starten Sie eine spezifische Suche danach.

### Tipp 4: Umgang mit mehreren Diagrammen

Es ist möglich, dass eine unscharfe Anfrage mehrere relevante Prozessdiagramme zurückliefert. Anstatt nur das beste Ergebnis anzuzeigen, können Sie eine kleine Galerie der gefundenen Diagramme präsentieren.

**UI-Vorschlag:**
*   Zeigen Sie eine horizontale Scroll-Liste mit kleinen Vorschaubildern oder nur den Titeln der Diagramme an.
*   Der Benutzer kann dann das für ihn relevanteste Diagramm auswählen, um es in der großen Ansicht zu betrachten.

Durch die Umsetzung dieser Tipps wird die Anwendung von einem reinen "Frage-Antwort-Tool" zu einem interaktiven **Wissens-Explorer**, der den Mitarbeitern hilft, die komplexen Prozesse der Marktkommunikation nicht nur zu finden, sondern wirklich zu verstehen.

**(Das Frontend-Beispiel aus der vorherigen Version ist weiterhin gültig.)**
