import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Avatar,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { userApi } from '../services/userApi';
import { UserPreferences, UserProfile } from '../types/user';

const Profile: React.FC = () => {
  const { state, dispatch } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>({
    name: state.user?.name || '',
    company: state.user?.company || '',
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    companies_of_interest: [],
    preferred_topics: [],
    notification_settings: {
        email_notifications: false,
        push_notifications: false,
    },
  });
  const [error, setError] = useState<string | null>(null);

  const topicOptions = [
    'Marktkommunikation',
    'Bilanzkreismanagement',
    'Regulierung',
    'Smart Meter',
    'Energiehandel',
    'Netzentgelte',
    'Erneuerbare Energien',
    'Digitalisierung',
    'Elektromobilität',
    'Sektorenkopplung',
  ];

  const companyOptions = [
    'Stadtwerke',
    'Energieversorger',
    'Netzbetreiber',
    'Energiehändler',
    'Messstellenbetreiber',
    'Bilanzkreisverantwortliche',
    'Direktvermarkter',
    'Energiedienstleister',
  ];

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // The user object from auth context might be stale.
            // Fetch the latest profile info.
            const userProfile = await userApi.getUserProfile();
            setProfileData({ name: userProfile.name, company: userProfile.company });

            const userPreferences = await userApi.getUserPreferences();
            setPreferences(userPreferences);

            setError(null);
        } catch (error) {
            console.error('Error loading user data:', error);
            setError('Fehler beim Laden der Profildaten.');
            showSnackbar('Fehler beim Laden der Daten', 'error');
        } finally {
            setLoading(false);
        }
    };

    loadData();
  }, []);

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePreferenceChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // Save profile data
      const updatedUser = await userApi.updateUserProfile(profileData);
      
      // Save preferences
      await userApi.updateUserPreferences(preferences);

      // Update auth context with new user data
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: updatedUser, token: state.token! } });
      
      showSnackbar('Profil erfolgreich gespeichert', 'success');
      setEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Fehler beim Speichern des Profils');
      showSnackbar('Fehler beim Speichern des Profils', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profileData.name) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
        </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Profil
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Verwalten Sie Ihre persönlichen Einstellungen
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                {profileData.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6">{profileData.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {state.user?.email}
                </Typography>
                <Chip
                  label={state.user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
                  color={state.user?.role === 'admin' ? 'secondary' : 'primary'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Persönliche Informationen</Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditing(!editing)}
                disabled={loading}
              >
                {editing ? 'Abbrechen' : 'Bearbeiten'}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Vollständiger Name"
                value={profileData.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                disabled={!editing || loading}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <TextField
                label="Unternehmen"
                value={profileData.company}
                onChange={(e) => handleProfileChange('company', e.target.value)}
                disabled={!editing || loading}
                InputProps={{
                  startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Box>

            {editing && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveProfile}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : 'Speichern'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Preferences */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Interessen & Benachrichtigungen</Typography>
            
            <Autocomplete
              multiple
              id="preferred-topics"
              options={topicOptions}
              value={preferences.preferred_topics}
              onChange={(_, newValue) => handlePreferenceChange('preferred_topics', newValue)}
              disabled={!editing || loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Bevorzugte Themen"
                  placeholder="Themen auswählen"
                />
              )}
              sx={{ mb: 2 }}
            />

            <Autocomplete
              multiple
              id="companies-of-interest"
              options={companyOptions}
              value={preferences.companies_of_interest}
              onChange={(_, newValue) => handlePreferenceChange('companies_of_interest', newValue)}
              disabled={!editing || loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Interessante Unternehmensarten"
                  placeholder="Typen auswählen"
                />
              )}
            />
          </Paper>
        </Grid>

        {/* Save Button */}
        {editing && (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={saveProfile}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Speichern'}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Profile;
