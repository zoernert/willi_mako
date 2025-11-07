import React from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import { getAllArticles, Article } from '../../../lib/content/articles';
import Layout from '../../../components/Layout';

// Article mit serialisierten Dates (Strings statt Date-Objekte)
interface SerializedArticle extends Omit<Article, 'date' | 'modifiedDate'> {
  date: string | null;
  modifiedDate: string | null;
}

interface Props {
  articles: SerializedArticle[];
}

const ArticleListPage: React.FC<Props> = ({ articles }) => {
  return (
    <Layout title="Artikel – Stromhaltig Wissen">
      <Container maxWidth="lg">
      <Head>
        <title>Artikel – Stromhaltig Wissen</title>
        <meta name="description" content="Fachartikel aus unseren Whitepapers zur Marktkommunikation und Energiewirtschaft." />
        <link rel="canonical" href="https://stromhaltig.de/wissen/artikel" />
      </Head>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Artikel
        </Typography>
        <Typography variant="body1" paragraph>
          Ausgewählte Beiträge aus unseren Whitepapers – kompakt und praxisnah.
        </Typography>

        <Box
          sx={{
            mt: 4,
            display: 'grid',
            gap: 4,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          }}
        >
          {articles.map((a) => (
            <Card key={a.slug} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h2" gutterBottom>
                  {a.title}
                </Typography>
                {/* Date removed as requested */}
                <Typography variant="body1" paragraph>
                  {a.shortDescription}
                </Typography>
                <Link href={`/wissen/artikel/${a.slug}`} passHref>
                  <Button variant="contained" sx={{ backgroundColor: '#147a50', '&:hover': { backgroundColor: '#0d5538' } }}>
                    Artikel lesen
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
  const articles = getAllArticles().map((article: any) => {
    // Konvertiere Date-Objekte zu ISO-Strings (nur wenn es ein Date ist)
    const dateValue = article.date instanceof Date ? article.date.toISOString() : 
                      (article.date || null);
    const modifiedDateValue = article.modifiedDate instanceof Date ? article.modifiedDate.toISOString() : 
                              (article.modifiedDate || null);
    
    return {
      ...article,
      date: dateValue,
      modifiedDate: modifiedDateValue,
    };
  });
  
  return {
    props: { articles },
    revalidate: 60,
  };
};

export default ArticleListPage;
