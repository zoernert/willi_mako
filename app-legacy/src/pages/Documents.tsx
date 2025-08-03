import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  DateRange as DateIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import apiClient from '../services/apiClient';

interface Document {
  id: string;
  title: string;
  description: string;
  file_size: number;
  created_at: string;
}

const Documents: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // For now, use the admin documents endpoint - this might need to be changed to a public library endpoint
      const documentsData = await apiClient.get<Document[]>('/admin/documents');
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Fehler beim Laden der Dokumente');
      setDocuments([]); // Ensure documents is always an array
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDownload = async (documentId: string, title: string) => {
    try {
      await apiClient.get(`/admin/documents/${documentId}/download`);
      // In a real implementation, this would download the file
      showSnackbar(`Download für "${title}" gestartet`, 'info');
    } catch (error) {
      console.error('Error downloading document:', error);
      showSnackbar('Fehler beim Herunterladen des Dokuments', 'error');
    }
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
          Dokumente & Spickzettel
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Kuratierte Inhalte und Cheat Sheets für die Energiewirtschaft
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Keine Dokumente verfügbar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dokumente werden von Administratoren bereitgestellt und erscheinen hier, sobald sie verfügbar sind.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {documents.map((doc) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={doc.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DocumentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h2" noWrap>
                      {doc.title}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {doc.description || 'Keine Beschreibung verfügbar'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DateIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(doc.created_at)}
                    </Typography>
                  </Box>
                  
                  <Chip
                    label={formatFileSize(doc.file_size)}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                </CardContent>
                
                <Box sx={{ p: 2, pt: 0 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => handleDownload(doc.id, doc.title)}
                      sx={{ flex: 1 }}
                    >
                      Anzeigen
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(doc.id, doc.title)}
                      sx={{ flex: 1 }}
                    >
                      Download
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Hilfreiche Informationen
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <DocumentIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="PDF-Dokumente"
                secondary="Alle Dokumente sind als PDF verfügbar und können heruntergeladen werden."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ViewIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Direkte Anzeige"
                secondary="Dokumente können direkt im Browser angezeigt werden."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DownloadIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Download"
                secondary="Laden Sie Dokumente herunter für die Offline-Nutzung."
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default Documents;
