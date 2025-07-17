import React, { useState, useEffect } from 'react';
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
  CardActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fade,
  Zoom,
  Stack,
} from '@mui/material';
import { 
  ElectricBolt as EnergyIcon,
  QuestionAnswer as FAQIcon,
  TrendingUp as TrendingIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  Business as BusinessIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import axios from 'axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  
  const { state, login, clearError } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLatestFAQs();
  }, []);

  const fetchLatestFAQs = async () => {
    try {
      setFaqLoading(true);
      const response = await axios.get('/faqs?limit=10');
      setFaqs(response.data.data);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setFaqLoading(false);
    }
  };

  const handleFAQClick = (faqId: string) => {
    // Zeige FAQ-Details oder navigiere zur FAQ-Seite
    navigate(`/faqs/${faqId}`);
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'E-Mail Format ist ungültig';
    }
    
    if (!password) {
      newErrors.password = 'Passwort ist erforderlich';
    } else if (password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
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
      await login(email, password);
      showSnackbar('Erfolgreich angemeldet!', 'success');
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #147a50 0%, #0d5c3c 100%)', 
        color: 'white',
        py: 8,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: 6
          }}>
            <Box sx={{ flex: 1 }}>
              <Fade in={true} timeout={1000}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <EnergyIcon sx={{ fontSize: 60, color: '#fff' }} />
                    <Typography variant="h2" component="h1" fontWeight="bold" color="white">
                      Stromhaltig
                    </Typography>
                  </Box>
                  <Typography variant="h4" component="h2" sx={{ mb: 2, opacity: 0.9 }}>
                    Ihr täglicher KI-Experte für Marktkommunikation in der Energiewirtschaft
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 3, opacity: 0.85, fontWeight: 400, lineHeight: 1.4 }}>
                    Sofortiges Fachwissen zu MaKo – speziell für Sachbearbeiter, die keine Zeit für lange Schulungen haben. Inklusive KI-Chat und umfassender FAQ-Sammlung.
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 4, opacity: 0.8, fontWeight: 300 }}>
                    Powered by Mako Willi - Ihr intelligenter AI-Coach
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                      Ihre Premium-Plattform für die Energiewirtschaft
                    </Typography>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ color: '#4caf50' }} />
                        <Typography variant="body1">KI-gestützte Fachberatung rund um die Uhr</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ color: '#4caf50' }} />
                        <Typography variant="body1">Personalisierte Marktanalysen</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ color: '#4caf50' }} />
                        <Typography variant="body1">Kuratierte Premium-Dokumentenbibliothek</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ color: '#4caf50' }} />
                        <Typography variant="body1">Exklusive Brancheninsights</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Fade>
            </Box>
            
            <Box sx={{ minWidth: { xs: '100%', md: 400 } }}>
              <Zoom in={true} timeout={1500}>
                <Paper elevation={12} sx={{ 
                  p: 4, 
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Typography variant="h5" component="h3" sx={{ mb: 3, fontWeight: 600, color: '#147a50' }}>
                    Jetzt einloggen
                  </Typography>
                  
                  {state.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {state.error}
                    </Alert>
                  )}
                  
                  <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="email"
                      label="E-Mail Adresse"
                      name="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!errors.email}
                      helperText={errors.email}
                      disabled={state.loading}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Passwort"
                      type="password"
                      id="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!errors.password}
                      helperText={errors.password}
                      disabled={state.loading}
                      sx={{ mb: 3 }}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      sx={{ 
                        py: 1.5, 
                        mb: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600
                      }}
                      disabled={state.loading}
                    >
                      {state.loading ? <CircularProgress size={24} /> : 'Anmelden'}
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Noch kein Konto?{' '}
                        <Link to="/register" style={{ color: '#147a50', textDecoration: 'none', fontWeight: 600 }}>
                          Jetzt registrieren &amp; sofort starten
                        </Link>
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Zoom>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" sx={{ mb: 2, fontWeight: 600 }}>
          Warum Stromhaltig Ihre Arbeit erleichtert
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          Speziell entwickelt für den Arbeitsalltag von Sachbearbeitern in der Energiewirtschaft
        </Typography>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 4
        }}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
            <CardContent>
              <SpeedIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                Punktuelles Wissen sofort verfügbar
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Täglich andere Fragen zur Marktkommunikation? Erhalten Sie schnelle und präzise Antworten auf alle MaKo-Themen - ohne langes Suchen oder Nachfragen.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
            <CardContent>
              <TrendingIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                Keine zeitaufwändigen Schulungen
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Starten Sie sofort durch! Unser System bietet schnellen Zugang zu Fachwissen ohne langwierige Einarbeitung oder kostspielige Weiterbildungen.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
            <CardContent>
              <AIIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                KI-gestützte Antworten
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Mako Willi liefert präzise, kontextbezogene Antworten auf Ihre spezifischen Fragen - basierend auf aktuellen Regelwerken und Praxiserfahrungen.
              </Typography>
            </CardContent>
          </Card>
        </Box>
        
        {/* Additional Benefits Row */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4,
          mt: 4
        }}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
            <CardContent>
              <AnalyticsIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                Immer auf dem neuesten Stand
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Das System passt sich kontinuierlich an die sich ändernden Anforderungen der Energiewirtschaft an. Sie arbeiten immer mit aktuellen Informationen.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, bgcolor: 'rgba(20, 122, 80, 0.05)' }}>
            <CardContent>
              <BusinessIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 600 }}>
                Unternehmenslösungen
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Sie sind ein größeres Energieversorgungsunternehmen? Sprechen Sie uns auf unsere günstigen Bündeltarife an!
              </Typography>
              <Button 
                variant="outlined" 
                size="small"
                sx={{ 
                  borderColor: '#147a50',
                  color: '#147a50',
                  '&:hover': {
                    borderColor: '#147a50',
                    bgcolor: 'rgba(20, 122, 80, 0.04)'
                  }
                }}
              >
                Jetzt Kontakt aufnehmen
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* FAQ Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" sx={{ mb: 2, fontWeight: 600 }}>
            Ein Blick in unsere Wissensdatenbank
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 3 }}>
            Die FAQs werden laufend und automatisch durch unser System generiert
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}>
            Sie erhalten einen Vorgeschmack auf die Tiefe und Breite des Wissens, das unser KI-Chat für Sie bereithält. 
            Jede FAQ zeigt exemplarisch, wie präzise und praxisnah Mako Willi Ihre Fragen zur Marktkommunikation beantwortet.
          </Typography>
          
          {faqLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3
            }}>
              {faqs.map((faq, index) => (
                <Fade in={true} timeout={1000 + index * 100} key={faq.id}>
                  <Card sx={{ 
                    height: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleFAQClick(faq.id)}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <FAQIcon sx={{ color: '#147a50', mt: 0.5 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                            {faq.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {faq.description}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {faq.tags && faq.tags.slice(0, 3).map((tag: string) => (
                              <Chip 
                                key={tag} 
                                label={tag} 
                                size="small" 
                                sx={{ 
                                  bgcolor: 'rgba(20, 122, 80, 0.1)',
                                  color: '#147a50',
                                  fontWeight: 500
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                      <Button size="small" endIcon={<ArrowIcon />} sx={{ color: '#147a50' }}>
                        Antwort lesen
                      </Button>
                    </CardActions>
                  </Card>
                </Fade>
              ))}
            </Box>
          )}
          
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button 
              variant="outlined" 
              size="large"
              component={Link}
              to="/faqs"
              sx={{ 
                borderColor: '#147a50',
                color: '#147a50',
                '&:hover': {
                  borderColor: '#147a50',
                  bgcolor: 'rgba(20, 122, 80, 0.04)'
                }
              }}
            >
              Alle FAQs anzeigen
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Value Proposition */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
            Investition in Ihre Zukunft
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Stromhaltig ist mehr als nur eine Software - es ist Ihr strategischer Partner für den Erfolg in der Energiewirtschaft
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4,
          alignItems: 'start'
        }}>
          <List>
            <ListItem>
              <ListItemIcon>
                <TrendingIcon sx={{ color: '#147a50' }} />
              </ListItemIcon>
              <ListItemText
                primary="Zeitersparnis von 80%"
                secondary="Durch KI-gestützte Analysen und automatisierte Recherche sparen Sie wertvolle Zeit bei komplexen Energiemarkt-Fragen."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SpeedIcon sx={{ color: '#147a50' }} />
              </ListItemIcon>
              <ListItemText
                primary="Sofortige Expertise"
                secondary="24/7 Zugriff auf spezialisiertes Wissen zur Energiewirtschaft, Regulierung und Marktkommunikation."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <BusinessIcon sx={{ color: '#147a50' }} />
              </ListItemIcon>
              <ListItemText
                primary="Wettbewerbsvorteile"
                secondary="Bleiben Sie mit aktuellen Markttrends und regulatorischen Änderungen immer einen Schritt voraus."
              />
            </ListItem>
          </List>
          
          <Paper sx={{ p: 4, bgcolor: 'rgba(20, 122, 80, 0.05)', borderRadius: 2 }}>
            <Typography variant="h4" component="h3" sx={{ mb: 2, fontWeight: 600, color: '#147a50' }}>
              ROI in der ersten Woche
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Unsere Kunden berichten von messbaren Verbesserungen bereits nach wenigen Tagen:
            </Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                • 3-5 Stunden Zeitersparnis pro Woche
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Schnellere Entscheidungsfindung durch bessere Datenbasis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Reduzierte Compliance-Risiken durch aktuelle Informationen
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Verbesserte Marktposition durch strategische Insights
              </Typography>
            </Stack>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'white', 
              borderRadius: 1,
              border: '1px solid rgba(20, 122, 80, 0.2)'
            }}>
              <Typography variant="h6" color="#147a50" fontWeight="bold">
                Stundensatz eines Energieberaters: €150-250
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stromhaltig zahlt sich bereits nach der ersten gesparten Beratungsstunde aus.
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
