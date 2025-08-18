import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  PhotoCamera,
  Close as CloseIcon,
  ContentPaste as PasteIcon,
  CloudUpload as UploadIcon,
  Visibility as PreviewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface ScreenshotUploadProps {
  onScreenshotUploaded: (file: File, analysis?: ScreenshotAnalysis) => void;
  onScreenshotRemoved: () => void;
  disabled?: boolean;
  maxFileSize?: number; // in MB
}

interface ScreenshotAnalysis {
  detectedElements: DetectedElement[];
  errorMessages: string[];
  uiComponents: UIComponent[];
  confidence: number;
  isSchleupnCS30: boolean;
}

interface DetectedElement {
  type: 'error' | 'warning' | 'dialog' | 'menu' | 'form' | 'button' | 'table';
  text: string;
  confidence: number;
  position?: { x: number; y: number; width: number; height: number };
}

interface UIComponent {
  name: string;
  visible: boolean;
  text?: string;
}

const ScreenshotUpload: React.FC<ScreenshotUploadProps> = ({
  onScreenshotUploaded,
  onScreenshotRemoved,
  disabled = false,
  maxFileSize = 10, // 10MB default
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ScreenshotAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Validiere Bilddatei
  const validateFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSizeBytes = maxFileSize * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      setError('Nur PNG, JPEG und WebP Dateien sind erlaubt');
      return false;
    }

    if (file.size > maxSizeBytes) {
      setError(`Datei ist zu groß. Maximum: ${maxFileSize}MB`);
      return false;
    }

    return true;
  };

  // Analysiere Screenshot mit Backend-API
  const analyzeScreenshot = async (file: File): Promise<ScreenshotAnalysis | null> => {
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('screenshot', file);

      const response = await fetch('/api/chat/analyze-screenshot', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Screenshot-Analyse fehlgeschlagen');
      }

      const result = await response.json();
      return result.data.analysis;
    } catch (error) {
      console.error('Error analyzing screenshot:', error);
      setError('Fehler bei der Screenshot-Analyse');
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle File Selection
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    if (!validateFile(file)) {
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Analyze screenshot
    const analysisResult = await analyzeScreenshot(file);
    setAnalysis(analysisResult);

    // Notify parent component
    onScreenshotUploaded(file, analysisResult || undefined);
  }, [onScreenshotUploaded, maxFileSize]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], `screenshot-${Date.now()}.png`, { type });
            handleFileSelect(file);
            return;
          }
        }
      }
      
      setError('Kein Bild in der Zwischenablage gefunden');
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      setError('Fehler beim Einfügen aus der Zwischenablage');
    }
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      setError('Bitte ziehen Sie eine Bilddatei hierher');
    }
  };

  // Remove screenshot
  const handleRemove = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setAnalysis(null);
    setError(null);
    onScreenshotRemoved();
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render analysis results
  const renderAnalysis = () => {
    if (!analysis) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Screenshot-Analyse:
        </Typography>
        
        {analysis.isSchleupnCS30 && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Schleupen CS 3.0 Interface erkannt
          </Alert>
        )}

        {analysis.errorMessages.length > 0 && (
          <Alert severity="error" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Erkannte Fehlermeldungen:
            </Typography>
            {analysis.errorMessages.map((error, index) => (
              <Typography key={index} variant="body2">
                • {error}
              </Typography>
            ))}
          </Alert>
        )}

        {analysis.detectedElements.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Erkannte UI-Elemente: {analysis.detectedElements.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analyse-Vertrauen: {Math.round(analysis.confidence * 100)}%
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <Box sx={{ mb: 2 }}>
        {!selectedFile ? (
          <Paper
            ref={dropZoneRef}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              textAlign: 'center',
              backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
              cursor: disabled ? 'default' : 'pointer',
              '&:hover': {
                borderColor: disabled ? 'divider' : 'primary.main',
                backgroundColor: disabled ? 'action.disabledBackground' : 'action.hover',
              },
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <UploadIcon 
              sx={{ 
                fontSize: 48, 
                color: disabled ? 'action.disabled' : 'action.active',
                mb: 1 
              }} 
            />
            <Typography variant="h6" gutterBottom>
              Screenshot hochladen
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Ziehen Sie eine Bilddatei hierher oder klicken Sie zum Auswählen
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Unterstützte Formate: PNG, JPEG, WebP (max. {maxFileSize}MB)
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Datei auswählen
              </Button>
              <Button
                variant="outlined"
                startIcon={<PasteIcon />}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaste();
                }}
              >
                Einfügen
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                {selectedFile.name}
              </Typography>
              <Tooltip title="Vorschau anzeigen">
                <IconButton onClick={() => setPreviewOpen(true)}>
                  <PreviewIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Screenshot entfernen">
                <IconButton onClick={handleRemove} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {analyzing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">
                  Analysiere Screenshot...
                </Typography>
              </Box>
            )}

            {renderAnalysis()}
          </Paper>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Screenshot Vorschau
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewUrl && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewUrl}
                alt="Screenshot Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ScreenshotUpload;
