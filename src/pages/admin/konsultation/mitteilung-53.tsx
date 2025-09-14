import { GetServerSideProps } from 'next';
import Layout from '../../../components/Layout';
import SEOHead from '../../../components/SEO/SEOHead';
import React from 'react';

type Submission = {
  _id: string;
  slug: string;
  chapterKey: string;
  author?: string;
  organization?: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending'|'approved'|'rejected';
  published: boolean;
  curatedSummary?: string;
  curatedOpinion?: 'zustimmend'|'mit_auflagen'|'ablehnend'|'neutral'|null;
};

type Props = { initial: Submission[]; origin: string };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const protocol = (ctx.req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (ctx.req.headers['x-forwarded-host'] as string) || ctx.req.headers.host || 'localhost:3000';
  const origin = `${protocol}://${host}`;
  // Note: This relies on session cookies for admin auth; if not present, backend returns 401/403.
  let initial: Submission[] = [];
  try {
    const res = await fetch(`${origin}/api/admin/public-community/consultations/mitteilung-53/submissions?status=all&limit=100`, { headers: { cookie: ctx.req.headers.cookie || '' } as any });
    if (res.ok) {
      const json = await res.json();
      initial = json?.data || [];
    }
  } catch {}
  return { props: { initial, origin } };
};

export default function AdminMitteilung53({ initial, origin }: Props) {
  const [items, setItems] = React.useState<Submission[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<'all'|'pending'|'approved'|'rejected'>('all');
  const [ingestBusy, setIngestBusy] = React.useState(false);

  const reload = async () => {
    const url = new URL(`/api/admin/public-community/consultations/mitteilung-53/submissions`, origin);
    url.searchParams.set('status', filter);
    if (q.trim()) url.searchParams.set('q', q.trim());
    const token = localStorage.getItem('token') || '';
    const res = await fetch(url.toString(), { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const json = await res.json();
    if (res.ok) setItems(json.data || []);
  };

  const update = async (id: string, patch: Partial<Submission>) => {
    setBusy(id);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/admin/public-community/consultations/mitteilung-53/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (res.ok) await reload();
    } finally { setBusy(null); }
  };

  return (
    <Layout title="Admin · Mitteilung 53 Moderation">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
        <SEOHead title="Admin · Mitteilung 53 Moderation" description="Moderation der Konsultations-Rückmeldungen" url={`${origin}/admin/konsultation/mitteilung-53`} type="website" />
        <h1>Mitteilung 53 · Moderation</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0.5rem 0 1rem' }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">Alle</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Freigegeben</option>
            <option value="rejected">Abgelehnt</option>
          </select>
          <input placeholder="Suche…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={reload}>Neu laden</button>
          <button className="btn secondary" onClick={async () => {
            setIngestBusy(true);
            try {
              const token = localStorage.getItem('token') || '';
              const resp = await fetch(`/api/admin/public-community/consultations/mitteilung-53/ingest`, {
                method: 'POST', credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const json = await resp.json();
              alert(resp.ok ? `Ingestion ok: ${json?.data?.count || 0} Stück` : (json?.message || 'Ingestion fehlgeschlagen'));
            } finally { setIngestBusy(false); }
          }} disabled={ingestBusy}>{ingestBusy ? 'Indiziere…' : 'Qdrant re-indizieren'}</button>
        </div>
        {!items.length && <p style={{ color: '#777' }}>Keine Einträge.</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {items.map((it) => (
            <li key={it._id} style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem 1rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Kapitel {it.chapterKey} · {it.author || 'Anonym'}{it.organization ? ` (${it.organization})` : ''}</div>
                  <div style={{ color: '#666', fontSize: '0.85rem' }}>Status: {it.status} · Öffentlich: {it.published ? 'Ja' : 'Nein'} · {new Date(it.createdAt).toLocaleString('de-DE')}</div>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{it.comment}</pre>
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <textarea placeholder="Kurze Zusammenfassung…" defaultValue={it.curatedSummary || ''} onBlur={(e) => update(it._id, { curatedSummary: e.target.value })} />
                    <select defaultValue={it.curatedOpinion || ''} onChange={(e) => update(it._id, { curatedOpinion: (e.target.value || null) as any })}>
                      <option value="">— Meinung wählen —</option>
                      <option value="zustimmend">zustimmend</option>
                      <option value="mit_auflagen">mit Auflagen</option>
                      <option value="ablehnend">ablehnend</option>
                      <option value="neutral">neutral</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6, minWidth: 220 }}>
                  <button className="btn" disabled={busy === it._id} onClick={() => update(it._id, { status: 'approved', published: true })}>{busy === it._id ? '…' : 'Veröffentlichen'}</button>
                  <button className="btn secondary" disabled={busy === it._id} onClick={() => update(it._id, { status: 'approved', published: false })}>{busy === it._id ? '…' : 'Freigeben (intern)'}</button>
                  <button className="btn warn" disabled={busy === it._id} onClick={() => update(it._id, { status: 'rejected', published: false })}>{busy === it._id ? '…' : 'Ablehnen'}</button>
                  {it.published && <a className="btn secondary" href={`/konsultation/mitteilung-53/rueckmeldung/${it._id}`} target="_blank" rel="noreferrer">Öffentliche Seite</a>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <style jsx>{`
          .btn { background: #0a7; color: #fff; padding: 0.4rem 0.65rem; border-radius: 6px; text-decoration: none; display: inline-block; }
          .btn.secondary { background: #07a; }
          .btn.warn { background: #b00; }
          input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
          textarea { min-height: 80px; }
        `}</style>
      </div>
    </Layout>
  );
}
