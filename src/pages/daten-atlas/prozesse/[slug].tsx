import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import Layout from '../../../components/Layout';
import {
  getAtlasDiagramById,
  getAtlasElementBySlug,
  getAtlasProcessBySlug,
  loadAtlasData,
} from '../../../lib/atlas/data';
import type { AtlasDiagram, AtlasElement, AtlasProcess } from '../../../lib/atlas/types';
import {
  createAtlasProcessStructuredData,
  createBreadcrumbStructuredData,
} from '../../../lib/atlas/structuredData';

interface AtlasProcessPageProps {
  process: AtlasProcess;
  relatedElements: AtlasElement[];
  relatedDiagrams: AtlasDiagram[];
}

const AtlasProcessPage = ({ process, relatedElements, relatedDiagrams }: AtlasProcessPageProps) => {
  return (
    <Layout title={`${process.name} – Daten Atlas`}>
      <Head>
        <title>{`${process.name} | Daten Atlas`}</title>
        <meta
          name="description"
          content={
            process.summary ||
            process.description ||
            `Prozess ${process.name} im Daten Atlas der Marktkommunikation.`
          }
        />
        <link
          rel="canonical"
          href={`https://stromhaltig.de/daten-atlas/prozesse/${process.slug}`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(createAtlasProcessStructuredData(process)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              createBreadcrumbStructuredData([
                { name: 'Start', url: '/' },
                { name: 'Daten Atlas', url: '/daten-atlas' },
                { name: process.name, url: `/daten-atlas/prozesse/${process.slug}` },
              ]),
            ),
          }}
        />
      </Head>

      <Stack spacing={4}>
        <Box>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link href="/">Start</Link>
            <Link href="/daten-atlas">Daten Atlas</Link>
            <Typography color="text.primary">{process.name}</Typography>
          </Breadcrumbs>

          <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
            Prozess
          </Typography>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mt: 1 }}>
            {process.name}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 4 }}>
          <Stack spacing={3}>
            {(process.summary || process.description) && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Beschreibung
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {process.summary || process.description}
                </Typography>
              </Box>
            )}

            {process.triggerQuestion && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Auslöser
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {process.triggerQuestion}
                </Typography>
              </Box>
            )}

            <Divider />

            {process.messageTypes.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Nachrichtentypen
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {process.messageTypes.map((messageType) => (
                    <Chip key={messageType} label={messageType} size="small" />
                  ))}
                </Stack>
              </Box>
            )}

            {process.relevantLaws.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Rechtsgrundlagen
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {process.relevantLaws.map((law) => (
                    <Chip key={law} label={law} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}

            {process.keywords.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Schlagwörter
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {process.keywords.map((keyword) => (
                    <Chip key={keyword} label={keyword} size="small" />
                  ))}
                </Stack>
              </Box>
            )}

            {relatedElements.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Datenelemente in diesem Prozess
                </Typography>
                <Stack spacing={1.5}>
                  {relatedElements.map((element) => (
                    <Box key={element.slug} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {element.elementName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          EDIFACT ID: {element.edifactId}
                        </Typography>
                      </Box>
                      <Button
                        component={Link}
                        href={`/daten-atlas/datenelemente/${element.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Datenelement →
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {relatedDiagrams.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Visualisierungen zum Prozess
                </Typography>
                <Stack spacing={1.5}>
                  {relatedDiagrams.map((diagram) => (
                    <Box key={diagram.slug} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {diagram.title}
                        </Typography>
                        {diagram.description && (
                          <Typography variant="body2" color="text.secondary">
                            {diagram.description}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        component={Link}
                        href={`/daten-atlas/visualisierungen/${diagram.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Visualisierung →
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {process.qdrantReferences.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Kontextquellen (Qdrant)
                </Typography>
                <Stack spacing={2}>
                  {process.qdrantReferences.map((reference) => (
                    <Paper variant="outlined" sx={{ p: 2 }} key={reference.id}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {reference.title}
                      </Typography>
                      {reference.snippet && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {reference.snippet}
                        </Typography>
                      )}
                      {reference.url && (
                        <Button
                          component={Link}
                          href={reference.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="text"
                          size="small"
                          sx={{ mt: 1 }}
                        >
                          Quelle öffnen →
                        </Button>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Layout>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const data = loadAtlasData();
    const paths = data.processes.map((process) => ({
      params: { slug: process.slug },
    }));
    return { paths, fallback: false };
  } catch (error) {
    console.warn('⚠️  Konnte Atlas-Prozesse nicht laden:', error);
    return { paths: [], fallback: false };
  }
};

export const getStaticProps: GetStaticProps<AtlasProcessPageProps> = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    const data = loadAtlasData();
    const process = getAtlasProcessBySlug(slug);

    if (!process) {
      return { notFound: true };
    }

    const relatedElements = process.elements
      .map((elementSlug) => getAtlasElementBySlug(elementSlug))
      .filter(Boolean) as AtlasElement[];

    const relatedDiagrams = process.diagramIds
      .map((diagramId) => getAtlasDiagramById(diagramId))
      .filter(Boolean) as AtlasDiagram[];

    return {
      props: {
        process,
        relatedElements,
        relatedDiagrams,
      },
      revalidate: 60 * 60 * 24,
    };
  } catch (error) {
    console.warn('⚠️  Fehler beim Laden eines Prozesses:', error);
    return { notFound: true };
  }
};

export default AtlasProcessPage;
