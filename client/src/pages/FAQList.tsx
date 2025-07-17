import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import axios from 'axios';

interface FAQ {
  id: string;
  title: string;
  description: string;
  context: string;
  answer: string;
  additional_info: string;
  view_count: number;
  created_at: string;
  tags: string[];
}

const FAQList: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const navigate = useNavigate();
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/faqs');
      setFaqs(response.data.data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setError('Fehler beim Laden der FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatFromFAQ = async (faqId: string) => {
    if (!state.user) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(`/faqs/${faqId}/start-chat`);
      navigate(`/chat/${response.data.data.chat.id}`);
    } catch (error) {
      console.error('Error starting chat from FAQ:', error);
      showSnackbar('Fehler beim Starten des Chats', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box mt={4}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          FAQ - Häufig gestellte Fragen
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Finden Sie Antworten auf häufig gestellte Fragen zur Energiewirtschaft
        </Typography>
      </Box>

      {faqs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Keine FAQs verfügbar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Derzeit sind keine FAQ-Einträge vorhanden.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {faqs.map((faq) => (
            <Grid size={{ xs: 12, md: 6 }} key={faq.id}>
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
                    {faq.view_count} mal angesehen • {formatDate(faq.created_at)}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedFAQ(faq)}
                      startIcon={<ViewIcon />}
                      sx={{ flex: 1 }}
                    >
                      Details
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleStartChatFromFAQ(faq.id)}
                      startIcon={<ChatIcon />}
                      sx={{ flex: 1 }}
                    >
                      Chat starten
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAQ Details Modal */}
      {selectedFAQ && (
        <Paper
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
          onClick={() => setSelectedFAQ(null)}
        >
          <Box
            sx={{
              maxWidth: 800,
              maxHeight: '90vh',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: 2,
              overflow: 'auto',
              p: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h5" gutterBottom>
              {selectedFAQ.title}
            </Typography>
            <Box display="flex" gap={0.5} mb={2} sx={{ flexWrap: 'wrap' }}>
              {selectedFAQ.tags && selectedFAQ.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{ 
                    backgroundColor: '#147a50',
                    color: 'white',
                    mb: 0.5
                  }}
                />
              ))}
            </Box>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Beschreibung
            </Typography>
            <Typography variant="body1" paragraph>
              {selectedFAQ.description}
            </Typography>
            
            {selectedFAQ.context && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Kontext
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedFAQ.context}
                </Typography>
              </>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Antwort
            </Typography>
            <MarkdownRenderer>
              {selectedFAQ.answer}
            </MarkdownRenderer>
            
            {selectedFAQ.additional_info && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Zusätzliche Informationen
                </Typography>
                <MarkdownRenderer>
                  {selectedFAQ.additional_info}
                </MarkdownRenderer>
              </>
            )}
            
            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                onClick={() => handleStartChatFromFAQ(selectedFAQ.id)}
                startIcon={<ChatIcon />}
              >
                Chat zu diesem Thema starten
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedFAQ(null)}
              >
                Schließen
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default FAQList;
