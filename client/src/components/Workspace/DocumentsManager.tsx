import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  LinearProgress,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Input
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  MoreVert as MoreIcon,
  SmartToy as AIIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DocumentPreview from './DocumentPreview';

interface Document {
  id: string;
  title: string;
  description?: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  is_processed: boolean;
  is_ai_context_enabled: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface DocumentsManagerProps {
  onStatsUpdate: () => void;
}

const DocumentsManager: React.FC<DocumentsManagerProps> = ({ onStatsUpdate }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentTags, setDocumentTags] = useState<string[]>([]);
  const [aiContextEnabled, setAiContextEnabled] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  const { showSnackbar } = useSnackbar();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });

      const response = await fetch(`/api/workspace/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setTotalPages(Math.ceil((data.total || 0) / 12));
    } catch (err) {
      showSnackbar('Fehler beim Laden der Dokumente', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, showSnackbar]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => {
        const error = file.errors[0];
        if (error.code === 'file-too-large') {
          return `${file.file.name}: Datei zu groß (max. 50MB)`;
        } else if (error.code === 'file-invalid-type') {
          return `${file.file.name}: Ungültiger Dateityp`;
        }
        return `${file.file.name}: ${error.message}`;
      });
      showSnackbar(`Fehler beim Upload: ${errors.join(', ')}`, 'error');
    }
    
    if (acceptedFiles.length > 0) {
      setSelectedFiles(acceptedFiles);
      setIsUploadDialogOpen(true);
    }
  }, [showSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploadLoading(true);
      const token = localStorage.getItem('token');
      const files = Array.from(selectedFiles);

      // Upload files one by one or multiple at once
      if (files.length === 1) {
        const file = files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', documentTitle || file.name);
        formData.append('description', documentDescription);
        formData.append('tags', JSON.stringify(documentTags));
        formData.append('is_ai_context_enabled', aiContextEnabled.toString());

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }
      } else {
        // Multiple file upload
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });
        formData.append('is_ai_context_enabled', aiContextEnabled.toString());

        const response = await fetch('/api/documents/upload-multiple', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }
      }

      showSnackbar(
        `${files.length} Dokument(e) erfolgreich hochgeladen`,
        'success'
      );
      setIsUploadDialogOpen(false);
      resetUploadForm();
      fetchDocuments();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Hochladen der Dokumente', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFiles([]);
    setDocumentTitle('');
    setDocumentDescription('');
    setDocumentTags([]);
    setAiContextEnabled(false);
    setNewTag('');
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setDocumentTitle(document.title);
    setDocumentDescription(document.description || '');
    setDocumentTags(document.tags);
    setAiContextEnabled(document.is_ai_context_enabled);
    setIsEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspace/documents/${editingDocument.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: documentTitle,
          description: documentDescription,
          tags: documentTags,
          is_ai_context_enabled: aiContextEnabled
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      showSnackbar('Dokument erfolgreich aktualisiert', 'success');
      setIsEditDialogOpen(false);
      fetchDocuments();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Aktualisieren des Dokuments', 'error');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspace/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      showSnackbar('Dokument erfolgreich gelöscht', 'success');
      fetchDocuments();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Löschen des Dokuments', 'error');
    }
    setAnchorEl(null);
  };

  const handleDownloadDocument = async (documentId: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      showSnackbar('Fehler beim Herunterladen des Dokuments', 'error');
    }
    setAnchorEl(null);
  };

  const handleToggleAIContext = async (document: Document) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspace/documents/${document.id}/ai-context`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: !document.is_ai_context_enabled
        })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle AI context');
      }

      showSnackbar(
        `KI-Kontext ${!document.is_ai_context_enabled ? 'aktiviert' : 'deaktiviert'}`,
        'success'
      );
      fetchDocuments();
    } catch (err) {
      showSnackbar('Fehler beim Ändern des KI-Kontexts', 'error');
    }
    setAnchorEl(null);
  };

  const handleReprocessDocument = async (documentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspace/documents/${documentId}/reprocess`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reprocess document');
      }

      showSnackbar('Dokument wird neu verarbeitet', 'success');
      fetchDocuments();
    } catch (err) {
      showSnackbar('Fehler beim Neu-Verarbeiten des Dokuments', 'error');
    }
    setAnchorEl(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddTag = () => {
    if (newTag && !documentTags.includes(newTag)) {
      setDocumentTags([...documentTags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setDocumentTags(documentTags.filter(tag => tag !== tagToRemove));
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handlePreviewDocument = (document: Document) => {
    setPreviewDocument(document);
    setIsPreviewOpen(true);
    setAnchorEl(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Upload Area with Drag & Drop */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box 
            {...getRootProps()}
            sx={{ 
              textAlign: 'center', 
              p: 3,
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              bgcolor: isDragActive ? 'action.hover' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ 
              fontSize: 48, 
              color: isDragActive ? 'primary.main' : 'text.secondary', 
              mb: 2 
            }} />
            <Typography variant="h6" gutterBottom color={isDragActive ? 'primary.main' : 'inherit'}>
              {isDragActive ? 'Dateien hier ablegen...' : 'Dokumente hochladen'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isDragActive 
                ? 'Lassen Sie die Dateien los, um sie hochzuladen'
                : 'Ziehen Sie Dateien hierher oder klicken Sie, um Dateien auszuwählen'
              }
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              sx={{ mt: 1 }}
            >
              Dateien auswählen
            </Button>
            
            <Typography variant="caption" display="block" sx={{ mt: 2 }}>
              Unterstützte Formate: PDF, DOC, DOCX, TXT, MD (max. 50MB pro Datei)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Documents Grid */}
      {documents.length === 0 && !loading ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Sie haben noch keine Dokumente hochgeladen. Verwenden Sie den Upload-Bereich oben, um Ihre ersten Dokumente hinzuzufügen.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {documents.map((document) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={document.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" noWrap sx={{ flexGrow: 1 }}>
                      {document.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, document)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {document.description || 'Keine Beschreibung'}
                  </Typography>

                  {/* Status indicators */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={document.is_processed ? 'Verarbeitet' : 'Wird verarbeitet...'}
                      color={document.is_processed ? 'success' : 'warning'}
                      icon={document.is_processed ? undefined : <CircularProgress size={12} />}
                    />
                    {document.is_ai_context_enabled && (
                      <Chip
                        size="small"
                        label="KI-Kontext"
                        color="primary"
                        icon={<AIIcon />}
                      />
                    )}
                  </Box>

                  {/* Tags */}
                  {document.tags && document.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      {document.tags.slice(0, 2).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                      {document.tags.length > 2 && (
                        <Chip
                          label={`+${document.tags.length - 2}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      )}
                    </Box>
                  )}

                  {/* File info */}
                  <Box sx={{ mt: 'auto' }}>
                    <Divider sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(document.file_size)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(document.updated_at)}
                      </Typography>
                    </Box>
                    
                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        startIcon={<PreviewIcon />}
                        onClick={() => handlePreviewDocument(document)}
                        sx={{ flex: 1 }}
                      >
                        Vorschau
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadDocument(document.id, document.original_name)}
                        sx={{ flex: 1 }}
                      >
                        Download
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedDocument && handlePreviewDocument(selectedDocument)}>
          <PreviewIcon sx={{ mr: 1 }} /> Vorschau
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleEditDocument(selectedDocument)}>
          <EditIcon sx={{ mr: 1 }} /> Bearbeiten
        </MenuItem>
        <MenuItem 
          onClick={() => selectedDocument && handleDownloadDocument(selectedDocument.id, selectedDocument.original_name)}
        >
          <DownloadIcon sx={{ mr: 1 }} /> Herunterladen
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleToggleAIContext(selectedDocument)}>
          <AIIcon sx={{ mr: 1 }} /> 
          {selectedDocument?.is_ai_context_enabled ? 'KI-Kontext deaktivieren' : 'KI-Kontext aktivieren'}
        </MenuItem>
        {selectedDocument?.is_processed && (
          <MenuItem onClick={() => selectedDocument && handleReprocessDocument(selectedDocument.id)}>
            <RefreshIcon sx={{ mr: 1 }} /> Neu verarbeiten
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => selectedDocument && handleDeleteDocument(selectedDocument.id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Löschen
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog
        open={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Dokumente hochladen ({selectedFiles?.length || 0} Datei{selectedFiles?.length !== 1 ? 'en' : ''})
        </DialogTitle>
        <DialogContent>
          {selectedFiles && selectedFiles.length === 1 && (
            <>
              <TextField
                autoFocus
                margin="dense"
                label="Titel"
                fullWidth
                variant="outlined"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder={selectedFiles[0]?.name}
                sx={{ mb: 2 }}
              />
              
              <TextField
                margin="dense"
                label="Beschreibung"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
            </>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={aiContextEnabled}
                onChange={(e) => setAiContextEnabled(e.target.checked)}
              />
            }
            label="Für KI-Kontext aktivieren"
            sx={{ mb: 2 }}
          />

          {/* File list */}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Ausgewählte Dateien ({selectedFiles?.length || 0}):
          </Typography>
          <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
            {selectedFiles && Array.from(selectedFiles).map((file, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 1, p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FileIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)} • {file.type || 'Unbekannter Typ'}
                    </Typography>
                  </Box>
                  {uploadLoading && (
                    <CircularProgress size={20} sx={{ ml: 1 }} />
                  )}
                </Box>
              </Card>
            ))}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsUploadDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleUpload}
            variant="contained"
            disabled={uploadLoading || !selectedFiles || selectedFiles.length === 0}
          >
            {uploadLoading ? <CircularProgress size={20} /> : 'Hochladen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Dokument bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Titel"
            fullWidth
            variant="outlined"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={documentDescription}
            onChange={(e) => setDocumentDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={aiContextEnabled}
                onChange={(e) => setAiContextEnabled(e.target.checked)}
              />
            }
            label="Für KI-Kontext aktivieren"
            sx={{ mb: 2 }}
          />

          {/* Tags */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Tags</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {documentTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Neuen Tag hinzufügen"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                Hinzufügen
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleUpdateDocument}
            variant="contained"
          >
            Aktualisieren
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Document Preview Dialog */}
      {previewDocument && (
        <DocumentPreview
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          documentId={previewDocument.id}
          documentName={previewDocument.title}
          mimeType={previewDocument.mime_type}
        />
      )}
    </Box>
  );
};

export default DocumentsManager;
