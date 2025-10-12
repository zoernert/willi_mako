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
  Divider,
  Stack
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Api as ApiIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Link as IntegrationIcon,
  Code as CodeIcon,
  TrendingUp as TrendingIcon,
  Storage as DataIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';

export default function MCPService() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Willi MaKo MCP Service",
    "description": "MCP Tool-Server für RAG-Anwendungen in der deutschen Energie-Marktkommunikation (MaKo) mit JSON-RPC 2.0 Protokoll und dynamischer Tool-Erkennung.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "description": "Kostenloser Zugang während der Beta-Phase"
    },
    "provider": {
      "@type": "Organization",
      "name": "STROMDAO GmbH",
      "url": "https://stromhaltig.de"
    },
    "url": "https://stromhaltig.de/mcp-service",
    "potentialAction": {
      "@type": "UseAction",
      "target": "https://mcp.stromhaltig.de"
    }
  };

  return (
    <Layout title="MCP Service - API für Energie-Marktkommunikation">
      <Head>
        <title>MCP Service | Willi MaKo - REST-API für Energie-Marktkommunikation</title>
        <meta 
          name="description" 
          content="MCP Tool-Server für RAG-Anwendungen in der Energie-Marktkommunikation. JSON-RPC 2.0 Protokoll, dynamische Tool-Erkennung, optimiert für n8n, Claude.ai und LangChain Integration."
        />
        <meta name="keywords" content="MCP Tool-Server, JSON-RPC 2.0, Energie-Marktkommunikation, RAG, n8n, Claude.ai, LangChain, Model Context Protocol, Qdrant, Energiewirtschaft" />
        <link rel="canonical" href="https://stromhaltig.de/mcp-service" />
        
        {/* Open Graph */}
        <meta property="og:title" content="MCP Service | Professionelle API für Energie-Marktkommunikation" />
        <meta property="og:description" content="MCP Tool-Server für RAG-Anwendungen mit JSON-RPC 2.0 Protokoll. Optimiert für n8n, Claude.ai und LangChain Integration." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/mcp-service" />
        <meta property="og:image" content="https://stromhaltig.de/api-preview.jpg" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MCP Service | REST-API für Energie-Marktkommunikation" />
        <meta name="twitter:description" content="MCP Tool-Server für RAG-Anwendungen in der Energiewirtschaft mit JSON-RPC 2.0 Protokoll." />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <Container maxWidth="lg">
        {/* Hero Section */}
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
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ mb: 3, lineHeight: 1.4 }}
          >
            MCP Tool-Server für RAG-Anwendungen in der deutschen Energie-Marktkommunikation
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Beta-Phase:</strong> Der Service ist derzeit kostenfrei verfügbar. 
            Nutzen Sie die Gelegenheit, um die API zu testen und Feedback zu geben.
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button 
              variant="contained" 
              size="large"
              startIcon={<ApiIcon />}
              href="https://mcp.stromhaltig.de"
              target="_blank"
              rel="noopener noreferrer"
            >
              MCP Server
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              startIcon={<CodeIcon />}
              href="#examples"
            >
              Code-Beispiele ansehen
            </Button>
          </Stack>
        </Box>

        {/* Key Features */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ mb: 4 }}>
            Warum der MCP Service?
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SearchIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" component="h3">
                      Intelligente Suche
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Multi-Vektor-Strategie mit AI-Zusammenfassungen, ELI5-Erklärungen und synthetischen QA-Paaren für präzise Ergebnisse.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IntegrationIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" component="h3">
                      JSON-RPC 2.0 Protokoll
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Vollständige MCP Tool-Server Implementation mit dynamischer Tool-Erkennung über /initialize, /tools/list und /tools/call Endpunkte.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DataIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                    <Typography variant="h6" component="h3">
                      Optimierte Wissensbasis
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Qdrant Vector-Datenbank mit Multi-Layer-Extraktion von Diagrammen, Tabellen und strukturierten Daten aus MaKo-Dokumenten.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Technical Details */}
        <Paper sx={{ p: 4, mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Technische Spezifikation
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
                MCP Tool-Server Endpunkte
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
                <Typography variant="body2">
                  POST https://mcp.stromhaltig.de/<br/>
                  POST https://mcp.stromhaltig.de/initialize<br/>
                  POST https://mcp.stromhaltig.de/tools/list<br/>
                  POST https://mcp.stromhaltig.de/tools/call
                </Typography>
              </Paper>
              
              <Typography variant="h6" gutterBottom>
                Protokoll
              </Typography>
              <Typography paragraph>
                JSON-RPC 2.0 Standard. Alle Anfragen folgen dem dreistufigen MCP-Protokoll: Initialize → Tools List → Tools Call.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Authentifizierung
              </Typography>
              <Typography paragraph>
                Während der Beta-Phase ist keine Authentifizierung erforderlich. Der Server akzeptiert alle Anfragen.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
                Tool-Server Fähigkeiten
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
                <Typography variant="body2" component="pre">
{`{
  "capabilities": {
    "tools": {},
    "prompts": {},
    "resources": {}
  },
  "serverInfo": {
    "name": "willi-mako-mcp-server",
    "version": "1.0.0"
  }
}`}
                </Typography>
              </Paper>
              
              <Typography variant="h6" gutterBottom>
                Verfügbare Tools
              </Typography>
              <Typography paragraph>
                <strong>search</strong>: Intelligente Suche in der MaKo-Wissensdatenbank mit konfigurierbaren Parametern (query, top_k).
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Dynamische Schema-Erkennung
              </Typography>
              <Typography paragraph>
                Clients können zur Laufzeit die verfügbaren Tools und deren Input-Schemas automatisch ermitteln.
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Use Cases */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ mb: 4 }}>
            Anwendungsfälle
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Chatbots & Assistenten
                  </Typography>
                  <Typography paragraph>
                    Entwickeln Sie intelligente Chatbots für die Energiewirtschaft mit präzisem Zugriff auf MaKo-Wissen.
                  </Typography>
                  <Chip label="n8n" size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="LangChain" size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="Custom Apps" size="small" sx={{ mb: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Dokumentationssuche
                  </Typography>
                  <Typography paragraph>
                    Intelligente Suche in komplexen MaKo-Dokumenten mit kontextualisierten Antworten und Quellenangaben.
                  </Typography>
                  <Chip label="BDEW" size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="GPKE" size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="Prozesse" size="small" sx={{ mb: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Compliance-Tools
                  </Typography>
                  <Typography paragraph>
                    Automatisierte Compliance-Prüfungen und Regelwerks-Abfragen für Energieversorger.
                  </Typography>
                  <Chip label="Automated Checks" size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="Risk Management" size="small" sx={{ mb: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                    Schulungsanwendungen
                  </Typography>
                  <Typography paragraph>
                    Interaktive Lernplattformen mit contextualisierten Erklärungen für Mitarbeiter-Schulungen.
                  </Typography>
                  <Chip label="E-Learning" size="small" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="Knowledge Base" size="small" sx={{ mb: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Code Examples */}
        <Paper sx={{ p: 4, mb: 6 }} id="examples">
          <Typography variant="h3" component="h2" gutterBottom>
            Code-Beispiele
          </Typography>
          
          <Typography variant="h5" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            1. Protokoll-Handshake (Initialize)
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
            <Typography variant="body2" component="pre">
{`curl -X POST https://mcp.stromhaltig.de/initialize \\
-H "Content-Type: application/json" \\
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
-d '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "Wie funktioniert der Lieferantenwechsel?",
      "top_k": 2
    }
  }
}'`}
            </Typography>
          </Paper>
          
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            JavaScript/Node.js Beispiel
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', mb: 3 }}>
            <Typography variant="body2" component="pre">
{`// 1. Initialize
const initResponse = await fetch('https://mcp.stromhaltig.de/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  })
});

// 2. List tools
const toolsResponse = await fetch('https://mcp.stromhaltig.de/tools/list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  })
});

// 3. Call search tool
const searchResponse = await fetch('https://mcp.stromhaltig.de/tools/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search',
      arguments: {
        query: 'Was bedeutet der Fehlercode Z08?',
        top_k: 3
      }
    }
  })
});

const data = await searchResponse.json();
console.log(data.result);`}
            </Typography>
          </Paper>
          
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            n8n Integration
          </Typography>
          <Typography paragraph>
            Verwenden Sie den <strong>MCP Client Tool Node</strong> in n8n:
          </Typography>
          <Box sx={{ ml: 2 }}>
            <Typography component="div" paragraph>
              1. <strong>Credential erstellen:</strong>
            </Typography>
            <Box sx={{ ml: 2, mb: 2 }}>
              <Typography component="div">
                • Gehen Sie zu "Credentials" und erstellen Sie eine neue "MCP Client"-Credential
              </Typography>
              <Typography component="div">
                • <strong>Base URL:</strong> <code>https://mcp.stromhaltig.de</code>
              </Typography>
            </Box>
            
            <Typography component="div" paragraph>
              2. <strong>MCP Client Tool Node konfigurieren:</strong>
            </Typography>
            <Box sx={{ ml: 2 }}>
              <Typography component="div">
                • Fügen Sie den "MCP Client Tool"-Node hinzu
              </Typography>
              <Typography component="div">
                • Wählen Sie die erstellte Credential aus
              </Typography>
              <Typography component="div">
                • Der Node führt automatisch den Discovery-Prozess aus
              </Typography>
              <Typography component="div">
                • Wählen Sie das <code>search</code>-Tool aus der Dropdown-Liste
              </Typography>
              <Typography component="div">
                • Konfigurieren Sie die Parameter <code>query</code> und <code>top_k</code>
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* CTA Section */}
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h4" gutterBottom>
            Jetzt testen!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
            Nutzen Sie die Beta-Phase und integrieren Sie den MCP Tool-Server in Ihre RAG-Anwendung.
            Kostenloser Zugang während der Testphase mit vollständiger JSON-RPC 2.0 Unterstützung.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button 
              variant="contained" 
              size="large"
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
              startIcon={<ApiIcon />}
              href="https://mcp.stromhaltig.de"
              target="_blank"
              rel="noopener noreferrer"
            >
              MCP Server testen
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'grey.200', bgcolor: 'rgba(255,255,255,0.1)' } }}
              href="/app"
            >
              Willi MaKo App nutzen
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Layout>
  );
}
