import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Breadcrumbs,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import Layout from '../../../components/Layout';
import {
  getAtlasDiagramBySlug,
  getAtlasProcessBySlug,
  loadAtlasData,
} from '../../../lib/atlas/data';
import type { AtlasDiagram, AtlasProcess } from '../../../lib/atlas/types';
import {
  createAtlasDiagramStructuredData,
  createBreadcrumbStructuredData,
} from '../../../lib/atlas/structuredData';

interface AtlasDiagramPageProps {
  diagram: AtlasDiagram;
  relatedProcesses: AtlasProcess[];
}

const AtlasDiagramPage = ({ diagram, relatedProcesses }: AtlasDiagramPageProps) => {
  return (
    <Layout title={`${diagram.title} – Daten Atlas`}>
      <Head>
        <title>{`${diagram.title} | Daten Atlas`}</title>
        <meta
          name="description"
          content={
            diagram.description ||
            `Visualisierung ${diagram.title} im Daten Atlas der Marktkommunikation.`
          }
        />
        <link
          rel="canonical"
          href={`https://stromhaltig.de/daten-atlas/visualisierungen/${diagram.slug}`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(createAtlasDiagramStructuredData(diagram)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              createBreadcrumbStructuredData([
                { name: 'Start', url: '/' },
                { name: 'Daten Atlas', url: '/daten-atlas' },
                { name: 'Visualisierungen', url: '/daten-atlas#visualisierungen' },
                { name: diagram.title, url: `/daten-atlas/visualisierungen/${diagram.slug}` },
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
            <Typography color="text.primary">{diagram.title}</Typography>
          </Breadcrumbs>

          <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
            Visualisierung
          </Typography>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mt: 1 }}>
            {diagram.title}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 4 }}>
          <Stack spacing={3}>
            {diagram.description && (
              <Typography variant="body1" color="text.secondary">
                {diagram.description}
              </Typography>
            )}

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {diagram.svgPath && (
                <Button
                  component={Link}
                  href={diagram.svgPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                >
                  SVG öffnen
                </Button>
              )}
              {diagram.pdfPath && (
                <Button
                  component={Link}
                  href={diagram.pdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                >
                  PDF herunterladen
                </Button>
              )}
              {diagram.pngPath && (
                <Button
                  component={Link}
                  href={diagram.pngPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="text"
                >
                  PNG anzeigen
                </Button>
              )}
              {diagram.pumlPath && (
                <Button
                  component={Link}
                  href={diagram.pumlPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="text"
                >
                  PlantUML herunterladen
                </Button>
              )}
            </Stack>

            {diagram.svgPath && (
              <Box
                component="div"
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  backgroundColor: 'background.paper',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={diagram.svgPath}
                  alt={diagram.title}
                  style={{ width: '100%', display: 'block' }}
                />
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
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {process.name}
                      </Typography>
                      <Button
                        component={Link}
                        href={`/daten-atlas/prozesse/${process.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Prozess ansehen →
                      </Button>
                    </Box>
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
    const paths = data.diagrams.map((diagram) => ({
      params: { slug: diagram.slug },
    }));
    return { paths, fallback: false };
  } catch (error) {
    console.warn('⚠️  Konnte Atlas-Diagramme nicht laden:', error);
    return { paths: [], fallback: false };
  }
};

export const getStaticProps: GetStaticProps<AtlasDiagramPageProps> = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    const data = loadAtlasData();
    const diagram = getAtlasDiagramBySlug(slug);

    if (!diagram) {
      return { notFound: true };
    }

    const relatedProcesses = diagram.relatedProcessSlugs
      .map((processSlug) => getAtlasProcessBySlug(processSlug))
      .filter(Boolean) as AtlasProcess[];

    return {
      props: {
        diagram,
        relatedProcesses,
      },
      revalidate: 60 * 60 * 24,
    };
  } catch (error) {
    console.warn('⚠️  Fehler beim Laden einer Visualisierung:', error);
    return { notFound: true };
  }
};

export default AtlasDiagramPage;
