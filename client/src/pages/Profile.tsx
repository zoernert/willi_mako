import React, { useState, useEffect } from 'react';
import {
  Container,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { userApi } from '../services/userApi';
import { UserPreferences, UserProfile, FlipModePreferences } from '../types/user';

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
  const [flipModePreferences, setFlipModePreferences] = useState<FlipModePreferences>({});
  const [error, setError] = useState<string | null>(null);

  const topicOptions = [
    'Marktkommunikation', 'Bilanzkreismanagement', 'Regulierung', 'Smart Meter', 'Energiehandel',
    'Netzentgelte', 'Erneuerbare Energien', 'Digitalisierung', 'Elektromobilität', 'Sektorenkopplung',
  ];

  const companyOptions = [
    'Stadtwerke', 'Energieversorger', 'Netzbetreiber', 'Energiehändler', 'Messstellenbetreiber',
    'Bilanzkreisverantwortliche', 'Direktvermarkter', 'Energiedienstleister',
  ];

  const flipModeOptions = {
    energy_type: ['Strom', 'Gas', 'Beide'],
    stakeholder_perspective: ['Energielieferant', 'Netzbetreiber', 'Messstellenbetreiber', 'Stadtwerke', 'Endkunde', 'Regulierungsbehörde'],
    context_specificity: ['Geschäftsprozesse', 'Technische Umsetzung', 'Rechtliche Anforderungen', 'Kundenbetreuung', 'Abrechnung'],
    detail_level: ['Kurzer Überblick', 'Detaillierte Erklärung', 'Schritt-für-Schritt Anleitung', 'Rechtliche Grundlagen', 'Technische Spezifikationen'],
    topic_focus: ['Grundlagen und Definitionen', 'Prozesse und Abläufe', 'Fristen und Termine', 'Verantwortlichkeiten', 'Praktische Beispiele'],
  };

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const [userProfile, userPreferences, flipPrefs] = await Promise.all([
                userApi.getUserProfile(),
                userApi.getUserPreferences(),
                userApi.getFlipModePreferences(),
            ]);
            
            setProfileData({ name: userProfile.name, company: userProfile.company });
            setPreferences(userPreferences);
            setFlipModePreferences(flipPrefs || {});

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
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleFlipModeChange = (field: keyof FlipModePreferences, value: string) => {
    setFlipModePreferences(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
          userApi.updateUserProfile(profileData),
          userApi.updateUserPreferences(preferences),
          userApi.updateFlipModePreferences(flipModePreferences),
      ]);

      const updatedUser = await userApi.getUserProfile();
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
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Profil & Einstellungen
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Verwalten Sie Ihre persönlichen Informationen und App-Voreinstellungen
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant={editing ? "outlined" : "contained"}
          startIcon={<EditIcon />}
          onClick={() => setEditing(!editing)}
          disabled={loading}
        >
          {editing ? 'Abbrechen' : 'Bearbeiten'}
        </Button>
        {editing && (
            <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveProfile}
                disabled={loading}
                sx={{ ml: 2 }}
            >
                {loading ? <CircularProgress size={24} /> : 'Alles Speichern'}
            </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Profile & Interests */}
        <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', md: '45%' } }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                {profileData.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6">{profileData.name}</Typography>
                <Typography variant="body2" color="text.secondary">{state.user?.email}</Typography>
                <Chip
                  label={state.user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
                  color={state.user?.role === 'admin' ? 'secondary' : 'primary'}
                  size="small" sx={{ mt: 1 }}
                />
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>Persönliche Informationen</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Vollständiger Name"
                value={profileData.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                disabled={!editing || loading}
                InputProps={{ startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
              <TextField
                label="Unternehmen"
                value={profileData.company}
                onChange={(e) => handleProfileChange('company', e.target.value)}
                disabled={!editing || loading}
                InputProps={{ startAdornment: <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Box>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Interessen</Typography>
            <Autocomplete
              multiple id="preferred-topics" options={topicOptions}
              value={preferences.preferred_topics}
              onChange={(_, newValue) => handlePreferenceChange('preferred_topics', newValue)}
              disabled={!editing || loading}
              renderInput={(params) => <TextField {...params} variant="outlined" label="Bevorzugte Themen" />}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              multiple id="companies-of-interest" options={companyOptions}
              value={preferences.companies_of_interest}
              onChange={(_, newValue) => handlePreferenceChange('companies_of_interest', newValue)}
              disabled={!editing || loading}
              renderInput={(params) => <TextField {...params} variant="outlined" label="Interessante Unternehmensarten" />}
            />
          </Paper>
        </Box>

        {/* Flip Mode Preferences */}
        <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', md: '45%' } }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TuneIcon color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="h6">Flip Mode Voreinstellungen</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Legen Sie Standard-Antworten für die Präzisierungsfragen fest, um schneller genauere Ergebnisse zu erhalten.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '45%' } }}>
                    <FormControl fullWidth disabled={!editing || loading}>
                        <InputLabel>Energieträger</InputLabel>
                        <Select
                            value={flipModePreferences.energy_type || ''}
                            label="Energieträger"
                            onChange={(e) => handleFlipModeChange('energy_type', e.target.value)}
                        >
                            {flipModeOptions.energy_type.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '45%' } }}>
                    <FormControl fullWidth disabled={!editing || loading}>
                        <InputLabel>Perspektive</InputLabel>
                        <Select
                            value={flipModePreferences.stakeholder_perspective || ''}
                            label="Perspektive"
                            onChange={(e) => handleFlipModeChange('stakeholder_perspective', e.target.value)}
                        >
                            {flipModeOptions.stakeholder_perspective.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '45%' } }}>
                    <FormControl fullWidth disabled={!editing || loading}>
                        <InputLabel>Anwendungsbereich</InputLabel>
                        <Select
                            value={flipModePreferences.context_specificity || ''}
                            label="Anwendungsbereich"
                            onChange={(e) => handleFlipModeChange('context_specificity', e.target.value)}
                        >
                            {flipModeOptions.context_specificity.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '45%' } }}>
                    <FormControl fullWidth disabled={!editing || loading}>
                        <InputLabel>Detailgrad</InputLabel>
                        <Select
                            value={flipModePreferences.detail_level || ''}
                            label="Detailgrad"
                            onChange={(e) => handleFlipModeChange('detail_level', e.target.value)}
                        >
                            {flipModeOptions.detail_level.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ width: '100%' }}>
                     <FormControl fullWidth disabled={!editing || loading}>
                        <InputLabel>Themenfokus</InputLabel>
                        <Select
                            value={flipModePreferences.topic_focus || ''}
                            label="Themenfokus"
                            onChange={(e) => handleFlipModeChange('topic_focus', e.target.value)}
                        >
                            {flipModeOptions.topic_focus.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default Profile;
