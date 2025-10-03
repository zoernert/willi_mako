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
  createAtlasElementStructuredData,
  createBreadcrumbStructuredData,
} from '../../../lib/atlas/structuredData';

interface AtlasElementPageProps {
  element: AtlasElement;
  relatedProcesses: AtlasProcess[];
  relatedDiagrams: AtlasDiagram[];
}

const AtlasElementPage = ({ element, relatedProcesses, relatedDiagrams }: AtlasElementPageProps) => {
  return (
    <Layout title={`${element.elementName} – Daten Atlas`}>
      <Head>
        <title>{`${element.elementName} (${element.edifactId}) | Daten Atlas`}</title>
        <meta
          name="description"
          content={
            element.description ||
            `Datenelement ${element.edifactId} im Daten Atlas der Marktkommunikation.`
          }
        />
        <link
          rel="canonical"
          href={`https://stromhaltig.de/daten-atlas/datenelemente/${element.slug}`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(createAtlasElementStructuredData(element)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              createBreadcrumbStructuredData([
                { name: 'Start', url: '/' },
                { name: 'Daten Atlas', url: '/daten-atlas' },
                { name: element.elementName, url: `/daten-atlas/datenelemente/${element.slug}` },
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
            <Typography color="text.primary">{element.elementName}</Typography>
          </Breadcrumbs>

          <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
            Datenelement
          </Typography>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mt: 1 }}>
            {element.elementName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            EDIFACT ID: {element.edifactId}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Beschreibung
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {element.description || 'Keine Beschreibung hinterlegt.'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Schlüsselwörter
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {element.keywords.length > 0 ? (
                  element.keywords.map((keyword) => (
                    <Chip key={keyword} label={keyword} size="small" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Keine Schlüsselwörter vorhanden.
                  </Typography>
                )}
              </Stack>
            </Box>

            {element.messages.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Nachrichtenkontext
                </Typography>
                <Stack spacing={2}>
                  {element.messages.map((message, index) => (
                    <Paper variant="outlined" sx={{ p: 2 }} key={`${message.messageType}-${index}`}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {message.messageType}
                        {message.messageVersion ? ` • Version ${message.messageVersion}` : ''}
                      </Typography>
                      {message.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {message.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                        {message.codesUsed.map((code) => (
                          <Chip key={code} label={code} size="small" variant="outlined" />
                        ))}
                        {message.isMandatory && <Chip label="Pflicht" size="small" color="primary" />}
                      </Stack>
                      {message.processes.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                          Eingesetzt in: {message.processes.map((process) => process.name).join(', ')}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {relatedProcesses.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Zugeordnete Prozesse
                </Typography>
                <Stack spacing={1.5}>
                  {relatedProcesses.map((process) => (
                    <Box key={process.slug} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {process.name}
                        </Typography>
                        {process.summary && (
                          <Typography variant="body2" color="text.secondary">
                            {process.summary}
                          </Typography>
                        )}
                      </Box>
                      <Button
                        component={Link}
                        href={`/daten-atlas/prozesse/${process.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Prozess öffnen →
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {relatedDiagrams.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Verknüpfte Visualisierungen
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

            {element.qdrantReferences.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Kontextquellen (Qdrant)
                </Typography>
                <Stack spacing={2}>
                  {element.qdrantReferences.map((reference) => (
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
                      {reference.tags && reference.tags.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          {reference.tags.slice(0, 4).map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Stack>
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
    const paths = data.elements.map((element) => ({
      params: { slug: element.slug },
    }));
    return { paths, fallback: false };
  } catch (error) {
    console.warn('⚠️  Konnte Atlas-Datenelemente nicht laden:', error);
    return { paths: [], fallback: false };
  }
};

export const getStaticProps: GetStaticProps<AtlasElementPageProps> = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    const data = loadAtlasData();
    const element = getAtlasElementBySlug(slug);

    if (!element) {
      return { notFound: true };
    }

    const relatedProcesses = element.processes
      .map((process) => getAtlasProcessBySlug(process.slug))
      .filter(Boolean) as AtlasProcess[];

    const relatedDiagrams = element.diagramIds
      .map((id) => getAtlasDiagramById(id))
      .filter(Boolean) as AtlasDiagram[];

    return {
      props: {
        element,
        relatedProcesses,
        relatedDiagrams,
      },
      revalidate: 60 * 60 * 24,
    };
  } catch (error) {
    console.warn('⚠️  Fehler beim Laden eines Datenelements:', error);
    return { notFound: true };
  }
};

export default AtlasElementPage;
