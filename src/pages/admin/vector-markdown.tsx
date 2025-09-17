import React, { useState } from 'react';

export default function VectorMarkdownAdmin() {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'glossary' | 'abbreviation' | 'guide' | 'note'>('guide');
  const [tags, setTags] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [searchRes, setSearchRes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const ingest = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/vector-content/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug: slug || undefined, content, type, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, error: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/vector-content/markdown/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 8 })
      });
      const data = await res.json();
      setSearchRes(data?.data?.results || []);
    } finally { setBusy(false); }
  };

  const del = async () => {
    if (!slug) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/vector-content/markdown/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      const data = await res.json();
      setResult(data);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '2rem auto', padding: '1rem' }}>
      <h1>Admin: Markdown → Vector Store</h1>
      <p>Fügen Sie Glossar/Abkürzungen/Guides als Markdown hinzu. Beispiel: "EoG - Ersatz- oder Grundversorgung".</p>
      <div style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} />
        <input placeholder="Slug (optional)" value={slug} onChange={e => setSlug(e.target.value)} />
        <select value={type} onChange={e => setType(e.target.value as any)}>
          <option value="glossary">glossary</option>
          <option value="abbreviation">abbreviation</option>
          <option value="guide">guide</option>
          <option value="note">note</option>
        </select>
        <input placeholder="Tags, Komma-getrennt" value={tags} onChange={e => setTags(e.target.value)} />
        <textarea placeholder="Markdown Inhalt" rows={12} value={content} onChange={e => setContent(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={ingest} disabled={busy}>Ingest</button>
          <button onClick={del} disabled={busy || !slug}>Delete by Slug</button>
        </div>
      </div>

      {result && (
        <pre style={{ marginTop: 16, background: '#111', color: '#ddd', padding: 12, borderRadius: 6 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}

      <hr style={{ margin: '2rem 0' }} />
      <h2>Suche in Admin-Markdown</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1 }} placeholder="Suchbegriff (z.B. EoG)" value={query} onChange={e => setQuery(e.target.value)} />
        <button onClick={runSearch} disabled={busy}>Suchen</button>
      </div>
      <div>
        {(searchRes || []).map((r, i) => (
          <div key={i} style={{ marginTop: 12, padding: 10, border: '1px solid #ddd', borderRadius: 6 }}>
            <div><strong>{r?.payload?.title}</strong> [{r?.payload?.slug}]</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{r?.payload?.chunk_type} • {r?.score?.toFixed?.(3)}</div>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{r?.payload?.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
