import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import apiClient from '../services/apiClient';

interface ChatConfiguration {
  id: string;
  name: string;
  description: string;
  config: {
    systemPrompt: string;
    maxIterations: number;
    vectorSearch: {
      maxQueries: number;
      limit: number;
      scoreThreshold: number;
      useQueryExpansion: boolean;
    };
    processingSteps: Array<{
      name: string;
      enabled: boolean;
      prompt: string;
    }>;
    contextSynthesis: {
      enabled: boolean;
      maxLength: number;
    };
    qualityChecks: {
      enabled: boolean;
      minResponseLength: number;
      checkForHallucination: boolean;
    };
  };
}

const ChatConfigurationInfo: React.FC = () => {
  const [config, setConfig] = useState<ChatConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveConfiguration();
  }, []);

  const loadActiveConfiguration = async () => {
    try {
      setLoading(true);
      const activeConfig = await apiClient.get<ChatConfiguration>('/admin/chat-config/active');
      setConfig(activeConfig);
      setError(null);
    } catch (err) {
      console.error('Error loading active configuration:', err);
      setError('Fehler beim Laden der Chat-Konfiguration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Lade Chat-Konfiguration...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Keine aktive Chat-Konfiguration gefunden</Alert>
      </Box>
    );
  }

  const enabledSteps = config.config.processingSteps.filter(step => step.enabled);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Ihre Chat-Konfiguration
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Diese Konfiguration wird für alle Ihre Chat-Anfragen verwendet und wurde von einem Administrator festgelegt.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {config.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {config.description}
          </Typography>
          <Chip label="Aktive Konfiguration" color="success" size="small" />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System-Prompt
          </Typography>
          <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
            <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
              {config.config.systemPrompt}
            </Typography>
          </Paper>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Verarbeitungsschritte
          </Typography>
          <List>
            {config.config.processingSteps.map((step, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">{step.name}</Typography>
                      <Chip 
                        label={step.enabled ? 'Aktiviert' : 'Deaktiviert'} 
                        color={step.enabled ? 'success' : 'default'} 
                        size="small" 
                      />
                    </Box>
                  }
                  secondary={step.enabled ? step.prompt : 'Dieser Schritt ist deaktiviert'}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sucheinstellungen
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Maximale Suchanfragen" 
                secondary={config.config.vectorSearch.maxQueries} 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Ergebnislimit pro Anfrage" 
                secondary={config.config.vectorSearch.limit} 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Mindest-Ähnlichkeitsscore" 
                secondary={config.config.vectorSearch.scoreThreshold} 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Query-Expansion" 
                secondary={
                  <Chip 
                    label={config.config.vectorSearch.useQueryExpansion ? 'Aktiviert' : 'Deaktiviert'}
                    color={config.config.vectorSearch.useQueryExpansion ? 'success' : 'default'}
                    size="small"
                  />
                } 
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Weitere Einstellungen
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Maximale Iterationen" 
                secondary={config.config.maxIterations} 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Kontext-Synthese" 
                secondary={
                  <Chip 
                    label={config.config.contextSynthesis.enabled ? 'Aktiviert' : 'Deaktiviert'}
                    color={config.config.contextSynthesis.enabled ? 'success' : 'default'}
                    size="small"
                  />
                } 
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText 
                primary="Qualitätsprüfungen" 
                secondary={
                  <Chip 
                    label={config.config.qualityChecks.enabled ? 'Aktiviert' : 'Deaktiviert'}
                    color={config.config.qualityChecks.enabled ? 'success' : 'default'}
                    size="small"
                  />
                } 
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ChatConfigurationInfo;
