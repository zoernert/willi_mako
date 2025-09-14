import React from 'react';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import { GetServerSideProps } from 'next';
import Layout from '../../../components/Layout';

interface PublicationPayload {
  slug: string;
  title: string;
  summary: string;
  thread_id: string;
  published_at: string;
  source_thread_updated_at: string;
  content: {
    problem_description?: string;
    context?: string;
    analysis?: string;
    solution_proposals?: Array<{ id: string; title?: string; content: string; created_at?: string; created_by?: string }>;
    final_solution?: { content: string };
  };
  privateThreadUrl: string;
}

type Props = { data: PublicationPayload | null };

const PublicCommunityThreadPage: React.FC<Props> = ({ data }) => {
  if (!data) {
    return (
      <Layout title="Community (Öffentlich)">
        <div className="min-h-[50vh] bg-transparent flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Nicht gefunden</h1>
            <a href="/" className="text-primary underline">Zur Startseite</a>
          </div>
        </div>
      </Layout>
    );
  }

  const { content } = data;
  return (
    <>
      <Head>
        <title>{data.title} – Community Hub (Öffentlich)</title>
        <meta name="robots" content="index,follow" />
      </Head>
  <Layout title={`Community (Öffentlich) – ${data.title}`}>
    <div className="">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.title}</h1>
            {data.summary && <p className="text-gray-700">{data.summary}</p>}
            <div className="text-sm text-gray-500 mt-2">
              Veröffentlicht am {new Date(data.published_at).toLocaleDateString('de-DE')} • Stand: {new Date(data.source_thread_updated_at).toLocaleDateString('de-DE')}
            </div>
            <div className="mt-3">
      <a href={`/app/community/${data.thread_id}`} className="text-primary underline" target="_blank" rel="noopener noreferrer">
                Zum privaten Community-Thread (Login erforderlich)
              </a>
            </div>
          </div>

          <Section title="Problembeschreibung" text={content.problem_description} />
          <Section title="Kontext" text={content.context} />
          <Section title="Analyse" text={content.analysis} />

          {content.solution_proposals && content.solution_proposals.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Lösungsvorschläge</h2>
              <div className="space-y-4">
                {content.solution_proposals.map((p) => (
                  <div key={p.id} className="border-l-4 border-blue-200 pl-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                      {p.title && <h3 className="text-blue-900 font-semibold mb-2">{p.title}</h3>}
                      <div className="prose prose-sm max-w-none text-gray-800">
                        <ReactMarkdown components={{
                          a: ({ href, children, ...props }) => (
                            <a href={href as string} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
                          ),
                          h1: ({ children, ...props }) => (<h1 className="text-2xl font-semibold text-blue-900" {...props}>{children}</h1>),
                          h2: ({ children, ...props }) => (<h2 className="text-xl font-semibold text-blue-900" {...props}>{children}</h2>),
                          h3: ({ children, ...props }) => (<h3 className="text-lg font-semibold text-blue-900" {...props}>{children}</h3>),
                        }}>
                          {p.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.final_solution?.content && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold text-green-900 mb-4">Finale Lösung</h2>
              <div className="prose prose-sm max-w-none text-gray-800">
                <ReactMarkdown components={{
                  a: ({ href, children, ...props }) => (
                    <a href={href as string} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
                  ),
                  h1: ({ children, ...props }) => (<h1 className="text-2xl font-semibold text-green-900" {...props}>{children}</h1>),
                  h2: ({ children, ...props }) => (<h2 className="text-xl font-semibold text-green-900" {...props}>{children}</h2>),
                  h3: ({ children, ...props }) => (<h3 className="text-lg font-semibold text-green-900" {...props}>{children}</h3>),
                }}>
                  {content.final_solution.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

const Section: React.FC<{ title: string; text?: string }> = ({ title, text }) => {
  if (!text) return null;
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="prose prose-sm max-w-none text-gray-800">
        <ReactMarkdown components={{
          a: ({ href, children, ...props }) => (
            <a href={href as string} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
          ),
          h1: ({ children, ...props }) => (<h1 className="text-2xl font-semibold text-gray-900" {...props}>{children}</h1>),
          h2: ({ children, ...props }) => (<h2 className="text-xl font-semibold text-gray-900" {...props}>{children}</h2>),
          h3: ({ children, ...props }) => (<h3 className="text-lg font-semibold text-gray-900" {...props}>{children}</h3>),
        }}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;
  try {
  // Ensure the HTML is not cached by intermediaries
  try { (ctx.res as any)?.setHeader?.('Cache-Control', 'no-store'); } catch {}
  const proto = (ctx.req.headers['x-forwarded-proto'] as string) || 'https';
  const host = ctx.req.headers.host;
  const derivedBase = host ? `${proto}://${host}` : '';
  // Prefer the site origin in SSR to avoid localhost env misconfiguration in production
  const base = derivedBase || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3009';
  // Add a cache-busting query to avoid stale CDN/proxy caches just after republish
  const res = await fetch(`${base}/api/public/community/threads/${encodeURIComponent(slug)}?t=${Date.now()}`);
    if (!res.ok) return { props: { data: null } };
    const json = await res.json();
    return { props: { data: json.data as PublicationPayload } };
  } catch {
    return { props: { data: null } };
  }
};

export default PublicCommunityThreadPage;
