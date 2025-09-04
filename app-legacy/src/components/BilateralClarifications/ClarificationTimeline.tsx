// Timeline-Komponente für Bilaterale Klärfälle
// Erstellt: 14. August 2025
// Beschreibung: Zeigt chronologisch alle Aktivitäten eines Klärfalls an

import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  TextField,
  IconButton,
  Collapse,
  Divider,
  Alert,
  Paper
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Create as CreateIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Attachment as AttachmentIcon,
  Note as NoteIcon,
  PersonAdd as PersonAddIcon,
  Update as UpdateIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { BilateralClarification } from '../../types/bilateral';
import { notesApi } from '../../services/notesApi';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useUserNames } from '../../hooks/useUserNames';
import { useAuth } from '../../contexts/AuthContext';

interface TimelineActivity {
  id: string;
  type: 'created' | 'status_change' | 'note' | 'email' | 'attachment' | 'assignment' | 'update';
  timestamp: string;
  user: {
    id: string;
    name: string;
  };
  title: string;
  description?: string;
  content?: string;
  metadata?: any;
  isExpanded?: boolean;
}

interface ClarificationTimelineProps {
  clarification: BilateralClarification;
  notes: any[];
  emails: any[];
  attachments: any[];
  onUpdate: () => void;
}

export const ClarificationTimeline: React.FC<ClarificationTimelineProps> = ({
  clarification,
  notes,
  emails,
  attachments,
  onUpdate
}) => {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const { state } = useAuth();
  const currentUserId = state.user?.id;
  // Collect potential user IDs from clarification and artifacts for name resolution
  const candidateUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (clarification.createdBy) ids.add(clarification.createdBy.toString());
    if (clarification.lastModifiedBy) ids.add(clarification.lastModifiedBy.toString());
    (notes || []).forEach((n: any) => { if (n.created_by) ids.add(String(n.created_by)); });
    (emails || []).forEach((e: any) => { if (e.added_by) ids.add(String(e.added_by)); });
    (attachments || []).forEach((a: any) => { if (a.uploaded_by) ids.add(String(a.uploaded_by)); });
    return Array.from(ids);
  }, [clarification, notes, emails, attachments]);
  const nameMap = useUserNames(candidateUserIds);

  // Timeline-Aktivitäten zusammenstellen
  React.useEffect(() => {
    const timelineActivities: TimelineActivity[] = [];

    // Erstellung des Klärfalls
  timelineActivities.push({
      id: `created-${clarification.id}`,
      type: 'created',
      timestamp: clarification.createdAt,
      user: {
    id: clarification.createdBy?.toString() || '',
    name: (clarification.createdBy && clarification.createdBy === currentUserId) ? 'ich' : (clarification.createdBy ? (nameMap[clarification.createdBy] || 'System') : 'System')
      },
      title: 'Klärfall erstellt',
      description: `Klärfall "${clarification.title}" wurde erstellt`
    });

    // Status-Änderungen simulieren (basierend auf aktuellem Status)
    if (clarification.status !== 'DRAFT') {
      const statusTimestamp = clarification.updatedAt || clarification.createdAt;
      let statusDescription = '';
      
      switch (clarification.status) {
        case 'INTERNAL':
          statusDescription = 'Interne Klärung begonnen - Sammlung von Informationen';
          break;
        case 'READY_TO_SEND':
          statusDescription = 'Bereit zum Versenden - Alle Informationen gesammelt';
          break;
        case 'SENT':
          statusDescription = 'An Marktpartner versendet - Warten auf Antwort';
          break;
        case 'PENDING':
          statusDescription = 'Antwort erhalten - Prüfung läuft';
          break;
        case 'IN_PROGRESS':
          statusDescription = 'In Bearbeitung - Weitere Kommunikation erforderlich';
          break;
        case 'RESOLVED':
          statusDescription = 'Klärfall abgeschlossen - Problem gelöst';
          break;
        case 'CLOSED':
          statusDescription = 'Klärfall geschlossen - Endgültig beendet';
          break;
        case 'ESCALATED':
          statusDescription = 'Eskaliert - Höhere Instanz eingeschaltet';
          break;
        default:
          statusDescription = `Status geändert zu "${clarification.status}"`;
      }

      timelineActivities.push({
        id: `status-${clarification.id}-${clarification.status}`,
        type: 'status_change',
        timestamp: statusTimestamp,
        user: {
          id: clarification.lastModifiedBy?.toString() || clarification.createdBy?.toString() || '',
          name: (clarification.lastModifiedBy && clarification.lastModifiedBy === currentUserId)
            ? 'ich'
            : (clarification.lastModifiedBy ? (nameMap[clarification.lastModifiedBy] || 'System') : 'System')
        },
        title: 'Status aktualisiert',
        description: statusDescription
      });
    }

    // Notizen hinzufügen
    notes.forEach(note => {
      timelineActivities.push({
        id: `note-${note.id}`,
        type: 'note',
        timestamp: note.created_at,
        user: {
          id: note.created_by?.toString() || '',
          name: (note.created_by && String(note.created_by) === currentUserId)
            ? 'ich'
            : (note.author_name || nameMap[String(note.created_by)] || 'Unbekannt')
        },
        title: note.title || 'Notiz ohne Titel',
        description: 'Notiz hinzugefügt',
        content: note.content,
        metadata: note
      });
    });

    // E-Mails hinzufügen
    emails.forEach(email => {
      timelineActivities.push({
        id: `email-${email.id}`,
        type: 'email',
        timestamp: email.added_at || email.sent_at,
        user: {
          id: email.added_by?.toString() || '',
          name: (email.added_by && String(email.added_by) === currentUserId)
            ? 'ich'
            : (email.adder_name || nameMap[String(email.added_by)] || 'System')
        },
        title: email.direction === 'OUTGOING' ? 'E-Mail gesendet' : 'E-Mail empfangen',
        description: email.subject,
        content: email.content,
        metadata: email
      });
    });

    // Anhänge hinzufügen
    attachments.forEach(attachment => {
      timelineActivities.push({
        id: `attachment-${attachment.id}`,
        type: 'attachment',
        timestamp: attachment.uploaded_at,
        user: {
          id: attachment.uploaded_by?.toString() || '',
          name: (attachment.uploaded_by && String(attachment.uploaded_by) === currentUserId)
            ? 'ich'
            : (attachment.uploader_name || nameMap[String(attachment.uploaded_by)] || 'Unbekannt')
        },
        title: 'Anhang hinzugefügt',
        description: attachment.original_filename,
        metadata: attachment
      });
    });

    // Nach Zeitstempel sortieren (neueste zuerst)
    timelineActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setActivities(timelineActivities);
  }, [clarification, notes, emails, attachments]);

  const handleToggleExpand = (activityId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedItems(newExpanded);
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      showSnackbar('Bitte Titel und Inhalt eingeben', 'warning');
      return;
    }

    try {
      setLoading(true);

      const noteData = {
        title: newNoteTitle,
        content: newNoteContent,
        tags: ['bilateral-clarification', `clarification-${clarification.id}`],
        source_type: 'manual',
        source_context: `Klärfall: ${clarification.title} - ${clarification.marketPartner.companyName}`
      };

      await notesApi.createNote(noteData);
      
      // Formular zurücksetzen
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowNewNote(false);
      
      showSnackbar('Notiz erfolgreich erstellt', 'success');
      onUpdate(); // Parent aktualisieren
      
    } catch (error) {
      console.error('Error creating note:', error);
      showSnackbar('Fehler beim Erstellen der Notiz', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created': return <CreateIcon />;
      case 'status_change': return <UpdateIcon />;
      case 'note': return <NoteIcon />;
      case 'email': return <EmailIcon />;
      case 'attachment': return <AttachmentIcon />;
      case 'assignment': return <PersonAddIcon />;
      case 'update': return <EditIcon />;
      default: return <UpdateIcon />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'created': return 'success';
      case 'status_change': return 'warning';
      case 'note': return 'info';
      case 'email': return 'primary';
      case 'attachment': return 'secondary';
      case 'assignment': return 'info';
      case 'update': return 'default';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return timestamp;
    }
  };

  return (
    <Box>
      {/* Neue Notiz erstellen */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Aktivitäten-Timeline</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewNote(!showNewNote)}
              disabled={loading}
            >
              Neue Notiz
            </Button>
          </Box>

          {clarification.status === 'INTERNAL' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Interne Klärung aktiv:</strong> Nutzen Sie die Timeline um den Fortschritt zu dokumentieren. 
              Notizen und Aktivitäten helfen bei der späteren Nachvollziehbarkeit.
            </Alert>
          )}

          <Collapse in={showNewNote}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Neue Notiz erstellen
              </Typography>
              
              <TextField
                label="Titel"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                fullWidth
                margin="normal"
                size="small"
              />
              
              <TextField
                label="Inhalt"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                fullWidth
                multiline
                rows={3}
                margin="normal"
                size="small"
              />

              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={handleCreateNote}
                  disabled={loading || !newNoteTitle.trim() || !newNoteContent.trim()}
                >
                  Speichern
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={() => {
                    setShowNewNote(false);
                    setNewNoteTitle('');
                    setNewNoteContent('');
                  }}
                  disabled={loading}
                >
                  Abbrechen
                </Button>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Timeline */}
      {activities.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">
              Noch keine weiteren Aktivitäten für diesen Klärfall vorhanden. 
              Erstellen Sie eine Notiz oder laden Sie Anhänge hoch, um die Timeline zu erweitern.
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Timeline>
          {activities.map((activity, index) => (
            <TimelineItem key={activity.id}>
              <TimelineOppositeContent sx={{ flex: 0.3 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatTimestamp(activity.timestamp)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activity.user.name}
                </Typography>
              </TimelineOppositeContent>
              
              <TimelineSeparator>
                <TimelineDot color={getActivityColor(activity.type) as any}>
                  {getActivityIcon(activity.type)}
                </TimelineDot>
                {index < activities.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent sx={{ flex: 1 }}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {activity.title}
                      </Typography>
                      {activity.description && (
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                      )}
                    </Box>
                    
                    {(activity.content || activity.type === 'note') && (
                      <IconButton
                        size="small"
                        onClick={() => handleToggleExpand(activity.id)}
                        title={activity.type === 'note' ? 'Notizinhalt anzeigen/verbergen' : 'Details anzeigen/verbergen'}
                      >
                        {expandedItems.has(activity.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </Box>

                  {/* Zusätzliche Metadaten */}
                  {activity.type === 'email' && activity.metadata && (
                    <Box mt={1}>
                      {/* Direction chip */}
                      <Chip
                        label={activity.metadata.direction === 'OUTGOING' ? 'Ausgehend' : 'Eingehend'}
                        size="small"
                        color={activity.metadata.direction === 'OUTGOING' ? 'primary' : 'secondary'}
                      />
                      {/* Important chip (supports snake_case and camelCase) */}
                      {(activity.metadata.is_important || activity.metadata.isImportant) && (
                        <Chip label="Wichtig" size="small" color="error" sx={{ ml: 1 }} />
                      )}
                      {/* Reply/thread hints */}
                      {Boolean(activity.metadata.in_reply_to || activity.metadata.inReplyTo) && (
                        <Chip label="Antwort" size="small" variant="outlined" sx={{ ml: 1 }} />
                      )}
                      {Boolean(activity.metadata.message_id || activity.metadata.messageId) && (
                        <Chip
                          label={`Thread ${(activity.metadata.message_id || activity.metadata.messageId).toString().slice(0, 8)}`}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  )}

                  {activity.type === 'attachment' && activity.metadata && (
                    <Box mt={1}>
                      <Chip 
                        label={`${(activity.metadata.file_size / 1024).toFixed(1)} KB`} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={activity.metadata.mime_type} 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 1 }} 
                      />
                    </Box>
                  )}

                  {/* Erweiterbarer Inhalt */}
                  <Collapse in={expandedItems.has(activity.id)}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                      {activity.type === 'note' ? (
                        <>
                          <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                            {activity.content || 'Keine Inhalte vorhanden.'}
                          </Typography>
                          {activity.metadata && activity.metadata.tags && (
                            <Box mt={1}>
                              {activity.metadata.tags.map((tag: string, index: number) => (
                                <Chip 
                                  key={index}
                                  label={tag} 
                                  size="small" 
                                  variant="outlined" 
                                  sx={{ mr: 0.5, mt: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                          {activity.content}
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  );
};

export default ClarificationTimeline;
