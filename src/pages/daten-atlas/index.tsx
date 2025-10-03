import { useMemo, useState } from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import Layout from '../../components/Layout';
import { AtlasSearchBar } from '../../components/atlas/AtlasSearchBar';
import { AtlasFilterPanel } from '../../components/atlas/AtlasFilterPanel';
import AtlasCard from '../../components/atlas/AtlasCard';
import { loadAtlasData, loadAtlasSearchIndex } from '../../lib/atlas/data';
import type {
  AtlasDiagram,
  AtlasElement,
  AtlasProcess,
  AtlasSearchItem,
} from '../../lib/atlas/types';
import { sortAlpha, unique } from '../../lib/atlas/utils';
import { createAtlasLandingStructuredData } from '../../lib/atlas/structuredData';

type AtlasFilterState = {
  processes: string[];
  messageTypes: string[];
  laws: string[];
};

interface DatenAtlasLandingProps {
  atlasElements: AtlasElement[];
  atlasProcesses: AtlasProcess[];
  atlasDiagrams: AtlasDiagram[];
  searchItems: AtlasSearchItem[];
  processOptions: Array<{ slug: string; name: string }>;
  messageTypes: string[];
  laws: string[];
}

const initialFilters: AtlasFilterState = {
  processes: [],
  messageTypes: [],
  laws: [],
};

