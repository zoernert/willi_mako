import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { Container, Box, Typography, Breadcrumbs } from '@mui/material';
import Link from 'next/link';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getManualMarkdown, parseManualSections, getManualSectionBySlug, ManualSection } from '../../lib/content/manual';

interface Props { section: ManualSection | null }

export default function ManualChapterPage({ section }: Props) {
  if (!section) {
    return (
      <Layout title="Benutzerhandbuch">
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Typography variant="h5">Kapitel nicht gefunden.</Typography>
          <Link href="/benutzerhandbuch">← Zurück zum Handbuch</Link>
        </Container>
      </Layout>
    );
  }

  const title = `${section.title} – Willi‑Mako Benutzerhandbuch`;
  const description = `Kapitel: ${section.title} – Praxisleitfaden Marktkommunikation.`;

  return (
    <Layout title={title}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://stromhaltig.de/benutzerhandbuch/${section.slug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`https://stromhaltig.de/benutzerhandbuch/${section.slug}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TechArticle',
              headline: title,
              description,
              inLanguage: 'de',
              url: `https://stromhaltig.de/benutzerhandbuch/${section.slug}`,
              isPartOf: {
                '@type': 'CreativeWork',
                name: 'Willi‑Mako Benutzerhandbuch',
                url: 'https://stromhaltig.de/benutzerhandbuch'
              }
            })
          }}
        />
      </Head>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link href="/">Home</Link>
          <Link href="/benutzerhandbuch">Benutzerhandbuch</Link>
          <Typography color="text.secondary">{section.title}</Typography>
        </Breadcrumbs>
        <Box className="markdown-body">
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>{section.title}</Typography>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{section.content}</ReactMarkdown>
        </Box>
      </Container>
      <style jsx global>{`
        .markdown-body h2 { font-size: 1.6rem; margin-top: 1.5rem; }
        .markdown-body p { line-height: 1.7; }
        .markdown-body ul { padding-left: 1.25rem; }
        .markdown-body a { color: #147a50; }
      `}</style>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const sections = parseManualSections(getManualMarkdown());
  const paths = sections.map((s) => ({ params: { chapter: s.slug } }));
  return { paths, fallback: 'blocking' };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = params?.chapter as string;
  const section = getManualSectionBySlug(slug);
  return { props: { section }, revalidate: 3600 };
};
