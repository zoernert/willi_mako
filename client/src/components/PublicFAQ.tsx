import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import apiClient from '../services/apiClient';
import { FAQWithLinks } from '../types/faq';
import FAQItem from '../components/FAQ/FAQItem';
import './PublicFAQ.css';

export const PublicFAQ: React.FC = () => {
  const [publicFAQs, setPublicFAQs] = useState<FAQWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicFAQs();
  }, []);

  const fetchPublicFAQs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/public/faqs?limit=20') as any;
      setPublicFAQs(response.data);
    } catch (error) {
      console.error('Error fetching public FAQs:', error);
      setError('Fehler beim Laden der FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleFAQClick = (faqId: string) => {
    setSelectedFAQ(faqId);
    // Scroll to FAQ
    const element = document.getElementById(`faq-${faqId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Highlight the FAQ temporarily
      element.classList.add('highlighted');
      setTimeout(() => {
        element.classList.remove('highlighted');
      }, 3000);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (publicFAQs.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Derzeit sind keine öffentlichen FAQs verfügbar.
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" className="public-faq">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
          Häufig gestellte Fragen
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Finden Sie Antworten auf die häufigsten Fragen zur Energiewirtschaft
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {publicFAQs.map((faq) => (
          <Accordion key={faq.id} id={`faq-${faq.id}`}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {faq.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {faq.description}
                </Typography>
                {faq.tags && faq.tags.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {faq.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <FAQItem
                faq={faq}
                onFAQClick={handleFAQClick}
                showFullContent={true}
              />
              {faq.additional_info && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Zusätzliche Informationen:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {faq.additional_info}
                  </Typography>
                </Box>
              )}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {faq.view_count} Aufrufe
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Erstellt am: {new Date(faq.created_at).toLocaleDateString('de-DE')}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          <strong>Hinweis:</strong> Haben Sie Ihre Frage nicht gefunden? 
          Melden Sie sich an, um auf alle FAQs zuzugreifen oder direkt mit unserem KI-Assistenten zu chatten.
        </Typography>
      </Box>
    </Container>
  );
};

export default PublicFAQ;
