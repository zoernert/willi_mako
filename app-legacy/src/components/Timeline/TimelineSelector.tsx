import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Add as AddIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { timelineService, Timeline } from '../../services/timelineService';

interface TimelineSelectorProps {
  className?: string;
}

const TimelineSelector: React.FC<TimelineSelectorProps> = ({ className = '' }) => {
  const { state, setActiveTimeline } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTimelineName, setNewTimelineName] = useState('');
  const [newTimelineDescription, setNewTimelineDescription] = useState('');
  const [activeTimeline, setActiveTimelineLocal] = useState<Timeline | null>(null);

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (state.token) {
      fetchTimelines();
    }
  }, [state.token]);

  useEffect(() => {
    // Finde die aktive Timeline basierend auf activeTimelineId
    if (state.activeTimelineId && timelines.length > 0) {
      const active = timelines.find(t => t.id === state.activeTimelineId);
      setActiveTimelineLocal(active || null);
    } else {
      setActiveTimelineLocal(null);
    }
  }, [state.activeTimelineId, timelines]);

  const fetchTimelines = async () => {
    try {
      setLoading(true);
      const data = await timelineService.getTimelines();
      setTimelines(data);
      
      // Wenn keine aktive Timeline gesetzt ist, aber Timelines existieren
      if (!state.activeTimelineId && data.length > 0) {
        const activeTimeline = data.find((t: Timeline) => t.is_active) || data[0];
        setActiveTimeline(activeTimeline.id);
      }
    } catch (error) {
      console.error('Error fetching timelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTimelineSelect = async (timeline: Timeline) => {
    try {
      // Timeline als aktiv setzen
      await timelineService.activateTimeline(timeline.id);
      setActiveTimeline(timeline.id);
      setActiveTimelineLocal(timeline);
      
      // Timelines neu laden um Status zu aktualisieren
      await fetchTimelines();
    } catch (error) {
      console.error('Error activating timeline:', error);
    }
    
    handleClose();
  };

  const handleCreateTimeline = async () => {
    if (!newTimelineName.trim()) return;

    try {
      setLoading(true);

      const newTimeline = await timelineService.createTimeline({
        name: newTimelineName.trim(),
        description: newTimelineDescription.trim() || undefined
      });
      
      // Timeline als aktiv setzen
      await timelineService.activateTimeline(newTimeline.id);

      // Dialoge schließen und zurücksetzen
      setCreateDialogOpen(false);
      setNewTimelineName('');
      setNewTimelineDescription('');
      
      // Timeline als aktiv setzen
      setActiveTimeline(newTimeline.id);
      
      // Timelines neu laden
      await fetchTimelines();
    } catch (error) {
      console.error('Error creating timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
    return date.toLocaleDateString('de-DE');
  };

  if (!state.token) {
    return null; // Nicht angemeldet
  }

  return (
    <Box className={className}>
      <Button
        onClick={handleClick}
        startIcon={<TimelineIcon />}
        endIcon={<ArrowDownIcon />}
        variant="outlined"
        size="small"
        sx={{
          color: 'inherit',
          borderColor: 'rgba(255, 255, 255, 0.3)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          },
          minWidth: 200,
          justifyContent: 'space-between'
        }}
      >
        <Box textAlign="left" overflow="hidden">
          {activeTimeline ? (
            <>
              <Typography variant="body2" noWrap>
                {activeTimeline.name}
              </Typography>
              {timelines.length > 1 && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {timelines.length} Timelines
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2">
              {loading ? 'Lade...' : 'Keine Timeline'}
            </Typography>
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'timeline-selector-button',
        }}
        PaperProps={{
          sx: { minWidth: 300, maxWidth: 400 }
        }}
      >
        {/* Header */}
        <Box px={2} py={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Meine Timelines ({timelines.length})
          </Typography>
        </Box>
        
        <Divider />

        {/* Timeline Liste */}
        {timelines.length === 0 ? (
          <MenuItem disabled>
            <Typography color="text.secondary">
              Keine Timelines vorhanden
            </Typography>
          </MenuItem>
        ) : (
          timelines.map((timeline) => (
            <MenuItem
              key={timeline.id}
              onClick={() => handleTimelineSelect(timeline)}
              selected={timeline.id === state.activeTimelineId}
              sx={{ py: 1.5 }}
            >
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight={timeline.is_active ? 'bold' : 'normal'}>
                    {timeline.name}
                  </Typography>
                  {timeline.is_active && (
                    <CheckIcon color="success" sx={{ fontSize: 16 }} />
                  )}
                </Box>
                
                {timeline.description && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 250
                    }}
                  >
                    {timeline.description}
                  </Typography>
                )}
                
                <Typography variant="caption" color="text.secondary">
                  Aktualisiert: {formatRelativeTime(timeline.updated_at)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}

        <Divider />

        {/* Neue Timeline Button */}
        <MenuItem onClick={() => { setCreateDialogOpen(true); handleClose(); }}>
          <AddIcon sx={{ mr: 1, fontSize: 18 }} />
          <Typography variant="body2">
            Neue Timeline erstellen
          </Typography>
        </MenuItem>
      </Menu>

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
    </Box>
  );
};

export default TimelineSelector;