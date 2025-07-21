import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Slider,
  Alert,
  LinearProgress,
  Divider,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Storage as StorageIcon,
  SmartToy as AIIcon,
  Tag as TagIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface WorkspaceSettingsData {
  ai_context_enabled: boolean;
  auto_tag_enabled: boolean;
  storage_used_mb: number;
  storage_limit_mb: number;
  settings: {
    default_ai_context: boolean;
    auto_process_documents: boolean;
    notification_preferences: {
      processing_complete: boolean;
      storage_warnings: boolean;
    };
  };
}

interface WorkspaceSettingsProps {
  onStatsUpdate: () => void;
}

const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ onStatsUpdate }) => {
  const [settings, setSettings] = useState<WorkspaceSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workspace/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      
      // Ensure nested objects exist with default values
      const normalizedData = {
        ...data,
        settings: {
          default_ai_context: false,
          auto_process_documents: true,
          notification_preferences: {
            processing_complete: true,
            storage_warnings: true,
            ...data.settings?.notification_preferences,
          },
          ...data.settings,
        }
      };
      
      setSettings(normalizedData);
    } catch (err) {
      showSnackbar('Fehler beim Laden der Einstellungen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (key: keyof WorkspaceSettingsData, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [key]: value
    });
  };

  const handleNestedSettingsChange = (parentKey: string, childKey: string, value: any) => {
    if (!settings) return;

    if (childKey === '') {
      // Direct update to parent key
      setSettings({
        ...settings,
        settings: {
          ...settings.settings,
          [parentKey]: value
        }
      });
    } else {
      // Nested update
      const parentValue = settings.settings?.[parentKey as keyof typeof settings.settings];
      setSettings({
        ...settings,
        settings: {
          ...settings.settings,
          [parentKey]: {
            ...(typeof parentValue === 'object' && parentValue !== null ? parentValue : {}),
            [childKey]: value
          }
        }
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workspace/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      showSnackbar('Einstellungen erfolgreich gespeichert', 'success');
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Speichern der Einstellungen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workspace/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete workspace data');
      }

      showSnackbar('Alle Workspace-Daten wurden gelöscht', 'success');
      setIsDeleteDialogOpen(false);
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Löschen der Workspace-Daten', 'error');
    }
  };

  const formatStorageSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(1)} KB`;
    }
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  const getStoragePercentage = () => {
    if (!settings) return 0;
    return (settings.storage_used_mb / settings.storage_limit_mb) * 100;
  };

  const getStorageColor = () => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'primary';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (!settings) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Fehler beim Laden der Einstellungen
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Workspace-Einstellungen
      </Typography>

      <Grid container spacing={3}>
        {/* Storage Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="primary" />
                Speicher-Verwaltung
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Speicherplatz verwendet
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={getStoragePercentage()}
                  color={getStorageColor()}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2">
                  {formatStorageSize(settings.storage_used_mb)} von {formatStorageSize(settings.storage_limit_mb)}
                </Typography>
              </Box>

              {getStoragePercentage() >= 90 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Ihr Speicherplatz ist fast voll. Löschen Sie nicht benötigte Dokumente oder kontaktieren Sie den Support für mehr Speicherplatz.
                  </Typography>
                </Alert>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Speicher-Limit: {formatStorageSize(settings.storage_limit_mb)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon color="primary" />
                KI-Einstellungen
              </Typography>

              <List>
                <ListItem>
                  <ListItemText
                    primary="KI-Kontext aktiviert"
                    secondary="Ermöglicht der KI den Zugriff auf Ihre Dokumente für bessere Antworten"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.ai_context_enabled}
                      onChange={(e) => handleSettingsChange('ai_context_enabled', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Automatisches Tagging"
                    secondary="Erstellt automatisch Tags für Notizen und Dokumente"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.auto_tag_enabled}
                      onChange={(e) => handleSettingsChange('auto_tag_enabled', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Standard KI-Kontext für neue Dokumente"
                    secondary="Neue Dokumente werden automatisch für KI-Kontext aktiviert"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.settings?.default_ai_context || false}
                      onChange={(e) => handleNestedSettingsChange('default_ai_context', '', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Automatische Dokument-Verarbeitung"
                    secondary="Dokumente werden automatisch nach dem Upload verarbeitet"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.settings?.auto_process_documents || true}
                      onChange={(e) => handleNestedSettingsChange('auto_process_documents', '', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" />
                Benachrichtigungseinstellungen
              </Typography>

              <List>
                <ListItem>
                  <ListItemText
                    primary="Verarbeitungsabschluss"
                    secondary="Benachrichtigung, wenn Dokumente fertig verarbeitet wurden"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.settings?.notification_preferences?.processing_complete || false}
                      onChange={(e) => handleNestedSettingsChange('notification_preferences', 'processing_complete', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Speicher-Warnungen"
                    secondary="Benachrichtigung bei geringem Speicherplatz"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.settings?.notification_preferences?.storage_warnings || false}
                      onChange={(e) => handleNestedSettingsChange('notification_preferences', 'storage_warnings', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Management */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Daten-Verwaltung
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Diese Aktionen sind unwiderruflich. Stellen Sie sicher, dass Sie alle wichtigen Daten gesichert haben.
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  startIcon={<DeleteIcon />}
                >
                  Alle Workspace-Daten löschen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSaveSettings}
          disabled={saving}
          size="large"
        >
          {saving ? 'Speichern...' : 'Einstellungen speichern'}
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Alle Workspace-Daten löschen</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Diese Aktion ist unwiderruflich!
          </Alert>
          <Typography variant="body1" paragraph>
            Sind Sie sicher, dass Sie alle Ihre Workspace-Daten löschen möchten? 
            Dies umfasst:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Alle hochgeladenen Dokumente" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Alle erstellten Notizen" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Alle Workspace-Einstellungen" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Alle Vector-Datenbank-Einträge" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDeleteAllData}
            color="error"
            variant="contained"
          >
            Alle Daten löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceSettings;
