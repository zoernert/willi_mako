import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Chip, 
  Paper,
  Breadcrumbs,
  Card,
  CardContent,
  Button,
  Divider
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  QuestionAnswer as FAQIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import { getAllPublicFAQs, getFAQBySlug, StaticFAQData } from '../../../lib/faq-api';
import { generateMetadata, generateFAQJSONLD, generateBreadcrumbJSONLD } from '../../../lib/seo-utils';

interface FAQDetailProps {
  faq: StaticFAQData;
}

export default function FAQDetail({ faq }: FAQDetailProps) {
  const metadata = generateMetadata(faq);
  const faqJSONLD = generateFAQJSONLD(faq);
  const breadcrumbJSONLD = generateBreadcrumbJSONLD(faq);

  return (
    <Layout title={`${faq.title} | Wissensdatenbank`}>
      <Head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        <link rel="canonical" href={metadata.openGraph.url} />
        
        {/* Open Graph */}
        <meta property="og:title" content={metadata.openGraph.title} />
        <meta property="og:description" content={metadata.openGraph.description} />
        <meta property="og:type" content={metadata.openGraph.type} />
        <meta property="og:url" content={metadata.openGraph.url} />
        
        {/* Twitter */}
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta name="twitter:title" content={metadata.twitter.title} />
        <meta name="twitter:description" content={metadata.twitter.description} />

        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJSONLD) }}
        />
      </Head>

      <Box sx={{ mb: 8 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 4 }}
        >
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <HomeIcon fontSize="small" />
            <Typography color="text.primary">Home</Typography>
          </Link>
          <Link href="/wissen" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FAQIcon fontSize="small" />
            <Typography color="text.primary">Wissensdatenbank</Typography>
          </Link>
          <Typography color="text.secondary">{faq.title}</Typography>
        </Breadcrumbs>

        {/* Main Content */}
        <Paper sx={{ p: 4, mb: 4 }}>
          {/* Article Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {faq.tags.map((tag: string) => (
                <Chip
                  key={tag}
                  label={tag}
                  variant="outlined"
                  color="primary"
                  size="small"
                  component={Link}
                  href={`/wissen/thema/${tag.toLowerCase()}`}
                  clickable
                />
              ))}
            </Box>

            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              {faq.title}
            </Typography>

            {faq.description && (
              <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 3 }}>
                {faq.description}
              </Typography>
            )}

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              color: 'text.secondary',
              fontSize: '0.875rem',
              borderBottom: 1,
              borderColor: 'divider',
              pb: 2,
              mb: 4
            }}>
              <Typography variant="body2">{faq.view_count} Aufrufe</Typography>
              <Typography variant="body2" component="time" dateTime={faq.updated_at}>
                Zuletzt aktualisiert: {new Date(faq.updated_at).toLocaleDateString('de-DE')}
              </Typography>
            </Box>
          </Box>

          {/* FAQ Content */}
          <Box sx={{ mb: 4 }}>
            {faq.content && faq.content !== faq.answer && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                  Kontext:
                </Typography>
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {faq.content}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                Antwort:
              </Typography>
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {faq.answer}
              </Typography>
            </Box>

            {faq.additional_info && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                  Zusätzliche Informationen:
                </Typography>
                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {faq.additional_info}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Related FAQs */}
        {faq.related_faqs && faq.related_faqs.length > 0 && (
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Verwandte Themen
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              {faq.related_faqs.map((relatedFAQ) => (
                <Card 
                  key={relatedFAQ.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      boxShadow: 3,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  component={Link}
                  href={`/wissen/${relatedFAQ.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      {relatedFAQ.title}
                    </Typography>
                    {relatedFAQ.similarity_score && (
                      <Typography variant="caption" color="text.secondary">
                        Ähnlichkeit: {Math.round(relatedFAQ.similarity_score * 100)}%
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        )}

        {/* Call to Action */}
        <Paper sx={{ p: 4, bgcolor: '#147a50', textAlign: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
            Haben Sie weitere Fragen?
          </Typography>
          <Typography variant="body1" paragraph sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Nutzen Sie unsere intelligente FAQ-Suche oder starten Sie einen Chat mit unserem Experten-System.
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: 2, 
            justifyContent: 'center',
            mt: 3
          }}>
            <Button
              variant="outlined"
              component={Link}
              href="/wissen"
              sx={{ minWidth: 200 }}
            >
              ← Zurück zur Übersicht
            </Button>
            <Button
              variant="contained"
              component={Link}
              href="/app"
              sx={{ 
                minWidth: 200,
                bgcolor: '#ee7f4b',
                '&:hover': { bgcolor: '#d66d3a' }
              }}
            >
              Zur Hauptanwendung →
            </Button>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const faqs = await getAllPublicFAQs();
    const paths = faqs.map((faq) => ({
      params: { slug: faq.slug },
    }));

    return {
      paths,
      fallback: 'blocking', // Enable ISR for new FAQs
    };
  } catch (error) {
    console.error('Error in getStaticPaths for FAQ pages:', error);
    return {
      paths: [],
      fallback: 'blocking',
    };
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  try {
    const slug = params?.slug as string;
    const faq = await getFAQBySlug(slug);

    if (!faq) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        faq,
      },
      revalidate: 3600, // Revalidate every hour
    };
  } catch (error) {
    console.error(`Error in getStaticProps for FAQ slug ${params?.slug}:`, error);
    
    return {
      notFound: true,
    };
  }
};
