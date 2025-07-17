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
import axios from 'axios';

interface UserPreferences {
  companies_of_interest: string[];
  preferred_topics: string[];
  notification_settings: {
    email_notifications?: boolean;
    push_notifications?: boolean;
  };
}

const Profile: React.FC = () => {
  const { state } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: state.user?.name || '',
    company: state.user?.company || '',
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    companies_of_interest: [],
    preferred_topics: [],
    notification_settings: {},
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
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/user/preferences');
      setPreferences(response.data.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setError('Fehler beim Laden der Einstellungen');
    }
  };

  const handleProfileChange = (field: string, value: string) => {
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
      await axios.put('/user/profile', {
        name: profileData.name,
        company: profileData.company,
      });
      
      // Save preferences
      await axios.put('/user/preferences', {
        companiesOfInterest: preferences.companies_of_interest,
        preferredTopics: preferences.preferred_topics,
        notificationSettings: preferences.notification_settings,
      });
      
      showSnackbar('Profil erfolgreich gespeichert', 'success');
      setEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Fehler beim Speichern des Profils');
    } finally {
      setLoading(false);
    }
  };

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
                {state.user?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">{state.user?.name}</Typography>
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
                disabled={!editing}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <TextField
                label="Unternehmen"
                value={profileData.company}
                onChange={(e) => handleProfileChange('company', e.target.value)}
                disabled={!editing}
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
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Präferenzen
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Diese Einstellungen helfen dabei, relevantere Inhalte zu finden.
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Autocomplete
                multiple
                options={companyOptions}
                value={preferences.companies_of_interest}
                onChange={(event, newValue) => {
                  handlePreferenceChange('companies_of_interest', newValue);
                }}
                disabled={!editing}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Interessante Unternehmen"
                    placeholder="Wählen Sie Unternehmen aus..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={index}
                    />
                  ))
                }
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Autocomplete
                multiple
                options={topicOptions}
                value={preferences.preferred_topics}
                onChange={(event, newValue) => {
                  handlePreferenceChange('preferred_topics', newValue);
                }}
                disabled={!editing}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Bevorzugte Themen"
                    placeholder="Wählen Sie Themen aus..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={index}
                    />
                  ))
                }
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
                  {loading ? <CircularProgress size={24} /> : 'Präferenzen speichern'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;
