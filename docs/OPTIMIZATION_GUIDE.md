# Anleitung zur optimierten Nutzung der "Willi Extractor" Wissens-Collection

## Zielsetzung

Diese Anleitung beschreibt die notwendigen Schritte, um eine RAG (Retrieval-Augmented Generation)-Anwendung so zu optimieren, dass sie das volle Potenzial der "Willi Extractor" Vektor-Collection ausschöpft. Die Collection enthält nicht nur Vektoren, sondern auch reichhaltige Metadaten und strukturierte Inhaltstypen, die für eine hochpräzise und kontextbewusste Antwortfindung entscheidend sind.

---

## Implementierungsanweisungen für den AI-Agenten

### 1. Implementierung einer Pre-Filtering-Logik basierend auf Metadaten

**Anforderung:**
Modifizieren Sie den Retrieval-Prozess so, dass **vor** der Vektorsuche eine Filterung basierend auf den Metadaten der Chunks durchgeführt wird. Dies ist der wichtigste Schritt zur Steigerung der Relevanz und Effizienz.

**Verfügbare und zu nutzende Metadaten-Felder in der Qdrant-Collection:**
*   `document_metadata.document_base_name` (string, z.B., "BK6-24-174_GPKE_Teil1_Lesefassung")
*   `document_metadata.publication_date` (string, Format "YYYY-MM-DD")
*   `document_metadata.version` (string, z.B., "6_1b")
*   `chunk_type` (string, einer aus: `paragraph`, `structured_table`, `abbreviation`, `definition`, `visual_summary`, `full_page`)

**Implementierungsdetails:**

1.  **Analyse der Nutzeranfrage:** Implementieren Sie eine Funktion, die die eingehende Nutzeranfrage auf Schlüsselwörter und Absichten analysiert, um Filterkriterien abzuleiten.
    *   **Definitionen erkennen:** Wenn die Anfrage "Was ist...", "Definiere...", "Was bedeutet die Abkürzung..." enthält, setzen Sie den Filter auf `chunk_type: ['definition', 'abbreviation']`.
    *   **Dokumentenbezug erkennen:** Wenn die Anfrage einen Dokumentennamen (z.B. "GPKE", "MaBiS", "WiM") enthält, identifizieren Sie den entsprechenden `document_base_name` und verwenden Sie ihn als Filter. Erstellen Sie hierfür ein Mapping von gängigen Bezeichnungen zu den `document_base_name`-Werten.
    *   **Tabellen-Fragen erkennen:** Wenn die Anfrage nach "Liste", "Fristen", "Werte in einer Tabelle" fragt, priorisieren Sie `chunk_type: 'structured_table'`.

2.  **Standard-Filter für Aktualität:** Implementieren Sie eine Logik, die sicherstellt, dass standardmäßig nur die **aktuellste Version** eines Dokuments durchsucht wird.
    *   Schritt A: Extrahieren Sie alle einzigartigen `document_base_name` aus der Collection.
    *   Schritt B: Für jeden `document_base_name` finden Sie den Chunk mit dem neuesten `publication_date`.
    *   Schritt C: Erstellen Sie eine Liste der gültigen, aktuellsten `document_name`-Werte, die standardmäßig für die Suche verwendet werden, es sei denn, der Nutzer fragt explizit nach einer älteren Version.

3.  **Filter an Qdrant übergeben:** Konstruieren Sie das Qdrant-Filterobjekt dynamisch basierend auf den abgeleiteten Kriterien und übergeben Sie es zusammen mit dem Suchvektor an die `search`-API.

**Beispiel für einen dynamisch erstellten Qdrant-Filter:**
```javascript
// Wenn der Nutzer fragt: "Was steht in der GPKE zu Lieferantenwechseln?"
const filter = {
  "must": [
    { "key": "document_metadata.document_base_name", "match": { "value": "BK6-24-174_GPKE_Teil1_Lesefassung" } }
  ]
};
```

---

### 2. Implementierung einer Query-Transformation

**Anforderung:**
Verbessern Sie die Qualität des Suchvektors, indem Sie die ursprüngliche Nutzeranfrage vor der Vektorisierung transformieren.

**Implementierungsdetails:**

1.  **Hypothetical Document Embeddings (HyDE):**
    *   Erstellen Sie eine Funktion `generateHypotheticalAnswer(query)`.
    *   Diese Funktion sendet die Nutzeranfrage an ein schnelles LLM mit dem Prompt: *"Du bist ein Experte für die deutsche Energiewirtschaft. Beantworte die folgende Frage prägnant und ausschließlich basierend auf deinem allgemeinen Wissen über die Marktprozesse. Gib nur die Antwort aus, ohne einleitende Sätze."*
    *   Verwenden Sie die vom LLM generierte, hypothetische Antwort anstelle der ursprünglichen Nutzerfrage, um den Suchvektor für die Qdrant-Suche zu erstellen.

2.  **Query-Expansion mit Abkürzungen:**
    *   Erstellen Sie beim Start der Anwendung einen In-Memory-Index (z.B. ein `Map`-Objekt) aller Chunks vom Typ `abbreviation`. Der Key ist die Abkürzung (z.B., "MaBiS"), der Value ist der ausgeschriebene Begriff.
    *   Analysieren Sie die Nutzeranfrage. Wenn eine bekannte Abkürzung gefunden wird, erweitern Sie die Anfrage. Beispiel: "Was sind die Fristen in der MaBiS?" wird zu "Was sind die Fristen in der MaBiS (Marktregeln für die Durchführung der Bilanzkreisabrechnung Strom)?".
    *   Verwenden Sie diese erweiterte Anfrage für die weitere Verarbeitung (z.B. für HyDE).

---

### 3. Implementierung einer intelligenten Nachverarbeitung (Post-Processing)

**Anforderung:**
Behandeln Sie die von Qdrant zurückgegebenen Suchergebnisse nicht als gleichwertig. Verarbeiten Sie sie intelligent, um den finalen Prompt für das LLM zu optimieren.

**Implementierungsdetails:**

1.  **Kontextualisierung des finalen Prompts:**
    *   Modifizieren Sie die Funktion, die den finalen Prompt für das Antwort-generierende LLM zusammenstellt.
    *   Iterieren Sie durch die abgerufenen Chunks und fügen Sie für jeden Chunk spezifischen Kontext basierend auf dem `chunk_type` hinzu.

    **Prompt-Template-Beispiel:**
    ```
    Du bist ein KI-Assistent für die deutsche Energiewirtschaft. Beantworte die Nutzerfrage basierend auf den folgenden, exakten Auszügen aus den offiziellen Dokumenten. Gib bei deiner Antwort die Quelle(n) an.

    Nutzerfrage: {user_query}

    --- KONTEXT-AUSZÜGE ---

    {for chunk in retrieved_chunks}
      **Quelle:** {chunk.metadata.source_document}, Seite {chunk.metadata.page_number}
      **Typ:** {chunk.metadata.chunk_type}
      **Inhalt:**
      {if chunk.metadata.chunk_type == 'structured_table'}
        Der folgende Auszug ist eine Markdown-Tabelle:
        {chunk.content}
      {elif chunk.metadata.chunk_type == 'visual_summary'}
        Die folgende ist eine textuelle Beschreibung eines Diagramms oder einer visuellen Darstellung:
        {chunk.content}
      {else}
        {chunk.content}
      {/if}
      ---
    {/for}

    Antworte nun auf die Nutzerfrage. Sei präzise und beziehe dich ausschließlich auf die bereitgestellten Kontexte.
    ```

2.  **Implementierung eines Re-Rankers (Optional, für höchste Qualität):**
    *   Rufen Sie initial mehr Ergebnisse von Qdrant ab als benötigt (z.B., Top 20).
    *   Nutzen Sie ein leichtgewichtiges Cross-Encoder-Modell, um die Ähnlichkeit zwischen der *ursprünglichen Nutzerfrage* und dem *Inhalt jedes Chunks* zu bewerten.
    *   Sortieren Sie die 20 Chunks basierend auf dem Score des Cross-Encoders neu.
    *   Wählen Sie die Top 3-5 Chunks aus dieser neu sortierten Liste für den finalen Prompt aus.

---

### 4. Implementierung von transparenten Quellenangaben

**Anforderung:**
Stellen Sie sicher, dass jede generierte Antwort mit präzisen und nachvollziehbaren Quellenangaben versehen ist.

**Implementierungsdetails:**

1.  **Quellen aus Metadaten extrahieren:** Stellen Sie sicher, dass die Metadaten `source_document` und `page_number` für jeden im finalen Prompt verwendeten Chunk gespeichert werden.
2.  **Anzeige in der UI:** Weisen Sie das LLM im finalen Prompt an, die Quellen in seiner Antwort zu nennen. Stellen Sie zusätzlich sicher, dass die Quellen auch separat in der Benutzeroberfläche angezeigt werden, idealerweise als klickbare Links, die zum Originaldokument führen.

**Beispiel für die Anweisung im Prompt:**
`"Gib am Ende deiner Antwort eine Liste der verwendeten Quellen im Format '[Dokumentname, Seite X]' an."`
