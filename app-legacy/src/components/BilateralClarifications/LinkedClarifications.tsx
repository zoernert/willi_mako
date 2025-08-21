// Linked Clarifications Component
// Erstellt: 20. August 2025
// Komponente zur Anzeige von verknüpften Klärfällen für Chats und Notizen

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Button,
  Tooltip,
  Link,
  Alert
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
  PriorityHigh as PriorityHighIcon,
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';
import { useNavigate } from 'react-router-dom';

interface LinkedClarification {
  id: number;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  marketPartnerName: string;
  referenceId: string;
}

interface LinkedClarificationsProps {
  sourceType: 'CHAT' | 'NOTE';
  sourceId: string;
  onNavigate?: () => void;
}

export const LinkedClarifications: React.FC<LinkedClarificationsProps> = ({
  sourceType,
  sourceId,
  onNavigate
}) => {
  const [linkedClarifications, setLinkedClarifications] = useState<LinkedClarification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (sourceId) {
      loadLinkedClarifications();
    }
  }, [sourceType, sourceId]);

  const loadLinkedClarifications = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: LinkedClarification[] = [];
      
      if (sourceType === 'CHAT') {
        data = await bilateralClarificationService.getClarificationsLinkedToChat(sourceId);
      } else if (sourceType === 'NOTE') {
        data = await bilateralClarificationService.getClarificationsLinkedToNote(sourceId);
      }
      
      setLinkedClarifications(data);
    } catch (err) {
      console.error(`Error loading clarifications linked to ${sourceType}:`, err);
      setError(`Fehler beim Laden der verknüpften Klärfälle`);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToCase = (id: number) => {
    if (onNavigate) {
      onNavigate();
    }
    navigate(`/app/bilateral-clarifications/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'INTERNAL': return 'warning';
      case 'READY_TO_SEND': return 'info';
      case 'SENT': return 'primary';
      case 'PENDING': return 'primary';
      case 'IN_PROGRESS': return 'info';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'success';
      case 'ESCALATED': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'info';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'error';
      default: return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Prüfen, ob das Datum gültig ist
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Ungültiges Datum:', dateString);
        return 'Ungültiges Datum';
      }
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (err) {
      console.error('Fehler beim Formatieren des Datums:', err);
      return 'Datum unbekannt';
    }
  };

  if (linkedClarifications.length === 0 && !loading && !error) {
    return null; // Nichts anzeigen, wenn keine verknüpften Klärfälle vorhanden sind
  }

  return (
    <Paper sx={{ mt: 2, p: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
        <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle1" fontWeight="medium">
          Verknüpfte Klärfälle
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List dense disablePadding>
          {linkedClarifications.map((clarification) => (
            <React.Fragment key={clarification.id}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigateToCase(clarification.id)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap>
                          {clarification.title}
                        </Typography>
                        <Tooltip title={`Priorität: ${clarification.priority}`}>
                          <BookmarkIcon 
                            fontSize="small" 
                            color={getPriorityColor(clarification.priority) as any} 
                          />
                        </Tooltip>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={clarification.status}
                          color={getStatusColor(clarification.status) as any}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {clarification.marketPartnerName || 'Unbekannter Marktpartner'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(clarification.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ArrowForwardIcon fontSize="small" color="action" />
                </ListItemButton>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default LinkedClarifications;
