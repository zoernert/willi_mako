import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  List,
  ListItem,
  Tooltip,
  Divider,
  Grid,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as UsersIcon,
  Description as DocumentsIcon,
  QuestionAnswer as FAQIcon,
  Quiz as QuizIcon,
  Settings as SettingsIcon,
  Assessment as StatsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Link as LinkIcon,
  Forum as ForumIcon,
  Email as EmailIcon,
  List as BulkIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import apiClient from '../services/apiClient';
import AdminQuizManager from '../components/AdminQuizManager';
import AdminChatConfiguration from '../components/admin/ChatConfigurationManager';
import FAQLinkManager from '../components/admin/FAQLinkManager';
import CommunityAdminManager from '../components/admin/CommunityAdminManager';
import TeamEmailConfig from '../components/admin/TeamEmailConfig';
import BulkClarificationManager from '../components/admin/BulkClarificationManager';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Admin components - Full implementation
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    totalChats: 0,
    totalMessages: 0,
    recentUsers: 0,
    recentChats: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/stats') as any;
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
      showSnackbar('Fehler beim Laden der Statistiken', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await apiClient.get('/admin/activity') as any;
      setRecentActivity(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Willkommen im Admin-Bereich. Hier haben Sie einen Überblick über das System.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Benutzer
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.totalUsers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.recentUsers || 0} neue in den letzten 30 Tagen
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dokumente
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.totalDocuments || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hochgeladene Dokumente
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Chats
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.totalChats || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats?.recentChats || 0} neue in den letzten 30 Tagen
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Nachrichten
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats?.totalMessages || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gesamt ausgetauschte Nachrichten
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Recent Activity */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Letzte Aktivitäten
            </Typography>
            <List>
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity: any, index) => (
                  <ListItem key={index}>
                    <Typography variant="body2">
                      {activity.description} - {new Date(activity.timestamp).toLocaleString('de-DE')}
                    </Typography>
                  </ListItem>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Keine aktuellen Aktivitäten verfügbar
                </Typography>
              )}
            </List>
          </Paper>
        </>
      )}
    </Box>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({
    id: '',
    email: '',
    name: '',
    role: 'user',
    isActive: true,
    canAccessCs30: false // CR-CS30: Add cs30 access field
  });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users') as any;
      setUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Fehler beim Laden der Benutzer', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setUserForm({
      id: user.id,
      email: user.email,
      name: user.full_name || user.name,
      role: user.role,
      isActive: user.is_active !== false,
      canAccessCs30: user.can_access_cs30 || false // CR-CS30: Include cs30 access field
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    try {
      // Update role
      await apiClient.put(`/admin/users/${userForm.id}/role`, {
        role: userForm.role
      });
      
      // CR-CS30: Update cs30 access if changed
      if (selectedUser && selectedUser.can_access_cs30 !== userForm.canAccessCs30) {
        await apiClient.put(`/admin/users/${userForm.id}/cs30-access`, {
          canAccess: userForm.canAccessCs30
        });
      }
      
      showSnackbar('Benutzer erfolgreich aktualisiert', 'success');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar('Fehler beim Aktualisieren des Benutzers', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Benutzer löschen möchten?')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/users/${userId}`);
      showSnackbar('Benutzer erfolgreich gelöscht', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar('Fehler beim Löschen des Benutzers', 'error');
    }
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
    <Box>
      <Typography variant="h5" gutterBottom>
        Benutzerverwaltung
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Verwalten Sie Benutzer, Rollen und Berechtigungen.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>E-Mail</TableCell>
                <TableCell>Rolle</TableCell>
                <TableCell>Firma</TableCell>
                <TableCell>Registriert</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{user.full_name || user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <Tooltip title="Bearbeiten">
                      <IconButton onClick={() => handleEditUser(user)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton color="error" onClick={() => handleDeleteUser(user.id)}>
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

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Benutzer bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={userForm.name}
            disabled
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="E-Mail"
            value={userForm.email}
            disabled
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Rolle</InputLabel>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            >
              <MenuItem value="user">Benutzer</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
            </Select>
          </FormControl>
          {/* CR-CS30: Add CS30 access checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={userForm.canAccessCs30}
                onChange={(e) => setUserForm({ ...userForm, canAccessCs30: e.target.checked })}
              />
            }
            label="Zugriff auf Schleupen-Wissensbasis (cs30) gewähren"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleUpdateUser}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const AdminDocuments = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentForm, setDocumentForm] = useState({
    id: '',
    title: '',
    description: '',
    isActive: true
  });
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null
  });
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/documents') as any;
      setDocuments(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showSnackbar('Fehler beim Laden der Dokumente', 'error');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.file || !uploadForm.title) {
      showSnackbar('Bitte füllen Sie alle Pflichtfelder aus', 'warning');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);

      await apiClient.post('/admin/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showSnackbar('Dokument erfolgreich hochgeladen', 'success');
      setUploadDialogOpen(false);
      setUploadForm({ title: '', description: '', file: null });
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      showSnackbar('Fehler beim Hochladen des Dokuments', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleEditDocument = (document: any) => {
    setSelectedDocument(document);
    setDocumentForm({
      id: document.id,
      title: document.title,
      description: document.description || '',
      isActive: document.is_active !== false
    });
    setEditDialogOpen(true);
  };

  const handleUpdateDocument = async () => {
    try {
      await apiClient.put(`/admin/documents/${documentForm.id}`, {
        title: documentForm.title,
        description: documentForm.description,
        isActive: documentForm.isActive
      });
      showSnackbar('Dokument erfolgreich aktualisiert', 'success');
      setEditDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      showSnackbar('Fehler beim Aktualisieren des Dokuments', 'error');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie dieses Dokument löschen möchten?')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/documents/${documentId}`);
      showSnackbar('Dokument erfolgreich gelöscht', 'success');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      showSnackbar('Fehler beim Löschen des Dokuments', 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h5" gutterBottom>
            Dokumentenverwaltung
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Verwalten Sie hochgeladene Dokumente und deren Inhalte.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Dokument hochladen
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titel</TableCell>
                <TableCell>Beschreibung</TableCell>
                <TableCell>Dateigröße</TableCell>
                <TableCell>Hochgeladen von</TableCell>
                <TableCell>Hochgeladen am</TableCell>
                <TableCell>Öffentlich</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((document: any) => (
                <TableRow key={document.id}>
                  <TableCell>{document.title}</TableCell>
                  <TableCell>{document.description || '-'}</TableCell>
                  <TableCell>{formatFileSize(document.file_size)}</TableCell>
                  <TableCell>{document.uploaded_by_name || '-'}</TableCell>
                  <TableCell>{formatDate(document.created_at)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={document.is_active ? 'Ja' : 'Nein'} 
                      color={document.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Bearbeiten">
                      <IconButton onClick={() => handleEditDocument(document)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton color="error" onClick={() => handleDeleteDocument(document.id)}>
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dokument hochladen</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Titel *"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Beschreibung"
            multiline
            rows={3}
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
              style={{ display: 'none' }}
              id="document-upload"
            />
            <label htmlFor="document-upload">
              <Button variant="outlined" component="span" fullWidth>
                {uploadForm.file ? uploadForm.file.name : 'Datei auswählen (PDF)'}
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleUploadDocument} disabled={uploading}>
            {uploading ? <CircularProgress size={20} /> : 'Hochladen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dokument bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Titel *"
            value={documentForm.title}
            onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Beschreibung"
            multiline
            rows={3}
            value={documentForm.description}
            onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={documentForm.isActive ? 'active' : 'inactive'}
              onChange={(e) => setDocumentForm({ ...documentForm, isActive: e.target.value === 'active' })}
            >
              <MenuItem value="active">Aktiv</MenuItem>
              <MenuItem value="inactive">Inaktiv</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleUpdateDocument}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

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
  const [linkManagerOpen, setLinkManagerOpen] = useState(false);
  const [selectedFAQForLinking, setSelectedFAQForLinking] = useState<{id: string, title: string} | null>(null);
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
    isActive: true,
    isPublic: false // Neues Feld für öffentliche Anzeige
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
      const response = await apiClient.get('/admin/chats') as any;
      setChats(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching chats:', error);
      showSnackbar('Fehler beim Laden der Chats', 'error');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/faqs') as any;
      setFaqs(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      showSnackbar('Fehler beim Laden der FAQs', 'error');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      const response = await apiClient.get('/faq-tags') as any;
      setAvailableTags(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setAvailableTags([]);
    }
  };

  const fetchChatDetails = async (chatId: string) => {
    try {
      const response = (await apiClient.get(`/admin/chats/${chatId}`)) as any;
      setSelectedChat(response.chat);
      setChatMessages(response.messages);
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
      const response = (await apiClient.post(`/admin/chats/${selectedChat.id}/create-faq`)) as any;
      const generatedFAQ = response;
      
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
        isActive: true,
        isPublic: generatedFAQ.is_public || false
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
        const response = (await apiClient.put(`/admin/faqs/${faqForm.id}`, {
          title: faqForm.title.trim(),
          description: faqForm.description.trim(),
          context: faqForm.context.trim(),
          answer: faqForm.answer.trim(),
          additional_info: faqForm.additionalInfo.trim(),
          tags: faqForm.tags,
          is_active: faqForm.isActive,
          is_public: faqForm.isPublic,
          enhance_with_context: enhanceWithContext
        })) as any;

        if (enhanceWithContext) {
          // Update form with enhanced data
          const enhancedFAQ = response;
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
      isActive: faq.is_active !== false,
      isPublic: faq.is_public || false
    });
    setEditFAQOpen(true);
  };

  const handleDeleteFAQ = async (faqId: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen FAQ-Eintrag löschen möchten?')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/faqs/${faqId}`);
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
      isActive: true,
      isPublic: false
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
                    <TableCell>Öffentlich</TableCell>
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
                      <TableCell>
                        <Chip 
                          label={faq.is_public ? 'Ja' : 'Nein'} 
                          color={faq.is_public ? 'info' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{faq.created_by_name}</TableCell>
                      <TableCell>{formatDate(faq.created_at)}</TableCell>
                      <TableCell>
                        <Tooltip title="Verlinkungen verwalten">
                          <IconButton 
                            onClick={() => {
                              setSelectedFAQForLinking({id: faq.id, title: faq.title});
                              setLinkManagerOpen(true);
                            }}
                            color="info"
                          >
                            <LinkIcon />
                          </IconButton>
                        </Tooltip>
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
            <>
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
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Öffentliche Anzeige</InputLabel>
                <Select
                  value={faqForm.isPublic ? 'public' : 'private'}
                  onChange={(e) => setFaqForm({ ...faqForm, isPublic: e.target.value === 'public' })}
                >
                  <MenuItem value="public">Öffentlich (auf Startseite)</MenuItem>
                  <MenuItem value="private">Privat (nur für angemeldete Benutzer)</MenuItem>
                </Select>
              </FormControl>
            </>
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

      {/* Link Manager Dialog */}
      {linkManagerOpen && selectedFAQForLinking && (
        <Dialog open={linkManagerOpen} onClose={() => setLinkManagerOpen(false)} maxWidth="lg" fullWidth>
          <FAQLinkManager 
            faqId={selectedFAQForLinking.id}
            faqTitle={selectedFAQForLinking.title}
            onClose={() => setLinkManagerOpen(false)}
          />
        </Dialog>
      )}
    </Paper>
  );
};

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    systemName: 'Willi Mako',
    systemDescription: 'Intelligentes FAQ-System mit KI-Unterstützung',
    maxFileSize: 50,
    enableRegistration: true,
    enableGuestAccess: false,
    geminiApiKey: '',
    qdrantUrl: '',
    qdrantApiKey: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    enableEmailNotifications: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/settings') as any;
      setSettings(response);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showSnackbar('Fehler beim Laden der Einstellungen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await apiClient.put('/admin/settings', settings);
      showSnackbar('Einstellungen erfolgreich gespeichert', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showSnackbar('Fehler beim Speichern der Einstellungen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (type: string) => {
    try {
      await apiClient.post(`/admin/settings/test-${type}`);
      showSnackbar(`${type.toUpperCase()} Verbindung erfolgreich getestet`, 'success');
    } catch (error) {
      console.error(`Error testing ${type} connection:`, error);
      showSnackbar(`Fehler beim Testen der ${type.toUpperCase()} Verbindung`, 'error');
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Systemeinstellungen
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Konfigurieren Sie Systemeinstellungen, API-Schlüssel und andere administrative Optionen.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Allgemein" />
              <Tab label="API-Konfiguration" />
              <Tab label="E-Mail-Einstellungen" />
              <Tab label="Sicherheit" />
            </Tabs>
          </Paper>

          <Paper sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Allgemeine Einstellungen
                </Typography>
                <TextField
                  fullWidth
                  label="Systemname"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Systembeschreibung"
                  multiline
                  rows={3}
                  value={settings.systemDescription}
                  onChange={(e) => setSettings({ ...settings, systemDescription: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Maximale Dateigröße (MB)"
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Registrierung aktiviert</InputLabel>
                  <Select
                    value={settings.enableRegistration ? 'enabled' : 'disabled'}
                    onChange={(e) => setSettings({ ...settings, enableRegistration: e.target.value === 'enabled' })}
                  >
                    <MenuItem value="enabled">Aktiviert</MenuItem>
                    <MenuItem value="disabled">Deaktiviert</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Gastzugang</InputLabel>
                  <Select
                    value={settings.enableGuestAccess ? 'enabled' : 'disabled'}
                    onChange={(e) => setSettings({ ...settings, enableGuestAccess: e.target.value === 'enabled' })}
                  >
                    <MenuItem value="enabled">Aktiviert</MenuItem>
                    <MenuItem value="disabled">Deaktiviert</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  API-Konfiguration
                </Typography>
                <TextField
                  fullWidth
                  label="Gemini API-Schlüssel"
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Qdrant URL"
                    value={settings.qdrantUrl}
                    onChange={(e) => setSettings({ ...settings, qdrantUrl: e.target.value })}
                  />
                  <Button variant="outlined" onClick={() => handleTestConnection('qdrant')}>
                    Testen
                  </Button>
                </Box>
                <TextField
                  fullWidth
                  label="Qdrant API-Schlüssel"
                  type="password"
                  value={settings.qdrantApiKey}
                  onChange={(e) => setSettings({ ...settings, qdrantApiKey: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  E-Mail-Einstellungen
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>E-Mail-Benachrichtigungen</InputLabel>
                  <Select
                    value={settings.enableEmailNotifications ? 'enabled' : 'disabled'}
                    onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.value === 'enabled' })}
                  >
                    <MenuItem value="enabled">Aktiviert</MenuItem>
                    <MenuItem value="disabled">Deaktiviert</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="SMTP-Host"
                  value={settings.smtpHost}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="SMTP-Port"
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="SMTP-Benutzername"
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="SMTP-Passwort"
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                  />
                  <Button variant="outlined" onClick={() => handleTestConnection('smtp')}>
                    Testen
                  </Button>
                </Box>
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Sicherheitseinstellungen
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Sicherheitseinstellungen werden in einer zukünftigen Version verfügbar sein.
                </Alert>
                <TextField
                  fullWidth
                  label="Session-Timeout (Minuten)"
                  type="number"
                  value={60}
                  disabled
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Maximale Login-Versuche"
                  type="number"
                  value={5}
                  disabled
                  sx={{ mb: 2 }}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleSaveSettings}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                {saving ? 'Speichern...' : 'Einstellungen speichern'}
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

const AdminStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    totalChats: 0,
    totalMessages: 0,
    recentUsers: 0,
    recentChats: 0
  });
  const [detailedStats, setDetailedStats] = useState({
    usersByRole: [],
    chatsByMonth: [],
    messagesByDay: [],
    popularFAQs: []
  });
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchStats();
    fetchDetailedStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = (await apiClient.get('/admin/stats')) as any;
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
      showSnackbar('Fehler beim Laden der Statistiken', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedStats = async () => {
    try {
      const response = await apiClient.get('/admin/stats/detailed') as any;
      setDetailedStats(response);
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Statistiken
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Detaillierte Einblicke in die Nutzung und Performance des Systems.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Main Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Benutzer-Statistiken
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.totalUsers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gesamt registrierte Benutzer
                </Typography>
                <Typography variant="body2" color="success.main">
                  +{stats.recentUsers} neue in den letzten 30 Tagen
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Content-Statistiken
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.totalDocuments}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hochgeladene Dokumente
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Chat-Aktivität
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.totalChats}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gesamt erstellte Chats
                </Typography>
                <Typography variant="body2" color="success.main">
                  +{stats.recentChats} neue in den letzten 30 Tagen
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Nachrichten
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.totalMessages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gesamt ausgetauschte Nachrichten
                </Typography>
                <Typography variant="body2" color="info.main">
                  ⌀ {stats.totalChats > 0 ? Math.round(stats.totalMessages / stats.totalChats) : 0} Nachrichten pro Chat
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Detailed Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 2 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Benutzer nach Rollen
              </Typography>
              <List>
                {detailedStats.usersByRole.map((role: any, index) => (
                  <ListItem key={index}>
                    <Typography variant="body1">
                      {role.role === 'admin' ? 'Administratoren' : 'Benutzer'}: {role.count}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Beliebteste FAQs
              </Typography>
              <List>
                {detailedStats.popularFAQs.map((faq: any, index) => (
                  <ListItem key={index}>
                    <Box>
                      <Typography variant="body1">
                        {faq.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {faq.view_count} Aufrufe
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

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
    { label: 'Community', icon: <ForumIcon />, component: <CommunityAdminManager /> },
    { label: 'Quizzes', icon: <QuizIcon />, component: <AdminQuizManager /> },
    { label: 'Team E-Mail', icon: <EmailIcon />, component: <TeamEmailConfig /> },
    { label: 'Bulk-Klärungen', icon: <BulkIcon />, component: <BulkClarificationManager /> },
    { label: 'Chat-Config', icon: <SettingsIcon />, component: <AdminChatConfiguration /> },
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
