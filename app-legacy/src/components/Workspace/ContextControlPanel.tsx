import React from 'react';
import { Box, Card, CardContent, Typography, Switch, FormControlLabel, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
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
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer' 
          }}
          onClick={onToggle}
        >
          <Typography variant="subtitle2">
            Kontext-Einstellungen
          </Typography>
          {isOpen ? <ExpandLess /> : <ExpandMore />}
        </Box>
        
        <Collapse in={isOpen}>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={contextSettings.useWorkspaceOnly}
                  onChange={(e) => 
                    onSettingsChange({ 
                      ...contextSettings, 
                      useWorkspaceOnly: e.target.checked 
                    })
                  }
                  size="small"
                />
              }
              label="Nur Workspace verwenden"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={contextSettings.includeUserDocuments}
                  onChange={(e) => 
                    onSettingsChange({ 
                      ...contextSettings, 
                      includeUserDocuments: e.target.checked 
                    })
                  }
                  size="small"
                />
              }
              label="Benutzer-Dokumente einbeziehen"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={contextSettings.includeUserNotes}
                  onChange={(e) => 
                    onSettingsChange({ 
                      ...contextSettings, 
                      includeUserNotes: e.target.checked 
                    })
                  }
                  size="small"
                />
              }
              label="Benutzer-Notizen einbeziehen"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={contextSettings.includeSystemKnowledge}
                  onChange={(e) => 
                    onSettingsChange({ 
                      ...contextSettings, 
                      includeSystemKnowledge: e.target.checked 
                    })
                  }
                  size="small"
                />
              }
              label="System-Wissen einbeziehen"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={contextSettings.includeM2CRoles}
                  onChange={(e) => 
                    onSettingsChange({ 
                      ...contextSettings, 
                      includeM2CRoles: e.target.checked 
                    })
                  }
                  size="small"
                />
              }
              label="M2C-Rollen einbeziehen"
            />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ContextControlPanel;
