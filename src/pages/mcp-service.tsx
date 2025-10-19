import Head from 'next/head';
import {
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Chip,
  Alert,
  Button,
  Container,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Api as ApiIcon,
  Architecture as ArchitectureIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  Code as CodeIcon,
  TrendingUp as TrendingIcon,
  Storage as StorageIcon,
  Terminal as TerminalIcon,
  BugReport as BugReportIcon,
  Link as IntegrationIcon,
  CheckCircleOutline as CheckIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';

export default function MCPService() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Willi MaKo MCP Service',
    description:
      'Managed Model Context Protocol (MCP) Service für die Willi-MaKo Plattform mit kuratierten Tools, Authentifizierung und Integrationsleitfaden für IDE-Copiloten und Automatisierung.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Verwalteter Zugang mit Token-Authentifizierung'
    },
    provider: {
      '@type': 'Organization',
      name: 'STROMDAO GmbH',
      url: 'https://stromhaltig.de'
    },
    url: 'https://stromhaltig.de/mcp-service',
    potentialAction: {
      '@type': 'UseAction',
      target: 'https://mcp.stromhaltig.de/mcp'
    }
  };

  return (
    <Layout title="MCP Service - Model Context Protocol für Willi MaKo">
      <Head>
        <title>MCP Service | Willi MaKo - Model Context Protocol Endpoint</title>
        <meta
          name="description"
          content="Willi MaKo MCP Service: Managed Model Context Protocol Endpoint mit kuratierten Tools, Authentifizierung, Deployment-Guides und Integrationen für IDE-Copiloten, Agenten und Automatisierung."
        />
        <meta
          name="keywords"
          content="MCP Tool-Server, JSON-RPC 2.0, Energie-Marktkommunikation, RAG, n8n, Claude.ai, LangChain, Model Context Protocol, Qdrant, Energiewirtschaft"
        />
        <link rel="canonical" href="https://stromhaltig.de/mcp-service" />

        <meta property="og:title" content="MCP Service | Willi MaKo MCP Endpoint" />
        <meta
          property="og:description"
          content="Managed Model Context Protocol Endpoint für Willi MaKo mit Authentifizierung, Integrationsleitfaden und Tool-Übersicht."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/mcp-service" />
        <meta property="og:image" content="https://stromhaltig.de/api-preview.jpg" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MCP Service | Willi MaKo MCP Endpoint" />
        <meta
          name="twitter:description"
          content="Managed Model Context Protocol Endpoint für Willi MaKo mit Authentifizierung und Integrationsleitfaden."
        />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>

      <Container maxWidth="lg">
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #1976d2, #ee7f4b)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Willi MaKo MCP Service
          </Typography>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 3, lineHeight: 1.4 }}>
            Managed Model Context Protocol Endpoint, der den kompletten Willi-MaKo API-Funktionsumfang als MCP-Tools für
            Copiloten, IDE-Integrationen und Automatisierungsagenten bereitstellt.
          </Typography>

          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>Schnellstart:</strong> Verbinden Sie Ihr MCP-fähiges Tool mit
            <code> https://mcp.stromhaltig.de/mcp </code>
            und senden Sie <code>Authorization: Bearer &lt;WILLI_MAKO_TOKEN&gt;</code> oder betten Sie das Token als ersten
            URL-Segment ein (<code>https://mcp.stromhaltig.de/&#123;token&#125;/mcp</code>).
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ApiIcon />}
              href="https://mcp.stromhaltig.de/mcp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hosted MCP Endpoint öffnen
            </Button>
            <Button variant="outlined" size="large" startIcon={<CodeIcon />} href="#examples">
              Code-Beispiele ansehen
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ mb: 4 }}>
            Highlights
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ArchitectureIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" component="h3">
                      Vollständiges MCP-Protokoll
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Streamable HTTP-Transport mit <code>/initialize</code>, <code>/tools/list</code> und <code>/tools/call</code>
                    – kompatibel mit IDE-Copiloten, autonomen Agenten und Desktop-Clients.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SearchIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" component="h3">
                      Kuratierte Willi-MaKo Tools
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Login, Session-Management, Chat, Retrieval, Reasoning und Artefakt-Verwaltung stehen als typisierte
                    Tools mit konsistenten JSON-Schemata bereit.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SecurityIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" component="h3">
                      Flexible Authentifizierung
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Unterstützt Bearer-, Basic- und URL-Token-Flows mit optionaler Persistenz & Session-Caching für langlebige
                    Workflows.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Konzeptueller Überblick
          </Typography>
          <Typography paragraph>
            Das Model Context Protocol (MCP) ermöglicht einen standardisierten Zugriff auf Tools und Datenquellen für
            Copiloten, IDEs und Automatisierung. Der Willi-MaKo MCP Service bildet das gesamte API-Angebot der Plattform ab,
            verwaltet Authentifizierung automatisch und stellt strukturierte JSON-Antworten für nachgelagerte Agenten bereit.
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Einheitlicher Zugang zu Willi-MaKo Workflows"
                secondary="Login, Session-Erzeugung, Chat, Reasoning und Artefakte werden über konsistente Tool-Aufrufe orchestriert."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Streamfähiger HTTP-Transport"
                secondary="Kompatibel mit MCP-fähigen IDEs und Desktop-Clients dank bidirektionaler Streaming-Verbindungen."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Stateful Sessions"
                secondary="Token- und Session-Caches ermöglichen mehrschrittige Automationen ohne zusätzliche Authentifizierungsrunden."
              />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Architektur
          </Typography>
          <Typography paragraph>
            Der MCP Service nutzt einen streamfähigen HTTP-Transport (Standard-Port 7337) aus dem
            <code> @modelcontextprotocol/sdk </code> und integriert den typisierten <code>WilliMakoClient</code>. Token-Caches
            und Session-Tracker sichern den Zustand zwischen Aufrufen, bevor Anfragen an die Willi-MaKo API v2 weitergeleitet
            werden.
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace' }}>
            <Typography variant="body2" component="pre">
              {`┌──────────────────────────────────────────────────────────────┐
│      MCP-aware Agent (IDE, CLI, Chat Client, Automation)      │
└───────────────▲───────────────────────────┬──────────────────┘
                │ HTTP/JSON (MCP protocol)  │
                │                           │
        ┌───────┴───────────────────────────▼──────────────────┐
        │           Willi-Mako MCP Service Transport           │
        │   (Streamable HTTP transport on port 7337 by default)│
        └───────▲───────────────────────────┬──────────────────┘
                │                           │
         ┌──────┴──────┐              ┌─────┴────────────────┐
         │ Token cache │              │  WilliMakoClient SDK │
         │ & session   │              │  (REST calls, retries │
         │ tracker     │              │   typed responses)    │
         └──────▲──────┘              └────────▲─────────────┘
                │                                │
          ┌─────┴────────────────────────────────▼──────┐
          │      Willi-Mako API v2 (stromhaltig.de)     │
          └─────────────────────────────────────────────┘`}
            </Typography>
          </Paper>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Authentifizierung & Autorisierung
          </Typography>
          <Typography paragraph>
            Alle Flows benötigen ein gültiges Willi-MaKo Access-Token. Der Transport unterstützt mehrere Mechanismen und
            verwaltet die Persistenz pro Verbindung.
          </Typography>
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Mechanismus</TableCell>
                <TableCell>Nutzung</TableCell>
                <TableCell>Hinweise</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <strong>Bearer Header</strong>
                </TableCell>
                <TableCell>
                  <code>Authorization: Bearer &lt;token&gt;</code>
                </TableCell>
                <TableCell>Bevorzugt für Clients mit bestehendem Token (CI, Agenten, Desktop-Clients).</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <strong>Basic Header</strong>
                </TableCell>
                <TableCell>
                  <code>Authorization: Basic base64(email:password)</code>
                </TableCell>
                <TableCell>Server tauscht die Credentials gegen ein JWT und cached es mit Ablaufsteuerung.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <strong>Ambient Token</strong>
                </TableCell>
                <TableCell>
                  <code>WILLI_MAKO_TOKEN</code> als Umgebungsvariable
                </TableCell>
                <TableCell>Fallback, falls keine Header übermittelt werden.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <strong>URL-Segment</strong>
                </TableCell>
                <TableCell>
                  <code>https://mcp.stromhaltig.de/&lt;token&gt;/mcp</code>
                </TableCell>
                <TableCell>Hosted Endpoint extrahiert Tokens und entfernt sie aus Logs.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Typography paragraph>
            Tokens werden pro MCP-Transport gespeichert, sodass mehrstufige Workflows ohne erneute Authentifizierung
            ausgeführt werden können. Der <code>willi-mako-login</code>-Tool-Aufruf kann Tokens persistieren oder mit
            <code>{'{ persistToken: false }'}</code> rein transient halten.
          </Typography>
          <Typography paragraph>
            Wird keine <code>sessionId</code> übergeben, merkt sich der Dienst die zuletzt aktive Session und stellt sie den
            nachfolgenden Tool-Aufrufen bereit – ideal für Chat-, Reasoning- oder Retrieval-Ketten.
          </Typography>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Verfügbare Tools & Ressourcen
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <ApiIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-login" secondary="Authentifiziert neue Sessions und persistiert Tokens optional." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-create-session" secondary="Startet Workflows mit konfigurierbaren Präferenzen." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-get-session" secondary="Prüft Metadaten, Richtlinien und Ablaufzeiten." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-delete-session" secondary="Bereinigt Sessions und Artefakte nach Automationen." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SearchIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-chat" secondary="Conversational Prompts mit Willi-MaKo Expertenwissen." />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <SearchIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-semantic-search" secondary="Hybrid Retrieval in der Wissensbasis." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-generate-reasoning" secondary="Deterministischer Reasoning-Pipeline-Output." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <TrendingIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-resolve-context" secondary="Kontextgerüste für Entscheidungen und Aktionen." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <StorageIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Artefakt-Tools" secondary="Listen, abrufen und erzeugen von Artefakten wie UTILMD oder MSCONS." />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="willi-mako-generate-tool & willi-mako-repair-tool" secondary="Generiert und verbessert deterministische Node.js-Utilities mit automatischen Retry-Strategien." />
                </ListItem>
              </List>
            </Grid>
          </Grid>
          <Typography variant="body2" color="text.secondary">
            Weitere Helfer-Tools (z.&nbsp;B. Dokumentations- und Kontakt-Shortcuts) sind im Quellcode des MCP Servers unter
            <code> src/demos/mcp-server.ts </code> dokumentiert.
          </Typography>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            MCP Service lokal betreiben
          </Typography>
          <Typography paragraph>
            Voraussetzungen: Node.js ≥ 18, installierter <code>willi-mako-client</code> (global oder via npx) sowie ein gültiges
            Willi-MaKo Token oder Credentials.
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <TerminalIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Schnellstart"
                secondary="npx willi-mako-client mcp startet den lokalen MCP Server auf http://localhost:7337/mcp."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TerminalIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Global installieren"
                secondary="npm install -g willi-mako-client@0.3.4 && willi-mako mcp"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TerminalIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Konfiguration"
                secondary="Nutzen Sie --base-url, --token oder die Umgebungsvariable WILLI_MAKO_TOKEN für alternative Umgebungen und Tokens."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TerminalIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="PM2 Wrapper"
                secondary="Die CommonJS-Shim bin/willi-mako.cjs ermöglicht einen PM2-Start ohne ERR_REQUIRE_ESM (pm2 start --name willi-mako-mcp willi-mako -- mcp)."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TerminalIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Docker"
                secondary="docker run -e WILLI_MAKO_TOKEN=$WILLI_MAKO_TOKEN -p 7337:7337 ghcr.io/energychain/willi-mako-client:0.3.4 willi-mako mcp --port 7337"
              />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Deployment-Muster für die Produktion
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    PM2 / Forever
                  </Typography>
                  <Typography paragraph>
                    Zero-Downtime-Restarts, Log-Rotation und Prozess-Monitoring. Nutzen Sie den CommonJS-Wrapper, um ESM
                    problemlos zu starten.
                  </Typography>
                  <Chip label="Empfohlen" color="primary" size="small" />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    systemd Service
                  </Typography>
                  <Typography paragraph>
                    Betriebssystem-native Kontrolle mit Restart-Policies. Ein Wrapper-Script exportiert Tokens und ruft
                    <code> willi-mako mcp </code> auf.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Docker / Kubernetes
                  </Typography>
                  <Typography paragraph>
                    Immutable Deployments, horizontale Skalierung und Secret-Management via Environment oder Secrets-Store.
                    Stellen Sie Port 7337 bereit und halten Sie Sticky Sessions vor.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Serverless Container
                  </Typography>
                  <Typography paragraph>
                    On-Demand Skalierung für Workloads mit wechselnder Auslastung. Beachten Sie, dass in-memory Token-Caches
                    bei Kaltstarts zurückgesetzt werden.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Öffentlicher Hosted Endpoint
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ApiIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Basis-URL" secondary="https://mcp.stromhaltig.de/ mit Transportpfad /mcp" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Token-Injektion" secondary="Per Header oder als erstes URL-Segment – Token wird aus Logs entfernt." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="TLS & Rate-Limits" secondary="HTTPS mit modernen Cipher Suites, Standard-Willi-MaKo Rate Limits." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <IntegrationIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Einsatzszenarien" secondary="Für schnelle Experimente oder als dauerhaft verwalteter Integrationspunkt." />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            MCP Clients integrieren
          </Typography>
          <Typography paragraph>
            Konfigurieren Sie MCP-fähige Clients in wenigen Schritten – unabhängig davon, ob Sie lokal oder über den Hosted
            Endpoint verbinden.
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <IntegrationIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Transport definieren" secondary="HTTP/streamable mit URL http://localhost:7337/mcp oder https://mcp.stromhaltig.de/mcp." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Credentials bereitstellen" secondary="Per Bearer-Header oder via willi-mako-login Tool." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SearchIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Tools entdecken" secondary="Die meisten Clients bieten automatische Tool-Listen mit willi-mako-* Prefix." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TrendingIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Session aufbauen" secondary="Einmal willi-mako-create-session ausführen und Folge-Calls auf derselben Verbindung nutzen." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StorageIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Ergebnisse sichern" secondary="Artefakt-Tools nutzen, um JSON/EDI-Ausgaben direkt in Willi-MaKo zu speichern." />
            </ListItem>
          </List>

          <Typography variant="h5" gutterBottom sx={{ mt: 2, color: 'primary.main' }}>
            Beispiel: VS Code MCP Client
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
            <Typography variant="body2" component="pre">
              {`{
  "mcpServers": {
    "willi-mako": {
      "transport": "streamable",
      "url": "https://mcp.stromhaltig.de/<WILLI_MAKO_TOKEN>/mcp"
    }
  }
}`}
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            Beispiel: Claude Desktop
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <IntegrationIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Integrationen → MCP Servers öffnen" secondary="Neuen Server mit URL https://mcp.stromhaltig.de/mcp anlegen." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Header setzen" secondary="Authorization: Bearer &lt;WILLI_MAKO_TOKEN&gt; oder Token in der URL einbetten." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SearchIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Tool Palette" secondary="Mit /tool willi-mako-create-session eine Session initialisieren." />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Observability & Troubleshooting
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <BugReportIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Strukturierte Logs" secondary="Emoji-präfixierte Logs für Verbindungen und Tool-Aufrufe, einsehbar via pm2 logs." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <BugReportIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Fehlerbehandlung" secondary="API-Fehler werden als MCP Error Responses mit ErrorCode annotiert." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <BugReportIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Token-Cache" secondary="Basic-Auth Cache invalidiert abgelaufene Tokens automatisch; Login erneut ausführen bei Rotation." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <BugReportIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Session-Reset" secondary="Transport-Disconnect löscht In-Memory Sessions – willi-mako-create-session erneut aufrufen." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <BugReportIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="PM2 Shim" secondary="Bei ERR_REQUIRE_ESM auf willi-mako-client ≥ 0.3.4 upgraden (enthält CommonJS Wrapper)." />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Security-Empfehlungen
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Token schützen" secondary="Tokens in URLs gelten als sensibel – Logs und History überprüfen." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Rotation" secondary="WILLI_MAKO_TOKEN regelmäßig wechseln und least-privilege beachten." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Netzwerkabsicherung" secondary="Eigene Deployments per Firewall/VPN eingrenzen, Token-Persistenz in Shared Environments deaktivieren." />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Monitoring" secondary="API Usage Dashboards nutzen, um Anomalien frühzeitig zu erkennen." />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 4, mb: 6 }} id="examples">
          <Typography variant="h3" component="h2" gutterBottom>
            Code-Beispiele
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 2, color: 'primary.main' }}>
            1. MCP-Handshake (curl)
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
            <Typography variant="body2" component="pre">
              {`curl -X POST https://mcp.stromhaltig.de/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <WILLI_MAKO_TOKEN>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'`}
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            2. Tools auflisten
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
            <Typography variant="body2" component="pre">
              {`curl -X POST https://mcp.stromhaltig.de/tools/list \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <WILLI_MAKO_TOKEN>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'`}
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            3. Tool ausführen (Suche)
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
            <Typography variant="body2" component="pre">
              {`curl -X POST https://mcp.stromhaltig.de/tools/call \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <WILLI_MAKO_TOKEN>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "willi-mako-semantic-search",
      "arguments": {
        "query": "Wie funktioniert der Lieferantenwechsel?",
        "top_k": 2
      }
    }
  }'`}
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            JavaScript / Node.js Beispiel
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace' }}>
            <Typography variant="body2" component="pre">
              {`const headers = {
  'Content-Type': 'application/json',
  Authorization: \`Bearer \${process.env.WILLI_MAKO_TOKEN}\`
};

// 1. Initialize
await fetch('https://mcp.stromhaltig.de/mcp', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  })
});

// 2. List tools
await fetch('https://mcp.stromhaltig.de/tools/list', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  })
});

// 3. Call semantic search
const response = await fetch('https://mcp.stromhaltig.de/tools/call', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'willi-mako-semantic-search',
      arguments: {
        query: 'Was bedeutet der Fehlercode Z08?',
        top_k: 3
      }
    }
  })
});

const data = await response.json();
console.log(data.result);`}
            </Typography>
          </Paper>
        </Paper>

        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'white', mb: 10 }}>
          <Typography variant="h4" gutterBottom>
            Jetzt verbinden und loslegen
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
            Nutzen Sie den verwalteten MCP Endpoint oder betreiben Sie ihn selbst. Alle Tools, Authentifizierungsflüsse und
            Deployment-Muster stehen bereit, um Willi-MaKo Workflows in Ihre Copiloten zu integrieren.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
              startIcon={<ApiIcon />}
              href="https://mcp.stromhaltig.de/mcp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hosted Endpoint öffnen
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'grey.200', bgcolor: 'rgba(255,255,255,0.1)' } }}
              href="/docs/INTEGRATIONS.md"
            >
              Integrationsleitfaden lesen
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Layout>
  );
}
