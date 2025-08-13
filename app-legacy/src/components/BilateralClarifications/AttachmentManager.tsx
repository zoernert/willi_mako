// Attachment Manager für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Komponente zur Verwaltung von Anhängen in Klärfällen

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Types
import { 
  ClarificationAttachment, 
  AttachmentType, 
  AttachmentCategory 
} from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';

interface AttachmentManagerProps {
  clarificationId: string;
  readOnly?: boolean;
  onAttachmentsChange?: () => void;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  clarificationId,
  readOnly = false,
  onAttachmentsChange
}) => {
  const [attachments, setAttachments] = useState<ClarificationAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    category: 'GENERAL' as AttachmentCategory,
    description: '',
    isPublic: false
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [clarificationId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await bilateralClarificationService.getAttachments(clarificationId);
      setAttachments(data);
    } catch (err) {
      setError('Fehler beim Laden der Anhänge');
      console.error('Error loading attachments:', err);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        setUploadDialogOpen(true);
      }
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: readOnly
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(0);
      const attachment = await bilateralClarificationService.uploadAttachment(
        clarificationId,
        selectedFile
      );
      
      setAttachments(prev => [...prev, attachment]);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadMetadata({
        category: 'GENERAL',
        description: '',
        isPublic: false
      });
      onAttachmentsChange?.();
    } catch (err) {
      setError('Fehler beim Upload');
      console.error('Error uploading file:', err);
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const blob = await bilateralClarificationService.downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Fehler beim Download');
      console.error('Error downloading file:', err);
    }
  };

  const getFileIcon = (type: AttachmentType) => {
    switch (type) {
      case 'IMAGE': return <ImageIcon />;
      case 'EMAIL': return <EmailIcon />;
      case 'DOCUMENT': return <DocumentIcon />;
      default: return <AttachFileIcon />;
    }
  };

  const getCategoryColor = (category: AttachmentCategory) => {
    switch (category) {
      case 'FEHLER': return 'error';
      case 'KORREKTUR': return 'warning';
      case 'KOMMUNIKATION': return 'info';
      case 'URSPRUNG': return 'primary';
      default: return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Anhänge ({attachments.length})
        </Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
            size="small"
          >
            Hinzufügen
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!readOnly && (
        <Paper
          {...getRootProps()}
          sx={{
            p: 3,
            mb: 2,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <input {...getInputProps()} />
          <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          <Typography variant="body1" color="textSecondary">
            {isDragActive ? 'Datei hier ablegen...' : 'Datei hierher ziehen oder klicken zum Auswählen'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Max. 10MB pro Datei
          </Typography>
        </Paper>
      )}

      <List>
        {attachments.map((attachment) => (
          <React.Fragment key={attachment.id}>
            <ListItem>
              <Box display="flex" alignItems="center" mr={2}>
                {getFileIcon(attachment.attachmentType)}
              </Box>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">{attachment.filename}</Typography>
                    <Chip 
                      label={attachment.attachmentCategory} 
                      size="small" 
                      color={getCategoryColor(attachment.attachmentCategory)}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      {formatFileSize(attachment.fileSize)} • 
                      {new Date(attachment.uploadedAt).toLocaleDateString('de-DE')}
                    </Typography>
                    {attachment.description && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {attachment.description}
                      </Typography>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(attachment.id.toString(), attachment.filename)}
                    title="Herunterladen"
                  >
                    <DownloadIcon />
                  </IconButton>
                  {!readOnly && (
                    <IconButton
                      size="small"
                      color="error"
                      title="Löschen"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>

      {attachments.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <AttachFileIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="body1" color="textSecondary">
            Keine Anhänge vorhanden
          </Typography>
        </Box>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Datei hochladen</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Box mb={2}>
              <Typography variant="body1" gutterBottom>
                Ausgewählte Datei: <strong>{selectedFile.name}</strong>
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Größe: {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>
          )}

          <TextField
            label="Beschreibung"
            value={uploadMetadata.description}
            onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Kategorie</InputLabel>
            <Select
              value={uploadMetadata.category}
              onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value as AttachmentCategory }))}
            >
              <MenuItem value="GENERAL">Allgemein</MenuItem>
              <MenuItem value="URSPRUNG">Ursprung</MenuItem>
              <MenuItem value="FEHLER">Fehler</MenuItem>
              <MenuItem value="KORREKTUR">Korrektur</MenuItem>
              <MenuItem value="KOMMUNIKATION">Kommunikation</MenuItem>
            </Select>
          </FormControl>

          {uploadProgress !== null && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Upload: {Math.round(uploadProgress)}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!selectedFile || uploadProgress !== null}
          >
            Hochladen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
