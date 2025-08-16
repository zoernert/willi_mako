import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
  Container,
} from '@mui/material';
import {
  PhotoCamera as PhotoIcon,
  ContentPaste as PasteIcon,
  Close as CloseIcon,
  FileCopy as CopyIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Tag as TagIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface ExtractedCode {
  type: 'MaLo' | 'MeLo' | 'EIC' | 'BDEW';
  value: string;
  confidence: number;
  context?: string;
}

interface ExtractedInfo {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
}

interface BDEWPartnerInfo {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  contact?: string;
  website?: string;
}

interface AnalysisResult {
  codes: ExtractedCode[];
  additionalInfo: ExtractedInfo;
  bdewPartnerInfo?: BDEWPartnerInfo;
  rawText?: string;
}

const ScreenshotAnalyzerMain: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handlePaste = useCallback(async () => {
    try {
      setError(null);
      setIsAnalyzing(true);
      setResult(null);

      const clipboardItems = await navigator.clipboard.read();
      let imageFile: File | null = null;

      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            imageFile = new File([blob], 'screenshot.png', { type });
            break;
          }
        }
        if (imageFile) break;
      }

      if (!imageFile) {
        setError('Kein Bild in der Zwischenablage gefunden. Bitte kopieren Sie ein Screenshot.');
        return;
      }

      await analyzeImage(imageFile);

    } catch (err) {
      console.error('Fehler beim Einfügen:', err);
      setError('Fehler beim Zugriff auf die Zwischenablage. Bitte stellen Sie sicher, dass Sie die Berechtigung erteilt haben.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/analyze-screenshot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          if (errorData.details) {
            setError(errorData.details);
            return;
          }
        } catch (parseError) {
          // Falls JSON-Parsing fehlschlägt, verwende Status
        }
        throw new Error(`Server-Fehler: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      console.error('Analysefehler:', err);
      setError('Fehler bei der Analyse. Bitte versuchen Sie es erneut.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const getCodeColor = (type: string) => {
    switch (type) {
      case 'MaLo': return 'primary';
      case 'MeLo': return 'secondary';
      case 'EIC': return 'success';
      case 'BDEW': return 'warning';
      default: return 'default';
    }
  };

  const getCodeDescription = (type: string) => {
    switch (type) {
      case 'MaLo': return 'Marktlokations-ID';
      case 'MeLo': return 'Messlokations-ID';
      case 'EIC': return 'Energy Identification Code';
      case 'BDEW': return 'BDEW Code-Nummer';
      default: return type;
    }
  };

  return (
    <Container maxWidth="lg">
      {/* Upload Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
        <PhotoIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Screenshot-Analyse starten
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
          Erstellen Sie einen Screenshot oder kopieren Sie ein Bild in die Zwischenablage und klicken Sie den Button unten, 
          um automatisch Energiewirtschafts-Codes zu extrahieren.
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={isAnalyzing ? <CircularProgress size={24} color="inherit" /> : <PasteIcon />}
          onClick={handlePaste}
          disabled={isAnalyzing}
          sx={{ 
            py: 2, 
            px: 4, 
            fontSize: '1.1rem',
            borderRadius: 3
          }}
        >
          {isAnalyzing ? 'Analysiere Screenshot...' : 'Screenshot aus Zwischenablage analysieren'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Results Section */}
      {result && (
        <Box>
          {/* Success Message */}
          <Alert severity="success" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon />
              <Typography variant="body1">
                Screenshot erfolgreich analysiert! {result.codes.length} Code(s) gefunden.
              </Typography>
            </Box>
          </Alert>

          <Box>
            {/* Extracted Codes */}
            {result.codes.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TagIcon color="primary" />
                      Erkannte Codes
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Klicken Sie auf einen Code, um ihn in die Zwischenablage zu kopieren.
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                      gap: 2 
                    }}>
                      {result.codes.map((code, index) => (
                        <Paper 
                          key={index}
                          elevation={1}
                          sx={{ 
                            p: 2, 
                            cursor: 'pointer', 
                            transition: 'all 0.2s',
                            border: '1px solid',
                            borderColor: 'divider',
                            '&:hover': { 
                              elevation: 3,
                              borderColor: 'primary.main',
                              transform: 'translateY(-2px)'
                            }
                          }}
                          onClick={() => copyToClipboard(code.value)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Chip
                              label={code.type}
                              color={getCodeColor(code.type) as any}
                              size="small"
                              variant="filled"
                            />
                            {copiedCode === code.value ? (
                              <CheckIcon color="success" fontSize="small" />
                            ) : (
                              <CopyIcon color="action" fontSize="small" />
                            )}
                          </Box>
                          <Typography variant="h6" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {code.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getCodeDescription(code.type)} • {(code.confidence * 100).toFixed(0)}% Konfidenz
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
              gap: 3,
              mb: 3
            }}>
              {/* BDEW Partner Information */}
              {result.bdewPartnerInfo && (
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon color="primary" />
                      BDEW Marktpartner-Information
                    </Typography>
                    <List>
                      {result.bdewPartnerInfo.name && (
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => copyToClipboard(result.bdewPartnerInfo!.name!)}
                        >
                          <ListItemIcon><BusinessIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Unternehmensname"
                            secondary={result.bdewPartnerInfo.name}
                          />
                          <IconButton size="small">
                            <CopyIcon />
                          </IconButton>
                        </ListItem>
                      )}
                      {result.bdewPartnerInfo.address && (
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => copyToClipboard(`${result.bdewPartnerInfo!.address}${result.bdewPartnerInfo!.postalCode ? `, ${result.bdewPartnerInfo!.postalCode}` : ''}${result.bdewPartnerInfo!.city ? ` ${result.bdewPartnerInfo!.city}` : ''}`)}
                        >
                          <ListItemIcon><LocationIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Adresse"
                            secondary={`${result.bdewPartnerInfo.address}${result.bdewPartnerInfo.postalCode ? `, ${result.bdewPartnerInfo.postalCode}` : ''}${result.bdewPartnerInfo.city ? ` ${result.bdewPartnerInfo.city}` : ''}`}
                          />
                          <IconButton size="small">
                            <CopyIcon />
                          </IconButton>
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {(result.additionalInfo.name || result.additionalInfo.address || result.additionalInfo.email || result.additionalInfo.phone) && (
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon color="primary" />
                      Zusätzliche Informationen
                    </Typography>
                    <List>
                      {result.additionalInfo.name && (
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => copyToClipboard(result.additionalInfo.name!)}
                        >
                          <ListItemText 
                            primary="Name"
                            secondary={result.additionalInfo.name}
                          />
                          <IconButton size="small">
                            <CopyIcon />
                          </IconButton>
                        </ListItem>
                      )}
                      {result.additionalInfo.address && (
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => copyToClipboard(`${result.additionalInfo.address}${result.additionalInfo.postalCode ? `, ${result.additionalInfo.postalCode}` : ''}${result.additionalInfo.city ? ` ${result.additionalInfo.city}` : ''}`)}
                        >
                          <ListItemText 
                            primary="Adresse"
                            secondary={`${result.additionalInfo.address}${result.additionalInfo.postalCode ? `, ${result.additionalInfo.postalCode}` : ''}${result.additionalInfo.city ? ` ${result.additionalInfo.city}` : ''}`}
                          />
                          <IconButton size="small">
                            <CopyIcon />
                          </IconButton>
                        </ListItem>
                      )}
                      {result.additionalInfo.email && (
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => copyToClipboard(result.additionalInfo.email!)}
                        >
                          <ListItemText 
                            primary="E-Mail"
                            secondary={result.additionalInfo.email}
                          />
                          <IconButton size="small">
                            <CopyIcon />
                          </IconButton>
                        </ListItem>
                      )}
                      {result.additionalInfo.phone && (
                        <ListItem 
                          sx={{ px: 0, cursor: 'pointer' }}
                          onClick={() => copyToClipboard(result.additionalInfo.phone!)}
                        >
                          <ListItemText 
                            primary="Telefon"
                            secondary={result.additionalInfo.phone}
                          />
                          <IconButton size="small">
                            <CopyIcon />
                          </IconButton>
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>

            {/* Details Button */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={() => setDetailsOpen(true)}
                size="large"
              >
                Analyse-Details anzeigen
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Analyse-Details
          <IconButton
            onClick={() => setDetailsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {result?.rawText && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Erkannter Text:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {result.rawText}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ScreenshotAnalyzerMain;
