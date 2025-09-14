import { GetServerSideProps } from 'next';
import Layout from '../../../../components/Layout';
import SEOHead from '../../../../components/SEO/SEOHead';

type PublicSubmission = {
  id: string;
  slug: string;
  chapterKey: string;
  author?: string;
  organization?: string;
  comment: string;
  createdAt: string;
  curatedSummary?: string;
  curatedOpinion?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral' | null;
};

type Props = { submission: PublicSubmission | null; origin: string };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const protocol = (ctx.req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (ctx.req.headers['x-forwarded-host'] as string) || ctx.req.headers.host || 'localhost:3000';
  const origin = `${protocol}://${host}`;
  const id = ctx.params?.id as string;

  let submission: PublicSubmission | null = null;
  try {
    const res = await fetch(`${origin}/api/public/community/consultations/mitteilung-53/submissions/${encodeURIComponent(id)}`);
    if (res.ok) {
      const json = await res.json();
      submission = json?.data || null;
    }
  } catch {}

  ctx.res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  return { props: { submission, origin } };
};

export default function SubmissionDetail({ submission, origin }: Props) {
  const title = submission ? `Rückmeldung zu Mitteilung 53 – ${submission.chapterKey}` : 'Rückmeldung nicht gefunden';
  const desc = submission?.curatedSummary || (submission ? `Rückmeldung von ${submission.author || 'Anonym'} (${submission.organization || '—'})` : 'Diese Rückmeldung ist nicht öffentlich verfügbar.');
  return (
    <Layout title={title}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1rem' }}>
        <SEOHead
          title={title}
          description={desc}
          url={`${origin}/konsultation/mitteilung-53/rueckmeldung/${submission?.id || ''}`}
          type="article"
        />
        <a href="/konsultation/mitteilung-53" style={{ textDecoration: 'none', color: '#07a' }}>← Zur Konsultation</a>
        {!submission ? (
          <p style={{ color: '#777', marginTop: '1rem' }}>Diese Rückmeldung ist nicht verfügbar.</p>
        ) : (
          <article style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
            <header style={{ marginBottom: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Rückmeldung – Kapitel {submission.chapterKey}</h1>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                Eingereicht am {new Date(submission.createdAt).toLocaleString('de-DE')} · {submission.author || 'Anonym'}{submission.organization ? ` (${submission.organization})` : ''}
              </div>
              {submission.curatedOpinion && (
                <div style={{ marginTop: 6 }}>
                  Redaktionsmeinung: <strong>{submission.curatedOpinion}</strong>
                </div>
              )}
              {submission.curatedSummary && (
                <p style={{ marginTop: 6, color: '#333' }}>{submission.curatedSummary}</p>
              )}
            </header>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{submission.comment}</div>
            <footer style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.75rem', fontSize: '0.9rem' }}>
              <a href={`/konsultation/mitteilung-53/issues?chapterKey=${encodeURIComponent(submission.chapterKey)}`} className="btn secondary">Weitere Diskussionen zu diesem Kapitel</a>
            </footer>
          </article>
        )}
        <style jsx>{`
          .btn { background: #0a7; color: #fff; padding: 0.4rem 0.65rem; border-radius: 6px; text-decoration: none; display: inline-block; }
          .btn.secondary { background: #07a; }
        `}</style>
      </div>
    </Layout>
  );
}
