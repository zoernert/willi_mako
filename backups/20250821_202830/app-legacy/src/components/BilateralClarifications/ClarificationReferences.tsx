// Clarification References Component
// Erstellt: 20. August 2025
// Komponente zur Anzeige und Verwaltung von Referenzen (Chats und Notizen) für Klärfälle

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  Divider,
  Button,
  Paper,
  CircularProgress,
  IconButton,
  Alert,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Chat as ChatIcon,
  Note as NoteIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

import { bilateralClarificationService } from '../../services/bilateralClarificationService';
import { BilateralClarification } from '../../types/bilateral';
import ChatSelectorDialog from './ChatSelectorDialog';
import NoteSelectorDialog from './NoteSelectorDialog';

interface ClarificationReferencesProps {
  clarification: BilateralClarification;
  onUpdate: () => void;
}

interface Reference {
  id: string;
  reference_type: 'CHAT' | 'NOTE';
  reference_id: string;
  reference_data: {
    title: string;
    addedBy: string;
    addedAt: string;
  };
  created_at: string;
}

export const ClarificationReferences: React.FC<ClarificationReferencesProps> = ({
  clarification,
  onUpdate
}) => {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSelectorOpen, setChatSelectorOpen] = useState(false);
  const [noteSelectorOpen, setNoteSelectorOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadReferences = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Lade Referenzen für Klärfall:', clarification.id);
      const data = await bilateralClarificationService.getReferences(clarification.id.toString());
      console.log('Geladene Referenzen:', data);
      setReferences(data);
    } catch (err) {
      console.error('Error loading references:', err);
      setError('Fehler beim Laden der Referenzen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clarification && clarification.id) {
      loadReferences();
    }
  }, [clarification]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReferences();
    setRefreshing(false);
  };

  const handleAddChat = async (chatId: string, chatTitle: string) => {
    try {
      console.log(`Adding chat reference: clarificationId=${clarification.id}, chatId=${chatId}, title=${chatTitle}`);
      await bilateralClarificationService.addChatReference(
        clarification.id.toString(), 
        chatId,
        chatTitle
      );
      await loadReferences();
      onUpdate();
    } catch (err) {
      console.error('Error adding chat reference:', err);
      setError('Fehler beim Hinzufügen der Chat-Referenz');
    }
  };

  const handleAddNote = async (noteId: string, noteTitle: string) => {
    try {
      console.log(`Adding note reference: clarificationId=${clarification.id}, noteId=${noteId}, title=${noteTitle}`);
      await bilateralClarificationService.addNoteReference(
        clarification.id.toString(), 
        noteId,
        noteTitle
      );
      await loadReferences();
      onUpdate();
    } catch (err) {
      console.error('Error adding note reference:', err);
      setError('Fehler beim Hinzufügen der Notiz-Referenz');
    }
  };

  const handleRemoveReference = async (referenceId: string) => {
    try {
      await bilateralClarificationService.removeReference(
        clarification.id.toString(),
        referenceId
      );
      await loadReferences();
      onUpdate();
    } catch (err) {
      console.error('Error removing reference:', err);
      setError('Fehler beim Entfernen der Referenz');
    }
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      // Handle empty dates
      if (!dateString) {
        console.error('Undefiniertes oder leeres Datum erhalten');
        return 'Datum unbekannt';
      }
      
      // Prüfen, ob das Datum gültig ist
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Ungültiges Datum:', dateString);
        return 'Ungültiges Datum';
      }
      
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Fehler beim Formatieren des Datums:', err);
      return 'Datum unbekannt';
    }
  };

  const isInternalMode = clarification.status === 'INTERNAL';

  // Filter Referenzen nach Typ
  const chatReferences = references.filter(ref => ref.reference_type === 'CHAT');
  const noteReferences = references.filter(ref => ref.reference_type === 'NOTE');

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Verknüpfte Kontexte
        </Typography>
        
        <Box>
          <Tooltip title="Aktualisieren">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              size="small"
            >
              <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <ChatIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
              Verknüpfte Chats
            </Typography>
            {chatReferences.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine Chats verknüpft
              </Typography>
            ) : (
              <List dense>
                {chatReferences.map((ref) => (
                  <ListItem key={ref.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemAvatar>
                      <Avatar>
                        <ChatIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={ref.reference_data?.title || 'Unbenannter Chat'}
                      secondary={`Hinzugefügt: ${formatDate(ref.created_at)}`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Verknüpfung entfernen">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRemoveReference(ref.id)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            {isInternalMode && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setChatSelectorOpen(true)}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              >
                Chat hinzufügen
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              <NoteIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
              Verknüpfte Notizen
            </Typography>
            {noteReferences.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine Notizen verknüpft
              </Typography>
            ) : (
              <List dense>
                {noteReferences.map((ref) => (
                  <ListItem key={ref.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemAvatar>
                      <Avatar>
                        <NoteIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={ref.reference_data?.title || 'Unbenannte Notiz'}
                      secondary={`Hinzugefügt: ${formatDate(ref.created_at)}`}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Verknüpfung entfernen">
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRemoveReference(ref.id)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            {isInternalMode && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setNoteSelectorOpen(true)}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              >
                Notiz hinzufügen
              </Button>
            )}
          </Box>
        </Paper>
      )}

      <ChatSelectorDialog
        open={chatSelectorOpen}
        onClose={() => setChatSelectorOpen(false)}
        onSelect={handleAddChat}
        clarificationId={clarification.id.toString()}
      />

      <NoteSelectorDialog
        open={noteSelectorOpen}
        onClose={() => setNoteSelectorOpen(false)}
        onSelect={handleAddNote}
        clarificationId={clarification.id.toString()}
      />
    </Box>
  );
};

export default ClarificationReferences;
