import { GetServerSideProps } from 'next';
import SEOHead from '../../components/SEO/SEOHead';
import Layout from '../../components/Layout';
import React, { useMemo, useState } from 'react';

type Section = {
  key: string;
  title: string;
  html: string;
};

type ConsultationPayload = {
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'final';
  updated_at: string;
  tags: string[];
  executiveSummary?: string;
  sections: Section[];
  downloads?: { pdf?: string; docx?: string };
};

type IssueRef = {
  number: number;
  title: string;
  labels: string[];
  url: string;
  state: 'open' | 'closed';
  updated_at: string;
  chapterKey?: string | null;
};

type Props = {
  payload: ConsultationPayload | null;
  issues: IssueRef[];
  origin: string;
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const protocol = (ctx.req.headers['x-forwarded-proto'] as string) || 'http';
  const host = ctx.req.headers['x-forwarded-host'] || ctx.req.headers.host || 'localhost:3000';
  const origin = `${protocol}://${host}`;

  const [payloadRes, issuesRes] = await Promise.all([
    fetch(`${origin}/api/public/community/consultations/mitteilung-53`).catch(() => null),
    fetch(`${origin}/api/public/community/consultations/mitteilung-53/issues`).catch(() => null),
  ]);

  let payload: ConsultationPayload | null = null;
  let issues: IssueRef[] = [];

  try {
    if (payloadRes && payloadRes.ok) {
      const json = await payloadRes.json();
      payload = json?.data || null;
    }
  } catch {}

  try {
    if (issuesRes && issuesRes.ok) {
      const json = await issuesRes.json();
      issues = json?.data || [];
    }
  } catch {}

  // Cache SSR response for a short period
  try { ctx.res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600'); } catch {}

  return { props: { payload, issues, origin } };
};

export default function Mitteilung53Page({ payload, issues, origin }: Props) {
  if (!payload) {
    return (
      <Layout title="Konsultation – Mitteilung Nr. 53">
        <div style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
          <SEOHead
            title="Mitteilung Nr. 53 – Konsultation API‑Webdienste | Willi-Mako"
            description="Öffentliche Lesefassung und Referenzen (GitHub Issues) zur Konsultation der BNetzA: Mitteilung Nr. 53 – API‑Webdienste für den MaBiS‑Hub."
            url={`${origin}/konsultation/mitteilung-53`}
            type="article"
          />
          <DeadlineBanner />
          <h1>Mitteilung Nr. 53</h1>
          <p>Inhalt derzeit nicht verfügbar.</p>
        </div>
      </Layout>
    );
  }

  const groupedIssues = issues.reduce<Record<string, IssueRef[]>>((acc, it) => {
    const key = it.chapterKey || 'other';
    (acc[key] = acc[key] || []).push(it);
    return acc;
  }, {});

  return (
    <Layout title="Konsultation – Mitteilung Nr. 53">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem' }}>
      {/* Hintergrund & Einordnung */}
      <section style={{ margin: '1rem 0 1.5rem', padding: '0.75rem 1rem', border: '1px solid #eaeaea', borderRadius: 8, background: '#fbfbfb' }}>
        <strong>Hintergrund (BK6‑24‑210):</strong> Die Beschlusskammer 6 plant ein zweistufiges Verfahren (Block 1/Block 2) für den MaBiS‑Hub. Block 1 betrifft u. a. zentrale Aggregation und Messwertaufbereitung.
        <div style={{ marginTop: 6 }}>
          <a href="/wissen/artikel/bk6-24-210-verfahrensstand" target="_blank" rel="noopener">Artikel: Verfahrensstand & Einordnung</a> ·
          <a style={{ marginLeft: 8 }} href="https://www.bundesnetzagentur.de/DE/Beschlusskammern/1_GZ/BK6-GZ/2024/BK6-24-210/InfoVorgehen/BK6-24-210_Verfahrensstand.html?nn=1029832" target="_blank" rel="noopener">Offizielle BNetzA‑Seite</a>
        </div>
      </section>
      <SEOHead
        title={`${payload.title} | Willi-Mako`}
        description="Öffentliche Lesefassung und Referenzen (GitHub Issues) zur Konsultation der BNetzA: Mitteilung Nr. 53 – API‑Webdienste für den MaBiS‑Hub."
        url={`${origin}/konsultation/mitteilung-53`}
        type="article"
      />
      <StructuredData origin={origin} title={payload.title} updatedAt={payload.updated_at} />

      <DeadlineBanner />
      <header style={{ margin: '1rem 0 2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>{payload.title}</h1>
        <p style={{ color: '#555', marginTop: 0 }}>Letzte Aktualisierung: {new Date(payload.updated_at).toLocaleDateString('de-DE')}</p>
        {!!issues.length && (
          <p style={{ color: '#777', marginTop: 0, fontSize: '0.95rem' }}>
            Issues zuletzt aktualisiert: {new Date(issues.map(i => i.updated_at).sort().slice(-1)[0] || payload.updated_at).toLocaleString('de-DE')}
          </p>
        )}
        {payload.downloads && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {payload.downloads.pdf && (
              <a className="btn" href={payload.downloads.pdf} rel="nofollow noopener" target="_blank">PDF herunterladen</a>
            )}
            {payload.downloads.docx && (
              <a className="btn secondary" href={payload.downloads.docx} rel="nofollow noopener" target="_blank">DOCX herunterladen</a>
            )}
          </div>
        )}
      </header>

      {/* Quick EVU Actions */}
      <div style={{ display: 'grid', gap: '0.5rem', background: '#f0fbf4', border: '1px solid #cfe9da', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <strong>Was sollten EVU jetzt tun?</strong>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li><a href="#warum-wichtig">Wichtigkeit verstehen</a> – warum API‑Webdienste jetzt relevant sind.</li>
          <li><a href="#handlungs-empfehlungen">Handlungsempfehlungen lesen</a> – in 4 Schritten zur Rückmeldung.</li>
          <li><a href="#ch10_1">Rückmeldung zu Kap. 1–8</a> und <a href="#ch10_2">zu Kap. 9</a> gezielt vorbereiten.</li>
          <li>Optional: <a href={payload.downloads?.pdf || '#'} rel="nofollow noopener" target="_blank">PDF‑Export</a> oder <a href={payload.downloads?.docx || '#'} rel="nofollow noopener" target="_blank">DOCX‑Export</a> nutzen.</li>
        </ul>
      </div>

  <section style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Inhaltsverzeichnis</h2>
        <ul style={{ columns: 2, paddingInlineStart: '1.2rem', margin: 0 }}>
          {payload.sections.map((s) => (
            <li key={s.key} style={{ breakInside: 'avoid' }}>
              <a href={`#${s.key}`}>{s.title}</a>
            </li>
          ))}
        </ul>
      </section>

  {/* KI-Kurzfassungen (optional) */}
  <AISummaries slug={payload.slug} sections={payload.sections} />

      {/* Zielgruppen-Block: Warum wichtig für EVU */}
      <section id="warum-wichtig" style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #e7f5ee', background: '#f6fffb', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Warum ist die Konsultation wichtig für Energieversorgungsunternehmen (EVU)?</h2>
        <ul>
          <li><strong>Zukunft der Marktkommunikation:</strong> API‑Webdienste im MaBiS‑Hub sind ein grundlegender Wandel. Frühe Auseinandersetzung sichert Wettbewerbsfähigkeit, Effizienz und Flexibilität.</li>
          <li><strong>Eigene IT‑Systeme:</strong> Direkte Auswirkungen auf Schnittstellen der EVU. Aktive Beteiligung ermöglicht, eigene Anforderungen einzubringen.</li>
          <li><strong>Standardisierung & Interoperabilität:</strong> Einheitliche Schnittstellenbeschreibungen fördern praxistaugliche, interoperable Prozesse über Marktpartner hinweg.</li>
          <li><strong>Kosteneffizienz:</strong> Gute API‑Strategie senkt langfristig Integrations‑ und Prozesskosten durch mehr Automatisierung.</li>
          <li><strong>Frühzeitige Information:</strong> Teilnahme liefert früh Einblick, um rechtzeitig auf Umstellungen zu planen.</li>
          <li><strong>Mitgestaltung:</strong> Aktive Rückmeldung und Teilnahme an der Konsultationssitzung bringt Expertise in die Ausgestaltung ein.</li>
          <li><strong>Energiewende‑Dynamik:</strong> Schnellere Veränderung der Geschäftsprozesse – Mitwirkung stellt sicher, dass EVU‑Interessen berücksichtigt werden.</li>
        </ul>
      </section>

      {/* Zielgruppen-Block: Handlungsempfehlungen */}
      <section id="handlungs-empfehlungen" style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #e8ecff', background: '#f7f9ff', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Konkrete Handlungsempfehlungen für EVU</h2>
        <ol>
          <li><strong>Analyse des Konzepts:</strong> Auswirkungen auf eigene IT‑Systeme und Prozesse bewerten.</li>
          <li><strong>Prüfung des GitHub‑Repositorys:</strong> Strukturen, Schemas und Beispiele der vorgeschlagenen API‑Webdienste verstehen.</li>
          <li><strong>Erstellung einer Rückmeldung:</strong> Detaillierte Anmerkungen und Vorschläge zu Kap. 1–8 (allgemein) und Kap. 9 (Spezifika) ausarbeiten.</li>
          <li><strong>Teilnahme an der Konsultationssitzung:</strong> Position vertreten, Fragen klären, Austausch mit Marktteilnehmern.</li>
        </ol>
      </section>

  {/* Schnell-Rückmeldung (2 Minuten) */}
  <section id="quick-response" style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ffd9b3', background: '#fffaf2', borderRadius: 8, boxShadow: '0 1px 0 rgba(0,0,0,0.02)' }}>
        <h2 style={{ marginTop: 0 }}>Schnell‑Rückmeldung (2 Minuten)</h2>
        <p style={{ color: '#555' }}>Keine Zeit? Mit wenigen Angaben erhalten Sie eine DOCX‑Vorlage zur offiziellen Einreichung per E‑Mail (BNetzA).</p>
        <QuickResponseBuilder issues={issues} slug={payload.slug} />
      </section>

  {/* Weitere Quellen – Qdrant Snippets */}
  <MoreSources slug={payload.slug} />

      {payload.sections.map((s) => (
        <article id={s.key} key={s.key} style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start', marginBottom: '2rem' }}>
          <div className="content">
            <h2>{s.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: s.html }} />
          </div>
          <aside style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Referenzen (GitHub)</h3>
            <p style={{ color: '#666', marginTop: 0 }}>Diskussionen und Hinweise aus dem offiziellen Repository.</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(groupedIssues[s.key] || []).slice(0, 6).map((it) => (
                <li key={it.number} style={{ marginBottom: '0.5rem' }}>
                  <a href={it.url} target="_blank" rel="noopener noreferrer">
                    #{it.number} · {it.title}
                  </a>
                </li>
              ))}
              {!(groupedIssues[s.key] || []).length && (
                <li style={{ color: '#888' }}>Keine referenzierten Issues.</li>
              )}
            </ul>
            <div style={{ marginTop: '0.75rem' }}>
              <a href={`${origin}/konsultation/mitteilung-53/issues?chapterKey=${encodeURIComponent(s.key)}`} target="_blank" rel="noopener noreferrer">Alle Issues zu diesem Kapitel ansehen</a>
            </div>
          </aside>
        </article>
      ))}

      <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #eee', color: '#666' }}>
        <p>
          Offizielle Abgabe an die BNetzA erfolgt per E‑Mail gemäß Konsultationsaufruf. Diese Seite dient der öffentlichen Lesefassung und verweist auf das offizielle GitHub‑Repository.
        </p>
      </footer>

      <style jsx>{`
        .btn { background: #0a7; color: #fff; padding: 0.5rem 0.75rem; border-radius: 6px; text-decoration: none; display: inline-block; }
        .btn.secondary { background: #07a; }
        .content :global(h2) { margin-top: 0; }
        .content :global(table) { width: 100%; border-collapse: collapse; }
        .content :global(th), .content :global(td) { border: 1px solid #ddd; padding: 6px; }
        .content :global(sup.citation) { font-size: 0.8em; color: #666; margin-left: 2px; }
        section { scroll-margin-top: 80px; }
        h2 { line-height: 1.25; }
        @media (max-width: 960px) {
          article { grid-template-columns: 1fr; }
        }
      `}</style>
      </div>
    </Layout>
  );
}

function MoreSources({ slug }: { slug: string }) {
  const [q, setQ] = useState('Messwertübermittlung');
  const [hits, setHits] = useState<Array<{ text: string; source: string; score: number }>>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const url = `/api/public/community/consultations/${slug}/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const json = await res.json();
      setHits(json?.data || []);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #e8e8e8', background: '#fafafa', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Weitere Quellen</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <input aria-label="Suchbegriff" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Begriff eingeben (z. B. OBIS)" style={{ flex: '1 1 260px' }} />
        <button className="btn secondary" onClick={run} disabled={loading} aria-label="Suche starten">{loading ? 'Suche…' : 'Suchen'}</button>
      </div>
      {!hits.length && <p style={{ color: '#777', marginTop: 0 }}>Noch keine Treffer. Tipp: Suchbegriff anpassen und erneut versuchen.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
        {hits.slice(0, 3).map((h, idx) => (
          <li key={idx} style={{ border: '1px solid #eee', borderRadius: 6, padding: '0.5rem 0.75rem', background: '#fff' }}>
            <div style={{ fontSize: '0.9rem', color: '#333' }}>{h.text.slice(0, 280)}{h.text.length > 280 ? '…' : ''}</div>
            <div style={{ marginTop: 4 }}>
              <a href={h.source} target="_blank" rel="noopener noreferrer">Quelle öffnen</a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeadlineBanner() {
  // Frist: 15.10.2025
  const deadline = new Date('2025-10-15T23:59:59+02:00');
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return (
    <div style={{ background: '#fff7e6', border: '1px solid #ffd08a', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
      <strong>Frist:</strong> Einreichung bis 15.10.2025 (BNetzA) — noch {daysLeft} Tage.
    </div>
  );
}

function StructuredData({ origin, title, updatedAt }: { origin: string; title: string; updatedAt: string }) {
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: `${origin}/konsultation/mitteilung-53`,
    dateModified: updatedAt,
    publisher: {
      '@type': 'Organization',
      name: 'STROMDAO GmbH',
      url: 'https://stromhaltig.de',
    },
  };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    url: `${origin}/konsultation/mitteilung-53`,
    dateModified: updatedAt,
    author: {
      '@type': 'Organization',
      name: 'Willi-Mako Expertensystem',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'Willi-Mako',
      url: 'https://stromhaltig.de',
    },
  };
  const json = JSON.stringify([webpage, article]);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

function AISummaries({ slug, sections }: { slug: string; sections: Section[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, string> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/community/consultations/${slug}/ai/summaries`);
      const json = await res.json();
      setData(json?.data || {});
      setOpen(true);
    } catch {
      alert('KI-Kurzfassungen aktuell nicht verfügbar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ margin: '1rem 0 1.5rem', padding: '1rem', border: '1px dashed #ddd', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>KI‑Kurzfassungen pro Kapitel</h3>
        <button className="btn secondary" onClick={load} disabled={loading}>{loading ? 'Lade…' : 'Kurzfassungen anzeigen'}</button>
      </div>
      {open && (
        <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
          {sections.map((s) => (
            <div key={s.key} style={{ border: '1px solid #eee', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#444' }}>{data?.[s.key] || '—'}</pre>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickResponseBuilder({ issues, slug }: { issues: IssueRef[]; slug: string }) {
  const [organization, setOrganization] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('');
  const [positionGeneral, setPositionGeneral] = useState<'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral'>('neutral');
  const [remarksGeneral, setRemarksGeneral] = useState('');
  const [remarksChapter9, setRemarksChapter9] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAIBusy] = useState(false);

  const latestIssues = useMemo(() => {
    return [...issues]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
  }, [issues]);

  const toggle = (n: number) => {
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/public/community/consultations/${slug}/response.docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization, contact, role, positionGeneral, remarksGeneral, remarksChapter9, selectedIssueNumbers: selected }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-rueckmeldung.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export fehlgeschlagen. Bitte später erneut versuchen.');
    } finally {
      setBusy(false);
    }
  };

  const suggest = async () => {
    setAIBusy(true);
    try {
      const res = await fetch(`/api/public/community/consultations/${slug}/ai/suggest-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, positionGeneral, selectedIssueNumbers: selected }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      setRemarksGeneral((json?.data?.general as string) || remarksGeneral);
      setRemarksChapter9((json?.data?.chapter9 as string) || remarksChapter9);
    } catch {
      alert('KI‑Vorschläge aktuell nicht verfügbar.');
    } finally {
      setAIBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
      {/* Primary actions at the top for quick access */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={busy} aria-label="DOCX Rückmeldung erstellen (oben)">
          {busy ? 'Erzeuge…' : 'Rückmeldung als DOCX herunterladen'}
        </button>
        <button className="btn secondary" type="button" onClick={suggest} disabled={aiBusy} aria-label="KI Vorschläge einfügen (oben)">
          {aiBusy ? 'Hole…' : 'KI‑Vorschläge übernehmen'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <input aria-label="Organisation" placeholder="Organisation (optional)" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        <input aria-label="Kontakt" placeholder="Kontakt (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
        <input aria-label="Rolle" placeholder="Rolle (z. B. EVU, MSB)" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div>
        <label style={{ marginRight: 8 }}><strong>Grundsatzposition (Kap. 1–8):</strong></label>
        {(['zustimmend','mit_auflagen','ablehnend','neutral'] as const).map((opt) => (
          <label key={opt} style={{ marginRight: 12 }}>
            <input type="radio" name="pos" value={opt} checked={positionGeneral === opt} onChange={() => setPositionGeneral(opt)} /> {opt.replace('_', ' ')}
          </label>
        ))}
      </div>
      <textarea aria-label="Anmerkungen 1–8" placeholder="Anmerkungen zu Kap. 1–8 (optional)" value={remarksGeneral} onChange={(e) => setRemarksGeneral(e.target.value)} />
      <textarea aria-label="Anmerkungen 9" placeholder="Anmerkungen zu Kap. 9 (optional)" value={remarksChapter9} onChange={(e) => setRemarksChapter9(e.target.value)} />

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Relevante GitHub‑Issues (optional, max. 10):</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {latestIssues.map((it) => (
            <label key={it.number} style={{ border: '1px solid #eee', borderRadius: 6, padding: 6 }}>
              <input type="checkbox" checked={selected.includes(it.number)} onChange={() => toggle(it.number)} /> #{it.number} · {it.title}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" type="submit" disabled={busy} aria-label="DOCX Rückmeldung erstellen">
          {busy ? 'Erzeuge…' : 'Rückmeldung als DOCX herunterladen'}
        </button>
        <button className="btn secondary" type="button" onClick={suggest} disabled={aiBusy} aria-label="KI Vorschläge einfügen">
          {aiBusy ? 'Hole…' : 'KI‑Vorschläge übernehmen'}
        </button>
        <span style={{ color: '#666' }}>Offizieller Versand per E‑Mail an die BNetzA (siehe Konsultationsaufruf).</span>
      </div>

      <style jsx>{`
        input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
        textarea { min-height: 90px; }
      `}</style>
    </form>
  );
}
