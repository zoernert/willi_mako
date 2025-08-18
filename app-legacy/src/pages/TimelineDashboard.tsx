import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { TimelineOverviewWidget } from '../components/Timeline/TimelineOverviewWidget';
import { TimelineDetailView } from '../components/Timeline/TimelineDetailView';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`timeline-tabpanel-${index}`}
      aria-labelledby={`timeline-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TimelineDashboard: React.FC = () => {
  const { state } = useAuth();
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTimelineName, setNewTimelineName] = useState('');
  const [newTimelineDescription, setNewTimelineDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleCreateTimeline = async () => {
    if (!newTimelineName.trim()) return;

    try {
      setLoading(true);

      const response = await fetch('/api/timelines', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTimelineName.trim(),
          description: newTimelineDescription.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create timeline');
      }

      const newTimeline = await response.json();
      
      // Timeline als aktiv setzen
      await fetch(`/api/timelines/${newTimeline.id}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        }
      });

      // Dialog schließen und zurücksetzen
      setCreateDialogOpen(false);
      setNewTimelineName('');
      setNewTimelineDescription('');
      
      // Timeline-Details anzeigen
      setSelectedTimelineId(newTimeline.id);
      setTabValue(1);

    } catch (error) {
      console.error('Error creating timeline:', error);
      alert('Fehler beim Erstellen der Timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleTimelineSelect = (timelineId: string) => {
    setSelectedTimelineId(timelineId);
    setTabValue(1); // Switch to details tab
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (selectedTimelineId && tabValue === 1) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <TimelineDetailView 
          timelineId={selectedTimelineId}
          onClose={() => {
            setSelectedTimelineId(null);
            setTabValue(0);
          }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={4}>
        <Box display="flex" alignItems="center">
          <TimelineIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Timeline-Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verwalten Sie Ihre Fälle und verfolgen Sie Ihre Arbeitsschritte
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Übersicht" />
          <Tab label="Timeline-Details" disabled={!selectedTimelineId} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Timeline Overview Widget */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <TimelineOverviewWidget onTimelineSelect={handleTimelineSelect} />
          </Grid>

          {/* Quick Actions */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box 
              p={3} 
              bgcolor="primary.50" 
              borderRadius={2}
              border="1px solid"
              borderColor="primary.200"
            >
              <Typography variant="h6" color="primary.main" gutterBottom>
                Schnellaktionen
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  fullWidth
                >
                  Neue Timeline erstellen
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth
                  disabled
                >
                  Timeline importieren (bald)
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth
                  disabled
                >
                  Berichte exportieren (bald)
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {selectedTimelineId ? (
          <Box>
            <Box mb={2}>
              <Typography variant="h5" gutterBottom>
                Timeline-Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Detaillierte Ansicht mit allen Aktivitäten und Einstellungen
              </Typography>
            </Box>
            <TimelineDetailView 
              timelineId={selectedTimelineId}
              onClose={() => {
                setSelectedTimelineId(null);
                setTabValue(0);
              }}
            />
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              Wählen Sie eine Timeline aus der Übersicht aus
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Klicken Sie auf "Details anzeigen" bei einer Timeline in der Übersicht, 
              um hier die detaillierte Ansicht zu sehen.
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Floating Action Button für neue Timeline */}
      <Fab
        color="primary"
        aria-label="neue timeline"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Create Timeline Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Neue Timeline erstellen
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Timeline-Name"
            fullWidth
            variant="outlined"
            value={newTimelineName}
            onChange={(e) => setNewTimelineName(e.target.value)}
            helperText="Maximal 50 Zeichen"
            inputProps={{ maxLength: 50 }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Beschreibung (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newTimelineDescription}
            onChange={(e) => setNewTimelineDescription(e.target.value)}
            helperText="Kurze Beschreibung des Falls oder Projekts"
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateTimeline}
            variant="contained"
            disabled={!newTimelineName.trim() || loading}
          >
            {loading ? 'Erstelle...' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TimelineDashboard;
