import React from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { Container, Typography, Box, Card, CardContent, Button } from '@mui/material';
import Link from 'next/link';
import { getAllWhitepapers, Whitepaper as WP } from '../../lib/content/whitepapers';
import Layout from '../../components/Layout';

interface WhitepapersProps {
  whitepapers: WP[];
}

const WhitepapersPage: React.FC<WhitepapersProps> = ({ whitepapers }) => {
  return (
    <Layout title="Whitepaper">
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

        <Box
          sx={{
            mt: 4,
            display: 'grid',
            gap: 4,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          }}
        >
          {whitepapers.map((wp) => (
            <Card key={wp.slug} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {wp.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Veröffentlicht: {new Date(wp.publishedDate).toLocaleDateString('de-DE')}
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
          ))}
        </Box>
      </Box>
      </Container>
    </Layout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      whitepapers: getAllWhitepapers(),
    },
    revalidate: 60, // Inkrementelle statische Regenerierung
  };
};

export default WhitepapersPage;
