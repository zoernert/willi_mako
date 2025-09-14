import { GetServerSideProps } from 'next';
import Layout from '../../../components/Layout';
import SEOHead from '../../../components/SEO/SEOHead';
import React from 'react';

type IssueRef = {
  number: number;
  title: string;
  labels: string[];
  url: string;
  state: 'open' | 'closed';
  updated_at: string;
  chapterKey?: string | null;
};

type Section = { key: string; title: string; html: string };
type Props = { issues: IssueRef[]; chapterKey?: string | null; origin: string; section?: Section | null };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const protocol = (ctx.req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (ctx.req.headers['x-forwarded-host'] as string) || ctx.req.headers.host || 'localhost:3000';
  const origin = `${protocol}://${host}`;
  const chapterKey = (ctx.query.chapterKey as string) || undefined;

  const url = new URL(`${origin}/api/public/community/consultations/mitteilung-53/issues`);
  if (chapterKey) url.searchParams.set('chapterKey', chapterKey);

  let issues: IssueRef[] = [];
  let section: Section | null = null;
  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      const json = await res.json();
      issues = json?.data || [];
    }
  } catch {}

  if (chapterKey) {
    try {
      const payloadRes = await fetch(`${origin}/api/public/community/consultations/mitteilung-53`);
      if (payloadRes.ok) {
        const payloadJson = await payloadRes.json();
        const sec = (payloadJson?.data?.sections as Section[] | undefined)?.find((s) => s.key === chapterKey) || null;
        section = sec;
      }
    } catch {}
  }

  ctx.res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  return { props: { issues, chapterKey: chapterKey || null, origin, section } };
};

export default function IssuesPage({ issues, chapterKey, origin, section }: Props) {
  const [author, setAuthor] = React.useState('');
  const [organization, setOrganization] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null);
  const [aiBusy, setAIBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterKey) return;
    setBusy(true);
    setCreatedUrl(null);
    try {
      const res = await fetch(`/api/public/community/consultations/mitteilung-53/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterKey, author, organization, contact, comment }),
      });
      const json = await res.json();
      if (res.ok && json?.data?.permalink) {
        setCreatedUrl(json.data.permalink);
      } else {
        alert(json?.message || 'Abgabe fehlgeschlagen.');
      }
    } catch (e) {
      alert('Netzwerkfehler bei der Abgabe.');
    } finally {
      setBusy(false);
    }
  };

  const aiSuggest = async () => {
    if (!chapterKey) return;
    setAIBusy(true);
    try {
      const res = await fetch(`/api/public/community/consultations/mitteilung-53/ai/suggest-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Fachreferent bei einem Verteilnetzbetreiber',
          tone: 'sachlich',
          chapterKeys: [chapterKey],
        }),
      });
      const json = await res.json();
      const text: string | undefined = json?.data?.text || json?.data?.content || json?.data?.suggestion;
      if (text) setComment((prev) => prev?.trim() ? `${prev}\n\n${text}` : text);
      else alert('Keine KI-Antwort erhalten.');
    } catch {
      alert('KI-Vorschlag fehlgeschlagen.');
    } finally {
      setAIBusy(false);
    }
  };
  return (
    <Layout title="Mitteilung 53 – Issues">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
        <SEOHead
          title={`Mitteilung 53 – Issues${chapterKey ? ` (${chapterKey})` : ''}`}
          description="Alle referenzierten GitHub‑Issues zur Konsultation Mitteilung 53"
          url={`${origin}/konsultation/mitteilung-53/issues`}
          type="article"
        />
        <h1 style={{ marginBottom: 8 }}>Issues zur Konsultation Mitteilung 53</h1>
        {chapterKey && <p style={{ color: '#666' }}>Kapitel: <code>{chapterKey}</code></p>}

        {section && (
          <section style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem 1rem', background: '#fafafa', margin: '0.5rem 0 1rem' }}>
            <h2 style={{ marginTop: 0 }}>{section.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: section.html }} />
          </section>
        )}

        {chapterKey && (
          <section style={{ border: '1px dashed #ddd', borderRadius: 8, padding: '0.75rem 1rem', background: '#fff', marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Rückmeldung zu diesem Kapitel abgeben</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary" onClick={aiSuggest} disabled={aiBusy}>{aiBusy ? 'KI denkt…' : 'KI-Vorschlag einfügen'}</button>
            </div>
            <form onSubmit={submit} style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <input placeholder="Name (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
                <input placeholder="Organisation (optional)" value={organization} onChange={(e) => setOrganization(e.target.value)} />
                <input placeholder="Kontakt (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <textarea placeholder="Ihr Kommentar…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn" type="submit" disabled={busy || !comment.trim()}>{busy ? 'Sende…' : 'Jetzt übermitteln'}</button>
                {createdUrl && <a className="btn secondary" href={createdUrl} target="_blank" rel="noopener noreferrer">Öffentliche Seite ansehen</a>}
              </div>
              <small style={{ color: '#666' }}>Hinweis: Eingaben werden zunächst intern gespeichert und ggf. durch die Redaktion veröffentlicht.</small>
            </form>
          </section>
        )}
        {!issues.length && <p style={{ color: '#777' }}>Keine Issues gefunden.</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {issues.map((it) => (
            <li key={it.number} style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem 1rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>#{it.number} · {it.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Status: {it.state} · Aktualisiert: {new Date(it.updated_at).toLocaleString('de-DE')}</div>
                </div>
                <a className="btn secondary" href={it.url} target="_blank" rel="noopener noreferrer">Auf GitHub öffnen</a>
              </div>
            </li>
          ))}
        </ul>

        <style jsx>{`
          .btn { background: #0a7; color: #fff; padding: 0.4rem 0.65rem; border-radius: 6px; text-decoration: none; display: inline-block; }
          .btn.secondary { background: #07a; }
          input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
          textarea { min-height: 120px; }
        `}</style>
      </div>
    </Layout>
  );
}
