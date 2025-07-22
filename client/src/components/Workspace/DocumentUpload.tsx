import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { documentsApi } from '../../services/documentsApi';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  title?: string;
  description?: string;
  documentId?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  maxFileSize = 50,
  allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'md']
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [editingFile, setEditingFile] = useState<UploadFile | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { showSnackbar } = useSnackbar();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach((rejection) => {
      const { file, errors } = rejection;
      const errorMessages = errors.map((e: any) => e.message).join(', ');
      showSnackbar(`${file.name}: ${errorMessages}`, 'error');
    });

    // Add accepted files to upload queue
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending',
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: ''
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading immediately
    newFiles.forEach(uploadFile => {
      uploadDocument(uploadFile);
    });
  }, [showSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: maxFileSize * 1024 * 1024,
    multiple: true
  });

  const uploadDocument = async (uploadFile: UploadFile) => {
    const updateFileStatus = (updates: Partial<UploadFile>) => {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, ...updates } : f
      ));
    };

    try {
      updateFileStatus({ status: 'uploading', progress: 0 });

      // Use the new documentsApi service with progress tracking
      const response = await documentsApi.uploadDocumentWithProgress(
        uploadFile.file,
        (progress) => {
          updateFileStatus({ progress });
        }
      );

      updateFileStatus({ 
        status: 'processing', 
        progress: 80,
        documentId: response.document.id
      });
      
      // Poll for processing completion
      pollProcessingStatus(uploadFile.id, response.document.id);

    } catch (error) {
      console.error('Upload error:', error);
      updateFileStatus({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  };

  const pollProcessingStatus = async (fileId: string, documentId: string) => {
    const updateFileStatus = (updates: Partial<UploadFile>) => {
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, ...updates } : f
      ));
    };

    try {
      const document = await documentsApi.getDocument(documentId);
      
      if (document.processed) {
        updateFileStatus({ 
          status: 'completed', 
          progress: 100 
        });
        showSnackbar('Dokument erfolgreich verarbeitet', 'success');
        
        if (onUploadComplete) {
          onUploadComplete(documentId);
        }
      } else {
        // Continue polling
        updateFileStatus({ progress: 90 });
        setTimeout(() => pollProcessingStatus(fileId, documentId), 2000);
      }
    } catch (error) {
      updateFileStatus({ 
        status: 'error', 
        error: 'Processing status check failed'
      });
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = (uploadFile: UploadFile) => {
    const updatedFile = { ...uploadFile, status: 'pending' as const, progress: 0, error: undefined };
    setUploadFiles(prev => prev.map(f => f.id === uploadFile.id ? updatedFile : f));
    uploadDocument(updatedFile);
  };

  const handleEditFile = (uploadFile: UploadFile) => {
    setEditingFile(uploadFile);
    setEditTitle(uploadFile.title || '');
    setEditDescription(uploadFile.description || '');
  };

  const handleSaveEdit = () => {
    if (editingFile) {
      setUploadFiles(prev => prev.map(f => 
        f.id === editingFile.id 
          ? { ...f, title: editTitle, description: editDescription }
          : f
      ));
      setEditingFile(null);
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'uploading':
      case 'processing': return 'primary';
      default: return 'default';
    }
  };

  const getStatusText = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return 'Warteschlange';
      case 'uploading': return 'Upload...';
      case 'processing': return 'Verarbeitung...';
      case 'completed': return 'Abgeschlossen';
      case 'error': return 'Fehler';
      default: return 'Unbekannt';
    }
  };

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: 2,
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderStyle: 'dashed',
          backgroundColor: isDragActive ? 'primary.light' : 'grey.50',
          cursor: 'pointer',
          textAlign: 'center',
          mb: 3,
          transition: 'all 0.3s ease'
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Dateien hier ablegen...' : 'Dateien hochladen'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Unterstützte Formate: {allowedTypes.join(', ').toUpperCase()} • Max. {maxFileSize}MB
        </Typography>
      </Paper>

      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Upload-Status ({uploadFiles.length} Datei{uploadFiles.length !== 1 ? 'en' : ''})
          </Typography>
          
          <List>
            {uploadFiles.map((uploadFile) => (
              <ListItem key={uploadFile.id} divider>
                <ListItemIcon>
                  <FileIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {uploadFile.title}
                      </Typography>
                      <Chip
                        label={getStatusText(uploadFile.status)}
                        size="small"
                        color={getStatusColor(uploadFile.status)}
                        icon={uploadFile.status === 'completed' ? <CheckIcon /> : 
                              uploadFile.status === 'error' ? <ErrorIcon /> : undefined}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {uploadFile.file.name} • {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                      {uploadFile.description && (
                        <Typography variant="caption" color="text.secondary">
                          {uploadFile.description}
                        </Typography>
                      )}
                      {uploadFile.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {uploadFile.error}
                        </Alert>
                      )}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <LinearProgress 
                          variant="determinate" 
                          value={uploadFile.progress} 
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {uploadFile.status === 'pending' && (
                      <IconButton
                        size="small"
                        onClick={() => handleEditFile(uploadFile)}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {uploadFile.status === 'error' && (
                      <IconButton
                        size="small"
                        onClick={() => retryUpload(uploadFile)}
                      >
                        <RefreshIcon />
                      </IconButton>
                    )}
                    {uploadFile.status !== 'uploading' && uploadFile.status !== 'processing' && (
                      <IconButton
                        size="small"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={!!editingFile} 
        onClose={() => setEditingFile(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Dokument-Details bearbeiten</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titel"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Beschreibung (optional)"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingFile(null)}>Abbrechen</Button>
          <Button onClick={handleSaveEdit} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentUpload;
