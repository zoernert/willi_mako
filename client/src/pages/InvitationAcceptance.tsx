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
  Divider,
} from '@mui/material';
import {
  Group as GroupIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import TeamService, { TeamInvitation } from '../services/teamService';

const InvitationAcceptance: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { state } = useAuth();

  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadInvitationInfo();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const loadInvitationInfo = async () => {
    try {
      setLoading(true);
      const invitationData = await TeamService.getInvitationInfo(token!);
      setInvitation(invitationData);
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      setError(error.message || 'Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;

    try {
      setProcessing(true);
      
      if (state.user) {
        // User is already logged in - use authenticated endpoint
        await TeamService.acceptInvitationAuthenticated(token);
        showSnackbar('Einladung erfolgreich angenommen! Willkommen im Team.', 'success');
        navigate('/teams');
      } else {
        // User is not logged in - use public endpoint for new/existing users
        const result = await TeamService.acceptInvitation(token);
        
        if (result.token && result.isNewUser) {
          // New user created - auto login with provided token
          localStorage.setItem('token', result.token);
          showSnackbar('Willkommen! Ihr Account wurde aktiviert und Sie wurden dem Team hinzugefügt.', 'success');
          // Refresh the page to trigger auth context update
          window.location.href = '/teams';
        } else if (result.isNewUser === false) {
          // Existing user - redirect to login
          showSnackbar('Einladung angenommen. Bitte melden Sie sich an, um auf Ihr Team zuzugreifen.', 'info');
          navigate('/login');
        } else {
          showSnackbar('Einladung erfolgreich angenommen!', 'success');
          navigate('/teams');
        }
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      let errorMessage = 'Fehler beim Annehmen der Einladung';
      
      if (error.message) {
        if (error.message.includes('already in a team')) {
          errorMessage = 'Sie sind bereits Mitglied eines Teams';
        } else if (error.message.includes('expired')) {
          errorMessage = 'Diese Einladung ist abgelaufen';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Ungültige oder bereits verwendete Einladung';
        } else {
          errorMessage = error.message;
        }
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!token) return;

    try {
      setProcessing(true);
      await TeamService.declineInvitation(token);
      showSnackbar('Einladung abgelehnt', 'info');
      navigate('/');
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      showSnackbar(error.message || 'Fehler beim Ablehnen der Einladung', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!state.user) {
    // For new users, show invitation details without requiring login first
    if (loading) {
      return (
        <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      );
    }

    if (error || !invitation) {
      return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <GroupIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="error">
                Ungültige Einladung
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error || 'Dieser Einladungslink ist ungültig, abgelaufen oder wurde bereits verwendet.'}
              </Alert>
              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                Zur Startseite
              </Button>
            </CardContent>
          </Card>
        </Container>
      );
    }

    // Show invitation details for unauthenticated users
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !invitation) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <GroupIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Invalid Invitation
            </Typography>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || 'This invitation link is invalid, expired, or has already been used.'}
            </Alert>
            <Button
              variant="outlined"
              onClick={() => navigate('/teams')}
            >
              Go to Teams
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ py: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: 32,
              }}
            >
              <GroupIcon fontSize="large" />
            </Avatar>
            <Typography variant="h4" gutterBottom>
              Team-Einladung
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Sie wurden eingeladen beizutreten:
            </Typography>
            <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h5" color="primary" gutterBottom>
                {invitation.team?.name}
              </Typography>
              {invitation.team?.description && (
                <Typography variant="body2" color="text.secondary">
                  {invitation.team.description}
                </Typography>
              )}
            </Card>

            <Typography variant="body1" gutterBottom>
              <strong>Rolle:</strong> {invitation.role === 'admin' ? 'Administrator' : 'Mitglied'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Eingeladen von:</strong> {invitation.creator?.full_name || invitation.creator?.name}
            </Typography>
            <Typography variant="body1">
              <strong>Läuft ab:</strong> {new Date(invitation.expires_at).toLocaleDateString('de-DE')}
            </Typography>
          </Box>

          {isExpired ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              Diese Einladung ist abgelaufen und kann nicht mehr angenommen werden.
            </Alert>
          ) : (
            <>
              <Divider sx={{ my: 3 }} />
              {!state.user && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Wenn Sie diese Einladung annehmen und noch keinen Account haben, wird automatisch ein Account für Sie erstellt.
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={handleAcceptInvitation}
                  disabled={processing}
                  size="large"
                  sx={{ minWidth: 120 }}
                >
                  {processing ? <CircularProgress size={24} /> : 'Annehmen'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={handleDeclineInvitation}
                  disabled={processing}
                  size="large"
                  sx={{ minWidth: 120 }}
                >
                  Ablehnen
                </Button>
              </Box>
            </>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="text"
              onClick={() => navigate(state.user ? '/teams' : '/')}
              size="small"
            >
              {state.user ? 'Meine Teams ansehen' : 'Zur Startseite'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default InvitationAcceptance;
