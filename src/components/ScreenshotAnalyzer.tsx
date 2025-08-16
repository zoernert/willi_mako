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

const ScreenshotAnalyzer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      setError(null);
      setIsAnalyzing(true);

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
        // Versuche, eine detaillierte Fehlermeldung zu erhalten
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
      // Optional: Show a snackbar or toast notification
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
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoIcon />
          Screenshot-Analyse
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Fügen Sie einen Screenshot ein, um automatisch Marktpartner-Codes und Informationen zu extrahieren.
        </Typography>

        <Button
          variant="contained"
          startIcon={isAnalyzing ? <CircularProgress size={20} /> : <PasteIcon />}
          onClick={handlePaste}
          disabled={isAnalyzing}
          fullWidth
          sx={{ mb: 2 }}
        >
          {isAnalyzing ? 'Analysiere...' : 'Screenshot einfügen & analysieren'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box>
            {result.codes.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Erkannte Codes
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {result.codes.map((code, index) => (
                      <Tooltip key={index} title={`${getCodeDescription(code.type)} - Konfidenz: ${(code.confidence * 100).toFixed(0)}%`}>
                        <Chip
                          label={`${code.type}: ${code.value}`}
                          color={getCodeColor(code.type) as any}
                          variant="filled"
                          icon={<TagIcon />}
                          onClick={() => copyToClipboard(code.value)}
                          onDelete={() => copyToClipboard(code.value)}
                          deleteIcon={<CopyIcon />}
                        />
                      </Tooltip>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {result.bdewPartnerInfo && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon />
                    BDEW Marktpartner-Information
                  </Typography>
                  <List dense>
                    {result.bdewPartnerInfo.name && (
                      <ListItem>
                        <ListItemIcon><BusinessIcon /></ListItemIcon>
                        <ListItemText primary={result.bdewPartnerInfo.name} />
                        <IconButton size="small" onClick={() => copyToClipboard(result.bdewPartnerInfo!.name!)}>
                          <CopyIcon />
                        </IconButton>
                      </ListItem>
                    )}
                    {result.bdewPartnerInfo.address && (
                      <ListItem>
                        <ListItemIcon><LocationIcon /></ListItemIcon>
                        <ListItemText 
                          primary={`${result.bdewPartnerInfo.address}${result.bdewPartnerInfo.postalCode ? `, ${result.bdewPartnerInfo.postalCode}` : ''}${result.bdewPartnerInfo.city ? ` ${result.bdewPartnerInfo.city}` : ''}`}
                        />
                        <IconButton size="small" onClick={() => copyToClipboard(`${result.bdewPartnerInfo!.address}${result.bdewPartnerInfo!.postalCode ? `, ${result.bdewPartnerInfo!.postalCode}` : ''}${result.bdewPartnerInfo!.city ? ` ${result.bdewPartnerInfo!.city}` : ''}`)}>
                          <CopyIcon />
                        </IconButton>
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}

            {(result.additionalInfo.name || result.additionalInfo.address || result.additionalInfo.email || result.additionalInfo.phone) && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Zusätzliche Informationen
                  </Typography>
                  <List dense>
                    {result.additionalInfo.name && (
                      <ListItem>
                        <ListItemText primary="Name" secondary={result.additionalInfo.name} />
                        <IconButton size="small" onClick={() => copyToClipboard(result.additionalInfo.name!)}>
                          <CopyIcon />
                        </IconButton>
                      </ListItem>
                    )}
                    {result.additionalInfo.address && (
                      <ListItem>
                        <ListItemText primary="Adresse" secondary={`${result.additionalInfo.address}${result.additionalInfo.postalCode ? `, ${result.additionalInfo.postalCode}` : ''}${result.additionalInfo.city ? ` ${result.additionalInfo.city}` : ''}`} />
                        <IconButton size="small" onClick={() => copyToClipboard(`${result.additionalInfo.address}${result.additionalInfo.postalCode ? `, ${result.additionalInfo.postalCode}` : ''}${result.additionalInfo.city ? ` ${result.additionalInfo.city}` : ''}`)}>
                          <CopyIcon />
                        </IconButton>
                      </ListItem>
                    )}
                    {result.additionalInfo.email && (
                      <ListItem>
                        <ListItemText primary="E-Mail" secondary={result.additionalInfo.email} />
                        <IconButton size="small" onClick={() => copyToClipboard(result.additionalInfo.email!)}>
                          <CopyIcon />
                        </IconButton>
                      </ListItem>
                    )}
                    {result.additionalInfo.phone && (
                      <ListItem>
                        <ListItemText primary="Telefon" secondary={result.additionalInfo.phone} />
                        <IconButton size="small" onClick={() => copyToClipboard(result.additionalInfo.phone!)}>
                          <CopyIcon />
                        </IconButton>
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}

            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => setDetailsOpen(true)}
              sx={{ mt: 1 }}
            >
              Details anzeigen
            </Button>
          </Box>
        )}

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
                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
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
      </Paper>
    </Box>
  );
};

export default ScreenshotAnalyzer;
