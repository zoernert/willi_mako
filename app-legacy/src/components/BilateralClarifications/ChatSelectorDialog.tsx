// Chat-Selector für Bilaterale Klärfälle
// Erstellt: 20. August 2025
// Beschreibung: Dialog zum Auswählen von bestehenden Chats als Kontext für Klärfälle

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Chat as ChatIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { chatApi } from '../../services/chatApi';

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

interface ChatSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (chatId: string, chatTitle: string) => Promise<void>;
  clarificationId: string;
}

export const ChatSelectorDialog: React.FC<ChatSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  clarificationId
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [addingChat, setAddingChat] = useState(false);

  const loadChats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch chats from API using the chat service
      console.log('Versuche Chats zu laden über chatApi...');
      const data = await chatApi.getChats();
      console.log('Geladene Chats (Datentyp):', typeof data, Array.isArray(data));
      
      if (data && Array.isArray(data)) {
        console.log(`${data.length} Chats geladen`);
        // Transformiere die Daten ins richtige Format
        const formattedChats = data.map(chat => ({
          id: chat.id,
          title: chat.title,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          messageCount: 0, // Anzahl aus API nicht verfügbar, kann später ergänzt werden
          lastMessage: undefined // Aus API nicht verfügbar, kann später ergänzt werden
        }));
        setChats(formattedChats);
      } else {
        console.error('Unerwartetes Datenformat:', data);
        throw new Error('Unerwartetes Datenformat von der API erhalten');
      }
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Fehler beim Laden der Chats. Testdaten werden verwendet.');
      // Testdaten laden, wenn die API nicht erreichbar ist
      loadTestData();
    } finally {
      setLoading(false);
    }
  };

  // Test-Modus: Fake-Daten laden, wenn die API nicht erreichbar ist
  const loadTestData = () => {
    console.log('Lade Test-Chats');
    try {
      const currentDate = new Date().toISOString();
      const testChats: Chat[] = [
        {
          id: '1',
          title: 'Test Chat 1',
          createdAt: currentDate,
          updatedAt: currentDate,
          messageCount: 15,
          lastMessage: 'Dies ist eine Testnachricht für Chat 1'
        },
        {
          id: '2',
          title: 'Test Chat 2',
          createdAt: currentDate,
          updatedAt: currentDate,
          messageCount: 8,
          lastMessage: 'Dies ist eine Testnachricht für Chat 2'
        },
        {
          id: '3',
          title: 'Problematischer Chat',
          createdAt: currentDate,
          updatedAt: currentDate,
          messageCount: 22,
          lastMessage: 'Enthält wichtige Informationen zu einem Klärfall'
        }
      ];
      setChats(testChats);
    } catch (err) {
      console.error('Fehler beim Erstellen der Testdaten:', err);
      // Fallback mit minimalen Daten
      setChats([{
        id: '1',
        title: 'Notfall-Testchat',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 1,
        lastMessage: 'Testinhalt'
      }]);
    }
  };

  useEffect(() => {
    if (open) {
      loadChats();
    } else {
      setSelectedChat(null);
      setSearchQuery('');
    }
  }, [open]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleAddChat = async () => {
    if (!selectedChat) return;
    
    setAddingChat(true);
    try {
      console.log('Füge Chat hinzu:', selectedChat.id, selectedChat.title);
      console.log('Clarification ID:', clarificationId);
      
      // Validierung
      if (!clarificationId) {
        throw new Error('Keine Klärfall-ID vorhanden');
      }
      if (!selectedChat.id) {
        throw new Error('Keine Chat-ID vorhanden');
      }
      
      await onSelect(selectedChat.id, selectedChat.title);
      onClose();
    } catch (err) {
      console.error('Error adding chat:', err);
      setError(`Fehler beim Hinzufügen des Chats: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setAddingChat(false);
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
      
      // Robustere Formatierung mit nativem JavaScript
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

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          <ChatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Chat als Kontext hinzufügen
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Suchen..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" height="calc(100% - 80px)">
            <Box sx={{ width: '50%', borderRight: '1px solid', borderColor: 'divider', pr: 2, overflow: 'auto' }}>
              {filteredChats.length === 0 ? (
                <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Keine Chats gefunden
                </Typography>
              ) : (
                <List sx={{ width: '100%' }}>
                  {filteredChats.map((chat) => (
                    <React.Fragment key={chat.id}>
                      <ListItem 
                        disablePadding
                      >
                        <ListItemButton
                          selected={selectedChat?.id === chat.id}
                          onClick={() => handleSelectChat(chat)}
                          sx={{ 
                            borderRadius: 1,
                            '&.Mui-selected': {
                              backgroundColor: 'action.selected',
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar>
                              <ChatIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={chat.title || 'Unbenannter Chat'}
                            secondary={`Zuletzt aktualisiert: ${formatDate(chat.updatedAt)}`}
                            primaryTypographyProps={{
                              noWrap: true,
                              style: { fontWeight: selectedChat?.id === chat.id ? 'bold' : 'normal' }
                            }}
                          />
                          {selectedChat?.id === chat.id && (
                            <CheckIcon color="success" />
                          )}
                        </ListItemButton>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
            <Box sx={{ width: '50%', pl: 2, overflow: 'auto' }}>
              {selectedChat ? (
                <Card>
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6">{selectedChat.title || 'Unbenannter Chat'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Chat ID: {selectedChat.id}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Erstellt am</Typography>
                      <Typography variant="body1">{formatDate(selectedChat.createdAt)}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Anzahl Nachrichten</Typography>
                      <Typography variant="body1">{selectedChat.messageCount}</Typography>
                    </Box>
                    {selectedChat.lastMessage && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Letzte Nachricht</Typography>
                        <Typography variant="body1" sx={{ 
                          maxHeight: '100px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {selectedChat.lastMessage}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary">
                    Wählen Sie einen Chat aus, um Details anzuzeigen
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={addingChat}>
          Abbrechen
        </Button>
        <Button 
          onClick={handleAddChat} 
          variant="contained" 
          disabled={!selectedChat || addingChat}
          startIcon={addingChat ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {addingChat ? 'Wird hinzugefügt...' : 'Hinzufügen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatSelectorDialog;
