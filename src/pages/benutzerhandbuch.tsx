import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import { GetStaticProps } from 'next';
import Layout from '../components/Layout';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Container, Box, Typography } from '@mui/material';
import Link from 'next/link';
import { parseManualSections, getManualMarkdown } from '../lib/content/manual';

interface Props { markdown: string; toc: Array<{ slug: string; title: string }> }

export default function Benutzerhandbuch({ markdown, toc }: Props) {
  return (
    <Layout title="Willi‑Mako Benutzerhandbuch">
      <Head>
        <title>Willi‑Mako Benutzerhandbuch – Praxisleitfaden Marktkommunikation</title>
        <meta name="description" content="Praxisnahes Benutzerhandbuch für die Marktkommunikation in der Energiewirtschaft: Probleme, Lösungswege und Szenarien mit Willi‑Mako." />
        <meta name="keywords" content="Marktkommunikation, Energiewirtschaft, EDIFACT, UTILMD, MSCONS, ORDERS, BDEW, BNetzA, AS4, ebMS3, GPKE, WiM, MaBiS, Grundversorgung, Netznutzungsabrechnung" />
        <link rel="canonical" href="https://stromhaltig.de/benutzerhandbuch" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="Willi‑Mako Benutzerhandbuch – Praxisleitfaden Marktkommunikation" />
        <meta property="og:description" content="Praxisnahes Benutzerhandbuch mit EDIFACT‑Beispielen (UTILMD, MSCONS, ORDERS) und Fristberechnungen (Lieferantenwechsel, Grundversorgung, Netznutzungsabrechnung)." />
        <meta property="og:url" content="https://stromhaltig.de/benutzerhandbuch" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TechArticle',
              headline: 'Willi‑Mako Benutzerhandbuch – Praxisleitfaden Marktkommunikation',
              description: 'Praxisnahes Benutzerhandbuch mit EDIFACT‑Beispielen (UTILMD, MSCONS, ORDERS) und Fristberechnungen.',
              author: { '@type': 'Organization', name: 'STROMDAO GmbH' },
              publisher: { '@type': 'Organization', name: 'STROMDAO GmbH' },
              inLanguage: 'de',
              url: 'https://stromhaltig.de/benutzerhandbuch',
              dateModified: new Date().toISOString(),
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://stromhaltig.de'
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Benutzerhandbuch',
                  item: 'https://stromhaltig.de/benutzerhandbuch'
                }
              ]
            })
          }}
        />
      </Head>
      <Container maxWidth="md" sx={{ py: 6 }}>
        {toc && toc.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Inhaltsverzeichnis
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {toc.map((s) => (
                <li key={s.slug}>
                  <Link href={`/benutzerhandbuch/${s.slug}`}>{s.title}</Link>
                </li>
              ))}
            </Box>
          </Box>
        )}
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{markdown}</ReactMarkdown>
        </div>
      </Container>
      <style jsx global>{`
        .markdown-body h1 { font-size: 2.2rem; margin: 0 0 1rem; }
        .markdown-body h2 { font-size: 1.6rem; margin-top: 2rem; }
        .markdown-body h3 { font-size: 1.2rem; margin-top: 1.25rem; }
        .markdown-body p { line-height: 1.7; }
        .markdown-body ul { padding-left: 1.25rem; }
        .markdown-body blockquote { border-left: 3px solid #147a50; padding-left: .8rem; color: #444; }
        .markdown-body code { background: #f6f8fa; padding: .1rem .3rem; border-radius: 4px; }
        .markdown-body hr { border: 0; border-top: 1px solid #eee; margin: 2rem 0; }
        .markdown-body a { color: #147a50; }
      `}</style>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const mdPath = path.join(process.cwd(), 'docs', 'benutzerhandbuch.md');
  const markdown = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '# Benutzerhandbuch';
  const toc = parseManualSections(getManualMarkdown()).map((s) => ({ slug: s.slug, title: s.title }));
  return { props: { markdown, toc } };
};
