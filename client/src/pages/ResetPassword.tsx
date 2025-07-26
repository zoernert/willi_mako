import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import apiClient from '../services/apiClient';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setValidating(false);
      setError('Ungültiger Reset-Link');
    }
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      const response = await apiClient.get(`/auth/validate-reset-token/${token}`) as any;
      setTokenValid(true);
      setUserInfo(response.data);
    } catch (error: any) {
      console.error('Token validation error:', error);
      setTokenValid(false);
      const errorMessage = error.response?.data?.error?.message || 'Token ist ungültig oder abgelaufen';
      setError(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  const validateForm = (): boolean => {
    if (!password) {
      setError('Passwort ist erforderlich');
      return false;
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: password
      });

      setSuccess(true);
      showSnackbar('Passwort erfolgreich zurückgesetzt!', 'success');

    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Zurücksetzen des Passworts';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Überprüfe Reset-Link...
        </Typography>
      </Container>
    );
  }

  // Success state
  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CardContent>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom color="success.main">
              Passwort zurückgesetzt!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Ihr Passwort wurde erfolgreich zurückgesetzt. 
              Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/login')}
              sx={{ mt: 2 }}
            >
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Error state (invalid token)
  if (!tokenValid) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CardContent>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom color="error.main">
              Ungültiger Link
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {error || 'Dieser Reset-Link ist ungültig oder bereits abgelaufen.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Reset-Links sind nur 1 Stunde gültig und können nur einmal verwendet werden.
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to="/forgot-password"
              sx={{ mr: 2 }}
            >
              Neuen Link anfordern
            </Button>
            <Button
              variant="outlined"
              component={Link}
              to="/login"
            >
              Zur Anmeldung
            </Button>
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
            Neues Passwort setzen
          </Typography>
          <Typography variant="h6" textAlign="center" sx={{ opacity: 0.9, mt: 1 }}>
            {userInfo?.name ? `Hallo ${userInfo.name}` : 'Fast geschafft!'} - Wählen Sie ein sicheres neues Passwort
          </Typography>
        </Container>
      </Box>

      {/* Form */}
      <Container maxWidth="sm" sx={{ mt: -4, position: 'relative', zIndex: 1 }}>
        <Paper elevation={8} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <KeyIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h2" gutterBottom>
              Neues Passwort setzen
            </Typography>
            {userInfo && (
              <Typography variant="body2" color="text.secondary">
                Für das Konto: <strong>{userInfo.email}</strong>
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Neues Passwort"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
              autoFocus
              required
              helperText="Mindestens 6 Zeichen"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Passwort bestätigen"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
              required
              helperText="Geben Sie das Passwort zur Bestätigung erneut ein"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
                  Wird gespeichert...
                </>
              ) : (
                'Passwort zurücksetzen'
              )}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button
              component={Link}
              to="/login"
              variant="text"
            >
              Zurück zur Anmeldung
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Security Info */}
      <Container maxWidth="md" sx={{ mt: 6, mb: 4 }}>
        <Card sx={{ p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            🛡️ Sicherheitstipps
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li>Verwenden Sie ein starkes, einzigartiges Passwort</li>
              <li>Mischen Sie Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen</li>
              <li>Verwenden Sie nicht dasselbe Passwort für andere Dienste</li>
              <li>Dieser Reset-Link wird nach der Verwendung ungültig</li>
            </ul>
          </Typography>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;
