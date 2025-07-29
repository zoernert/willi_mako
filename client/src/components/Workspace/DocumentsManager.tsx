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
  Pagination,
  LinearProgress,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider
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
  Refresh as RefreshIcon,
  Group as TeamIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DocumentPreview from './DocumentPreview';
import DocumentUpload from './DocumentUpload';
import { documentsApi } from '../../services/documentsApi';
import { workspaceApi } from '../../services/workspaceApi';
import { Document } from '../../types/workspace';

interface DocumentsManagerProps {
  onStatsUpdate: () => void;
  showTeamDocuments?: boolean;
  teamName?: string;
}

const DocumentsManager: React.FC<DocumentsManagerProps> = ({ 
  onStatsUpdate, 
  showTeamDocuments = false,
  teamName 
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showAdvancedUpload, setShowAdvancedUpload] = useState(false);
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
      
      let data;
      if (showTeamDocuments) {
        // Fetch team documents
        data = await workspaceApi.getTeamDocuments();
      } else {
        // Fetch personal documents
        data = await documentsApi.getWorkspaceDocuments({
          page: currentPage,
          limit: 12
        });
      }
      
      setDocuments(data.documents || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 12));
    } catch (err) {
      console.error('Error fetching documents:', err);
      showSnackbar('Fehler beim Laden der Dokumente', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, showSnackbar, showTeamDocuments]);

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
      const files = Array.from(selectedFiles);

      if (files.length === 1) {
        const file = files[0];
        const metadata = {
          title: documentTitle || file.name,
          description: documentDescription,
          tags: documentTags,
          is_ai_context_enabled: aiContextEnabled,
        };
        await documentsApi.uploadDocument(file, metadata);
      } else {
        await documentsApi.uploadMultipleDocuments(files, { 
          is_ai_context_enabled: aiContextEnabled 
        });
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
    setDocumentTitle(document.title || document.name || '');
    setDocumentDescription(document.description || '');
    setDocumentTags(document.tags || []);
    setAiContextEnabled(document.is_ai_context_enabled || false);
    setIsEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    try {
      await documentsApi.updateDocument(editingDocument.id, {
        title: documentTitle,
        description: documentDescription,
        tags: documentTags,
        is_ai_context_enabled: aiContextEnabled
      });

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
      await documentsApi.deleteDocument(documentId);
      
      showSnackbar('Dokument erfolgreich gelöscht', 'success');
      fetchDocuments();
      onStatsUpdate();
    } catch (err) {
      console.error('Error deleting document:', err);
      showSnackbar('Fehler beim Löschen des Dokuments', 'error');
    }
    setAnchorEl(null);
  };

  const handleDownloadDocument = async (documentId: string, filename: string) => {
    try {
      const blob = await documentsApi.downloadDocument(documentId);
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
      console.error('Error downloading document:', err);
      showSnackbar('Fehler beim Herunterladen des Dokuments', 'error');
    }
    setAnchorEl(null);
  };

  const handleToggleAIContext = async (document: Document) => {
    try {
      await documentsApi.toggleAIContext(document.id, !(document.is_ai_context_enabled || false));
      
      showSnackbar(
        `KI-Kontext ${!document.is_ai_context_enabled ? 'aktiviert' : 'deaktiviert'}`,
        'success'
      );
      fetchDocuments();
    } catch (err) {
      console.error('Error toggling AI context:', err);
      showSnackbar('Fehler beim Ändern des KI-Kontexts', 'error');
    }
    setAnchorEl(null);
  };

  const handleReprocessDocument = async (documentId: string) => {
    try {
      await documentsApi.reprocessDocument(documentId);
      
      showSnackbar('Dokument wird neu verarbeitet', 'success');
      fetchDocuments();
    } catch (err) {
      console.error('Error reprocessing document:', err);
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
      {/* Header with Team Info */}
      {showTeamDocuments && teamName && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <TeamIcon color="primary" />
            Team-Dokumente von "{teamName}"
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Diese Dokumente wurden von Ihren Team-Kollegen hochgeladen und sind für alle Mitglieder sichtbar.
          </Typography>
        </Box>
      )}

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
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setShowAdvancedUpload(!showAdvancedUpload)}
              >
                {showAdvancedUpload ? 'Einfacher Upload' : 'Erweiterte Upload-Optionen'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Advanced Upload Component */}
      {showAdvancedUpload && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Erweiterte Upload-Optionen
            </Typography>
            <DocumentUpload
              onUploadComplete={(documentId) => {
                fetchDocuments();
                onStatsUpdate();
                showSnackbar('Dokument erfolgreich hochgeladen!', 'success');
              }}
              maxFileSize={50}
              allowedTypes={['pdf', 'doc', 'docx', 'txt', 'md']}
            />
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchDocuments}
          disabled={loading}
        >
          Aktualisieren
        </Button>
      </Box>

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
                      {document.title || document.name}
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
                        {formatDate(document.updated_at || document.uploaded_at || new Date().toISOString())}
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
                        onClick={() => handleDownloadDocument(document.id, document.original_name || document.name)}
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
          onClick={() => selectedDocument && handleDownloadDocument(selectedDocument.id, selectedDocument.original_name || selectedDocument.name || 'document')}
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
          documentName={previewDocument.title || previewDocument.name || 'Document'}
          mimeType={previewDocument.mime_type}
        />
      )}
    </Box>
  );
};

export default DocumentsManager;
