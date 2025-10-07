# FAQ Create API - Quick Reference

## Endpoint
```
POST /api/faqs
Authorization: Bearer str0mda0
Content-Type: application/json
```

**✨ Auto-Indexing**: Neue FAQs werden automatisch in Qdrant indiziert (text-embedding-004)

## Minimal Request
```json
{
  "question": "Ihre Frage hier",
  "answer": "# Antwort in Markdown\n\nMit [Links](https://example.com) und **Formatierung**"
}
```
*`context` wird automatisch aus `answer` generiert*

## Full Request
```json
{
  "question": "Ihre Frage hier",
  "answer": "# Antwort in Markdown\n\nMit [Links](https://example.com)",
  "context": "Antwort als Plain Text ohne Markdown für bessere Suche",
  "tags": ["Energiewirtschaft", "Preise"],
  "description": "Kurzbeschreibung",
  "additional_info": "Zusätzliche Infos"
}
```

## Quick cURL
```bash
curl -X POST https://stromhaltig.de/api/faqs \
  -H "Authorization: Bearer str0mda0" \
  -H "Content-Type: application/json" \
  -d '{"question":"Was ist...","answer":"# Antwort..."}'
```

## Quick JavaScript
```javascript
fetch('https://stromhaltig.de/api/faqs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer str0mda0',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'Was ist...',
    answer: '# Antwort...',
    tags: ['Energiewirtschaft']
  })
});
```

📖 **Vollständige Dokumentation**: [faq-create-endpoint.md](./faq-create-endpoint.md)
