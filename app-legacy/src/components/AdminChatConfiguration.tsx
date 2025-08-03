import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import apiClient from '../services/apiClient';

enum SearchType {
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
  KEYWORD = 'keyword',
  FUZZY = 'fuzzy'
}

interface ProcessingStep {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface VectorSearchConfig {
  similarity_threshold: number;
  max_results: number;
  search_type: SearchType;
  hybrid_alpha?: number;
  diversity_threshold?: number;
  use_query_expansion?: boolean;
  max_queries?: number;
}

interface ChatConfiguration {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  processing_steps: ProcessingStep[];
  vector_search_config: VectorSearchConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TestSession {
  id: string;
  config_id: string;
  user_query: string;
  response: string;
  processing_time_ms: number;
  vector_results_count: number;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Helper function to get step descriptions
function getStepDescription(stepId: string): string {
  const descriptions: Record<string, string> = {
    'query_understanding': 'Analysiert die Benutzeranfrage und extrahiert die Kernfrage. Generiert alternative Suchanfragen bei aktivierter Query-Expansion.',
    'context_search': 'Durchsucht den Qdrant Vector Store mit den generierten Suchanfragen. ERFORDERLICH für die Anzeige von Vector Store Ergebnissen.',
    'context_optimization': 'Optimiert und synthetisiert den gefundenen Kontext. Entfernt Duplikate und priorisiert relevante Informationen.',
    'response_generation': 'Erstellt die finale Antwort basierend auf dem optimierten Kontext. Verwendet den konfigurierbaren System-Prompt.',
    'response_validation': 'Validiert die Antwort auf Qualität und Korrektheit. Prüft Mindestlänge und potenzielle Halluzinationen.'
  };
  return descriptions[stepId] || 'Unbekannter Verarbeitungsschritt';
}

const AdminChatConfiguration: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [configurations, setConfigurations] = useState<ChatConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ChatConfiguration | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testConfigId, setTestConfigId] = useState<string>('');
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [testQuery, setTestQuery] = useState('');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

