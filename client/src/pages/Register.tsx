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
  Divider,
} from '@mui/material';
import { ElectricBolt as EnergyIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const { state, register, clearError } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.email) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-Mail Format ist ungültig';
    }
    
    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwort bestätigen ist erforderlich';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }
    
    if (!formData.name) {
      newErrors.name = 'Vollständiger Name ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData.email, formData.password, formData.name, formData.company);
      showSnackbar('Erfolgreich registriert!', 'success');
      navigate('/');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={6} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EnergyIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography component="h1" variant="h4" color="primary" fontWeight="bold">
                Stromhaltig
              </Typography>
            </Box>
            <Typography component="h2" variant="h6" color="text.secondary" textAlign="center" mb={1}>
              Digital Energy Infrastructure for tomorrow
            </Typography>
            <Typography component="h3" variant="body2" color="text.secondary" textAlign="center" mb={3}>
              Konto erstellen
            </Typography>
            
            <Divider sx={{ width: '100%', mb: 3 }} />
            
            {state.error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {state.error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Vollständiger Name"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                disabled={state.loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="E-Mail Adresse"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                disabled={state.loading}
              />
              <TextField
                margin="normal"
                fullWidth
                id="company"
                label="Unternehmen (optional)"
                name="company"
                autoComplete="organization"
                value={formData.company}
                onChange={handleChange}
                disabled={state.loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Passwort"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                disabled={state.loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Passwort bestätigen"
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                disabled={state.loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={state.loading}
              >
                {state.loading ? <CircularProgress size={24} /> : 'Registrieren'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Bereits ein Konto?{' '}
                  <Link to="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Hier anmelden
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
