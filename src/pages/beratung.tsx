import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Container, 
  Stack,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import Layout from '../components/Layout';
import { Description as DescriptionIcon } from '@mui/icons-material';

interface FormData {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingAddress: string;
  billingZip: string;
  billingCity: string;
  message: string;
  acceptTerms: boolean;
  costAcknowledgement: boolean;
}

interface FormErrors {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  billingZip?: string;
  billingCity?: string;
  message?: string;
  acceptTerms?: string;
  costAcknowledgement?: string;
}

export default function BeratungAnfrage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    billingAddress: '',
    billingZip: '',
    billingCity: '',
    message: '',
    acceptTerms: false,
    costAcknowledgement: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error on field change
    if (errors[name as keyof FormErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate required fields
    if (!formData.companyName) newErrors.companyName = 'Bitte geben Sie den Firmennamen ein';
    if (!formData.firstName) newErrors.firstName = 'Bitte geben Sie Ihren Vornamen ein';
    if (!formData.lastName) newErrors.lastName = 'Bitte geben Sie Ihren Nachnamen ein';
    if (!formData.email) newErrors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein';
    if (!formData.billingAddress) newErrors.billingAddress = 'Bitte geben Sie die Rechnungsadresse ein';
    if (!formData.billingZip) newErrors.billingZip = 'Bitte geben Sie die PLZ ein';
    if (!formData.billingCity) newErrors.billingCity = 'Bitte geben Sie die Stadt ein';
    
    // Validate email format
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    
    // Validate checkboxes
    if (!formData.acceptTerms) newErrors.acceptTerms = 'Bitte stimmen Sie den Datenschutzbestimmungen zu';
    if (!formData.costAcknowledgement) newErrors.costAcknowledgement = 'Bitte bestätigen Sie, dass die Beratung kostenpflichtig sein kann';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/beratungsanfrage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Beim Senden der Anfrage ist ein Fehler aufgetreten.');
      }
      
      setSuccess(true);
      // Reset form after successful submission
      setFormData({
        companyName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        billingAddress: '',
        billingZip: '',
        billingCity: '',
        message: '',
        acceptTerms: false,
        costAcknowledgement: false
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show user-friendly error message
      const errorMsg = error instanceof Error 
        ? error.message 
        : 'Beim Senden der Anfrage ist ein Fehler aufgetreten.';
      
      setErrorMessage(errorMsg);
      
      // If there's an authentication error, suggest alternative contact method
      if (errorMsg.includes('Authentifizierung') || errorMsg.includes('Email-Server')) {
        setErrorMessage(
          `${errorMsg} Sie können uns alternativ direkt per E-Mail an kontakt@stromdao.com kontaktieren.`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
    setErrorMessage('');
  };

  return (
    <Layout title="Beratungsanfrage | Willi-Mako">
      <Head>
        <title>Beratungsanfrage für Willi-Mako | Professionelle Marktkommunikation</title>
        <meta 
          name="description" 
          content="Anfrage für eine Beratung zur Nutzung von Willi-Mako - der Plattform für professionelle Marktkommunikation in der Energiewirtschaft."
        />
      </Head>

      {/* Whitepaper Callout - promotes credibility and references */}
      <Container maxWidth="md" sx={{ pt: 6 }}>
        <Paper elevation={1} sx={{ p: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6" component="h2" sx={{ m: 0, fontWeight: 600 }}>
              Whitepapers als Grundlage unserer Beratung
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            component={Link}
            href="/whitepaper"
            variant="contained"
            color="primary"
            sx={{ fontWeight: 600 }}
          >
            Whitepaper ansehen →
          </Button>
        </Paper>
      </Container>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Beratungsanfrage für Willi-Mako
          </Typography>
          
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Wir freuen uns über Ihr Interesse an Willi-Mako. Bitte beachten Sie, dass die Beratung unter Umständen kostenpflichtig sein kann. 
            Dies wird mit Ihnen vor der Beratung besprochen. Füllen Sie das Formular aus und wir melden uns zeitnah bei Ihnen.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
            <Alert severity="info" sx={{ flex: '1', minWidth: '200px' }}>
              <Typography variant="body2">
                <strong>Wichtiger Hinweis:</strong> Die Beratung zur Nutzung von Willi-Mako ist nicht grundsätzlich kostenlos. 
                Je nach Umfang und Anforderungen kann eine Beratungsgebühr anfallen. Die genauen Konditionen werden mit Ihnen 
                vor der Beratung abgestimmt.
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                Direkte Kontaktaufnahme:
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                component="a" 
                href="mailto:kontakt@stromdao.com"
                sx={{ 
                  textTransform: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                kontakt@stromdao.com
              </Button>
            </Box>
          </Box>
          
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant="h6" gutterBottom>
                Unternehmensdaten
              </Typography>
              
              <TextField
                fullWidth
                label="Firmenname *"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                error={!!errors.companyName}
                helperText={errors.companyName}
                required
              />
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Vorname *"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Nachname *"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  required
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="E-Mail *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
                
                <TextField
                  fullWidth
                  label="Telefon"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Box>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Rechnungsadresse
              </Typography>
              
              <TextField
                fullWidth
                label="Straße, Hausnummer *"
                name="billingAddress"
                value={formData.billingAddress}
                onChange={handleChange}
                error={!!errors.billingAddress}
                helperText={errors.billingAddress}
                required
              />
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="PLZ *"
                  name="billingZip"
                  value={formData.billingZip}
                  onChange={handleChange}
                  error={!!errors.billingZip}
                  helperText={errors.billingZip}
                  required
                  sx={{ flexBasis: { sm: '30%' } }}
                />
                
                <TextField
                  fullWidth
                  label="Ort *"
                  name="billingCity"
                  value={formData.billingCity}
                  onChange={handleChange}
                  error={!!errors.billingCity}
                  helperText={errors.billingCity}
                  required
                  sx={{ flexBasis: { sm: '70%' } }}
                />
              </Box>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Ihre Anfrage
              </Typography>
              
              <TextField
                fullWidth
                label="Ihre Nachricht"
                name="message"
                multiline
                rows={4}
                value={formData.message}
                onChange={handleChange}
                placeholder="Beschreiben Sie hier kurz, wozu Sie eine Beratung wünschen und welche Themen besprochen werden sollen."
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    name="costAcknowledgement"
                    checked={formData.costAcknowledgement}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Ich bestätige, dass ich verstanden habe, dass die Beratung kostenpflichtig sein kann und mir die Kosten vor der Beratung mitgeteilt werden. *"
              />
              {errors.costAcknowledgement && (
                <Typography variant="caption" color="error">
                  {errors.costAcknowledgement}
                </Typography>
              )}
              
              <FormControlLabel
                control={
                  <Checkbox
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    Ich stimme den <Link href="/datenschutz">Datenschutzbestimmungen</Link> zu und akzeptiere, dass meine Daten für die Bearbeitung meiner Anfrage gespeichert werden. *
                  </Typography>
                }
              />
              {errors.acceptTerms && (
                <Typography variant="caption" color="error">
                  {errors.acceptTerms}
                </Typography>
              )}
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large"
                  disabled={isSubmitting}
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    bgcolor: '#147a50',
                    '&:hover': {
                      bgcolor: '#0d5538',
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                      Wird gesendet...
                    </>
                  ) : (
                    'Beratungsanfrage senden'
                  )}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Container>
      
      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Ihre Beratungsanfrage wurde erfolgreich gesendet. Wir melden uns in Kürze bei Ihnen.
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!errorMessage} 
        autoHideDuration={10000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="error" 
          sx={{ 
            width: '100%',
            '& .MuiAlert-message': {
              maxWidth: '500px'
            }
          }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
