# Prozesse und Verfahren - Debugging & Verbesserungen

## Status: 🔧 AKTIVE FEHLERBEHEBUNG v2.1

**Datum:** 6. August 2025  
**Probleme behoben:** Markdown-Rendering, Mermaid-Debugging, Content-Bereinigung

## 🐛 Behobene Probleme

### 1. Markdown wird als Raw-Text angezeigt
**Problem:** Content-Felder zeigten Markdown-Code statt gerenderte HTML-Ausgabe

**Lösung:**
- ✅ ReactMarkdown-Komponente für Content-Beschreibungen hinzugefügt
- ✅ Separate Styling für Markdown-Elemente (p, ul, li, headings)
- ✅ Content-Bereinigung um Markdown-Artefakte zu entfernen

```tsx
<Box sx={{ 
  '& p': { mb: 1, fontSize: '0.875rem', color: 'text.secondary' },
  '& ul, & ol': { pl: 2, mb: 1 },
  '& strong': { fontWeight: 'bold' },
  '& em': { fontStyle: 'italic' }
}}>
  <ReactMarkdown>
    {cleanContent(diagram.content, diagram.title)}
  </ReactMarkdown>
</Box>
```

### 2. Mermaid-Diagramme zeigen nur Spinner
**Problem:** "MermaidRenderer: Missing code or element ref" Fehlermeldung

**Lösungsansätze:**
- ✅ Verbesserte Debug-Ausgaben in MermaidRenderer
- ✅ Element-Ref-Validierung mit Retry-Logik
- ✅ Mermaid-Code-Validierung vor Rendering
- ✅ Erweiterte Error-Handling mit detaillierten Fehlermeldungen

```tsx
// Verbesserte Validierung und Debug-Info
const isValidMermaidCode = (code: string): boolean => {
  if (!code || !code.trim()) {
    console.log('MermaidValidator: No code provided');
    return false;
  }
  
  const cleaned = code.replace(/^```mermaid\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  console.log('MermaidValidator: Checking code (first 100 chars):', cleaned.substring(0, 100));
  
  // Umfassende Syntax-Erkennung
  const mermaidTypes = ['graph', 'flowchart', 'sequenceDiagram', ...];
  const startsWithValidType = mermaidTypes.some(type => 
    cleaned.toLowerCase().startsWith(type.toLowerCase())
  );
  
  return startsWithValidType && cleaned.length > 20;
};
```

### 3. Content-Duplikation und Artefakte
**Problem:** Titel wurden doppelt angezeigt, Markdown-Artefakte (`####`, `[cite: 123]`) blieben sichtbar

**Lösung:**
- ✅ `cleanTitle()` Funktion um Markdown-Header und Zitate zu entfernen
- ✅ `cleanContent()` Funktion um Titel-Duplikation zu vermeiden
- ✅ Intelligente Bereinigung von AI-generierten Duplikaten

```tsx
const cleanContent = (content: string, title: string): string => {
  let cleaned = content
    .replace(/^#+\s*/, '') // Remove markdown headers
    .replace(/\[cite:\s*\d+(?:,\s*\d+)*\]/g, '') // Remove citation markers
    .replace(/^\d+\.\d+\s+/, '') // Remove numbering
    .trim();
  
  // Remove title repetition at the beginning of content
  const cleanedTitle = cleanTitle(title);
  if (cleaned.toLowerCase().startsWith(cleanedTitle.toLowerCase())) {
    cleaned = cleaned.substring(cleanedTitle.length).trim();
  }
  
  return cleaned || 'Keine zusätzlichen Informationen verfügbar.';
};
```

## 🎯 Aktuelle Implementierung

