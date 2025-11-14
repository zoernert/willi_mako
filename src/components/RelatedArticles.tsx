import React from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Stack,
} from '@mui/material';
import { Article } from '../../lib/content/articles';

interface RelatedArticlesProps {
  currentArticleSlug: string;
  currentArticleTags?: string[];
  allArticles: Article[];
  manualRelated?: string[]; // Optional: manually specify related article slugs
  maxArticles?: number;
}

/**
 * Related Articles Component
 * 
 * Zeigt verwandte Artikel basierend auf:
 * 1. Manuell angegebene Artikel (manualRelated)
 * 2. Automatische Tag-basierte Ähnlichkeit
 * 
 * Reduziert Bounce Rate durch interne Verlinkung
 */
export const RelatedArticles: React.FC<RelatedArticlesProps> = ({
  currentArticleSlug,
  currentArticleTags = [],
  allArticles,
  manualRelated = [],
  maxArticles = 3,
}) => {
  // Filter: Aktuellen Artikel ausschließen, nur published
  const availableArticles = allArticles.filter(
    (article) => article.slug !== currentArticleSlug && article.status === 'published'
  );

  // 1. Manuelle Related Articles (Priorität 1)
  const manualArticles = manualRelated
    .map((slug) => availableArticles.find((a) => a.slug === slug))
    .filter((a): a is Article => a !== undefined);

  // 2. Tag-basierte Ähnlichkeit berechnen (Priorität 2)
  const tagBasedArticles = availableArticles
    .map((article) => {
      const sharedTags = article.tags.filter((tag) =>
        currentArticleTags.includes(tag)
      );
      return {
        article,
        score: sharedTags.length,
        sharedTags,
      };
    })
    .filter((item) => item.score > 0) // Mindestens 1 gemeinsamer Tag
    .sort((a, b) => b.score - a.score) // Sortiere nach Anzahl gemeinsamer Tags
    .map((item) => item.article);

  // Kombiniere: Manuelle zuerst, dann tag-basierte (ohne Duplikate)
  const relatedArticles: Article[] = [];
  
  // Manuelle hinzufügen
  for (const article of manualArticles) {
    if (relatedArticles.length >= maxArticles) break;
    relatedArticles.push(article);
  }
  
  // Tag-basierte auffüllen
  for (const article of tagBasedArticles) {
    if (relatedArticles.length >= maxArticles) break;
    if (!relatedArticles.find((a) => a.slug === article.slug)) {
      relatedArticles.push(article);
    }
  }

  // Fallback: Wenn weniger als maxArticles, neueste Artikel nehmen
  if (relatedArticles.length < maxArticles) {
    const newestArticles = availableArticles
      .filter((a) => !relatedArticles.find((r) => r.slug === a.slug))
      .sort((a, b) => {
        const dateA = new Date(a.date || a.publishedDate || '');
        const dateB = new Date(b.date || b.publishedDate || '');
        return dateB.getTime() - dateA.getTime();
      });

    for (const article of newestArticles) {
      if (relatedArticles.length >= maxArticles) break;
      relatedArticles.push(article);
    }
  }

  if (relatedArticles.length === 0) {
    return null; // Keine verwandten Artikel gefunden
  }

  const trackClick = (targetSlug: string) => {
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('internal_link_clicked', {
        props: {
          from: currentArticleSlug,
          to: targetSlug,
          component: 'RelatedArticles',
        },
      });
    }
  };

  return (
    <Box sx={{ my: 6 }}>
      <Typography
        variant="h5"
        component="h2"
        gutterBottom
        sx={{
          fontWeight: 600,
          mb: 3,
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          pl: 2,
        }}
      >
        📚 Weiterlesen
      </Typography>

      <Grid container spacing={3}>
        {relatedArticles.map((article) => (
          <Grid item xs={12} md={4} key={article.slug}>
            <Link
              href={`/wissen/artikel/${article.slug}`}
              passHref
              style={{ textDecoration: 'none' }}
            >
              <Card
                component={CardActionArea}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => trackClick(article.slug)}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.3,
                      mb: 2,
                      color: 'text.primary',
                    }}
                  >
                    {article.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {article.excerpt || article.shortDescription || ''}
                  </Typography>

                  {article.tags && article.tags.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {article.tags.slice(0, 3).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{
                            bgcolor: currentArticleTags.includes(tag)
                              ? 'primary.light'
                              : 'grey.200',
                            color: currentArticleTags.includes(tag)
                              ? 'primary.dark'
                              : 'text.secondary',
                            fontWeight: currentArticleTags.includes(tag) ? 600 : 400,
                            fontSize: '0.75rem',
                          }}
                        />
                      ))}
                    </Stack>
                  )}

                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{
                      mt: 2,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    Artikel lesen →
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RelatedArticles;
