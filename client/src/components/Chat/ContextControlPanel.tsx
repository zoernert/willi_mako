import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  Tooltip,
  IconButton,
  Collapse,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  WorkspacePremium as WorkspaceIcon,
  Description as DocumentIcon,
  StickyNote2 as NoteIcon,
  Public as SystemIcon,
} from '@mui/icons-material';
import { ContextSettings } from '../../services/chatApi';

interface ContextControlPanelProps {
  contextSettings: ContextSettings;
  onSettingsChange: (settings: ContextSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ContextControlPanel: React.FC<ContextControlPanelProps> = ({
  contextSettings,
  onSettingsChange,
  isOpen,
  onToggle,
}) => {
  const [tempSettings, setTempSettings] = useState<ContextSettings>(contextSettings);

  useEffect(() => {
    setTempSettings(contextSettings);
  }, [contextSettings]);

  const handleSettingChange = (setting: Partial<ContextSettings>) => {
    const newSettings = { ...tempSettings, ...setting };
    setTempSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      case 'disabled': return 'Deaktiviert';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'disabled': return 'default';
      default: return 'default';
    }
  };

  const priorityOptions = [
    { value: 'disabled', label: 'Aus' },
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
  ];

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2, 
          pb: 1,
          cursor: 'pointer',
          backgroundColor: 'background.paper',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
        onClick={onToggle}
      >
        <WorkspaceIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 500 }}>
          Context-Einstellungen
        </Typography>
        <Chip 
          label={tempSettings.useWorkspaceOnly ? 'Nur Workspace' : 'Standard'} 
          size="small" 
          color={tempSettings.useWorkspaceOnly ? 'primary' : 'default'}
          sx={{ mr: 1 }}
        />
        <IconButton size="small">
          <SettingsIcon />
        </IconButton>
      </Box>

      <Collapse in={isOpen}>
        <Box sx={{ p: 2, pt: 0 }}>
          {/* Quick Mode Toggle */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={tempSettings.useWorkspaceOnly}
                  onChange={(e) => handleSettingChange({ 
                    useWorkspaceOnly: e.target.checked,
                    includeSystemKnowledge: !e.target.checked 
                  })}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={500}>
                    Nur mein Workspace verwenden
                  </Typography>
                  <Tooltip title="Aktiviert: Verwendet nur Ihre persönlichen Dokumente und Notizen. Deaktiviert: Kombiniert Workspace mit Systemwissen.">
                    <InfoIcon sx={{ ml: 1, fontSize: 16, opacity: 0.7 }} />
                  </Tooltip>
                </Box>
              }
            />
            {tempSettings.useWorkspaceOnly && (
              <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                <Typography variant="body2">
                  Der Chat verwendet ausschließlich Ihre persönlichen Dokumente und Notizen.
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Detailed Settings */}
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Prioritäten anpassen
          </Typography>

          {/* Workspace Priority */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <WorkspaceIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Workspace Priorität
              </Typography>
              <Chip 
                label={getPriorityLabel(tempSettings.workspacePriority)} 
                size="small"
                color={getPriorityColor(tempSettings.workspacePriority) as any}
              />
            </Box>
            <Slider
              value={priorityOptions.findIndex(opt => opt.value === tempSettings.workspacePriority)}
              onChange={(_, value) => {
                const priority = priorityOptions[value as number].value as any;
                handleSettingChange({ workspacePriority: priority });
              }}
              min={0}
              max={3}
              step={1}
              marks={priorityOptions.map((opt, index) => ({
                value: index,
                label: opt.label,
              }))}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Individual Content Types */}
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={tempSettings.includeUserDocuments}
                  onChange={(e) => handleSettingChange({ includeUserDocuments: e.target.checked })}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DocumentIcon sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2">Meine Dokumente</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={tempSettings.includeUserNotes}
                  onChange={(e) => handleSettingChange({ includeUserNotes: e.target.checked })}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <NoteIcon sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2">Meine Notizen</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={tempSettings.includeSystemKnowledge}
                  onChange={(e) => handleSettingChange({ includeSystemKnowledge: e.target.checked })}
                  size="small"
                  disabled={tempSettings.useWorkspaceOnly}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SystemIcon sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2">Systemwissen</Typography>
                  {tempSettings.useWorkspaceOnly && (
                    <Typography variant="caption" sx={{ ml: 1, opacity: 0.6 }}>
                      (deaktiviert)
                    </Typography>
                  )}
                </Box>
              }
            />
          </Stack>

          {/* Context Summary */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Aktuelle Konfiguration:</strong><br />
              {tempSettings.useWorkspaceOnly ? (
                'Workspace-Only Modus aktiv'
              ) : (
                `Priorität: ${getPriorityLabel(tempSettings.workspacePriority)}, System: ${tempSettings.includeSystemKnowledge ? 'Ein' : 'Aus'}`
              )}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ContextControlPanel;
