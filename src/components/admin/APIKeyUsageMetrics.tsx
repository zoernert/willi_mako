import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
import Grid from '@mui/material/GridLegacy';
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
import axios from 'axios';
import { useSnackbar } from 'notistack';

interface UsageMetrics {
  quotaLimit?: number;
  minuteLimit?: number;
  totalUsage: number;
  currentDayUsage: number;
  dailyUsage?: Record<string, number>;
}

interface CostSavingsSummary {
  costSavingsEUR?: string;
  totalFreeRequests?: number;
}

interface MetricsSummary {
  currentDay?: string;
  costSavings?: CostSavingsSummary;
}

interface APIKeyMetrics {
  free: UsageMetrics;
  paid: UsageMetrics;
  summary: MetricsSummary;
}

interface DailyUsageDatum {
  day: string;
  kostenlos: number;
  bezahlt: number;
}

const APIKeyUsageMetrics = () => {
  const [metrics, setMetrics] = useState<APIKeyMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<DailyUsageDatum[]>([]);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetKeyType, setResetKeyType] = useState('all');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configValues, setConfigValues] = useState({
    dailyLimit: 100,
    minuteLimit: 10
  });
  
  const { enqueueSnackbar } = useSnackbar();
  
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/api-keys/usage');
      const payload = response.data.metrics as APIKeyMetrics;
      setMetrics(payload);

      // Bereite Daten für Diagramme vor
      prepareChartData(payload);
      
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching API key metrics:', err);
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message ?? 'Fehler beim Laden der API-Schlüssel-Metriken'
        : 'Fehler beim Laden der API-Schlüssel-Metriken';
      setError(message);
      enqueueSnackbar('Fehler beim Laden der Metriken', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const prepareChartData = (metricsData: APIKeyMetrics | null) => {
    if (!metricsData) return;

    const dailyData: DailyUsageDatum[] = [];
    const freeDailyUsage = metricsData.free.dailyUsage ?? {};
    const paidDailyUsage = metricsData.paid.dailyUsage ?? {};

    const allDays = [...new Set([...Object.keys(freeDailyUsage), ...Object.keys(paidDailyUsage)])].sort();
    const recentDays = allDays.slice(-14);

    recentDays.forEach((day) => {
      dailyData.push({
        day: day.split('-').slice(1).join('/'),
        kostenlos: freeDailyUsage[day] ?? 0,
        bezahlt: paidDailyUsage[day] ?? 0
      });
    });

    setChartData(dailyData);
  };
  
  const handleResetMetrics = async () => {
    try {
      const response = await axios.post('/api/admin/api-keys/usage/reset', {
        keyType: resetKeyType
      });
      
      const payload = response.data.currentMetrics as APIKeyMetrics;
      setMetrics(payload);
      prepareChartData(payload);
      
      enqueueSnackbar(
        `Nutzungsstatistiken für ${resetKeyType === 'free' ? 'kostenlose' : resetKeyType === 'paid' ? 'bezahlte' : 'alle'} API-Schlüssel zurückgesetzt`, 
        { variant: 'success' }
      );
    } catch (err: unknown) {
      console.error('Error resetting metrics:', err);
      enqueueSnackbar('Fehler beim Zurücksetzen der Metriken', { variant: 'error' });
    } finally {
      setResetDialogOpen(false);
    }
  };
  
  const handleConfigSave = async () => {
    try {
      const response = await axios.post('/api/admin/api-keys/config', configValues);
      
      enqueueSnackbar('API-Schlüssel-Konfiguration aktualisiert', { variant: 'success' });
      
      // Aktualisiere lokale Konfiguration
      const updatedConfig = response.data.currentConfig as { dailyLimit?: number; minuteLimit?: number };
      setConfigValues((prev) => ({
        dailyLimit: updatedConfig.dailyLimit ?? prev.dailyLimit,
        minuteLimit: updatedConfig.minuteLimit ?? prev.minuteLimit
      }));
      
      // Aktualisiere Metriken
      fetchMetrics();
    } catch (err: unknown) {
      console.error('Error updating config:', err);
      enqueueSnackbar('Fehler beim Aktualisieren der Konfiguration', { variant: 'error' });
    } finally {
      setConfigDialogOpen(false);
    }
  };
  
  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (metrics) {
      setConfigValues((prev) => ({
        dailyLimit: metrics.free.quotaLimit ?? prev.dailyLimit ?? 100,
        minuteLimit: metrics.free.minuteLimit ?? prev.minuteLimit ?? 10
      }));
    }
  }, [metrics]);
  
  const COLORS: readonly string[] = ['#8884d8', '#82ca9d'];
  
  if (loading && !metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !metrics) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  const pieData = metrics
    ? ([
        { name: 'Kostenlos', value: metrics.free.totalUsage },
        { name: 'Bezahlt', value: metrics.paid.totalUsage }
      ] satisfies Array<{ name: string; value: number }>)
    : [];
  
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          API-Schlüssel Nutzungsstatistik
        </Typography>
        <Box>
          <Tooltip title="Konfiguration">
            <IconButton color="primary" onClick={() => setConfigDialogOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Aktualisieren">
            <IconButton color="primary" onClick={fetchMetrics}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Zusammenfassung */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Zusammenfassung
              </Typography>
              <Typography variant="body1">
                Datum: {metrics?.summary.currentDay}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" gutterBottom>
                Kostenloser Schlüssel heute: {metrics?.free.currentDayUsage || 0} Anfragen
              </Typography>
              <Typography variant="body1" gutterBottom>
                Bezahlter Schlüssel heute: {metrics?.paid.currentDayUsage || 0} Anfragen
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" color="primary" fontWeight="bold">
                Geschätzte Einsparung: {metrics?.summary.costSavings?.costSavingsEUR || '0.00'} €
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Basierend auf {metrics?.summary.costSavings?.totalFreeRequests || 0} kostenfreien Anfragen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Tortendiagramm der Gesamtnutzung */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gesamtnutzung
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} Anfragen`, 'Nutzung']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setResetKeyType('all');
                    setResetDialogOpen(true);
                  }}
                >
                  Zurücksetzen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Gesamtnutzung pro Schlüssel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Gesamtnutzung pro Schlüssel
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Kostenloser Schlüssel:</strong> {metrics?.free.totalUsage || 0} Anfragen
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mb: 2 }}
                  onClick={() => {
                    setResetKeyType('free');
                    setResetDialogOpen(true);
                  }}
                >
                  Zurücksetzen
                </Button>
                
                <Typography variant="body1" gutterBottom>
                  <strong>Bezahlter Schlüssel:</strong> {metrics?.paid.totalUsage || 0} Anfragen
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => {
                    setResetKeyType('paid');
                    setResetDialogOpen(true);
                  }}
                >
                  Zurücksetzen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Tägliche Nutzung Diagramm */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tägliche Nutzung (letzte 14 Tage)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => [`${value} Anfragen`, '']} />
                    <Legend />
                    <Bar dataKey="kostenlos" name="Kostenloser Schlüssel" fill="#8884d8" />
                    <Bar dataKey="bezahlt" name="Bezahlter Schlüssel" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Rücksetzen-Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
      >
        <DialogTitle>
          Nutzungsstatistiken zurücksetzen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie die Nutzungsstatistiken für {
              resetKeyType === 'free' ? 'den kostenlosen Schlüssel' : 
              resetKeyType === 'paid' ? 'den bezahlten Schlüssel' : 
              'alle Schlüssel'
            } wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleResetMetrics} color="error" variant="contained">
            Zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Konfigurations-Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
      >
        <DialogTitle>
          API-Schlüssel Konfiguration
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Passen Sie die Limits für den kostenlosen API-Schlüssel an.
          </DialogContentText>
          <TextField
            label="Tägliches Limit"
            type="number"
            fullWidth
            variant="outlined"
            margin="normal"
            value={configValues.dailyLimit}
            onChange={(e) => setConfigValues({
              ...configValues,
              dailyLimit: parseInt(e.target.value) || 1
            })}
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Minütliches Limit"
            type="number"
            fullWidth
            variant="outlined"
            margin="normal"
            value={configValues.minuteLimit}
            onChange={(e) => setConfigValues({
              ...configValues,
              minuteLimit: parseInt(e.target.value) || 1
            })}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfigSave} 
            color="primary" 
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APIKeyUsageMetrics;
