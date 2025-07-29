import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Group as TeamIcon,
  PersonAdd as PersonAddIcon,
  Login as LoginIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import TeamService, { TeamInvitation } from '../services/teamService';

export const TeamInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { state } = useAuth();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!token) {
        setError('Ungültiger Einladungslink');
        return;
      }

      const data = await TeamService.getInvitationInfo(token);
      setInvitation(data);
      
      if (data.status !== 'pending') {
        if (data.status === 'expired') {
          setError('Diese Einladung ist abgelaufen');
        } else if (data.status === 'accepted') {
          setError('Diese Einladung wurde bereits angenommen');
        } else if (data.status === 'declined') {
          setError('Diese Einladung wurde abgelehnt');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden der Einladung');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;
    
    setAccepting(true);
    try {
      if (state.user) {
        // User is already logged in
        await TeamService.acceptInvitationAuthenticated(token);
        showSnackbar('Einladung erfolgreich angenommen!', 'success');
        navigate('/teams');
      } else {
        // User needs to register or login
        setShowRegistrationForm(true);
      }
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Annehmen der Einladung', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!token) return;
    
    try {
      await TeamService.declineInvitation(token);
      showSnackbar('Einladung abgelehnt', 'info');
      navigate('/');
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Ablehnen der Einladung', 'error');
    }
  };

  const handleRegistrationSubmit = async () => {
    const { name, password, confirmPassword } = registrationData;
    
    if (!name.trim()) {
      showSnackbar('Name ist erforderlich', 'error');
      return;
    }
    
    if (password.length < 6) {
      showSnackbar('Passwort muss mindestens 6 Zeichen haben', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      showSnackbar('Passwörter stimmen nicht überein', 'error');
      return;
    }

    try {
      setAccepting(true);
      // Accept invitation with registration data
      // For new users, use different endpoint
      const response = await fetch(`/api/teams/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          password: password,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Erstellen des Accounts');
      }
      
      showSnackbar('Willkommen! Ihr Account wurde erstellt und Sie wurden dem Team hinzugefügt.', 'success');
      navigate('/teams');
    } catch (error: any) {
      showSnackbar(error.message || 'Fehler beim Erstellen des Accounts', 'error');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  if (error || !invitation) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || 'Einladung nicht gefunden'}
            </Alert>
            <Button variant="outlined" onClick={() => navigate('/')}>
              Zur Startseite
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
              <TeamIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom>
              Team-Einladung
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sie wurden zu einem Wissensaustausch-Team eingeladen
            </Typography>
          </Box>

          {/* Team Information */}
          <Box sx={{ bgcolor: 'grey.50', p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
              <TeamIcon />
              {invitation.team_name}
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PersonIcon fontSize="small" />
              <Typography variant="body2">
                Eingeladen von: <strong>{invitation.invited_by_name}</strong>
              </Typography>
            </Box>

            {invitation.message && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Persönliche Nachricht:
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                  "{invitation.message}"
                </Typography>
              </>
            )}
          </Box>

          {/* Status and Actions */}
          {invitation.status === 'pending' ? (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Durch das Beitreten zu diesem Team können Sie:
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Dokumente und Wissen mit Kollegen teilen</li>
                  <li>Punkte sammeln, wenn Ihre Inhalte verwendet werden</li>
                  <li>Auf die gemeinsame Wissensbasis zugreifen</li>
                  <li>An der Team-Bestenliste teilnehmen</li>
                </ul>
              </Alert>

              <Box display="flex" gap={2} justifyContent="center">
                {state.user ? (
                  // User is logged in
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PersonAddIcon />}
                      onClick={handleAcceptInvitation}
                      disabled={accepting}
                    >
                      {accepting ? 'Trete bei...' : 'Team beitreten'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleDeclineInvitation}
                      disabled={accepting}
                    >
                      Ablehnen
                    </Button>
                  </>
                ) : (
                  // User not logged in
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PersonAddIcon />}
                      onClick={handleAcceptInvitation}
                      disabled={accepting}
                    >
                      {accepting ? 'Wird verarbeitet...' : 'Account erstellen & beitreten'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<LoginIcon />}
                      onClick={() => navigate('/login', { state: { redirectTo: `/team-invitation/${token}` } })}
                      disabled={accepting}
                    >
                      Mit vorhandenem Account anmelden
                    </Button>
                    <Button
                      variant="text"
                      size="large"
                      onClick={handleDeclineInvitation}
                      disabled={accepting}
                    >
                      Ablehnen
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          ) : (
            <Alert severity="warning">
              Diese Einladung ist nicht mehr gültig.
            </Alert>
          )}

          {/* Expiry Information */}
          {invitation.status === 'pending' && (
            <Box mt={3} textAlign="center">
              <Typography variant="caption" color="text.secondary">
                Diese Einladung läuft ab am:{' '}
                {new Date(invitation.expires_at).toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Registration Dialog */}
      <Dialog open={showRegistrationForm} onClose={() => !accepting && setShowRegistrationForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Account erstellen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Erstellen Sie einen Account, um dem Team beizutreten. Ihre E-Mail-Adresse ist bereits vorausgefüllt.
            </Alert>
            
            <TextField
              label="E-Mail-Adresse"
              value={invitation.invited_email}
              fullWidth
              disabled
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Vollständiger Name"
              value={registrationData.name}
              onChange={(e) => setRegistrationData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              sx={{ mb: 2 }}
              disabled={accepting}
            />
            
            <TextField
              label="Passwort"
              type="password"
              value={registrationData.password}
              onChange={(e) => setRegistrationData(prev => ({ ...prev, password: e.target.value }))}
              fullWidth
              required
              sx={{ mb: 2 }}
              disabled={accepting}
              helperText="Mindestens 6 Zeichen"
            />
            
            <TextField
              label="Passwort bestätigen"
              type="password"
              value={registrationData.confirmPassword}
              onChange={(e) => setRegistrationData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              fullWidth
              required
              disabled={accepting}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRegistrationForm(false)} disabled={accepting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleRegistrationSubmit}
            variant="contained"
            disabled={accepting}
            startIcon={accepting && <CircularProgress size={20} />}
          >
            {accepting ? 'Erstelle Account...' : 'Account erstellen & Team beitreten'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamInvitationPage;
