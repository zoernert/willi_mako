import React from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { Container, Typography, Box, Grid, Card, CardContent, CardMedia, Button } from '@mui/material';
import Link from 'next/link';

// Dummy-Daten für Whitepaper (später vom CMS)
interface Whitepaper {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_image_url?: string;
  published_date: string;
}

const dummyWhitepapers: Whitepaper[] = [
  {
    id: '1',
    title: 'Whitepaper: Die Zukunft der Energie',
    slug: 'die-zukunft-der-energie',
    description: 'Erfahren Sie, wie digitale Infrastrukturen die Energiewende vorantreiben.',
    thumbnail_image_url: 'https://via.placeholder.com/300x200?text=Whitepaper+1',
    published_date: '2023-01-15',
  },
  {
    id: '2',
    title: 'Smart Grids: Effizienz und Nachhaltigkeit',
    slug: 'smart-grids-effizienz',
    description: 'Ein tiefer Einblick in die Vorteile und Herausforderungen intelligenter Stromnetze.',
    thumbnail_image_url: 'https://via.placeholder.com/300x200?text=Whitepaper+2',
    published_date: '2023-03-20',
  },
];

interface WhitepapersProps {
  whitepapers: Whitepaper[];
}

const WhitepapersPage: React.FC<WhitepapersProps> = ({ whitepapers }) => {
  return (
    <Container maxWidth="lg">
      <Head>
        <title>Whitepaper - Stromhaltig</title>
        <meta name="description" content="Entdecken Sie unsere Whitepaper zu digitalen Energielösungen und Smart Grids." />
        <link rel="canonical" href="https://stromhaltig.de/whitepaper" />
      </Head>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Unsere Whitepaper
        </Typography>
        <Typography variant="body1" paragraph>
          Tauchen Sie ein in unsere Fachartikel und Studien zu den neuesten Entwicklungen in der digitalen Energieinfrastruktur.
        </Typography>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          {whitepapers.map((wp) => (
            <Grid item xs={12} sm={6} md={4} key={wp.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {wp.thumbnail_image_url && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={wp.thumbnail_image_url}
                    alt={wp.title}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {wp.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Veröffentlicht: {new Date(wp.published_date).toLocaleDateString('de-DE')}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {wp.description}
                  </Typography>
                  <Link href={`/whitepaper/${wp.slug}`} passHref>
                    <Button variant="contained" sx={{ backgroundColor: '#147a50', '&:hover': { backgroundColor: '#0d5538' } }}>
                      Mehr erfahren
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  // Hier würden später die Daten vom Headless CMS abgerufen
  // const res = await fetch('YOUR_CMS_API_ENDPOINT/whitepapers');
  // const whitepapers = await res.json();

  return {
    props: {
      whitepapers: dummyWhitepapers, // Dummy-Daten für jetzt
    },
    revalidate: 60, // Inkrementelle statische Regenerierung
  };
};

export default WhitepapersPage;
