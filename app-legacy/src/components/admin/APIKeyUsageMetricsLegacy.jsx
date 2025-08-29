import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import apiClient from '../../services/apiClient';
import { useSnackbar } from '../../contexts/SnackbarContext';

const APIKeyUsageMetricsLegacy = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetKeyType, setResetKeyType] = useState('all');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configValues, setConfigValues] = useState({
    dailyLimit: 100,
    minuteLimit: 10
  });
  
  const { showSnackbar } = useSnackbar();
  
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/api-keys/usage');
      console.log('API Response:', JSON.stringify(response, null, 2));
      console.log('API Response type:', typeof response);
      console.log('API Response has data property:', response.hasOwnProperty('data'));
      
      // In manchen Fällen gibt apiClient das Ergebnis direkt zurück, in anderen Fällen in response.data
      const responseData = response.data !== undefined ? response.data : response;
      
      console.log('Response data to process:', JSON.stringify(responseData, null, 2));
      console.log('Response data type:', typeof responseData);
      
      // More flexible defensive programming to handle different response structures
      // Option 1: The expected structure (responseData.metrics exists)
      // Option 2: The metrics are directly on the responseData
      // Option 3: The metrics are nested differently
      
      let metricsObject = null;
      let hasValidStructure = false;
      
      // Case 1: Standard structure with responseData.metrics
      if (responseData && responseData.metrics && typeof responseData.metrics === 'object') {
        console.log('Found standard metrics structure with responseData.metrics');
        metricsObject = responseData.metrics;
        hasValidStructure = true;
      } 
      // Case 2: Metrics directly on responseData
      else if (responseData && responseData.free && responseData.paid) {
        console.log('Found metrics directly on responseData');
        metricsObject = responseData;
        hasValidStructure = true;
      }
      // Case 3: Nested in a different way - check for metrics property anywhere in the object
      else if (responseData) {
        console.log('Searching for metrics in response...');
        for (const key in responseData) {
          if (responseData[key] && 
              typeof responseData[key] === 'object' && 
              responseData[key].free && 
              responseData[key].paid) {
            console.log('Found metrics nested in property:', key);
            metricsObject = responseData[key];
            hasValidStructure = true;
            break;
          }
        }
      }
      
      if (hasValidStructure && metricsObject) {
        console.log('Using metrics object:', JSON.stringify(metricsObject, null, 2));
        
        // Create a complete metrics object to avoid any undefined references
        const safeMetrics = {
          free: {
            dailyUsage: metricsObject.free?.dailyUsage || {},
            totalUsage: metricsObject.free?.totalUsage || 0,
            currentDayUsage: metricsObject.free?.currentDayUsage || 0,
            quotaLimit: metricsObject.free?.quotaLimit || 100
          },
          paid: {
            dailyUsage: metricsObject.paid?.dailyUsage || {},
            totalUsage: metricsObject.paid?.totalUsage || 0,
            currentDayUsage: metricsObject.paid?.currentDayUsage || 0
          },
          // New: providers (Gemini/Mistral)
          providers: {
            gemini: {
              dailyUsage: metricsObject.providers?.gemini?.dailyUsage || {},
              totalUsage: metricsObject.providers?.gemini?.totalUsage || 0,
              currentDayUsage: metricsObject.providers?.gemini?.currentDayUsage || 0
            },
            mistral: {
              dailyUsage: metricsObject.providers?.mistral?.dailyUsage || {},
              totalUsage: metricsObject.providers?.mistral?.totalUsage || 0,
              currentDayUsage: metricsObject.providers?.mistral?.currentDayUsage || 0
            }
          },
          summary: {
            currentDay: metricsObject.summary?.currentDay || new Date().toISOString().split('T')[0],
            costSavings: {
              totalFreeRequests: metricsObject.summary?.costSavings?.totalFreeRequests || 0,
              costSavingsUSD: metricsObject.summary?.costSavings?.costSavingsUSD || "0.00",
              costSavingsEUR: metricsObject.summary?.costSavings?.costSavingsEUR || "0.00"
            }
          }
        };
        
        console.log('Setting normalized metrics data:', safeMetrics);
        setMetrics(safeMetrics);
        
        // Bereite Daten für Diagramme vor
        prepareChartData(safeMetrics);
        
        setError(null);
      } else {
        console.error('Invalid metrics data structure:', responseData);
        if (responseData) {
          console.log('Available keys in response:', Object.keys(responseData));
          
          // Last resort attempt to use any available data
          if (responseData.data && typeof responseData.data === 'object') {
            console.log('Attempting to use responseData.data as fallback');
            try {
              const fallbackMetrics = {
                free: {
                  dailyUsage: {},
                  totalUsage: 0,
                  currentDayUsage: 0,
                  quotaLimit: 100
                },
                paid: {
                  dailyUsage: {},
                  totalUsage: 0,
                  currentDayUsage: 0
                },
                providers: {
                  gemini: { dailyUsage: {}, totalUsage: 0, currentDayUsage: 0 },
                  mistral: { dailyUsage: {}, totalUsage: 0, currentDayUsage: 0 }
                },
                summary: {
                  currentDay: new Date().toISOString().split('T')[0],
                  costSavings: {
                    totalFreeRequests: 0,
                    costSavingsUSD: "0.00",
                    costSavingsEUR: "0.00"
                  }
                }
              };
              
              // Try to populate with any data we can find
              if (responseData.data.free) fallbackMetrics.free = {...fallbackMetrics.free, ...responseData.data.free};
              if (responseData.data.paid) fallbackMetrics.paid = {...fallbackMetrics.paid, ...responseData.data.paid};
              if (responseData.data.providers) fallbackMetrics.providers = {...fallbackMetrics.providers, ...responseData.data.providers};
              if (responseData.data.summary) fallbackMetrics.summary = {...fallbackMetrics.summary, ...responseData.data.summary};
              
              console.log('Using fallback metrics:', fallbackMetrics);
              setMetrics(fallbackMetrics);
              prepareChartData(fallbackMetrics);
              setError(null);
              return;
            } catch (err) {
              console.error('Error using fallback data:', err);
            }
          }
        }
        
        setError('Ungültiges Datenformat der API-Antwort. Bitte die Konsole für Details prüfen.');
        showSnackbar('Fehler: Unerwartetes Datenformat', 'error');
      }
    } catch (err) {
      console.error('Error fetching API key metrics:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der API-Schlüssel-Metriken');
      showSnackbar('Fehler beim Laden der Metriken', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const prepareChartData = (metricsData) => {
    if (!metricsData) {
      console.log('No metrics data provided');
      setChartData([]);
      return;
    }
    
    if (!metricsData.free || !metricsData.paid) {
      console.log('Invalid metrics data structure:', metricsData);
      setChartData([]);
      return;
    }
    
    // Für Balkendiagramm - Tägliche Nutzung
    const dailyData = [];
    const freeDailyUsage = metricsData.free.dailyUsage || {};
    const paidDailyUsage = metricsData.paid.dailyUsage || {};
    
    // Alle Tage aus beiden Schlüsseln zusammenführen
    const allDays = [...new Set([
      ...Object.keys(freeDailyUsage),
      ...Object.keys(paidDailyUsage)
    ])].sort();
    
    // Letzte 14 Tage anzeigen
    const recentDays = allDays.slice(-14);
    
    recentDays.forEach(day => {
      dailyData.push({
        day: day.split('-').slice(1).join('/'), // Format: MM/DD
        kostenlos: freeDailyUsage[day] || 0,
        bezahlt: paidDailyUsage[day] || 0
      });
    });
    
    console.log('Chart data prepared:', dailyData);
    setChartData(dailyData);
  };
  
  const handleResetMetrics = async () => {
    try {
      const response = await apiClient.post('/admin/api-keys/usage/reset', {
        keyType: resetKeyType
      });
      
      if (response.data && response.data.currentMetrics) {
        // Create a safe metrics object with defaults for any missing values
        const safeMetrics = {
          free: {
            dailyUsage: response.data.currentMetrics.free?.dailyUsage || {},
            totalUsage: response.data.currentMetrics.free?.totalUsage || 0,
            currentDayUsage: response.data.currentMetrics.free?.currentDayUsage || 0,
            quotaLimit: response.data.currentMetrics.free?.quotaLimit || 100
          },
          paid: {
            dailyUsage: response.data.currentMetrics.paid?.dailyUsage || {},
            totalUsage: response.data.currentMetrics.paid?.totalUsage || 0,
            currentDayUsage: response.data.currentMetrics.paid?.currentDayUsage || 0
          },
          providers: {
            gemini: {
              dailyUsage: response.data.currentMetrics.providers?.gemini?.dailyUsage || {},
              totalUsage: response.data.currentMetrics.providers?.gemini?.totalUsage || 0,
              currentDayUsage: response.data.currentMetrics.providers?.gemini?.currentDayUsage || 0
            },
            mistral: {
              dailyUsage: response.data.currentMetrics.providers?.mistral?.dailyUsage || {},
              totalUsage: response.data.currentMetrics.providers?.mistral?.totalUsage || 0,
              currentDayUsage: response.data.currentMetrics.providers?.mistral?.currentDayUsage || 0
            }
          },
          summary: {
            currentDay: response.data.currentMetrics.summary?.currentDay || new Date().toISOString().split('T')[0],
            costSavings: {
              totalFreeRequests: response.data.currentMetrics.summary?.costSavings?.totalFreeRequests || 0,
              costSavingsUSD: response.data.currentMetrics.summary?.costSavings?.costSavingsUSD || "0.00",
              costSavingsEUR: response.data.currentMetrics.summary?.costSavings?.costSavingsEUR || "0.00"
            }
          }
        };
        
        setMetrics(safeMetrics);
        prepareChartData(safeMetrics);
      } else {
        // Fallback to fetch metrics if no currentMetrics in response
        await fetchMetrics();
      }
      
      showSnackbar(
        `Nutzungsstatistiken für ${resetKeyType === 'free' ? 'kostenlose' : resetKeyType === 'paid' ? 'bezahlte' : 'alle'} API-Schlüssel zurückgesetzt`, 
        'success'
      );
    } catch (err) {
      console.error('Error resetting metrics:', err);
      showSnackbar('Fehler beim Zurücksetzen der Metriken', 'error');
    } finally {
      setResetDialogOpen(false);
    }
  };
  
  const handleConfigSave = async () => {
    try {
      const response = await apiClient.post('/admin/api-keys/config', configValues);
      
      showSnackbar('API-Schlüssel-Konfiguration aktualisiert', 'success');
      
      // Aktualisiere lokale Konfiguration
      setConfigValues({
        dailyLimit: response.data.currentConfig.dailyLimit,
        minuteLimit: response.data.currentConfig.minuteLimit
      });
      
      // Aktualisiere Metriken
      fetchMetrics();
    } catch (err) {
      console.error('Error updating config:', err);
      showSnackbar('Fehler beim Aktualisieren der Konfiguration', 'error');
    } finally {
      setConfigDialogOpen(false);
    }
  };
  
  useEffect(() => {
    fetchMetrics();
    
    // Konfiguration initial abrufen
    const getInitialConfig = async () => {
      try {
        const response = await apiClient.get('/admin/api-keys/usage');
        console.log('API Response for config:', JSON.stringify(response, null, 2));
        
        // Default quota limit to use if not found
        const DEFAULT_QUOTA_LIMIT = 100;
        
        // Process the response to find the quota limit regardless of structure
        let quotaLimit = DEFAULT_QUOTA_LIMIT;
        
        // Helper function to search for quota limit in an object
        const findQuotaLimit = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          
          // Direct check
          if (obj.quotaLimit && typeof obj.quotaLimit === 'number') {
            return obj.quotaLimit;
          }
          
          // Check for free.quotaLimit
          if (obj.free && obj.free.quotaLimit && typeof obj.free.quotaLimit === 'number') {
            return obj.free.quotaLimit;
          }
          
          // Check for metrics.free.quotaLimit
          if (obj.metrics && obj.metrics.free && obj.metrics.free.quotaLimit && 
              typeof obj.metrics.free.quotaLimit === 'number') {
            return obj.metrics.free.quotaLimit;
          }
          
          // Recursive search for deeper objects
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
              const found = findQuotaLimit(obj[key]);
              if (found !== null) return found;
            }
          }
          
          return null;
        };
        
        // Try to find the quota limit in the response
        const foundLimit = findQuotaLimit(response);
        if (foundLimit !== null) {
          console.log('Found quota limit in response:', foundLimit);
          quotaLimit = foundLimit;
        } else {
          console.log('Using default quota limit:', DEFAULT_QUOTA_LIMIT);
        }
        
        console.log('Setting config values with quota limit:', quotaLimit);
        setConfigValues({
          dailyLimit: quotaLimit,
          minuteLimit: 10 // Default falls nicht verfügbar
        });
      } catch (err) {
        console.error('Error getting initial config:', err);
        // Set defaults in case of error
        setConfigValues({
          dailyLimit: 100,
          minuteLimit: 10
        });
      }
    };
    
    getInitialConfig();
  }, []);
  
  // Farbpalette für Diagramme
  const PROVIDER_COLORS = ['#1976D2', '#9C27B0'];
  
  // Berechne Prozentsatz der Verwendung des kostenlosen Schlüssels
  const calculateFreeKeyPercentage = () => {
    if (!metrics) return 0;
    
    // Safe access with defaults
    const freeUsage = metrics.free?.totalUsage || 0;
    const paidUsage = metrics.paid?.totalUsage || 0;
    const total = freeUsage + paidUsage;
    
    return total > 0 ? Math.round((freeUsage / total) * 100) : 0;
  };
  
  // New: Provider Pie-Chart-Daten (Gemini vs Mistral)
  const getProviderPieData = () => {
    if (!metrics || !metrics.providers) return [];
    const gemini = metrics.providers.gemini?.totalUsage || 0;
    const mistral = metrics.providers.mistral?.totalUsage || 0;
    const data = [];
    if (gemini > 0) data.push({ name: 'Gemini', value: gemini });
    if (mistral > 0) data.push({ name: 'Mistral', value: mistral });
    return data.length ? data : [
      { name: 'Gemini', value: 0 },
      { name: 'Mistral', value: 0 }
    ];
  };
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          API-Schlüssel Nutzungsstatistiken
        </Typography>
        
        <Box>
          <Tooltip title="Einstellungen">
            <IconButton onClick={() => setConfigDialogOpen(true)} sx={{ mr: 1 }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Aktualisieren">
            <IconButton onClick={fetchMetrics}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : metrics && metrics.free && metrics.paid ? (
        <>
          {/* Zusammenfassung */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Kostenloser Schlüssel
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {metrics?.free?.totalUsage || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesamte Anfragen
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Heute: {metrics?.free?.currentDayUsage || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Bezahlter Schlüssel
                  </Typography>
                  <Typography variant="h4" color="secondary">
                    {metrics?.paid?.totalUsage || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesamte Anfragen
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Heute: {metrics?.paid?.currentDayUsage || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Kosteneffizienz
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {calculateFreeKeyPercentage()}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nutzung des kostenlosen Schlüssels
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Einsparung: ~{metrics?.summary?.costSavings?.costSavingsEUR || '0.00'}€
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* LLM Provider Zusammenfassung */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                LLM-Provider Nutzung
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Gemini
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#1976D2' }}>
                    {metrics?.providers?.gemini?.totalUsage || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesamte Anfragen
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Heute: {metrics?.providers?.gemini?.currentDayUsage || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Mistral
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#9C27B0' }}>
                    {metrics?.providers?.mistral?.totalUsage || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesamte Anfragen
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Heute: {metrics?.providers?.mistral?.currentDayUsage || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Diagramme */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tägliche Nutzung
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="kostenlos" name="Kostenloser Schlüssel" fill="#4CAF50" />
                      <Bar dataKey="bezahlt" name="Bezahlter Schlüssel" fill="#FFC107" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Verteilung LLM-Provider
                </Typography>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                  {getProviderPieData().length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <Pie
                          data={getProviderPieData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {getProviderPieData().map((entry, index) => (
                            <Cell key={`provider-cell-${index}`} fill={PROVIDER_COLORS[index % PROVIDER_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine Daten für die Diagrammanzeige verfügbar
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Detaillierte Daten */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Detaillierte Nutzungsdaten
              </Typography>
              <Button 
                variant="outlined" 
                color="secondary" 
                startIcon={<DeleteIcon />}
                onClick={() => setResetDialogOpen(true)}
              >
                Zurücksetzen
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />              <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Datum</TableCell>
                    <TableCell align="right">Kostenloser Schlüssel</TableCell>
                    <TableCell align="right">Bezahlter Schlüssel</TableCell>
                    <TableCell align="right">Gesamt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.keys((metrics?.free?.dailyUsage || {}))
                    .sort((a, b) => b.localeCompare(a)) // Neueste zuerst
                    .slice(0, 10) // Nur die letzten 10 Tage
                    .map(day => {
                      const freeUsage = metrics?.free?.dailyUsage?.[day] || 0;
                      const paidUsage = metrics?.paid?.dailyUsage?.[day] || 0;
                      const total = freeUsage + paidUsage;
                      
                      // Parse date safely
                      let displayDate = day;
                      try {
                        if (day && day.split('-').length >= 3) {
                          displayDate = new Date(
                            parseInt(day.split('-')[0]), 
                            parseInt(day.split('-')[1]) - 1, 
                            parseInt(day.split('-')[2])
                          ).toLocaleDateString('de-DE');
                        }
                      } catch (e) {
                        console.error('Error parsing date:', e);
                        // Use the original day string as fallback
                      }
                      
                      return (
                        <TableRow key={day}>
                          <TableCell component="th" scope="row">
                            {displayDate}
                          </TableCell>
                          <TableCell align="right">{freeUsage}</TableCell>
                          <TableCell align="right">{paidUsage}</TableCell>
                          <TableCell align="right">{total}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Limits und Konfiguration */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Aktuelle Limits
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1">
                Tägliches Limit (Kostenloser Schlüssel): <b>{metrics?.free?.quotaLimit || 'N/A'}</b> Anfragen
              </Typography>
              <Button 
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={() => setConfigDialogOpen(true)}
              >
                Limits konfigurieren
              </Button>
            </Box>
          </Paper>
        </>
      ) : (
        <Alert severity="info">
          Keine Daten verfügbar. Beginnen Sie mit der Nutzung der API-Schlüssel, um Metriken zu sammeln.
        </Alert>
      )}

      {/* Reset-Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Nutzungsstatistiken zurücksetzen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie die Nutzungsstatistiken wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              label="Zurückzusetzende Statistiken"
              value={resetKeyType}
              onChange={(e) => setResetKeyType(e.target.value)}
              fullWidth
            >
              <option value="all">Alle Schlüssel</option>
              <option value="free">Nur kostenloser Schlüssel</option>
              <option value="paid">Nur bezahlter Schlüssel</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleResetMetrics} color="error">
            Zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Konfigurations-Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)}>
        <DialogTitle>API-Schlüssel-Konfiguration</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Konfigurieren Sie die Limits für den kostenlosen API-Schlüssel.
          </DialogContentText>
          <TextField
            label="Tägliches Limit"
            type="number"
            value={configValues.dailyLimit}
            onChange={(e) => setConfigValues({ ...configValues, dailyLimit: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Minütliches Limit"
            type="number"
            value={configValues.minuteLimit}
            onChange={(e) => setConfigValues({ ...configValues, minuteLimit: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleConfigSave} color="primary" startIcon={<SaveIcon />}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APIKeyUsageMetricsLegacy;
