import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  Paper
} from '@mui/material';
import {
  QuestionAnswer as FAQIcon,
  TrendingUp as TrendingIcon,
  ElectricBolt as EnergyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { getAllPublicFAQs, getAllTags, StaticFAQData, FAQTag } from '../../lib/faq-api';

interface HomeProps {
  featuredFAQs: StaticFAQData[];
  popularTags: FAQTag[];
  totalFAQCount: number;
}

export default function Home({ featuredFAQs, popularTags, totalFAQCount }: HomeProps) {
  return (
    <Layout title="Energiemarkt Wissensplattform">
      <Head>
        <title>Willi-Mako | Energiewirtschaft Expertensystem & FAQ-Datenbank</title>
        <meta 
          name="description" 
          content={`Willi-Mako: Das führende Expertensystem für Marktkommunikation in der Energiewirtschaft. ${totalFAQCount} FAQ-Artikel zu BDEW, EIC, Bilanzkreisen und mehr. Jetzt kostenlos testen!`}
        />
        <meta name="keywords" content="Energiewirtschaft, Marktkommunikation, BDEW, EIC, Bilanzkreise, FAQ, Expertensystem, Strommarkt" />
        <link rel="canonical" href="https://stromhaltig.de" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Willi-Mako | Energiewirtschaft Expertensystem" />
        <meta property="og:description" content={`Das führende Expertensystem für Marktkommunikation in der Energiewirtschaft. ${totalFAQCount} FAQ-Artikel verfügbar.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de" />
        <meta property="og:site_name" content="Willi-Mako" />
        
        {/* RSS/Atom Feeds */}
        <link rel="alternate" type="application/rss+xml" title="Willi-Mako FAQ RSS Feed" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Willi-Mako FAQ Atom Feed" href="/atom.xml" />

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Willi-Mako",
              "description": "Expertensystem für Marktkommunikation in der Energiewirtschaft",
              "url": "https://stromhaltig.de",
              "publisher": {
                "@type": "Organization",
                "name": "STROMDAO GmbH",
                "url": "https://stromdao.de"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://stromhaltig.de/wissen?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>

      {/* Hero Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)',
          p: 6,
          mb: 4,
          textAlign: 'center'
        }}
      >
        <EnergyIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Willi-Mako
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
          Das führende Expertensystem für Marktkommunikation in der Energiewirtschaft
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto' }}>
          Zugang zu {totalFAQCount}+ verifizierten FAQ-Artikeln zu BDEW-Codes, EIC-Codes, 
          Bilanzkreisen und allen relevanten Themen der Energiewirtschaft.
        </Typography>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/wissen"
            startIcon={<SearchIcon />}
            sx={{ px: 4 }}
          >
            Wissensdatenbank durchsuchen
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={Link}
            href="/app/login"
            startIcon={<EnergyIcon />}
            sx={{ px: 4 }}
          >
            Zur Hauptanwendung
          </Button>
        </Box>
      </Paper>

      {/* Featured FAQs */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FAQIcon color="primary" />
          Häufig gestellte Fragen
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Die wichtigsten Antworten zu Themen der Energiewirtschaft
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3, mt: 2 }}>
          {featuredFAQs.slice(0, 6).map((faq) => (
            <Card key={faq.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    <Link
                      href={`/wissen/${faq.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {faq.title}
                    </Link>
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {faq.description || faq.content.substring(0, 120) + '...'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                    <span>{faq.view_count} Aufrufe</span>
                    <span>{new Date(faq.updated_at).toLocaleDateString('de-DE')}</span>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {faq.tags.slice(0, 3).map((tag: string) => (
                      <Chip
                        key={tag}
                        label={tag}
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

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="text"
            size="large"
            component={Link}
            href="/wissen"
            endIcon={<TrendingIcon />}
          >
            Alle {totalFAQCount} FAQ-Artikel anzeigen
          </Button>
        </Box>
      </Box>

      {/* Popular Topics */}
      <Paper sx={{ p: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Beliebte Themengebiete
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Entdecken Sie die wichtigsten Bereiche der Energiewirtschaft
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3 }}>
          {popularTags.slice(0, 12).map((tag) => (
            <Button
              key={tag.tag}
              variant="outlined"
              component={Link}
              href={`/wissen/thema/${encodeURIComponent(tag.tag.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''))}`}
              sx={{ 
                borderRadius: 2,
                '& .MuiButton-endIcon': { ml: 1 }
              }}
              endIcon={
                <Chip 
                  label={tag.count} 
                  size="small" 
                  sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
                />
              }
            >
              {tag.tag}
            </Button>
          ))}
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button variant="outlined" component={Link} href="/wissen">
            Alle Themen anzeigen
          </Button>
        </Box>
      </Paper>

      {/* CTA Section */}
      <Paper 
        sx={{ 
          p: 6, 
          mt: 4,
          background: 'linear-gradient(135deg, #147a50 0%, #0d5538 100%)',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <Typography variant="h3" component="h2" gutterBottom sx={{ color: 'white' }}>
          Bereit für die vollständige Willi-Mako Erfahrung?
        </Typography>
        <Typography variant="h6" paragraph sx={{ color: 'rgba(255,255,255,0.9)', maxWidth: 600, mx: 'auto' }}>
          Entdecken Sie alle Features: KI-gestützter Chat, Dokumentenmanagement, 
          Team-Collaboration und personalisierte Lernpfade.
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          href="/app/login"
          sx={{ 
            mt: 2,
            bgcolor: 'white', 
            color: 'primary.main',
            '&:hover': { bgcolor: 'grey.100' }
          }}
        >
          Jetzt zur Hauptanwendung
        </Button>
      </Paper>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const [allFAQs, allTags] = await Promise.all([
      getAllPublicFAQs(), // Alle FAQs holen
      getAllTags()
    ]);

    // Nehme die ersten 6 FAQs als featured
    const featuredFAQs = allFAQs.slice(0, 6);

    // Sortiere Tags nach Häufigkeit
    const popularTags = allTags
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      props: {
        featuredFAQs,
        popularTags,
        totalFAQCount: allFAQs.length
      },
      revalidate: 3600 // 1 Stunde ISR
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      props: {
        featuredFAQs: [],
        popularTags: [],
        totalFAQCount: 0
      },
      revalidate: 60 // Kürzere Revalidation bei Fehlern
    };
  }
};