  // Load configurations on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadData = async () => {
      await loadConfigurations();
      await loadTestSessions();
    };
    loadData();
  }, []);

  const loadConfigurations = async () => {
    try {
      const backendConfigs = await apiClient.get<any[]>('/admin/chat-config');
      
      // Transform backend format to frontend format
      const transformedConfigs: ChatConfiguration[] = backendConfigs.map(config => ({
        id: config.id,
        name: config.name,
        description: config.description || '',
        system_prompt: config.config?.systemPrompt || 'You are a helpful AI assistant.',
        processing_steps: config.config?.processingSteps?.map((step: any) => ({
          id: step.name,
          name: step.name.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          enabled: step.enabled,
          config: {}
        })) || [
          { id: 'query_understanding', name: 'Query Understanding', enabled: true, config: {} },
          { id: 'context_search', name: 'Context Search', enabled: true, config: {} },
          { id: 'context_optimization', name: 'Context Optimization', enabled: true, config: {} },
          { id: 'response_generation', name: 'Response Generation', enabled: true, config: {} },
          { id: 'response_validation', name: 'Response Validation', enabled: true, config: {} }
        ],
        vector_search_config: {
          similarity_threshold: config.config?.vectorSearch?.scoreThreshold || 0.7,
          max_results: config.config?.vectorSearch?.limit || 10,
          search_type: config.config?.vectorSearch?.searchType || SearchType.HYBRID,
          hybrid_alpha: config.config?.vectorSearch?.hybridAlpha || 0.3,
          diversity_threshold: config.config?.vectorSearch?.diversityThreshold || 0.7
        },
        is_active: config.isActive || false,
        created_at: config.createdAt || '',
        updated_at: config.updatedAt || ''
      }));
      
      setConfigurations(transformedConfigs);
    } catch (error) {
      console.error('Error loading configurations:', error);
      showSnackbar('Error loading configurations', 'error');
    }
  };

  const loadTestSessions = async () => {
    try {
      const sessions = await apiClient.get<TestSession[]>('/admin/chat-config/test-sessions');
      setTestSessions(sessions);
    } catch (error) {
      console.error('Error loading test sessions:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateConfiguration = () => {
    const newConfig: ChatConfiguration = {
      id: '',
      name: 'New Configuration',
      description: '',
      system_prompt: 'Du bist ein hilfreicher AI-Assistent für die Energiewirtschaft.',
      processing_steps: [
        {
          id: 'query_understanding',
          name: 'Query Understanding',
          enabled: true,
          config: {
            prompt: 'Analysiere die Benutzeranfrage und extrahiere die Kernfrage.'
          }
        },
        {
          id: 'context_search',
          name: 'Context Search',
          enabled: true,
          config: {
            prompt: 'Durchsuche den Qdrant Vector Store mit den generierten Suchanfragen.'
          }
        },
        {
          id: 'context_optimization',
          name: 'Context Optimization',
          enabled: true,
          config: {
            prompt: 'Optimiere und synthetisiere den gefundenen Kontext.'
          }
        },
        {
          id: 'response_generation',
          name: 'Response Generation',
          enabled: true,
          config: {
            prompt: 'Erstelle die finale Antwort basierend auf dem optimierten Kontext.'
          }
        },
        {
          id: 'response_validation',
          name: 'Response Validation',
          enabled: true,
          config: {
            prompt: 'Validiere die Antwort auf Qualität und Korrektheit.'
          }
        }
      ],
      vector_search_config: {
        search_type: SearchType.HYBRID,
        similarity_threshold: 0.3,
        max_results: 10,
        hybrid_alpha: 0.7,
        diversity_threshold: 0.8,
        use_query_expansion: true,
        max_queries: 3
      },
      is_active: false,
      created_at: '',
      updated_at: ''
    };
    setSelectedConfig(newConfig);
    setEditDialogOpen(true);
  };

  const handleEditConfiguration = (config: ChatConfiguration) => {
    setSelectedConfig({ ...config });
    setEditDialogOpen(true);
  };

  const handleOpenTestModal = (configId: string) => {
    setTestConfigId(configId);
    setTestQuery('');
    setTestResponse(null);
    setTestDialogOpen(true);
  };

  const handleSaveConfiguration = async () => {
    if (!selectedConfig) return;

    setLoading(true);
    try {
      // Transform the frontend format to match backend expectations
      const transformedConfig = {
        name: selectedConfig.name,
        description: selectedConfig.description || '',
        config: {
          maxIterations: 3,
          systemPrompt: selectedConfig.system_prompt,
          vectorSearch: {
            maxQueries: 3,
            limit: selectedConfig.vector_search_config.max_results,
            scoreThreshold: selectedConfig.vector_search_config.similarity_threshold,
            useQueryExpansion: true,
            searchType: selectedConfig.vector_search_config.search_type,
            hybridAlpha: selectedConfig.vector_search_config.hybrid_alpha || 0.3,
            diversityThreshold: selectedConfig.vector_search_config.diversity_threshold || 0.7
          },
          processingSteps: selectedConfig.processing_steps.map(step => ({
            name: step.id, // Use step.id directly as it matches backend expectations
            enabled: step.enabled,
            prompt: step.config?.prompt || `Process ${step.name.toLowerCase()}`
          })),
          contextSynthesis: {
            enabled: true,
            maxLength: 2000
          },
          qualityChecks: {
            enabled: true,
            minResponseLength: 50,
            checkForHallucination: true
          }
        }
      };

      if (selectedConfig.id) {
        // Update existing configuration - include isActive for updates
        await apiClient.put(`/admin/chat-config/${selectedConfig.id}`, {
          ...transformedConfig,
          isActive: selectedConfig.is_active
        });
      } else {
        // Create new configuration
        await apiClient.post('/admin/chat-config', transformedConfig);
      }

      await loadConfigurations();
      setEditDialogOpen(false);
      setSelectedConfig(null);
      showSnackbar('Konfiguration erfolgreich gespeichert', 'success');
    } catch (error) {
      console.error('Error saving configuration:', error);
      showSnackbar('Fehler beim Speichern der Konfiguration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateConfiguration = async (configId: string) => {
    setLoading(true);
    try {
      await apiClient.post(`/admin/chat-config/${configId}/activate`);
      await loadConfigurations();
      showSnackbar('Konfiguration erfolgreich als Standard gesetzt', 'success');
    } catch (error) {
      console.error('Error activating configuration:', error);
      showSnackbar('Fehler beim Setzen als Standard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete(`/admin/chat-config/${configId}`);
      await loadConfigurations();
      showSnackbar('Configuration deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting configuration:', error);
      showSnackbar('Error deleting configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfiguration = async () => {
    if (!testQuery.trim()) {
      showSnackbar('Bitte geben Sie eine Testanfrage ein', 'error');
      return;
    }

    if (!testConfigId) {
      showSnackbar('Keine Konfiguration ausgewählt', 'error');
      return;
    }

    // Automatisch speichern vor dem Test, falls gerade editiert wird
    if (selectedConfig && selectedConfig.id === testConfigId && editDialogOpen) {
      try {
        await handleSaveConfiguration();
        showSnackbar('Konfiguration automatisch gespeichert vor Test', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Kurz warten
      } catch (error) {
        console.error('Error auto-saving configuration before test:', error);
        showSnackbar('Warnung: Konfiguration konnte nicht vor Test gespeichert werden', 'error');
        return; // Test nicht durchführen wenn Speichern fehlschlägt
      }
    }

    setLoading(true);
    try {
      const result = await apiClient.post(`/admin/chat-config/${testConfigId}/test`, { testQuery });
      setTestResponse(result);
      await loadTestSessions();
      showSnackbar('Test erfolgreich durchgeführt', 'success');
    } catch (error) {
      console.error('Error testing configuration:', error);
      showSnackbar('Fehler beim Testen der Konfiguration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedConfigField = (field: string, value: any) => {
    if (!selectedConfig) return;
    setSelectedConfig({ ...selectedConfig, [field]: value });
  };

  const updateVectorSearchConfig = (field: string, value: any) => {
    if (!selectedConfig) return;
    setSelectedConfig({
      ...selectedConfig,
      vector_search_config: {
        ...selectedConfig.vector_search_config,
        [field]: value
      }
    });
  };

  const updateProcessingStep = (stepIndex: number, field: string, value: any) => {
    if (!selectedConfig) return;
    const updatedSteps = [...selectedConfig.processing_steps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], [field]: value };
    setSelectedConfig({ ...selectedConfig, processing_steps: updatedSteps });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Chat Configuration Management
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Standard-Konfiguration:</strong> Alle Nutzer verwenden die als "Standard (Aktiv)" markierte Konfiguration für ihre Chat-Anfragen. 
        Es kann immer nur eine Konfiguration gleichzeitig als Standard gesetzt sein.
      </Alert>

      <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
        <Tab label="Configurations" />
        <Tab label="Test Sessions" />
      </Tabs>

      <TabPanel value={currentTab} index={0}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateConfiguration}
            sx={{ mr: 2 }}
          >
            Create Configuration
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConfigurations}
          >
            Refresh
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Processing Steps</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.name}</TableCell>
                  <TableCell>{config.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={config.is_active ? 'Standard (Aktiv)' : 'Inaktiv'}
                      color={config.is_active ? 'success' : 'default'}
                      size="small"
                      variant={config.is_active ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(config.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditConfiguration(config)}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenTestModal(config.id)}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                    {!config.is_active && (
                      <Tooltip title="Als Standard setzen">
                        <IconButton
                          size="small"
                          onClick={() => handleActivateConfiguration(config.id)}
                        >
                          <PlayArrowIcon color="success" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteConfiguration(config.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Query</TableCell>
                <TableCell>Response Preview</TableCell>
                <TableCell>Processing Time</TableCell>
                <TableCell>Vector Results</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {testSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.user_query}</TableCell>
                  <TableCell>
                    {session.response.substring(0, 100)}
                    {session.response.length > 100 ? '...' : ''}
                  </TableCell>
                  <TableCell>{session.processing_time_ms}ms</TableCell>
                  <TableCell>{session.vector_results_count}</TableCell>
                  <TableCell>
                    {new Date(session.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Edit Configuration Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedConfig?.id ? 'Edit Configuration' : 'Create Configuration'}
        </DialogTitle>
        <DialogContent>
          {selectedConfig && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Name"
                value={selectedConfig.name}
                onChange={(e) => updateSelectedConfigField('name', e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                value={selectedConfig.description}
                onChange={(e) => updateSelectedConfigField('description', e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="System Prompt"
                value={selectedConfig.system_prompt}
                onChange={(e) => updateSelectedConfigField('system_prompt', e.target.value)}
                sx={{ mb: 2 }}
              />

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Vector Search Configuration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        sx={{ flex: 1 }}
                        type="number"
                        label="Similarity Threshold"
                        value={selectedConfig.vector_search_config.similarity_threshold}
                        onChange={(e) => updateVectorSearchConfig('similarity_threshold', parseFloat(e.target.value))}
                        inputProps={{ step: 0.1, min: 0, max: 1 }}
                      />
                      <TextField
                        sx={{ flex: 1 }}
                        type="number"
                        label="Max Results"
                        value={selectedConfig.vector_search_config.max_results}
                        onChange={(e) => updateVectorSearchConfig('max_results', parseInt(e.target.value))}
                        inputProps={{ min: 1, max: 100 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>Search Type</InputLabel>
                        <Select
                          value={selectedConfig.vector_search_config.search_type}
                          onChange={(e) => updateVectorSearchConfig('search_type', e.target.value as SearchType)}
                          label="Search Type"
                        >
                          <MenuItem value={SearchType.SEMANTIC}>
                            Semantic Search
                          </MenuItem>
                          <MenuItem value={SearchType.HYBRID}>
                            Hybrid Search (Empfohlen)
                          </MenuItem>
                          <MenuItem value={SearchType.KEYWORD}>
                            Keyword Search
                          </MenuItem>
                          <MenuItem value={SearchType.FUZZY}>
                            Fuzzy Search
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Hybrid Search spezifische Optionen */}
                    {selectedConfig.vector_search_config.search_type === SearchType.HYBRID && (
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                          sx={{ flex: 1 }}
                          type="number"
                          label="Hybrid Alpha (0.0 = Semantic, 1.0 = Keyword)"
                          value={selectedConfig.vector_search_config.hybrid_alpha || 0.3}
                          onChange={(e) => updateVectorSearchConfig('hybrid_alpha', parseFloat(e.target.value))}
                          inputProps={{ step: 0.1, min: 0, max: 1 }}
                        />
                        <TextField
                          sx={{ flex: 1 }}
                          type="number"
                          label="Diversity Threshold"
                          value={selectedConfig.vector_search_config.diversity_threshold || 0.7}
                          onChange={(e) => updateVectorSearchConfig('diversity_threshold', parseFloat(e.target.value))}
                          inputProps={{ step: 0.1, min: 0, max: 1 }}
                        />
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Verarbeitungsschritte (5 Schritte für vollständige Vector Store Integration)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {selectedConfig.processing_steps.map((step, index) => (
                    <Card key={step.id} sx={{ mb: 2, bgcolor: step.enabled ? 'primary.lighter' : 'grey.100' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={step.enabled}
                                onChange={(e) => updateProcessingStep(index, 'enabled', e.target.checked)}
                                color="primary"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="h6">{step.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Schritt-ID: {step.id}
                                  {step.id === 'context_search' && (
                                    <Chip 
                                      label="ERFORDERLICH für Vector Store Ergebnisse" 
                                      size="small" 
                                      color="warning" 
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Typography>
                              </Box>
                            }
                          />
                          {/* Step importance indicator */}
                          {step.id === 'context_search' && (
                            <Tooltip title="Dieser Schritt ist erforderlich für QDrant Vector Store Ergebnisse">
                              <InfoIcon color="warning" />
                            </Tooltip>
                          )}
                        </Box>
                        
                        <TextField
                          fullWidth
                          label="Schritt-Name"
                          value={step.name}
                          onChange={(e) => updateProcessingStep(index, 'name', e.target.value)}
                          sx={{ mb: 2 }}
                          disabled
                          helperText="Schritt-Name ist systemdefiniert und kann nicht geändert werden"
                        />
                        
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Verarbeitungs-Prompt"
                          value={step.config?.prompt || ''}
                          onChange={(e) => {
                            const updatedStep = { ...step };
                            if (!updatedStep.config) updatedStep.config = {};
                            updatedStep.config.prompt = e.target.value;
                            const updatedSteps = [...selectedConfig.processing_steps];
                            updatedSteps[index] = updatedStep;
                            setSelectedConfig(prev => ({
                              ...prev!,
                              processing_steps: updatedSteps
                            }));
                          }}
                          helperText={`Definiert, wie Schritt "${step.name}" ausgeführt wird`}
                        />
                        
                        {/* Step description based on type */}
                        <Box sx={{ mt: 2, p: 1, bgcolor: 'info.lighter', borderRadius: 1 }}>
                          <Typography variant="body2" color="info.dark">
                            <strong>Funktion:</strong> {getStepDescription(step.id)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Add warning if context_search is disabled */}
                  {!selectedConfig.processing_steps.find(s => s.id === 'context_search')?.enabled && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Vector Store Ergebnisse nicht verfügbar
                      </Typography>
                      <Typography variant="body2">
                        Der Schritt "Context Search" ist deaktiviert. Ohne diesen Schritt werden keine QDrant Vector Store Ergebnisse in den Tests angezeigt.
                      </Typography>
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={() => selectedConfig && handleOpenTestModal(selectedConfig.id)}
            variant="outlined"
            disabled={loading}
            startIcon={<PlayArrowIcon />}
          >
            Testen
          </Button>
          <Button 
            onClick={handleSaveConfiguration} 
            variant="contained"
            disabled={loading}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Configuration Dialog */}
      <Dialog 
        open={testDialogOpen} 
        onClose={() => setTestDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Konfiguration testen
          {testConfigId && (
            <Typography variant="body2" color="text.secondary">
              {configurations.find(c => c.id === testConfigId)?.name || 'Unbekannte Konfiguration'}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Testanfrage"
            placeholder="Geben Sie hier Ihre Testfrage ein..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          {testResponse && (
            <Box sx={{ mt: 2 }}>
              {/* Response Section */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Generierte Antwort:</Typography>
                  <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {testResponse.generatedResponse}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Verarbeitungszeit: {testResponse.responseTimeMs}ms | 
                    Erfolg: {testResponse.success ? 'Ja' : 'Nein'}
                    {testResponse.errorMessage && ` | Fehler: ${testResponse.errorMessage}`}
                  </Typography>
                </CardContent>
              </Card>

              {/* Search Queries Section */}
              {testResponse.searchQueries && testResponse.searchQueries.length > 0 && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Verwendete Suchanfragen:</Typography>
                    {testResponse.searchQueries.map((query: string, index: number) => (
                      <Chip key={index} label={query} sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Iterations Section - New detailed view */}
              {testResponse.iterations && testResponse.iterations.length > 0 && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Iterationen: {testResponse.iterationCount} von {3}
                      {testResponse.finalConfidence && (
                        <Chip 
                          label={`Vertrauen: ${(testResponse.finalConfidence * 100).toFixed(1)}%`}
                          size="small"
                          color={testResponse.finalConfidence > 0.8 ? 'success' : testResponse.finalConfidence > 0.6 ? 'primary' : 'warning'}
                          sx={{ ml: 2 }}
                        />
                      )}
                    </Typography>
                    {testResponse.iterations.map((iteration: any, iterIndex: number) => (
                      <Accordion key={iterIndex} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                              Iteration {iteration.iteration}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip 
                                label={`${iteration.duration}ms`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip 
                                label={`Vertrauen: ${(iteration.confidence * 100).toFixed(1)}%`}
                                size="small"
                                color={iteration.confidence > 0.8 ? 'success' : iteration.confidence > 0.6 ? 'primary' : 'warning'}
                              />
                              {!iteration.shouldContinue && (
                                <Chip 
                                  label="Final"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.main' }}>
                              Query: "{iteration.query}"
                            </Typography>
                            
                            {/* Steps within this iteration */}
                            {iteration.steps && iteration.steps.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Verarbeitungsschritte:</Typography>
                                {iteration.steps.map((step: any, stepIndex: number) => (
                                  <Accordion key={stepIndex} sx={{ mb: 1, ml: 2 }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                          {step.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                          <Typography variant="caption">
                                            {step.duration || 0}ms
                                          </Typography>
                                          <Chip 
                                            label={step.success ? 'Erfolg' : 'Fehler'}
                                            size="small"
                                            color={step.success ? 'success' : 'error'}
                                            variant="outlined"
                                          />
                                        </Box>
                                      </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      {/* Special handling for Context Search step to show vector results */}
                                      {step.step === 'context_search' && step.output?.searchDetails && (
                                        <Box>
                                          <Typography variant="subtitle2" gutterBottom>Vector Search Results:</Typography>
                                          {step.output.searchDetails.map((searchDetail: any, searchIndex: number) => (
                                            <Box key={searchIndex} sx={{ mb: 3 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                                                Query: "{searchDetail.query}" ({searchDetail.resultsCount} results)
                                              </Typography>
                                              {searchDetail.results && searchDetail.results.length > 0 ? (
                                                <Box sx={{ ml: 2 }}>
                                                  {searchDetail.results.map((result: any, resultIndex: number) => (
                                                    <Card key={resultIndex} sx={{ mb: 2, bgcolor: 'grey.50' }}>
                                                      <CardContent sx={{ py: 2 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                            {result.title || result.source || `Result ${resultIndex + 1}`}
                                                          </Typography>
                                                          <Chip 
                                                            label={`Score: ${(result.score || 0).toFixed(3)}`}
                                                            size="small"
                                                            color={result.score > 0.8 ? 'success' : result.score > 0.6 ? 'primary' : 'default'}
                                                          />
                                                        </Box>
                                                        <Typography variant="body2" sx={{ 
                                                          mb: 1, 
                                                          fontSize: '13px',
                                                          color: 'text.secondary'
                                                        }}>
                                                          Source: {result.source} 
                                                          {result.chunk_index !== undefined && ` • Chunk: ${result.chunk_index}`}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ 
                                                          fontSize: '14px',
                                                          lineHeight: 1.4,
                                                          maxHeight: 80,
                                                          overflow: 'hidden',
                                                          bgcolor: 'white',
                                                          p: 1,
                                                          borderRadius: 1,
                                                          border: '1px solid',
                                                          borderColor: 'grey.200'
                                                        }}>
                                                          {result.content || result.text || 'No content available'}
                                                        </Typography>
                                                        {result.content && result.content.length > 300 && (
                                                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                            Content preview (first 300 chars)
                                                          </Typography>
                                                        )}
                                                      </CardContent>
                                                    </Card>
                                                  ))}
                                                </Box>
                                              ) : (
                                                <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic' }}>
                                                  No results found for this query
                                                </Typography>
                                              )}
                                            </Box>
                                          ))}
                                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Search Summary:</Typography>
                                          <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                                            <Typography variant="caption">
                                              Total results: {step.output.totalResultsFound} | 
                                              Unique results: {step.output.uniqueResultsUsed} | 
                                              Score threshold: {step.output.scoreThreshold} | 
                                              Avg score: {(step.output.avgScore || 0).toFixed(3)}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      )}
                                      
                                      {/* Show step input/output for non-context-search steps */}
                                      {step.step !== 'context_search' && (
                                        <Box>
                                          {step.input && (
                                            <Box sx={{ mb: 2 }}>
                                              <Typography variant="subtitle2" gutterBottom>Eingabe:</Typography>
                                              <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '150px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
                                              </pre>
                                            </Box>
                                          )}
                                          {step.output && (
                                            <Box>
                                              <Typography variant="subtitle2" gutterBottom>Ausgabe:</Typography>
                                              <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                {JSON.stringify(step.output, null, 2)}
                                              </pre>
                                            </Box>
                                          )}
                                          {step.errorMessage && (
                                            <Box sx={{ mt: 1 }}>
                                              <Typography variant="subtitle2" color="error" gutterBottom>Fehler:</Typography>
                                              <Typography variant="body2" color="error" sx={{ bgcolor: 'error.lighter', p: 1, borderRadius: 1 }}>
                                                {step.errorMessage}
                                              </Typography>
                                            </Box>
                                          )}
                                        </Box>
                                      )}
                                    </AccordionDetails>
                                  </Accordion>
                                ))}
                              </Box>
                            )}
                            
                            {/* Final answer for this iteration */}
                            {iteration.finalAnswer && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Finale Antwort:</Typography>
                                <Typography variant="body2" sx={{ 
                                  bgcolor: 'primary.lighter', 
                                  p: 2, 
                                  borderRadius: 1,
                                  maxHeight: 200,
                                  overflow: 'auto',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {iteration.finalAnswer}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Legacy Processing Steps Section - for backward compatibility */}
              {testResponse.processingSteps && testResponse.processingSteps.length > 0 && !testResponse.iterations && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Verarbeitungsschritte (Legacy):</Typography>
                    {testResponse.processingSteps.map((step: any, index: number) => (
                      <Accordion key={index} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                              {step.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {step.processingTimeMs || 0}ms
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {/* Special handling for Context Search step to show vector results */}
                          {step.name === 'Context Search' && step.output?.searchDetails && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>Vector Search Results:</Typography>
                              {step.output.searchDetails.map((searchDetail: any, searchIndex: number) => (
                                <Box key={searchIndex} sx={{ mb: 3 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                                    Query: "{searchDetail.query}" ({searchDetail.resultsCount} results)
                                  </Typography>
                                  {searchDetail.results && searchDetail.results.length > 0 ? (
                                    <Box sx={{ ml: 2 }}>
                                      {searchDetail.results.map((result: any, resultIndex: number) => (
                                        <Card key={resultIndex} sx={{ mb: 2, bgcolor: 'grey.50' }}>
                                          <CardContent sx={{ py: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                {result.title || result.source || `Result ${resultIndex + 1}`}
                                              </Typography>
                                              <Chip 
                                                label={`Score: ${(result.score || 0).toFixed(3)}`}
                                                size="small"
                                                color={result.score > 0.8 ? 'success' : result.score > 0.6 ? 'primary' : 'default'}
                                              />
                                            </Box>
                                            <Typography variant="body2" sx={{ 
                                              mb: 1, 
                                              fontSize: '13px',
                                              color: 'text.secondary'
                                            }}>
                                              Source: {result.source} 
                                              {result.chunk_index !== undefined && ` • Chunk: ${result.chunk_index}`}
                                            </Typography>
                                            <Typography variant="body2" sx={{ 
                                              fontSize: '14px',
                                              lineHeight: 1.4,
                                              maxHeight: 80,
                                              overflow: 'hidden',
                                              bgcolor: 'white',
                                              p: 1,
                                              borderRadius: 1,
                                              border: '1px solid',
                                              borderColor: 'grey.200'
                                            }}>
                                              {result.content || result.text || 'No content available'}
                                            </Typography>
                                            {result.content && result.content.length > 300 && (
                                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                Content preview (first 300 chars)
                                              </Typography>
                                            )}
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontStyle: 'italic' }}>
                                      No results found for this query
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Search Summary:</Typography>
                              <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                                <Typography variant="caption">
                                  Total results: {step.output.totalResultsFound} | 
                                  Unique results: {step.output.uniqueResultsUsed} | 
                                  Score threshold: {step.output.scoreThreshold} | 
                                  Avg score: {(step.output.avgScore || 0).toFixed(3)}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Default output for other steps */}
                          {step.name !== 'Context Search' && step.output && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>Ausgabe:</Typography>
                              <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Context Used Section */}
              {testResponse.contextUsed && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Verwendeter Kontext:</Typography>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" color="text.secondary">
                          Kontextlänge: {testResponse.contextUsed.length} Zeichen
                          {testResponse.contextUsed.length > 2000 && ' (Klicken zum Erweitern)'}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" sx={{ 
                          maxHeight: 400, 
                          overflow: 'auto', 
                          bgcolor: 'grey.50', 
                          p: 2, 
                          borderRadius: 1,
                          fontSize: '13px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.4,
                          fontFamily: 'monospace'
                        }}>
                          {testResponse.contextUsed}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Schließen</Button>
          <Button 
            onClick={() => handleTestConfiguration()} 
            variant="contained"
            disabled={loading || !testQuery.trim()}
            startIcon={<PlayArrowIcon />}
          >
            Test durchführen
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminChatConfiguration;