### Debug-Features (Development Mode)
```tsx
{process.env.NODE_ENV === 'development' && (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary">
      Debug - Mermaid Code ({diagram.mermaidCode?.length || 0} chars): 
      Valid = {isValidMermaidCode(diagram.mermaidCode) ? 'Yes' : 'No'}
    </Typography>
    {diagram.mermaidCode && (
      <Typography variant="caption" component="pre" sx={{ 
        fontSize: '0.7rem', 
        display: 'block', 
        maxHeight: 100, 
        overflow: 'auto', 
        bgcolor: 'grey.100', 
        p: 1, 
        mt: 1,
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 1
      }}>
        {diagram.mermaidCode.substring(0, 300)}...
      </Typography>
    )}
  </Box>
)}
```

### Improved Error Handling
```tsx
{diagram.mermaidCode && diagram.mermaidCode.trim() ? (
  isValidMermaidCode(diagram.mermaidCode) ? (
    <Box sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 1, bgcolor: 'grey.50' }}>
      <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block' }}>
        Mermaid-Diagramm:
      </Typography>
      <MermaidRenderer
        code={diagram.mermaidCode}
        title={cleanTitle(diagram.title)}
        id={`diagram-${diagram.id}`}
        height={400}
        onError={(error) => {
          console.error(`Mermaid error for ${diagram.title}:`, error);
          console.log('Full mermaid code:', diagram.mermaidCode);
        }}
      />
    </Box>
  ) : (
    <Alert severity="warning" sx={{ mt: 2 }}>
      <strong>Mermaid-Code Format-Problem</strong>
      <br />
      Der Diagramm-Code entspricht nicht dem erwarteten Mermaid-Format.
      <br />
      <Typography variant="caption" component="pre" sx={{ mt: 1, fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.1)', p: 1, borderRadius: 1 }}>
        Code Anfang: {diagram.mermaidCode.substring(0, 100)}...
      </Typography>
    </Alert>
  )
) : (
  <Alert severity="info" sx={{ mt: 2 }}>
    <strong>Kein Mermaid-Code verfügbar</strong>
    <br />
    Für dieses Diagramm ist leider kein Mermaid-Code in der Datenbank hinterlegt.
  </Alert>
)}
```

## 🔍 Debugging Steps

### Bei Mermaid-Problemen:
1. **Öffne Browser-Konsole** (F12 → Console Tab)
2. **Suche nach "MermaidRenderer" Logs** 
3. **Prüfe "MermaidValidator" Ausgaben**
4. **Schaue nach Element-Ref Fehlern**

### Debug-Ausgaben interpretieren:
```
MermaidRenderer: Starting render with: {hasCode: true, codeLength: 245, hasElementRef: true, id: "diagram-abc123"}
MermaidValidator: Checking code (first 100 chars): graph TD\n    subgraph LF\n        A[Stornierung starten] --> B(Stornierung)...
MermaidValidator: Starts with valid type: true
MermaidValidator: Has valid syntax patterns: true
MermaidValidator: Final validation result: true
```

### Bei Content-Problemen:
1. **Überprüfe cleanContent() Ausgabe**
2. **Schaue nach ReactMarkdown Rendering**
3. **Validiere API-Response Format**

## 📋 Nächste Schritte

### Sofortige Tests:
- [ ] **Browser-Test:** Öffne http://localhost:3003/app → Login → Prozesse und Verfahren
- [ ] **API-Test:** Verwende "API Test" Button auf der Seite
- [ ] **Mermaid-Test:** Suche nach "Kündigungsprozess" oder "Lieferantenwechsel"
- [ ] **Markdown-Test:** Überprüfe ob Content richtig formatiert ist

### Bei anhaltenden Problemen:
1. **Console-Logs sammeln** und analysieren
2. **API-Response überprüfen** (Network Tab in Browser)
3. **Mermaid-Code validieren** mit Online-Editor
4. **Backend-Logs prüfen** für Qdrant/Gemini Fehler

---

**Status:** Ready for Testing  
**Deployment:** ✅ Built & Deployed (v2.1)  
**Nächster Check:** Browser-Test und Console-Log-Analyse