const DatenAtlasLanding = ({
  atlasElements,
  atlasProcesses,
  atlasDiagrams,
  searchItems,
  processOptions,
  messageTypes,
  laws,
}: DatenAtlasLandingProps) => {
  const [filters, setFilters] = useState<AtlasFilterState>(initialFilters);
  const router = useRouter();

  const stats = useMemo(
    () => [
      {
        label: 'Datenelemente',
        value: atlasElements.length,
        description: 'EDIFACT-Felder mit Kontext und Einsatzbeispielen',
        anchor: 'datenelemente',
      },
      {
        label: 'Prozesse',
        value: atlasProcesses.length,
        description: 'Abläufe samt Nachrichten und Rechtsgrundlagen',
        anchor: 'prozesse',
      },
      {
        label: 'Visualisierungen',
        value: atlasDiagrams.length,
        description: 'PlantUML-Diagramme zum Download (SVG/PNG/PDF)',
        anchor: 'visualisierungen',
      },
    ],
    [atlasDiagrams.length, atlasElements.length, atlasProcesses.length],
  );

  const filteredElements = useMemo(() => {
    return atlasElements.filter((element) => {
      const matchesProcess =
        filters.processes.length === 0 ||
        element.processes.some((process) => filters.processes.includes(process.slug));

      const matchesMessageType =
        filters.messageTypes.length === 0 ||
        element.messages.some((message) => filters.messageTypes.includes(message.messageType));

      const matchesLaw =
        filters.laws.length === 0 ||
        element.processes.some((process) =>
          process.relevantLaws.some((law) => filters.laws.includes(law)),
        );

      return matchesProcess && matchesMessageType && matchesLaw;
    });
  }, [atlasElements, filters]);

  const featuredProcesses = useMemo(
    () => atlasProcesses.slice(0, 6),
    [atlasProcesses],
  );

  const featuredDiagrams = useMemo(
    () => atlasDiagrams.slice(0, 6),
    [atlasDiagrams],
  );

  const handleSearchSelect = async (item: AtlasSearchItem) => {
    if (!item?.url) return;
    await router.push(item.url);
  };

  return (
    <Layout title="Daten Atlas">
      <Head>
        <title>Daten Atlas Marktkommunikation | Willi-Mako</title>
        <meta
          name="description"
          content="Interaktiver Daten Atlas für Marktkommunikation in der Energiewirtschaft: Datenelemente, Prozesse und Visualisierungen mit rechtlichen Grundlagen."
        />
        <link rel="canonical" href="https://stromhaltig.de/daten-atlas" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(createAtlasLandingStructuredData()),
          }}
        />
      </Head>

      <Paper
        component="section"
        elevation={0}
        sx={{
          mb: 6,
          p: { xs: 4, md: 6 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(20,122,80,0.1) 0%, rgba(238,127,75,0.1) 100%)',
          border: '1px solid',
          borderColor: 'primary.100',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
              Daten Atlas
            </Typography>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              Marktkommunikation sichtbar gemacht
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 840 }}>
              Entdecke Datenelemente, Prozesse und Visualisierungen der Energiewirtschaft –
              mit rechtlichen Grundlagen, Einsatzbeispielen und Diagrammen, die du direkt
              herunterladen kannst.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            }}
          >
            {stats.map((stat) => (
              <Box key={stat.label}>
                <AtlasCard
                  title={`${stat.value} ${stat.label}`}
                  description={stat.description}
                  href={`#${stat.anchor}`}
                  tags={[stat.label]}
                  eyebrow="Überblick"
                />
              </Box>
            ))}
          </Box>
        </Stack>
      </Paper>

      <Box component="section" sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Direkter Einstieg
        </Typography>
        {searchItems.length > 0 ? (
          <AtlasSearchBar items={searchItems} onSelect={handleSearchSelect} />
        ) : (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary">
              Suche steht zur Verfügung, sobald der Atlas generiert wurde. Führe dazu
              <code style={{ marginLeft: 4 }}>npm run atlas:build</code> aus.
            </Typography>
          </Paper>
        )}

      </Box>

      <Box component="section" sx={{ mb: 6 }}>
        <AtlasFilterPanel
          processes={processOptions}
          messageTypes={messageTypes}
          laws={laws}
          value={filters}
          onChange={setFilters}
        />
      </Box>

      <Box component="section" id="datenelemente" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Datenelemente
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Filtere EDIFACT-Datenelemente nach Prozess, Nachrichtentyp oder Rechtsgrundlage.
          Die Liste zeigt einen Auszug der relevanten Felder.
        </Typography>

        {filteredElements.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Keine Datenelemente gefunden. Passe die Filter an oder entferne sie komplett,
              um weitere Ergebnisse zu sehen.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {filteredElements.slice(0, 9).map((element) => (
              <Card
                key={element.slug}
                variant="outlined"
                id={`element-${element.slug}`}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ height: '100%' }}>
                  <Stack spacing={1.5} sx={{ height: '100%' }}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        {element.edifactId}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {element.elementName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {element.description || 'Keine Beschreibung verfügbar.'}
                      </Typography>
                    </Box>

                    {element.messages.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Nachrichtenkontext
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {unique(element.messages.map((message) => message.messageType))
                            .slice(0, 4)
                            .map((messageType) => (
                              <Chip key={messageType} label={messageType} size="small" />
                            ))}
                        </Stack>
                      </Box>
                    )}

                    {element.processes.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Eingesetzte Prozesse
                        </Typography>
                        <Stack spacing={0.5}>
                          {element.processes.slice(0, 3).map((process) => (
                            <Typography key={process.slug} variant="body2" color="text.secondary">
                              • {process.name}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Box sx={{ mt: 'auto' }}>
                      <Button
                        component={Link}
                        href={`/daten-atlas/datenelemente/${element.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Details ansehen →
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box component="section" id="prozesse" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Prozesse
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Überblick über zentrale Marktprozesse inklusive beteiligter Nachrichten und
          rechtlicher Grundlagen.
        </Typography>

        {featuredProcesses.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Noch keine Prozesse geladen. Stelle sicher, dass der Atlas erfolgreich
              generiert wurde.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {featuredProcesses.map((process) => (
              <Card
                key={process.slug}
                variant="outlined"
                id={`process-${process.slug}`}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ height: '100%' }}>
                  <Stack spacing={1.5} sx={{ height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {process.name}
                    </Typography>
                    {process.summary && (
                      <Typography variant="body2" color="text.secondary">
                        {process.summary}
                      </Typography>
                    )}

                    {process.messageTypes.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Nachrichten
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {process.messageTypes.slice(0, 4).map((messageType) => (
                            <Chip key={messageType} label={messageType} size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {process.relevantLaws.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Rechtsgrundlagen
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {process.relevantLaws.slice(0, 4).map((law) => (
                            <Chip key={law} label={law} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Box sx={{ mt: 'auto' }}>
                      <Button
                        component={Link}
                        href={`/daten-atlas/prozesse/${process.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Prozessdetails →
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 6 }} />

      <Box component="section" id="visualisierungen" sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Visualisierungen
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Diagramme aus dem Daten Atlas – bereit als SVG, PNG oder PDF mit Willi-Mako-Branding.
        </Typography>

        {featuredDiagrams.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Es sind noch keine Diagramme verfügbar. Bitte führe die Atlas-Generierung
              oder den Import der UML-Dateien durch.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {featuredDiagrams.map((diagram) => (
              <Card
                key={diagram.slug}
                variant="outlined"
                id={`diagram-${diagram.slug}`}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ height: '100%' }}>
                  <Stack spacing={1.5} sx={{ height: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {diagram.title}
                    </Typography>
                    {diagram.description && (
                      <Typography variant="body2" color="text.secondary">
                        {diagram.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {diagram.svgPath && (
                        <Button
                          component={Link}
                          href={diagram.svgPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="contained"
                          color="primary"
                          size="small"
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
                          size="small"
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
                          size="small"
                        >
                          PNG
                        </Button>
                      )}
                    </Stack>

                    <Box sx={{ mt: 'auto' }}>
                      <Button
                        component={Link}
                        href={`/daten-atlas/visualisierungen/${diagram.slug}`}
                        variant="outlined"
                        size="small"
                      >
                        Visualisierung anzeigen →
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export const getStaticProps: GetStaticProps<DatenAtlasLandingProps> = async () => {
  let atlasElements: AtlasElement[] = [];
  let atlasProcesses: AtlasProcess[] = [];
  let atlasDiagrams: AtlasDiagram[] = [];
  let searchItems: AtlasSearchItem[] = [];

  try {
  const data = loadAtlasData();
  atlasElements = data.elements;
  atlasProcesses = data.processes;
  atlasDiagrams = data.diagrams;
    searchItems = loadAtlasSearchIndex();
  } catch (error) {
    console.warn(
      '⚠️  Daten Atlas konnte nicht vollständig geladen werden:',
      error instanceof Error ? error.message : error,
    );
  }

  const processOptions = atlasProcesses.map((process) => ({ slug: process.slug, name: process.name }));

  const messageTypes = sortAlpha(
    unique(
      [
        ...atlasElements.flatMap((element) => element.messages.map((message) => message.messageType)),
        ...atlasProcesses.flatMap((process) => process.messageTypes || []),
      ].filter(Boolean),
    ),
  );

  const laws = sortAlpha(
    unique(
      [
        ...atlasElements.flatMap((element) =>
          element.processes.flatMap((process) => process.relevantLaws || []),
        ),
        ...atlasProcesses.flatMap((process) => process.relevantLaws || []),
      ].filter(Boolean),
    ),
  );

  return {
    props: {
      atlasElements,
      atlasProcesses,
      atlasDiagrams,
      searchItems,
      processOptions,
      messageTypes,
      laws,
    },
    revalidate: 60 * 60 * 24,
  };
};

export default DatenAtlasLanding;
