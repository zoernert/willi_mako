import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  IconButton,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  ReportProblem as ReportIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/apiClient';

interface ProblemReportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface UploadedFile {
  file: File;
  preview: string;
}

const ProblemReportDialog: React.FC<ProblemReportDialogProps> = ({ open, onClose }) => {
  const [problemDescription, setProblemDescription] = useState('');
  const [category, setCategory] = useState('Allgemein');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [categories] = useState([
    'Allgemein',
    'Chat-Funktionalität', 
    'Marktpartner-Suche',
    'FAQ-System',
    'Quiz-System',
    'Dokument-Upload',
    'Teams & Zusammenarbeit',
    'Benutzeroberfläche',
    'Performance',
    'Datenfehler',
    'Sonstiges'
  ]);

  // Get current page and browser info
  const getCurrentPageInfo = () => {
    return {
      currentPage: window.location.pathname + window.location.search,
      browserInfo: `${navigator.userAgent} | Viewport: ${window.innerWidth}x${window.innerHeight}`,
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setSubmitError('Nur Bilddateien sind als Screenshots erlaubt');
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setSubmitError('Dateigröße darf 10MB nicht überschreiten');
        return;
      }
      
      // Check total number of files
      if (uploadedFiles.length + newFiles.length >= 5) {
        setSubmitError('Maximal 5 Screenshots können hochgeladen werden');
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      newFiles.push({ file, preview });
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setSubmitError(null);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSubmit = async () => {
    if (!problemDescription.trim()) {
      setSubmitError('Bitte beschreiben Sie das Problem');
      return;
    }

    setUploading(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('problemDescription', problemDescription.trim());
      formData.append('category', category);
      formData.append('additionalInfo', additionalInfo.trim());
      
      const pageInfo = getCurrentPageInfo();
      formData.append('currentPage', pageInfo.currentPage);
      formData.append('browserInfo', pageInfo.browserInfo);

      // Add screenshot files
      uploadedFiles.forEach((uploadedFile) => {
        formData.append('screenshots', uploadedFile.file);
      });

      await apiClient.post('/problem-report/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmitSuccess(true);
      
      // Reset form
      setProblemDescription('');
      setCategory('Allgemein');
      setAdditionalInfo('');
      setUploadedFiles([]);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting problem report:', error);
      setSubmitError(
        error.response?.data?.message || 
        'Fehler beim Senden des Problemberichts. Bitte versuchen Sie es später erneut.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      // Clean up previews
      uploadedFiles.forEach(file => URL.revokeObjectURL(file.preview));
      setUploadedFiles([]);
      setProblemDescription('');
      setCategory('Allgemein');
      setAdditionalInfo('');
      setSubmitError(null);
      setSubmitSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={uploading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ReportIcon sx={{ mr: 1, color: 'error.main' }} />
            Problem melden
          </Box>
          <IconButton 
            onClick={handleClose} 
            disabled={uploading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Haben Sie ein Problem oder einen Fehler gefunden? Helfen Sie uns dabei, 
          Willi Mako zu verbessern, indem Sie uns Details mitteilen.
        </Typography>

        {submitSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Problembericht erfolgreich gesendet! Vielen Dank für Ihr Feedback.
          </Alert>
        )}

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Category Selection */}
          <FormControl fullWidth>
            <InputLabel>Kategorie</InputLabel>
            <Select
              value={category}
              label="Kategorie"
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Problem Description */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Problembeschreibung *"
            placeholder="Beschreiben Sie bitte das Problem so detailliert wie möglich..."
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            disabled={uploading}
            error={!problemDescription.trim() && submitError !== null}
            helperText="Bitte beschreiben Sie, was genau nicht funktioniert oder welches Problem auftritt."
          />

          {/* Additional Information */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Zusätzliche Informationen"
            placeholder="Weitere Details, die hilfreich sein könnten..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            disabled={uploading}
            helperText="Optional: Schritte zur Reproduktion, erwartetes Verhalten, etc."
          />

          {/* Screenshot Upload */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Screenshots (optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Screenshots helfen uns dabei, das Problem besser zu verstehen. Sie können bis zu 5 Bilder hochladen.
            </Typography>
            
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="screenshot-upload"
              multiple
              type="file"
              onChange={handleFileUpload}
              disabled={uploading || uploadedFiles.length >= 5}
            />
            <label htmlFor="screenshot-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<PhotoIcon />}
                disabled={uploading || uploadedFiles.length >= 5}
                sx={{ mb: 2 }}
              >
                Screenshots hinzufügen ({uploadedFiles.length}/5)
              </Button>
            </label>

            {/* Show uploaded files */}
            {uploadedFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {uploadedFiles.map((uploadedFile, index) => (
                  <Box key={index} sx={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={uploadedFile.preview}
                      alt={`Screenshot ${index + 1}`}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid #ddd'
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'error.dark',
                        },
                        width: 20,
                        height: 20,
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Current Page Info */}
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              📄 Aktuelle Seite
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getCurrentPageInfo().currentPage}
            </Typography>
          </Box>
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Problembericht wird gesendet...
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={uploading}
          color="primary"
        >
          Abbrechen
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary" 
          variant="contained"
          disabled={uploading || !problemDescription.trim()}
          startIcon={uploading ? <CircularProgress size={20} /> : <ReportIcon />}
        >
          {uploading ? 'Wird gesendet...' : 'Problem melden'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProblemReportDialog;
