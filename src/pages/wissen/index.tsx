import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  QuestionAnswer as FAQIcon,
  Search as SearchIcon,
  Description as DescriptionIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout';

// Local types to avoid importing DB-coupled modules
interface RelatedFAQ {
  id: string;
  title: string;
  slug: string;
  similarity_score?: number;
}

interface StaticFAQData {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  answer: string;
  additional_info?: string;
  tags: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
  related_faqs: RelatedFAQ[];
}

interface FAQTag {
  tag: string;
  count: number;
}

// Slugify helper (mirrors generateFAQSlug in lib/faq-api without DB import)
function slugifyTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface WissenIndexProps {
  faqs: StaticFAQData[];
  tags: FAQTag[];
  totalCount: number;
}

export default function WissenIndex({ faqs, tags, totalCount }: WissenIndexProps) {
  // Gruppiere FAQs nach Tags
  const faqsByTag = tags.reduce((acc, tag) => {
    acc[tag.tag] = faqs.filter(faq => faq.tags.includes(tag.tag)).slice(0, 5); // Top 5 pro Tag
    return acc;
  }, {} as Record<string, StaticFAQData[]>);

  return (
    <Layout title="Wissensdatenbank">
      <Head>
        <title>Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako</title>
        <meta 
          name="description" 
          content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. [ ${totalCount} ]FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr.`}
        />
        <meta name="keywords" content="Energiewirtschaft, FAQ, BDEW, EIC, Bilanzkreise, Marktkommunikation, Strommarkt" />
        <link rel="canonical" href="https://stromhaltig.de/wissen" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako" />
        <meta property="og:description" content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/wissen" />
  {/* Hreflang alternates */}
  <link rel="alternate" hrefLang="de" href="https://stromhaltig.de/wissen" />
  <link rel="alternate" hrefLang="x-default" href="https://stromhaltig.de/wissen" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako" />
        <meta name="twitter:description" content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel.`} />

        {/* RSS/Atom Feeds */}
        <link rel="alternate" type="application/rss+xml" title="Willi-Mako FAQ RSS Feed" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Willi-Mako FAQ Atom Feed" href="/atom.xml" />

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": "Wissensdatenbank Energiewirtschaft",
              "description": "Umfassende FAQ-Sammlung für Marktkommunikation in der Energiewirtschaft",
              "url": "https://stromhaltig.de/wissen",
              "isPartOf": {
                "@type": "WebSite",
                "name": "Willi-Mako",
                "url": "https://stromhaltig.de"
              },
              "about": {
                "@type": "Thing",
                "name": "Energiewirtschaft Marktkommunikation"
              },
              "creator": {
                "@type": "Person",
                "name": "Willi Mako (STROMDAO GmbH)",
                "email": "dev@stromdao.com"
              },
              "mentions": tags.slice(0, 10).map(tag => ({
                "@type": "Thing",
                "name": tag.tag
              }))
            })
          }}
        />
      </Head>

      <Box sx={{ mb: 8 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Wissensdatenbank Energiewirtschaft
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
            Umfassende FAQ-Sammlung für Marktkommunikation in der Energiewirtschaft. 
            {totalCount} Artikel zu BDEW-Codes, EIC-Codes, Bilanzkreisen und mehr.
          </Typography>
        </Box>

        {/* Whitepapers Callout */}
        <Paper elevation={1} sx={{ p: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6" component="h2" sx={{ m: 0, fontWeight: 600 }}>
              Whitepapers zur Marktkommunikation
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            component={Link}
            href="/whitepaper"
            variant="contained"
            color="primary"
            sx={{ fontWeight: 600 }}
          >
            Zu den Whitepapers →
          </Button>
        </Paper>

        {/* Daten Atlas Highlight */}
        <Paper
          elevation={1}
          sx={{
            p: 4,
            mb: 8,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: { xs: 'flex-start', md: 'center' },
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.100',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <StorageIcon />
            </Box>
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
                Daten Atlas für Marktkommunikation
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620 }}>
                Interaktiver Atlas mit EDIFACT-Datenelementen, Prozessen und Visualisierungen – inklusive
                rechtlicher Grundlagen, Einsatzbeispielen und herunterladbaren Diagrammen.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            component={Link}
            href="/daten-atlas"
            variant="contained"
            color="primary"
            size="large"
            sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Daten Atlas entdecken →
          </Button>
        </Paper>

        {/* Tag Navigation */}
        <Box component="nav" aria-label="FAQ Kategorien" sx={{ mb: 8 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Themengebiete
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {tags.slice(0, 15).map(tag => (
              <Chip
                key={tag.tag}
                label={`${tag.tag} (${tag.count})`}
                variant="outlined"
                color="primary"
                component={Link}
                href={`/wissen/thema/${encodeURIComponent(tag.tag.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''))}`}
                clickable
                sx={{ 
                  px: 2,
                  py: 1,
                  '&:hover': { 
                    bgcolor: 'primary.50',
                    transform: 'translateY(-1px)',
                    boxShadow: 1
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* FAQ Sections by Tag */}
        {tags.slice(0, 8).map(tag => {
          const tagFAQs = faqsByTag[tag.tag];
          if (!tagFAQs || tagFAQs.length === 0) return null;

          return (
            <Box key={tag.tag} component="section" sx={{ mb: 8 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
                  {tag.tag}
                </Typography>
                <Button
                  component={Link}
                  href={`/wissen/thema/${encodeURIComponent(tag.tag.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''))}`}
                  variant="text"
                  color="primary"
                  sx={{ fontWeight: 600 }}
                >
                  Alle {tag.count} Artikel anzeigen →
                </Button>
              </Box>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
                gap: 3 
              }}>
                {tagFAQs.map((faq: StaticFAQData) => (
                  <Card 
                    key={faq.id}
                    component="article"
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      '&:hover': { 
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                        <Link
                          href={`/wissen/${faq.slug}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          {faq.title}
                        </Link>
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" paragraph sx={{ flexGrow: 1 }}>
                        {faq.description || faq.content.substring(0, 120) + '...'}
                      </Typography>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {faq.view_count} Aufrufe
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="time" dateTime={faq.updated_at}>
                          {new Date(faq.updated_at).toLocaleDateString('de-DE')}
                        </Typography>
                      </Box>

                      {/* Tags */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
                        {faq.tags.slice(0, 3).map((faqTag: string) => (
                          <Chip
                            key={faqTag}
                            label={faqTag}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        })}

        {/* Call to Action */}
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#147a50' }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
            Suchen Sie spezifische Informationen?
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Nutzen Sie unsere erweiterte Suchfunktion oder registrieren Sie sich für Zugang zu Premium-Features.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            href="/app"
            size="large"
            sx={{ 
              mt: 2,
              px: 4,
              py: 1.5,
              bgcolor: '#ee7f4b',
              '&:hover': { bgcolor: '#d66d3a' },
              fontWeight: 600
            }}
          >
            Zur Hauptanwendung →
          </Button>
        </Paper>
      </Box>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  try {
    const envBase = process.env.INTERNAL_API_BASE_URL || process.env.API_BASE_URL || process.env.API_URL;
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3003';
    const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
    const base = envBase || `${proto}://${host}`;

    const headers: Record<string, string> = { 'accept': 'application/json' };

    const faqsResp = await fetch(`${base}/api/faqs?limit=1000&offset=0`, { headers });
    const faqsJson = await faqsResp.json().catch(() => ({ success: false }));

    const faqsRawAll = Array.isArray(faqsJson?.data) ? faqsJson.data : [];
    const faqsRaw = process.env.NODE_ENV === 'production'
      ? (faqsRawAll || []).filter((f: any) => f?.is_public === true)
      : faqsRawAll;

    const faqs: StaticFAQData[] = (faqsRaw || []).map((faq: any) => ({
      id: String(faq.id),
      slug: slugifyTitle(faq.title || ''),
      title: faq.title || '',
      description: faq.description || '',
      content: faq.context || faq.content || '',
      answer: faq.answer || '',
      additional_info: faq.additional_info,
      tags: Array.isArray(faq.tags) ? faq.tags : (() => { try { return JSON.parse(faq.tags || '[]'); } catch { return []; } })(),
      view_count: Number(faq.view_count || 0),
      created_at: faq.created_at || new Date().toISOString(),
      updated_at: faq.updated_at || new Date().toISOString(),
      related_faqs: Array.isArray(faq.related_faqs) ? faq.related_faqs.map((r: any) => ({
        id: String(r.id),
        title: r.title || '',
        slug: r.slug || slugifyTitle(r.title || ''),
        similarity_score: typeof r.similarity_score === 'number' ? r.similarity_score : undefined,
      })) : []
    }));

    // Build tag list with counts from the fetched FAQs
    const tagCountMap = new Map<string, number>();
    for (const f of faqs) {
      for (const t of f.tags || []) {
        const key = String(t);
        tagCountMap.set(key, (tagCountMap.get(key) || 0) + 1);
      }
    }
    const tags: FAQTag[] = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 20);

    // Optional: mild caching hint for CDN/proxy
    try { res?.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600'); } catch {}

    return {
      props: {
        faqs,
        tags,
        totalCount: faqs.length,
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps for /wissen:', error);
    try { res?.setHeader('Cache-Control', 'public, s-maxage=60'); } catch {}
    return {
      props: {
        faqs: [],
        tags: [],
        totalCount: 0,
      }
    };
  }
};
