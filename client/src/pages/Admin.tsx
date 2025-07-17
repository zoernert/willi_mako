import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tab,
  Tabs,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as UsersIcon,
  Description as DocumentsIcon,
  Settings as SettingsIcon,
  BarChart as StatsIcon,
  QuestionAnswer as FAQIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Admin components (simplified for demo)
const AdminDashboard = () => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h5" gutterBottom>
      Admin Dashboard
    </Typography>
    <Typography variant="body1">
      Willkommen im Admin-Bereich. Hier können Sie Benutzer verwalten, Dokumente hochladen, FAQs erstellen und Systemstatistiken einsehen.
    </Typography>
  </Paper>
);

const AdminUsers = () => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h5" gutterBottom>
      Benutzerverwaltung
    </Typography>
    <Typography variant="body1">
      Hier können Sie Benutzer verwalten, Rollen zuweisen und Aktivitäten überwachen.
    </Typography>
  </Paper>
);

const AdminDocuments = () => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h5" gutterBottom>
      Dokumentenverwaltung
    </Typography>
    <Typography variant="body1">
      Laden Sie PDF-Dokumente hoch, bearbeiten Sie Spickzettel und verwalten Sie kuratierte Inhalte.
    </Typography>
  </Paper>
);

const AdminFAQ = () => {
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [chats, setChats] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [createFAQOpen, setCreateFAQOpen] = useState(false);
  const [editFAQOpen, setEditFAQOpen] = useState(false);
  const [generatingFAQ, setGeneratingFAQ] = useState(false);
  const [enhancingFAQ, setEnhancingFAQ] = useState(false);
  const [faqForm, setFaqForm] = useState({
    id: '',
    title: '',
    description: '',
    context: '',
    answer: '',
    additionalInfo: '',
    tags: [] as string[],
    isActive: true
  });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchAvailableTags();
    if (activeSubTab === 0) {
      fetchChats();
    } else if (activeSubTab === 1) {
      fetchFAQs();
    }
  }, [activeSubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/chats');
      setChats(response.data.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
      showSnackbar('Fehler beim Laden der Chats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/faqs');
      setFaqs(response.data.data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      showSnackbar('Fehler beim Laden der FAQs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await axios.get('/faq-tags');
      setAvailableTags(response.data.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchChatDetails = async (chatId: string) => {
    try {
      const response = await axios.get(`/admin/chats/${chatId}`);
      setSelectedChat(response.data.data.chat);
      setChatMessages(response.data.data.messages);
    } catch (error) {
      console.error('Error fetching chat details:', error);
      showSnackbar('Fehler beim Laden der Chat-Details', 'error');
    }
  };

  const handleCreateFAQFromChat = async () => {
    if (!selectedChat) {
      showSnackbar('Kein Chat ausgewählt', 'warning');
      return;
    }

    try {
      setGeneratingFAQ(true);
      const response = await axios.post(`/admin/chats/${selectedChat.id}/create-faq`);
      const generatedFAQ = response.data.data;
      
      console.log('Generated FAQ data:', generatedFAQ);
      
      // Pre-fill form with LLM-generated content, ensuring no empty values
      setFaqForm({
        id: generatedFAQ.id,
        title: generatedFAQ.title || 'Energiewirtschafts-FAQ',
        description: generatedFAQ.description || 'Frage zur Energiewirtschaft',
        context: generatedFAQ.context || 'Kontext zur Energiewirtschaft',
        answer: generatedFAQ.answer || 'Antwort zur Energiewirtschaft',
        additionalInfo: generatedFAQ.additional_info || 'Weitere Informationen können bei Bedarf ergänzt werden.',
        tags: generatedFAQ.tags || ['Energiewirtschaft'],
        isActive: true
      });
      
      setCreateFAQOpen(true);
      showSnackbar('FAQ-Inhalt automatisch generiert! Bitte überprüfen und anpassen.', 'success');
    } catch (error) {
      console.error('Error creating FAQ:', error);
      showSnackbar('Fehler beim Generieren des FAQs', 'error');
    } finally {
      setGeneratingFAQ(false);
    }
  };

  const handleSaveFAQ = async (enhanceWithContext: boolean = false) => {
    // Debug: Log the current form state
    console.log('Current faqForm:', faqForm);
    console.log('Enhance with context:', enhanceWithContext);
    
    // More robust validation with trimming
    const titleValid = faqForm.title && faqForm.title.trim().length > 0;
    const descriptionValid = faqForm.description && faqForm.description.trim().length > 0;
    const answerValid = faqForm.answer && faqForm.answer.trim().length > 0;
    
    console.log('Validation results:', { titleValid, descriptionValid, answerValid });
    
    if (!titleValid || !descriptionValid || !answerValid) {
      const missingFields = [];
      if (!titleValid) missingFields.push('Titel');
      if (!descriptionValid) missingFields.push('Beschreibung');
      if (!answerValid) missingFields.push('Antwort');
      
      showSnackbar(`Bitte füllen Sie alle Pflichtfelder aus: ${missingFields.join(', ')}`, 'warning');
      return;
    }

    try {
      if (enhanceWithContext) {
        setEnhancingFAQ(true);
        showSnackbar('FAQ wird mit Kontext aus der Wissensdatenbank erweitert...', 'info');
      }

      if (faqForm.id) {
        // Update existing FAQ
        const response = await axios.put(`/admin/faqs/${faqForm.id}`, {
          title: faqForm.title.trim(),
          description: faqForm.description.trim(),
          context: faqForm.context.trim(),
          answer: faqForm.answer.trim(),
          additional_info: faqForm.additionalInfo.trim(),
          tags: faqForm.tags,
          is_active: faqForm.isActive,
          enhance_with_context: enhanceWithContext
        });

        if (enhanceWithContext) {
          // Update form with enhanced data
          const enhancedFAQ = response.data.data;
          setFaqForm({
            ...faqForm,
            title: enhancedFAQ.title,
            description: enhancedFAQ.description,
            context: enhancedFAQ.context,
            answer: enhancedFAQ.answer,
            additionalInfo: enhancedFAQ.additional_info,
            tags: enhancedFAQ.tags
          });
          showSnackbar('FAQ erfolgreich mit Kontext erweitert! Sie können weitere Anpassungen vornehmen.', 'success');
        } else {
          showSnackbar('FAQ erfolgreich aktualisiert', 'success');
          setCreateFAQOpen(false);
          setEditFAQOpen(false);
          resetFAQForm();
          fetchFAQs();
        }
      } else {
        // Create new FAQ - this shouldn't happen with the current flow
        showSnackbar('FAQ wurde bereits erstellt', 'info');
      }
    } catch (error) {
      console.error('Error saving FAQ:', error);
      showSnackbar('Fehler beim Speichern des FAQs', 'error');
    } finally {
      if (enhanceWithContext) {
        setEnhancingFAQ(false);
      }
    }
  };

  const handleEditFAQ = (faq: any) => {
    setFaqForm({
      id: faq.id,
      title: faq.title,
      description: faq.description,
      context: faq.context || '',
      answer: faq.answer || '',
      additionalInfo: faq.additional_info || '',
      tags: faq.tags || [],
      isActive: faq.is_active !== false
    });
    setEditFAQOpen(true);
  };

  const handleDeleteFAQ = async (faqId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen FAQ-Eintrag löschen möchten?')) {
      return;
    }

    try {
      await axios.delete(`/admin/faqs/${faqId}`);
      showSnackbar('FAQ erfolgreich gelöscht', 'success');
      fetchFAQs();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showSnackbar('Fehler beim Löschen des FAQs', 'error');
    }
  };

  const resetFAQForm = () => {
    setFaqForm({
      id: '',
      title: '',
      description: '',
      context: '',
      answer: '',
      additionalInfo: '',
      tags: [],
      isActive: true
    });
    setSelectedChat(null);
    setChatMessages([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        FAQ-Verwaltung
      </Typography>
      
      <Tabs
        value={activeSubTab}
        onChange={(e, newValue) => setActiveSubTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Chats zu FAQs" />
        <Tab label="FAQ-Einträge" />
      </Tabs>

      {activeSubTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Chats auswählen für FAQ-Erstellung
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Titel</TableCell>
                    <TableCell>Benutzer</TableCell>
                    <TableCell>Nachrichten</TableCell>
                    <TableCell>KI-Antworten</TableCell>
                    <TableCell>Letzte Aktualisierung</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chats.map((chat) => (
                    <TableRow key={chat.id}>
                      <TableCell>{chat.title}</TableCell>
                      <TableCell>{chat.user_name}</TableCell>
                      <TableCell>{chat.message_count}</TableCell>
                      <TableCell>{chat.ai_responses}</TableCell>
                      <TableCell>{formatDate(chat.updated_at)}</TableCell>
                      <TableCell>
                        <Tooltip title="Chat anzeigen">
                          <IconButton onClick={() => fetchChatDetails(chat.id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeSubTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Bestehende FAQ-Einträge
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Titel</TableCell>
                    <TableCell>Tags</TableCell>
                    <TableCell>Aufrufe</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Erstellt von</TableCell>
                    <TableCell>Erstellt am</TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell>{faq.title}</TableCell>
                      <TableCell>
                        {faq.tags && faq.tags.map((tag: string) => (
                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell>{faq.view_count}</TableCell>
                      <TableCell>
                        <Chip 
                          label={faq.is_active ? 'Aktiv' : 'Inaktiv'} 
                          color={faq.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{faq.created_by_name}</TableCell>
                      <TableCell>{formatDate(faq.created_at)}</TableCell>
                      <TableCell>
                        <Tooltip title="Bearbeiten">
                          <IconButton onClick={() => handleEditFAQ(faq)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Löschen">
                          <IconButton color="error" onClick={() => handleDeleteFAQ(faq.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Chat Details Dialog */}
      <Dialog open={Boolean(selectedChat)} onClose={() => setSelectedChat(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Chat Details: {selectedChat?.title}
        </DialogTitle>
        <DialogContent>
          {selectedChat && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Benutzer: {selectedChat.user_name} ({selectedChat.user_email})
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Erstellt: {formatDate(selectedChat.created_at)}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Nachrichten:
              </Typography>
              <List>
                {chatMessages.map((message) => (
                  <ListItem key={message.id} sx={{ mb: 1 }}>
                    <Card sx={{ width: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" color={message.role === 'user' ? 'primary' : 'secondary'}>
                          {message.role === 'user' ? 'Benutzer' : 'Stromhaltig'}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(message.created_at)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resetFAQForm()}>Schließen</Button>
          <Button
            variant="contained"
            onClick={handleCreateFAQFromChat}
            startIcon={<AddIcon />}
            disabled={generatingFAQ}
          >
            {generatingFAQ ? <CircularProgress size={20} /> : 'FAQ generieren'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit FAQ Dialog */}
      <Dialog 
        open={createFAQOpen || editFAQOpen} 
        onClose={() => {
          setCreateFAQOpen(false);
          setEditFAQOpen(false);
          resetFAQForm();
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {editFAQOpen ? 'FAQ bearbeiten' : 'FAQ aus Chat erstellen'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {editFAQOpen 
              ? 'Bearbeiten Sie die FAQ-Inhalte nach Bedarf. Nutzen Sie "Mit Kontext erweitern" um relevante Informationen aus der Wissensdatenbank zu integrieren und einen ausführlicheren FAQ-Eintrag zu erstellen.'
              : 'Diese Inhalte wurden automatisch von der KI generiert. Verwenden Sie "Mit Kontext erweitern" um zusätzliche Informationen aus der Wissensdatenbank zu integrieren und einen noch besseren FAQ-Eintrag zu erstellen.'
            }
          </Alert>
          
          <TextField
            fullWidth
            label="Titel *"
            value={faqForm.title}
            onChange={(e) => setFaqForm({ ...faqForm, title: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            label="Beschreibung *"
            multiline
            rows={2}
            value={faqForm.description}
            onChange={(e) => setFaqForm({ ...faqForm, description: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            label="Kontext"
            multiline
            rows={3}
            value={faqForm.context}
            onChange={(e) => setFaqForm({ ...faqForm, context: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Hintergrundinformationen und Zusammenhang der Frage"
          />
          
          <TextField
            fullWidth
            label="Antwort *"
            multiline
            rows={4}
            value={faqForm.answer}
            onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            fullWidth
            label="Zusätzliche Informationen"
            multiline
            rows={3}
            value={faqForm.additionalInfo}
            onChange={(e) => setFaqForm({ ...faqForm, additionalInfo: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Weiterführende Details oder Hinweise"
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tags</InputLabel>
            <Select
              multiple
              value={faqForm.tags}
              onChange={(e) => setFaqForm({ ...faqForm, tags: e.target.value as string[] })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value: string) => (
                    <Chip
                      key={value}
                      label={value}
                      size="small"
                      sx={{ backgroundColor: '#147a50', color: 'white' }}
                    />
                  ))}
                </Box>
              )}
            >
              {/* Show current tags */}
              {faqForm.tags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
              {/* Show available tags that are not already selected */}
              {availableTags
                .filter((tag) => !faqForm.tags.includes(tag))
                .map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          
          {editFAQOpen && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={faqForm.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFaqForm({ ...faqForm, isActive: e.target.value === 'active' })}
              >
                <MenuItem value="active">Aktiv</MenuItem>
                <MenuItem value="inactive">Inaktiv</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateFAQOpen(false);
            setEditFAQOpen(false);
            resetFAQForm();
          }}>
            Abbrechen
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => handleSaveFAQ(true)}
            disabled={enhancingFAQ}
            sx={{ mr: 1 }}
          >
            {enhancingFAQ ? <CircularProgress size={20} /> : 'Mit Kontext erweitern'}
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleSaveFAQ(false)}
            disabled={enhancingFAQ}
          >
            {editFAQOpen ? 'Aktualisieren' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const AdminSettings = () => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h5" gutterBottom>
      Systemeinstellungen
    </Typography>
    <Typography variant="body1">
      Konfigurieren Sie Systemeinstellungen, API-Schlüssel und andere administrative Optionen.
    </Typography>
  </Paper>
);

const AdminStats = () => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="h5" gutterBottom>
      Statistiken
    </Typography>
    <Typography variant="body1">
      Einsehen von Nutzungsstatistiken, Chat-Aktivitäten und Systemmetriken.
    </Typography>
  </Paper>
);

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Dashboard', icon: <DashboardIcon />, component: <AdminDashboard /> },
    { label: 'Benutzer', icon: <UsersIcon />, component: <AdminUsers /> },
    { label: 'Dokumente', icon: <DocumentsIcon />, component: <AdminDocuments /> },
    { label: 'FAQ', icon: <FAQIcon />, component: <AdminFAQ /> },
    { label: 'Statistiken', icon: <StatsIcon />, component: <AdminStats /> },
    { label: 'Einstellungen', icon: <SettingsIcon />, component: <AdminSettings /> },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Administration
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Systemverwaltung und Konfiguration
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {tabs[activeTab].component}
      </Box>
    </Container>
  );
};

export default Admin;
