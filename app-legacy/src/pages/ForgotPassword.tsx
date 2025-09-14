// NOTE: Cleaned duplicate component; keeping the richer UI implementation below.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Email as EmailIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import apiClient from '../services/apiClient';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const validateEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('E-Mail ist erforderlich');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    try {
      setLoading(true);
      
      await apiClient.post('/auth/forgot-password', { email });
      
      setEmailSent(true);
      showSnackbar('Passwort-Reset-Link wurde gesendet (falls die E-Mail registriert ist)', 'success');
      
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Senden des Reset-Links';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CardContent>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom color="success.main">
              E-Mail gesendet!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Falls die E-Mail-Adresse <strong>{email}</strong> bei uns registriert ist, 
              haben Sie einen Link zum Zurücksetzen Ihres Passworts erhalten.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Überprüfen Sie auch Ihren Spam-Ordner. Der Link ist 1 Stunde gültig.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => setEmailSent(false)}
                sx={{ mr: 2 }}
              >
                Andere E-Mail verwenden
              </Button>
              <Button
                variant="contained"
                component={Link}
                to="/login"
                startIcon={<BackIcon />}
              >
                Zur Anmeldung
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #147a50 0%, #0d5c3c 100%)', 
        color: 'white',
        py: 4,
      }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" fontWeight="bold" textAlign="center">
            Passwort vergessen?
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ opacity: 0.9, mt: 1 }}>
            Kein Problem! Wir senden Ihnen einen Link zum Zurücksetzen.
          </Typography>
        </Container>
      </Box>

      {/* Form */}
      <Container maxWidth="sm" sx={{ mt: -4, position: 'relative', zIndex: 1 }}>
        <Paper elevation={8} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <EmailIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Passwort zurücksetzen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Magic Link 
              zum Zurücksetzen Ihres Passworts.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="E-Mail-Adresse"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
              autoFocus
              required
              helperText="Wir senden Ihnen einen sicheren Link zum Zurücksetzen"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mb: 3, py: 1.5 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Wird gesendet...
                </>
              ) : (
                'Reset-Link senden'
              )}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Haben Sie sich an Ihr Passwort erinnert?
            </Typography>
            <Button
              component={Link}
              to="/login"
              variant="text"
              startIcon={<BackIcon />}
            >
              Zurück zur Anmeldung
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Info Section */}
      <Container maxWidth="md" sx={{ mt: 6, mb: 4 }}>
        <Card sx={{ p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            🔐 Sicherheitshinweise
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Der Reset-Link ist nur 1 Stunde gültig</li>
              <li>Jeder Link kann nur einmal verwendet werden</li>
              <li>Falls Sie die E-Mail nicht erhalten, prüfen Sie Ihren Spam-Ordner</li>
              <li>Bei Problemen können Sie es erneut versuchen</li>
            </ul>
          </Typography>
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
