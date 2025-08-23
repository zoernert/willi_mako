import { GetStaticProps } from 'next';
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
  Search as SearchIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { getAllPublicFAQs, getAllTags, StaticFAQData, FAQTag } from '../../../lib/faq-api';

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
          content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr.`}
        />
        <meta name="keywords" content="Energiewirtschaft, FAQ, BDEW, EIC, Bilanzkreise, Marktkommunikation, Strommarkt" />
        <link rel="canonical" href="https://stromhaltig.de/wissen" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Wissensdatenbank | Energiewirtschaft FAQ | Willi-Mako" />
        <meta property="og:description" content={`Umfassende Wissensdatenbank für Marktkommunikation in der Energiewirtschaft. ${totalCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/wissen" />
        
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
                href={`/wissen/thema/${tag.tag.toLowerCase()}`}
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
                  href={`/wissen/thema/${tag.tag.toLowerCase()}`}
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

export const getStaticProps: GetStaticProps = async () => {
  try {
    const [faqs, tags] = await Promise.all([
      getAllPublicFAQs(),
      getAllTags()
    ]);

    return {
      props: {
        faqs,
        tags: tags.slice(0, 20), // Limite für Performance
        totalCount: faqs.length
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error('Error in getStaticProps for /wissen:', error);
    
    return {
      props: {
        faqs: [],
        tags: [],
        totalCount: 0
      },
      revalidate: 60, // Retry more frequently on error
    };
  }
};
