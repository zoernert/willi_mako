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
  Snackbar
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
  Visibility,
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
import APIKeyUsageMetricsLegacy from '../components/admin/APIKeyUsageMetricsLegacy';
import AdminArticlesManager from '../components/admin/AdminArticlesManager';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SearchIcon from '@mui/icons-material/Search';
import BugReportIcon from '@mui/icons-material/BugReport';

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
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [aiKeyStatus, setAiKeyStatus] = useState<Record<string, { hasKey: boolean; status: string; systemKeyAllowed?: boolean }>>({});
  const [userForm, setUserForm] = useState({
    id: '',
    email: '',
    name: '',
    role: 'user',
    isActive: true,
    canAccessCs30: false // CR-CS30: Add cs30 access field
  });
  const [engagement, setEngagement] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users') as any;
      setUsers(Array.isArray(response) ? response : []);
      // Optionally prefetch AI key status for listed users (best-effort, ignore failures)
      try {
        const results = await Promise.all(
          (Array.isArray(response) ? response : []).slice(0, 25).map(async (u: any) => {
            try {
              const s = await apiClient.get(`/admin/users/${u.id}/ai-key/status`) as any;
              return { id: u.id, s };
            } catch { return null; }
          })
        );
        const map: Record<string, any> = {};
        results.filter(Boolean).forEach((r: any) => { map[r.id] = r.s; });
        setAiKeyStatus(map);
      } catch {}
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

  const handleViewUserDetails = async (userId: string) => {
    try {
      setUserDetailsLoading(true);
      const response = await apiClient.get(`/admin/users/${userId}/details`) as any;
      setUserDetails(response);
      try {
        const s = await apiClient.get(`/admin/users/${userId}/ai-key/status`) as any;
        setAiKeyStatus(prev => ({ ...prev, [userId]: s }));
      } catch {}
      // fetch engagement status
      const eng = await apiClient.get(`/engagement/admin/engagement/${userId}`) as any;
      setEngagement(eng.items || []);
      // preset selected chat to most recent if available
      setSelectedChatId(response?.recent_chats?.[0]?.id);
      setUserDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      showSnackbar('Fehler beim Laden der Benutzerdetails', 'error');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const sendEngagementMail = async (type: 'layout_feedback' | 'chat_feedback', chatId?: string) => {
    if (!selectedUser && !userDetails) return;
    const uid = (selectedUser?.id) || (userDetails?.id);
    try {
      await apiClient.post('/engagement/admin/engagement/send', { userId: uid, type, chatId });
      showSnackbar('E-Mail versendet', 'success');
      const eng = await apiClient.get(`/engagement/admin/engagement/${uid}`) as any;
      setEngagement(eng.items || []);
    } catch (e:any) {
      showSnackbar(e.message || 'Versand fehlgeschlagen', 'error');
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
                <TableCell>Gemini-Key</TableCell>
                <TableCell>System-Key erlaubt</TableCell>
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
                  <TableCell>
                    {aiKeyStatus[user.id]?.hasKey ? (
                      <Chip size="small" label={aiKeyStatus[user.id]?.status === 'valid' ? 'Vorhanden (gültig)' : 'Vorhanden (unbekannt/ungültig)'} color={aiKeyStatus[user.id]?.status === 'valid' ? 'success' : 'warning'} />
                    ) : (
                      <Chip size="small" label="Kein persönlicher Key" />
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={<Checkbox checked={aiKeyStatus[user.id]?.systemKeyAllowed !== false} onChange={async (e) => {
                        try {
                          const systemKeyAllowed = e.target.checked;
                          await apiClient.patch(`/admin/users/${user.id}/ai-key-policy`, { systemKeyAllowed });
                          const s = await apiClient.get(`/admin/users/${user.id}/ai-key/status`) as any;
                          setAiKeyStatus(prev => ({ ...prev, [user.id]: s }));
                        } catch (err) { console.error(err); }
                      }} />}
                      label={aiKeyStatus[user.id]?.systemKeyAllowed !== false ? 'Erlaubt' : 'Verboten'}
                    />
                  </TableCell>
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
                    <Tooltip title="Details anzeigen">
                      <IconButton onClick={() => handleViewUserDetails(user.id)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Persönlichen Key entfernen">
                      <span>
                        <IconButton disabled={!aiKeyStatus[user.id]?.hasKey} onClick={async ()=>{
                          if (!window.confirm('Persönlichen Gemini-Schlüssel dieses Benutzers löschen?')) return;
                          try {
                            await apiClient.delete(`/admin/users/${user.id}/ai-key`);
                            const s = await apiClient.get(`/admin/users/${user.id}/ai-key/status`) as any;
                            setAiKeyStatus(prev => ({ ...prev, [user.id]: s }));
                          } catch (err) { console.error(err); }
                        }}>
                          <DeleteIcon />
                        </IconButton>
                      </span>
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

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onClose={() => setUserDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Benutzerdetails
          {userDetailsLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </DialogTitle>
        <DialogContent>          {userDetails ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* Erste Zeile: Persönliche und System-Informationen */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                {/* Persönliche Informationen */}
                <Box sx={{ flex: 1 }}>
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      Persönliche Informationen
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                      <Typography variant="body1">{userDetails.full_name || userDetails.name || '-'}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">E-Mail</Typography>
                      <Typography variant="body1">{userDetails.email}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Firma</Typography>
                      <Typography variant="body1">{userDetails.company || '-'}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Registriert am</Typography>
                      <Typography variant="body1">{formatDate(userDetails.created_at)}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Letztes Login</Typography>
                      <Typography variant="body1">{userDetails.last_login ? formatDate(userDetails.last_login) : 'Nie'}</Typography>
                    </Box>
                  </Paper>
                </Box>
                
                {/* System-Informationen */}
                <Box sx={{ flex: 1 }}>
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      System-Informationen
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Rolle</Typography>
                      <Chip 
                        label={userDetails.role} 
                        color={userDetails.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                      <Chip 
                        label={userDetails.is_active !== false ? 'Aktiv' : 'Inaktiv'} 
                        color={userDetails.is_active !== false ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">CS30-Zugriff</Typography>
                      <Chip 
                        label={userDetails.can_access_cs30 ? 'Ja' : 'Nein'} 
                        color={userDetails.can_access_cs30 ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Paper>
                </Box>
              </Box>
              
              {/* M2C Rollen */}
              <Box>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                  <Typography variant="h6" gutterBottom>
                    M2C Rollen
                  </Typography>
                  {userDetails.m2c_roles && userDetails.m2c_roles.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {userDetails.m2c_roles.map((role: string, index: number) => (
                        <Chip key={index} label={role} color="info" size="small" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine M2C Rollen zugewiesen
                    </Typography>
                  )}
                </Paper>
              </Box>
              
              {/* Zweite Zeile: Chat- und Quiz-Aktivität */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                {/* Chat-Aktivität */}
                <Box sx={{ flex: 1 }}>
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      Chat-Aktivität
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Anzahl Chats</Typography>
                      <Typography variant="body1">{userDetails.chat_count || 0}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Anzahl Nachrichten</Typography>
                      <Typography variant="body1">{userDetails.message_count || 0}</Typography>
                    </Box>
                  </Paper>
                </Box>
                
                {/* Quiz-Aktivität */}
                <Box sx={{ flex: 1 }}>
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      Quiz-Aktivität
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Absolvierte Quizzes</Typography>
                      <Typography variant="body1">{userDetails.completed_quizzes || 0}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Durchschnittliche Punktzahl</Typography>
                      <Typography variant="body1">
                        {userDetails.avg_quiz_score ? `${userDetails.avg_quiz_score}%` : '-'}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </Box>
              
              {/* Letzte Chats */}
              <Box>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                  <Typography variant="h6" gutterBottom>
                    Letzte Chats
                  </Typography>
                  {userDetails.recent_chats && userDetails.recent_chats.length > 0 ? (
                    <List>
                      {userDetails.recent_chats.map((chat: any) => (
                        <ListItem key={chat.id} divider sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">
                              {chat.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(chat.created_at)} • {chat.message_count} Nachrichten
                            </Typography>
                          </Box>
                          <Button size="small" variant="outlined" onClick={async ()=>{
                            try {
                              const r = await apiClient.post(`/admin/chats/${chat.id}/clone-as-admin`);
                              showSnackbar('Chat als Admin kopiert', 'success');
                            } catch (e:any) {
                              showSnackbar(e.message || 'Klonen fehlgeschlagen', 'error');
                            }
                          }}>Als Admin kopieren</Button>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine Chats vorhanden
                    </Typography>
                  )}
                </Paper>
              </Box>

              {/* Engagement Mails */}
              <Box>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                  <Typography variant="h6" gutterBottom>
                    Engagement-Mails
                  </Typography>
                  {userDetails?.recent_chats?.length ? (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">Chat für Bewertung auswählen</Typography>
                      <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                        <Select value={selectedChatId || ''} onChange={(e)=> setSelectedChatId(e.target.value as string)} displayEmpty>
                          {userDetails.recent_chats.map((c:any)=> (
                            <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  ) : null}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Button size="small" variant="contained" startIcon={<EmailIcon />} onClick={() => sendEngagementMail('layout_feedback')} disabled={!!engagement.find(e=>e.type==='layout_feedback')}>
                      Layout-Feedback anfragen
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={() => sendEngagementMail('chat_feedback', selectedChatId)} disabled={!!engagement.find(e=>e.type==='chat_feedback')}>
                      Chat-Feedback anfragen
                    </Button>
                  </Box>
                  {engagement.length>0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Typ</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Bewertung</TableCell>
                          <TableCell>Nützlich</TableCell>
                          <TableCell>Kommentar</TableCell>
                          <TableCell>Gesendet am</TableCell>
                          <TableCell>Rückmeldung am</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {engagement.map((e:any)=> (
                          <TableRow key={e.id}>
                            <TableCell>{e.type}</TableCell>
                            <TableCell>
                              <Chip size="small" label={e.status} color={e.status==='responded'?'success':'default'} />
                            </TableCell>
                            <TableCell>{e.feedback?.stars ? `${e.feedback.stars} ★` : '-'}</TableCell>
                            <TableCell>{e.feedback?.useful === true ? 'Ja' : e.feedback?.useful === false ? 'Nein' : '-'}</TableCell>
                            <TableCell>
                              {e.feedback?.comment ? (
                                <Tooltip title={e.feedback.comment}>
                                  <span>{String(e.feedback.comment).length > 40 ? `${String(e.feedback.comment).slice(0,40)}…` : e.feedback.comment}</span>
                                </Tooltip>
                              ) : '-' }
                            </TableCell>
                            <TableCell>{new Date(e.sent_at).toLocaleString('de-DE')}</TableCell>
                            <TableCell>{e.feedback?.feedback_at ? new Date(e.feedback.feedback_at).toLocaleString('de-DE') : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Noch keine Engagement-Mails versendet</Typography>
                  )}
                </Paper>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Keine Daten verfügbar
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsOpen(false)}>Schließen</Button>
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
  const [artifacts, setArtifacts] = useState<any | null>(null);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [sectionGenLoading, setSectionGenLoading] = useState(false);
  const [extendFieldLoading, setExtendFieldLoading] = useState(false);
  const [outlineNotes, setOutlineNotes] = useState('');
  const [sectionForm, setSectionForm] = useState({ type: 'answer' as 'description' | 'context' | 'answer' | 'additional_info', order: 1, target_length: 600, sectionHint: '' });
  const [extendForm, setExtendForm] = useState({ field: 'answer' as 'description' | 'context' | 'answer' | 'additional_info', target_length: 1500 });
  const [lastGeneratedSection, setLastGeneratedSection] = useState<string>('');
  const [uiBusy, setUiBusy] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Local date formatter for this component
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    fetchAvailableTags();
    if (activeSubTab === 0) {
      fetchChats();
    } else if (activeSubTab === 1) {
      fetchFAQs();
    }
  }, [activeSubTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load artifacts when editing/creating FAQ with id
  useEffect(() => {
    const shouldLoad = (editFAQOpen || createFAQOpen) && Boolean(faqForm.id);
    if (!shouldLoad) return;
    loadArtifacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFAQOpen, createFAQOpen, faqForm.id]);

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
      const missingFields = [] as string[];
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
      isPublic: faq.is_public !== false
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
    setArtifacts(null);
    setOutlineNotes('');
    setLastGeneratedSection('');
  };

  const loadArtifacts = async () => {
    if (!faqForm.id) return;
    try {
      setLoadingArtifacts(true);
      const res = await apiClient.get(`/admin/faqs/${faqForm.id}/artifacts`) as any;
      setArtifacts(res || null);
      const existingOutline = res?.artifacts?.outline?.notes || '';
      if (existingOutline) setOutlineNotes(existingOutline);
    } catch (e:any) {
      console.error('Error loading artifacts', e);
      showSnackbar(e.message || 'Artefakte konnten nicht geladen werden', 'error');
    } finally {
      setLoadingArtifacts(false);
    }
  };

  // Edit/delete section hooks
  const editArtifactSection = async (sec: any, patch: Partial<{ title: string; order: number; type: 'description'|'context'|'answer'|'additional_info'; content: string }>) => {
    if (!faqForm.id || !sec?.id) return;
    try {
      setUiBusy(true);
      const updated = await apiClient.patch(`/admin/faqs/${faqForm.id}/artifacts/section/${sec.id}`, patch) as any;
      setArtifacts(updated);
      showSnackbar('Abschnitt aktualisiert', 'success');
    } catch (e:any) {
      console.error('Edit section failed', e);
      showSnackbar(e.message || 'Fehler beim Aktualisieren des Abschnitts', 'error');
    } finally {
      setUiBusy(false);
    }
  };

  const deleteArtifactSection = async (sec: any) => {
    if (!faqForm.id || !sec?.id) return;
    if (!window.confirm('Diesen Abschnitt wirklich löschen?')) return;
    try {
      setUiBusy(true);
      const updated = await apiClient.delete(`/admin/faqs/${faqForm.id}/artifacts/section/${sec.id}`) as any;
      setArtifacts(updated);
      showSnackbar('Abschnitt gelöscht', 'success');
    } catch (e:any) {
      console.error('Delete section failed', e);
      showSnackbar(e.message || 'Fehler beim Löschen des Abschnitts', 'error');
    } finally {
      setUiBusy(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!faqForm.id) return;
    try {
      setOutlineLoading(true);
      const payload: any = { notes: outlineNotes.trim() || undefined };
      const result = await apiClient.post(`/admin/faqs/${faqForm.id}/artifacts/outline`, payload) as any;
      setArtifacts(result);
      const notes = result?.artifacts?.outline?.notes || '';
      setOutlineNotes(notes);
      showSnackbar('Outline erstellt/aktualisiert', 'success');
    } catch (e:any) {
      console.error('Outline generation failed', e);
      showSnackbar(e.message || 'Fehler bei Outline-Generierung', 'error');
    } finally {
      setOutlineLoading(false);
    }
  };

  const appendToField = (field: 'description' | 'context' | 'answer' | 'additional_info', content: string) => {
    const keyMap: any = { description: 'description', context: 'context', answer: 'answer', additional_info: 'additionalInfo' };
    const formKey = keyMap[field];
    setFaqForm((prev:any) => ({
      ...prev,
      [formKey]: `${(prev[formKey] || '').trim()}\n\n${content}`.trim()
    }));
  };

  const handleGenerateSection = async () => {
    if (!faqForm.id) return;
    try {
      setSectionGenLoading(true);
      const payload: any = {
        type: sectionForm.type,
        order: sectionForm.order,
        target_length: sectionForm.target_length,
        section: sectionForm.sectionHint?.trim() || undefined
      };
      const res = await apiClient.post(`/admin/faqs/${faqForm.id}/artifacts/section`, payload) as any;
      setArtifacts(res);
      const secs = res?.artifacts?.sections || [];
      const last = secs[secs.length - 1];
      if (last?.content) {
        setLastGeneratedSection(last.content);
        appendToField(sectionForm.type, last.content);
      }
      showSnackbar('Abschnitt generiert und in Formular eingefügt', 'success');
    } catch (e:any) {
      console.error('Section generation failed', e);
      showSnackbar(e.message || 'Fehler bei Abschnitt-Generierung', 'error');
    } finally {
      setSectionGenLoading(false);
    }
  };

  const handleInsertArtifactSection = (sec: any) => {
    if (!sec?.content || !sec?.type) return;
    appendToField(sec.type, sec.content);
    showSnackbar('Abschnitt in Formular eingefügt', 'success');
  };

  const handleExtendField = async () => {
    if (!faqForm.id) return;
    try {
      setExtendFieldLoading(true);
      const res: any = await apiClient.post(`/admin/faqs/${faqForm.id}/extend-field`, { field: extendForm.field, target_length: extendForm.target_length });
      // Update form from response
      setFaqForm((prev:any) => ({
        ...prev,
        description: res.description ?? prev.description,
        context: res.context ?? prev.context,
        answer: res.answer ?? prev.answer,
        additionalInfo: res.additional_info ?? prev.additionalInfo
      }));
      // Reload artifacts to reflect trace
      loadArtifacts();
      showSnackbar('Feld erfolgreich erweitert', 'success');
    } catch (e:any) {
      console.error('Extend field failed', e);
      showSnackbar(e.message || 'Fehler bei Feld-Erweiterung', 'error');
    } finally {
      setExtendFieldLoading(false);
    }
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
              ? 'Bearbeiten Sie die FAQ-Inhalte nach Bedarf. Nutzen Sie "Mit Kontext erweitern" oder die Artefakt-Funktionen, um lange Inhalte strukturiert zu erstellen.'
              : 'Diese Inhalte wurden automatisch von der KI generiert. Verwenden Sie "Mit Kontext erweitern" oder die Artefakt-Funktionen, um zusätzliche Informationen zu integrieren.'
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
              onChange={(e) => setFaqForm({ ...faqForm, tags: (e.target.value as string[]) })}
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

          {/* --- KI-Artefakte Bereich --- */}
          {faqForm.id ? (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                KI-Artefakte: Outline, Abschnitte, Feld-Erweiterung
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Erstellen und verwalten Sie lange FAQ-Inhalte iterativ. Generierte Abschnitte können gezielt in die Felder eingefügt werden.
              </Typography>

              {/* Outline */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Outline</Typography>
                  {loadingArtifacts && <CircularProgress size={18} />}
                </Box>
                <TextField
                  fullWidth
                  label="Redaktionelle Hinweise für die Outline (optional)"
                  multiline
                  minRows={2}
                  value={outlineNotes}
                  onChange={(e)=> setOutlineNotes(e.target.value)}
                  sx={{ mt: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" onClick={loadArtifacts}>Aktuelle Artefakte laden</Button>
                  <Button size="small" variant="contained" onClick={handleGenerateOutline} disabled={outlineLoading}>
                    {outlineLoading ? <CircularProgress size={18} /> : 'Outline generieren/aktualisieren'}
                  </Button>
                </Box>
                {artifacts?.artifacts?.outline?.notes ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Letzte Outline</Typography>
                    <Paper variant="outlined" sx={{ p: 1, maxHeight: 180, overflow: 'auto' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{artifacts.artifacts.outline.notes}</pre>
                    </Paper>
                  </Box>
                ) : null}
              </Paper>

              {/* Section Generator */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">Abschnitt generieren</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 2fr 3fr' }, gap: 2 }}>
                    <Box>
                      <FormControl fullWidth size="small">
                        <InputLabel>Feld</InputLabel>
                        <Select
                          value={sectionForm.type}
                          label="Feld"
                          onChange={(e)=> setSectionForm({ ...sectionForm, type: e.target.value as any })}
                        >
                          <MenuItem value="description">Beschreibung</MenuItem>
                          <MenuItem value="context">Kontext</MenuItem>
                          <MenuItem value="answer">Antwort</MenuItem>
                          <MenuItem value="additional_info">Zusätzliche Informationen</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Reihenfolge"
                        type="number"
                        value={sectionForm.order}
                        onChange={(e)=> setSectionForm({ ...sectionForm, order: parseInt(e.target.value || '1', 10) })}
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ziel-Länge"
                        type="number"
                        value={sectionForm.target_length}
                        onChange={(e)=> setSectionForm({ ...sectionForm, target_length: parseInt(e.target.value || '600', 10) })}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Hinweise / Bulletpoints für den Abschnitt (optional)"
                      multiline
                      minRows={2}
                      value={sectionForm.sectionHint}
                      onChange={(e)=> setSectionForm({ ...sectionForm, sectionHint: e.target.value })}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="contained" onClick={handleGenerateSection} disabled={sectionGenLoading}>
                    {sectionGenLoading ? <CircularProgress size={18} /> : 'Abschnitt generieren und einfügen'}
                  </Button>
                </Box>
                {lastGeneratedSection ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Zuletzt generierter Abschnitt</Typography>
                    <Paper variant="outlined" sx={{ p: 1, maxHeight: 180, overflow: 'auto' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {lastGeneratedSection}
                      </ReactMarkdown>
                    </Paper>
                  </Box>
                ) : null}
              </Paper>

              {/* Artifacts viewer */}
              {artifacts?.artifacts?.sections?.length ? (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1">Generierte Abschnitte</Typography>
                  <List>
                    {artifacts.artifacts.sections.map((sec:any, idx:number) => (
                      <ListItem key={`${sec.id || idx}` } divider sx={{ display: 'block' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2">{sec.title || sec.type} • {sec.type} • #{sec.order}</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" onClick={() => handleInsertArtifactSection(sec)} disabled={uiBusy}>In Feld einfügen</Button>
                            <Button size="small" variant="outlined" onClick={() => editArtifactSection(sec, { title: prompt('Neuer Titel', sec.title) || sec.title })} disabled={uiBusy}>Bearbeiten</Button>
                            <Button size="small" color="error" onClick={() => deleteArtifactSection(sec)} disabled={uiBusy}>Löschen</Button>
                          </Box>
                        </Box>
                        {sec?.content ? (
                          <Box sx={{ mt: 1 }}>
                            <Paper variant="outlined" sx={{ p: 1, maxHeight: 160, overflow: 'auto' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {sec.content}
                              </ReactMarkdown>
                            </Paper>
                          </Box>
                        ) : null}
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              ) : null}

              {/* Extend Field */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1">Feld iterativ erweitern</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 0.5 }}>
                  <Box>
                    <FormControl fullWidth size="small">
                      <InputLabel>Feld</InputLabel>
                      <Select
                        value={extendForm.field}
                        label="Feld"
                        onChange={(e)=> setExtendForm({ ...extendForm, field: e.target.value as any })}
                      >
                        <MenuItem value="description">Beschreibung</MenuItem>
                        <MenuItem value="context">Kontext</MenuItem>
                        <MenuItem value="answer">Antwort</MenuItem>
                        <MenuItem value="additional_info">Zusätzliche Informationen</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Ziel-Länge (Wörter)"
                      value={extendForm.target_length}
                      onChange={(e)=> setExtendForm({ ...extendForm, target_length: parseInt(e.target.value || '1500', 10) })}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button size="small" variant="contained" onClick={handleExtendField} disabled={extendFieldLoading}>
                    {extendFieldLoading ? <CircularProgress size={18} /> : 'Feld erweitern'}
                  </Button>
                </Box>
              </Paper>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>FAQ muss eine ID haben, um Artefakte zu erzeugen. Erstellen Sie zuerst den FAQ-Eintrag.</Alert>
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

  const handleTestConnection = async (type: 'qdrant' | 'smtp') => {
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
  const [activeTab, setActiveTab] = useState(0);

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
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="System-Metriken" />
          <Tab label="API-Schlüssel" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <React.Fragment>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <React.Fragment>
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
            </React.Fragment>
          )}
        </React.Fragment>
      )}
      
      {activeTab === 1 && (
        <APIKeyUsageMetricsLegacy />
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
  { label: 'Artikel (MDX)', icon: <DocumentsIcon />, component: <AdminArticlesManager /> },
    { label: 'Community', icon: <ForumIcon />, component: <CommunityAdminManager /> },
    { label: 'Quizzes', icon: <QuizIcon />, component: <AdminQuizManager /> },
  { label: 'Search Lab', icon: <SearchIcon />, component: <AdminSearchLab /> },
  { label: 'Chatflow Inspector', icon: <BugReportIcon />, component: <AdminChatflowInspector /> },
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

// --- New: Admin Search Lab component ---
const AdminSearchLab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'guided'|'simple'|'hybrid'|'optimized'|'faqs'|'cs30'>('guided');
  const [limit, setLimit] = useState(20);
  const [alpha, setAlpha] = useState(0.75);
  const [scoreThreshold, setScoreThreshold] = useState(0.5);
  const [outlineScoping, setOutlineScoping] = useState(true);
  const [excludeVisual, setExcludeVisual] = useState(true);
  const [userScope, setUserScope] = useState('');
  const [teamScope, setTeamScope] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { showSnackbar } = useSnackbar();

  const runSearch = async () => {
    if (!query.trim()) { showSnackbar('Bitte Suchbegriff eingeben', 'warning'); return; }
    try {
      setLoading(true);
      const body:any = { query, mode, limit, scoreThreshold, alpha, outlineScoping, excludeVisual };
      if (userScope) body.userId = userScope; if (teamScope) body.teamId = teamScope;
      const r:any = await apiClient.post('/admin/semantic-search', body);
      setResults(r);
    } catch (e:any) {
      showSnackbar(e.message || 'Suche fehlgeschlagen', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Semantic Search Lab</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Teste verschiedene Suchmodi und Parameter, um Retrieval zu optimieren.</Typography>
      <Paper sx={{ p:2, mb:2, display:'grid', gap:1, gridTemplateColumns:'1fr' }}>
        <TextField label="Query" value={query} onChange={(e)=>setQuery(e.target.value)} fullWidth />
        <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:1 }}>
          <FormControl fullWidth>
            <InputLabel>Modus</InputLabel>
            <Select value={mode} label="Modus" onChange={(e)=>setMode(e.target.value as any)}>
              <MenuItem value="guided">Guided</MenuItem>
              <MenuItem value="simple">Simple</MenuItem>
              <MenuItem value="hybrid">Hybrid</MenuItem>
              <MenuItem value="optimized">Optimized</MenuItem>
              <MenuItem value="faqs">FAQs</MenuItem>
              <MenuItem value="cs30">CS30</MenuItem>
            </Select>
          </FormControl>
          <TextField type="number" label="Limit" value={limit} onChange={(e)=>setLimit(parseInt(e.target.value||'0')||20)} />
          <TextField type="number" label="Score Threshold" value={scoreThreshold} onChange={(e)=>setScoreThreshold(parseFloat(e.target.value||'0')||0.5)} />
          {(mode==='guided'||mode==='hybrid') && (
            <TextField type="number" label="Alpha" value={alpha} onChange={(e)=>setAlpha(parseFloat(e.target.value||'0')||0.75)} />
          )}
          {mode==='guided' && (
            <>
              <FormControlLabel control={<Checkbox checked={outlineScoping} onChange={(e)=>setOutlineScoping(e.target.checked)} />} label="Outline Scoping" />
              <FormControlLabel control={<Checkbox checked={excludeVisual} onChange={(e)=>setExcludeVisual(e.target.checked)} />} label="Visual ausschließen" />
            </>
          )}
          {mode==='hybrid' && (
            <>
              <TextField label="User Scope (optional userId)" value={userScope} onChange={(e)=>setUserScope(e.target.value)} />
              <TextField label="Team Scope (optional teamId)" value={teamScope} onChange={(e)=>setTeamScope(e.target.value)} />
            </>
          )}
        </Box>
        <Box sx={{ display:'flex', gap:1, mt:1 }}>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={runSearch} disabled={loading}>
            {loading ? 'Suchen…' : 'Suchen'}
          </Button>
        </Box>
      </Paper>
      {results && (
        <Paper sx={{ p:2 }}>
          <Typography variant="subtitle1" gutterBottom>Ergebnisse ({Array.isArray(results?.results) ? results.results.length : (results?.results?.results?.length||0)})</Typography>
          <List>
            {(Array.isArray(results?.results) ? results.results : (results?.results?.results||[])).map((r:any, idx:number)=> (
              <ListItem key={r.id || idx} divider>
                <Box>
                  <Typography variant="body2">Score: {(r.merged_score ?? r.score ?? 0).toFixed(3)}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.payload?.title || r.payload?.document_name || r.payload?.type || 'Item'}</Typography>
                  {r.payload?.text && (
                    <Typography variant="body2" sx={{ mt:0.5 }}>
                      {String(r.payload.text).slice(0,240)}{String(r.payload.text).length>240?'…':''}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

// --- New: Admin Chatflow Inspector ---
const AdminChatflowInspector: React.FC = () => {
  const [query, setQuery] = useState('');
  const [chatId, setChatId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [useDetailed, setUseDetailed] = useState(true);
  const [useIterative, setUseIterative] = useState(false);
  const [maxIterations, setMaxIterations] = useState(2);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { showSnackbar } = useSnackbar();

  const runPreview = async () => {
    if (!query.trim()) { showSnackbar('Bitte eine Nutzerfrage eingeben', 'warning'); return; }
    try {
      setLoading(true);
      const r:any = await apiClient.post('/admin/chatflow/preview', {
        query, chatId: chatId || undefined, targetUserId: targetUserId || undefined,
        useDetailedIntentAnalysis: useDetailed,
        overridePipeline: useIterative ? { useIterativeRefinement: true, maxIterations, confidenceThreshold } : undefined
      });
      setPreview(r);
    } catch (e:any) {
      showSnackbar(e.message || 'Vorschau fehlgeschlagen', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Chatflow Inspector</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Intercept und steuere die Antworterstellung: Intent-Analyse, Retrieval, Iterationen und Entscheidungen.
      </Typography>
      <Paper sx={{ p:2, mb:2, display:'grid', gap:1 }}>
        <TextField label="Nutzerfrage" value={query} onChange={(e)=>setQuery(e.target.value)} fullWidth />
        <Box sx={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:1 }}>
          <TextField label="Chat-ID (optional)" value={chatId} onChange={(e)=>setChatId(e.target.value)} />
          <TextField label="User-ID (optional)" value={targetUserId} onChange={(e)=>setTargetUserId(e.target.value)} />
          <FormControlLabel control={<Checkbox checked={useDetailed} onChange={(e)=>setUseDetailed(e.target.checked)} />} label="Detaillierte Intent-Analyse" />
          <FormControlLabel control={<Checkbox checked={useIterative} onChange={(e)=>setUseIterative(e.target.checked)} />} label="Iterative Verfeinerung" />
          {useIterative && (
            <>
              <TextField type="number" label="Max Iterationen" value={maxIterations} onChange={(e)=>setMaxIterations(parseInt(e.target.value||'0')||1)} />
              <TextField type="number" label="Confidence Threshold" value={confidenceThreshold} onChange={(e)=>setConfidenceThreshold(parseFloat(e.target.value||'0')||0.8)} />
            </>
          )}
        </Box>
        <Box sx={{ display:'flex', gap:1, mt:1 }}>
          <Button variant="contained" onClick={runPreview} disabled={loading}>{loading ? 'Analysiere…' : 'Vorschau ausführen'}</Button>
        </Box>
      </Paper>

      {preview && (
        <Box sx={{ display:'grid', gap:2 }}>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6">Zusammenfassung</Typography>
            <Typography variant="body2" sx={{ mt:1 }}>Qualität: {preview.result?.finalQuality?.toFixed?.(2) ?? '-'}</Typography>
            <Typography variant="body2">Iterationen: {preview.result?.iterationsUsed ?? '-'}</Typography>
            <Typography variant="body2">API Calls: {preview.result?.apiCallsUsed ?? '-'}</Typography>
            <Typography variant="body2">Hybrid: {preview.result?.hybridSearchUsed ? `Ja (α=${preview.result?.hybridSearchAlpha ?? '-'})` : 'Nein'}</Typography>
          </Paper>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6">Pipeline-Entscheidungen</Typography>
            <pre style={{ whiteSpace:'pre-wrap', margin:0 }}>{JSON.stringify(preview.result?.pipelineDecisions, null, 2)}</pre>
          </Paper>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6">QA-Analyse</Typography>
            <pre style={{ whiteSpace:'pre-wrap', margin:0 }}>{JSON.stringify(preview.result?.qaAnalysis, null, 2)}</pre>
          </Paper>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6">Reasoning Steps</Typography>
            <List>
              {(preview.result?.reasoningSteps || []).map((s:any, idx:number)=> (
                <ListItem key={idx} divider>
                  <Box>
                    <Typography variant="subtitle2">{s.step}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(s.timestamp).toLocaleString('de-DE')} • {s.duration ? `${s.duration}ms` : ''}</Typography>
                    {s.description && <Typography variant="body2" sx={{ mt:0.5 }}>{s.description}</Typography>}
                    {s.qdrantQueries?.length ? <Typography variant="caption">Qdrant Queries: {s.qdrantQueries.length}</Typography> : null}
                    {s.qdrantResults != null ? <Typography variant="caption" sx={{ ml:1 }}>Results: {s.qdrantResults}</Typography> : null}
                    {s.error && <Alert severity="warning" sx={{ mt:1 }}>{s.error}</Alert>}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
          <Paper sx={{ p:2 }}>
            <Typography variant="h6">Antwort (Vorschau)</Typography>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview.result?.response || ''}</ReactMarkdown>
          </Paper>
        </Box>
      )}
    </Box>
  );
};
