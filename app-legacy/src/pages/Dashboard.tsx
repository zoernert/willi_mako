import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Button,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
} from '@mui/material';
import {
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  Description as DocumentIcon,
  Speed as SpeedIcon,
  ElectricBolt as EnergyIcon,
  Business as BusinessIcon,
  AccessTime as TimeIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TimelineDashboardWidget } from '../components/Timeline/TimelineDashboardWidget';
import apiClient from '../services/apiClient';

interface UserStats {
  totalChats: number;
  totalMessages: number;
  recentActivity: number;
}

interface RecentChat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface FAQ {
  id: string;
  title: string;
  description: string;
  view_count: number;
  created_at: string;
  tags: string[];
}

const Dashboard: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user stats
      const statsResponse = await apiClient.get<UserStats>('/v2/user/stats');
      setStats(statsResponse || null);
      
      // Fetch recent chats
      const chatsResponse = await apiClient.get<RecentChat[]>('/chat/chats');
      const chatsData = chatsResponse || [];
      setRecentChats(Array.isArray(chatsData) ? chatsData.slice(0, 5) : []);
      
      // Fetch documents
      const documentsResponse = await apiClient.get<{ documents: Document[] }>('/documents');
      const documentsData = documentsResponse?.documents || [];
      setDocuments(Array.isArray(documentsData) ? documentsData.slice(0, 5) : []);
      
      // Fetch latest FAQs
      const faqsResponse = await apiClient.get<FAQ[]>('/public/faqs?limit=5');
      const faqsData = faqsResponse || [];
      setFaqs(Array.isArray(faqsData) ? faqsData : []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error to prevent further errors
      setStats(null);
      setRecentChats([]);
      setDocuments([]);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = async () => {
    try {
      const response = await apiClient.post<{ id: string }>('/chat/chats', { 
        title: 'Neuer Chat' 
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleStartChatFromFAQ = async (faqId: string) => {
    try {
      const response = await apiClient.post<{ chat: { id: string } }>(`/faqs/${faqId}/start-chat`);
      navigate(`/chat/${response.chat.id}`);
    } catch (error) {
      console.error('Error starting chat from FAQ:', error);
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

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Willkommen zurück, {state.user?.name}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Ihre KI-gestützte Wissensplattform für Marktkommunikation, Regulierung, Netzbetrieb und strategische Energiewirtschafts-Themen
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Welcome Card */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #147a50 0%, #4a9b73 100%)', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
                  <EnergyIcon sx={{ fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Mako Willi - Ihr KI-Coach für die Energiewirtschaft
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Marktkommunikation (EDIFACT, GPKE, WiM), Regulierung (BNetzA, EnWG, §14a), Netzbetrieb (TAB, SAIDI/SAIFI) und wissenschaftliche Studien
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleStartNewChat}
                    sx={{
                      mt: 2,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    }}
                    startIcon={<AddIcon />}
                  >
                    Neuen Chat starten
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* User Info Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 50, height: 50 }}>
                  {state.user?.name?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{state.user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {state.user?.email}
                  </Typography>
                </Box>
              </Box>
              {state.user?.company && (
                <Box display="flex" alignItems="center" gap={1} mt={2}>
                  <BusinessIcon fontSize="small" color="primary" />
                  <Typography variant="body2">{state.user.company}</Typography>
                </Box>
              )}
              <Chip
                label={state.user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
                color={state.user?.role === 'admin' ? 'secondary' : 'primary'}
                size="small"
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <ChatIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalChats || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Chats insgesamt
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.totalMessages || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nachrichten
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <SpeedIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats?.recentActivity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Letzte 30 Tage
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline Dashboard Widget */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <TimelineDashboardWidget />
        </Grid>

        {/* Recent Chats */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Letzte Chats
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recentChats.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="300px">
                <ChatIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Noch keine Chats vorhanden.
                  <br />
                  Starten Sie Ihren ersten Chat!
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleStartNewChat}
                  sx={{ mt: 2 }}
                  startIcon={<AddIcon />}
                >
                  Neuen Chat starten
                </Button>
              </Box>
            ) : (
              <List sx={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#a8a8a8',
                },
              }}>
                {recentChats.map((chat) => (
                  <ListItem key={chat.id} sx={{ borderRadius: 1, mb: 1, p: 0 }}>
                    <ListItemButton
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon>
                        <ChatIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={chat.title}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <TimeIcon fontSize="small" />
                          {formatDate(chat.updated_at)}
                        </Box>
                      }
                    />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Available Documents */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Meine Dokumente
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {documents.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="300px">
                <DocumentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Noch keine Dokumente in Ihrem Workspace.
                  <br />
                  Laden Sie Dokumente in Ihrem Workspace hoch.
                </Typography>
              </Box>
            ) : (
              <List sx={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#a8a8a8',
                },
              }}>
                {documents.map((doc) => (
                  <ListItem key={doc.id} sx={{ borderRadius: 1, mb: 1, p: 0 }}>
                    <ListItemButton
                      onClick={() => navigate('/workspace')}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon>
                        <DocumentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.title}
                        secondary={doc.description}
                    />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Latest FAQs */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Neueste FAQ-Einträge
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {faqs.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="200px">
                <ChatIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Noch keine FAQ-Einträge verfügbar.
                  <br />
                  FAQ-Einträge werden von Administratoren aus Chats erstellt.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {faqs.map((faq) => (
                  <Grid size={{ xs: 12, md: 4 }} key={faq.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {faq.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {faq.description}
                        </Typography>
                        <Box display="flex" gap={0.5} mb={2} sx={{ flexWrap: 'wrap' }}>
                          {faq.tags && faq.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{ 
                                backgroundColor: '#147a50',
                                color: 'white',
                                fontSize: '0.75rem',
                                mb: 0.5
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {faq.view_count} mal angesehen
                        </Typography>
                      </CardContent>
                      <Box sx={{ p: 2, pt: 0 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleStartChatFromFAQ(faq.id)}
                          startIcon={<ChatIcon />}
                          fullWidth
                        >
                          Chat starten
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
