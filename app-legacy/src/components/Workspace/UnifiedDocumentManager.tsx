import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Fab,
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
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Breadcrumbs,
  Link,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Notes as NoteIcon,
  Description as FileIcon,
  Visibility as PreviewIcon,
  MoreVert as MoreIcon,
  Tag as TagIcon,
  CloudUpload as UploadIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Article as MarkdownIcon,
  Link as LinkIcon,
  SmartToy as AIIcon,
  Download as DownloadIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { unifiedDocumentApi } from '../../services/unifiedDocumentApi';
import { documentsApi } from '../../services/documentsApi';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownRenderer } from './MarkdownRenderer';
import DocumentUpload from './DocumentUpload';
import DocumentPreview from './DocumentPreview';
import { 
  UnifiedDocument, 
  UnifiedDocumentFilters, 
  UnifiedDocumentStats 
} from '../../types/unifiedDocument';

interface UnifiedDocumentManagerProps {
  onStatsUpdate: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && children}
  </div>
);

const UnifiedDocumentManager: React.FC<UnifiedDocumentManagerProps> = ({ onStatsUpdate }) => {
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UnifiedDocumentStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState<UnifiedDocumentFilters>({
    search: '',
    type: 'all',
    tags: [],
    sortBy: 'updated_at',
    sortOrder: 'desc'
  });
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<UnifiedDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<UnifiedDocument | null>(null);
  
  // Form states
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [documentTags, setDocumentTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<UnifiedDocument | null>(null);

  const { showSnackbar } = useSnackbar();

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        ...filters
      };

      const data = await unifiedDocumentApi.getUnifiedDocuments(params);
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      showSnackbar(`Fehler beim Laden der Dokumente: ${err.message}`, 'error');
      setDocuments([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, showSnackbar]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await unifiedDocumentApi.getUnifiedStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchAvailableTags = useCallback(async () => {
    try {
      const tags = await unifiedDocumentApi.getAvailableTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchStats();
    fetchAvailableTags();
  }, [fetchStats, fetchAvailableTags]);

  const handleCreateNote = () => {
    setEditingDocument(null);
    setDocumentTitle('');
    setDocumentContent('');
    setDocumentDescription('');
    setDocumentTags([]);
    setEditMode('edit');
    setIsCreateDialogOpen(true);
  };

  const handleEditDocument = (document: UnifiedDocument) => {
    setEditingDocument(document);
    setDocumentTitle(document.title);
    setDocumentContent(document.content || '');
    setDocumentDescription(document.description || '');
    setDocumentTags(document.tags);
    setEditMode('edit');
    setIsEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handlePreviewDocument = (document: UnifiedDocument) => {
    setPreviewDocument(document);
    if (document.type === 'note') {
      setDocumentContent(document.content || '');
      setEditMode('preview');
      setIsPreviewOpen(true);
    } else {
      // For file documents, use the existing DocumentPreview component
      setIsPreviewOpen(true);
    }
    setAnchorEl(null);
  };

  const handleDeleteDocument = async (document: UnifiedDocument) => {
    try {
      const docType = document.type === 'markdown' ? 'note' : document.type;
      await unifiedDocumentApi.deleteDocument(document.id, docType);
      showSnackbar('Dokument erfolgreich gelöscht', 'success');
      fetchDocuments();
      fetchStats();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Löschen des Dokuments', 'error');
    }
    setAnchorEl(null);
  };

  const handleSaveDocument = async () => {
    try {
      if (editingDocument) {
        const docType = editingDocument.type === 'markdown' ? 'note' : editingDocument.type;
        await unifiedDocumentApi.updateDocument(editingDocument.id, docType, {
          title: documentTitle,
          content: documentContent,
          description: documentDescription,
          tags: documentTags
        });
        showSnackbar('Dokument erfolgreich aktualisiert', 'success');
      } else {
        await unifiedDocumentApi.createNote({
          title: documentTitle,
          content: documentContent,
          tags: documentTags
        });
        showSnackbar('Notiz erfolgreich erstellt', 'success');
      }

      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      fetchDocuments();
      fetchStats();
      fetchAvailableTags();
      onStatsUpdate();
    } catch (err) {
      showSnackbar('Fehler beim Speichern des Dokuments', 'error');
    }
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

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: UnifiedDocument) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleFilterChange = (key: keyof UnifiedDocumentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleTagFilter = (tag: string) => {
    const currentTags = filters.tags || [];
    if (currentTags.includes(tag)) {
      handleFilterChange('tags', currentTags.filter(t => t !== tag));
    } else {
      handleFilterChange('tags', [...currentTags, tag]);
    }
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

  const getDocumentIcon = (document: UnifiedDocument) => {
    switch (document.type) {
      case 'note':
        return <NoteIcon />;
      case 'file':
        return <FileIcon />;
      default:
        return <MarkdownIcon />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'note': return 'Notiz';
      case 'file': return 'Datei';
      default: return 'Dokument';
    }
  };

  const filteredDocumentTypes = useMemo(() => {
    const types = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return types;
  }, [documents]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats Overview */}
      {stats && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flexGrow: 1, minWidth: { xs: '45%', sm: '22%' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.totalDocuments}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gesamt Dokumente
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: { xs: '45%', sm: '22%' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {stats.totalNotes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Notizen
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: { xs: '45%', sm: '22%' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.totalFiles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Dateien
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: { xs: '45%', sm: '22%' } }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {stats.storageUsedMB}MB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Speicher belegt
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', md: '40%' } }}>
            <TextField
              fullWidth
              placeholder="Dokumente und Notizen durchsuchen..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
          
          <Box sx={{ minWidth: { xs: '45%', md: '15%' } }}>
            <FormControl fullWidth>
              <InputLabel>Typ</InputLabel>
              <Select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                label="Typ"
              >
                <MenuItem value="all">
                  <Badge badgeContent={stats?.totalDocuments || 0} color="primary">
                    Alle
                  </Badge>
                </MenuItem>
                <MenuItem value="note">
                  <Badge badgeContent={stats?.totalNotes || 0} color="secondary">
                    Notizen
                  </Badge>
                </MenuItem>
                <MenuItem value="file">
                  <Badge badgeContent={stats?.totalFiles || 0} color="success">
                    Dateien
                  </Badge>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ minWidth: { xs: '45%', md: '15%' } }}>
            <FormControl fullWidth>
              <InputLabel>Sortierung</InputLabel>
              <Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                label="Sortierung"
              >
                <MenuItem value="updated_at">Zuletzt bearbeitet</MenuItem>
                <MenuItem value="created_at">Erstellt</MenuItem>
                <MenuItem value="title">Titel</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ minWidth: { xs: '100%', md: '20%' } }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNote}
                fullWidth
              >
                Neue Notiz
              </Button>
              <Tooltip title="Datei hochladen">
                <IconButton
                  color="primary"
                  onClick={() => setIsUploadDialogOpen(true)}
                >
                  <UploadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Active Filters */}
      {(filters.tags && filters.tags.length > 0) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>Aktive Filter:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filters.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleTagFilter(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Documents Grid */}
      {documents.length === 0 && !loading ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          {Object.values(filters).some(val => val && (Array.isArray(val) ? val.length > 0 : val !== 'all'))
            ? 'Keine Dokumente gefunden, die den Filterkriterien entsprechen.'
            : 'Sie haben noch keine Dokumente. Erstellen Sie Ihre erste Notiz oder laden Sie eine Datei hoch.'}
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {documents.map((document) => (
            <Box 
              key={`${document.type}-${document.id}`}
              sx={{ 
                width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)' },
                minWidth: '280px'
              }}
            >
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[4],
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease-in-out'
                  }
                }}
                onClick={() => handlePreviewDocument(document)}
              >
                {/* Document type badge */}
                <Chip
                  label={getDocumentTypeLabel(document.type)}
                  size="small"
                  color={document.type === 'note' ? 'secondary' : 'primary'}
                  icon={getDocumentIcon(document)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1
                  }}
                />

                <CardContent sx={{ flexGrow: 1, pt: 5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3" noWrap sx={{ flexGrow: 1, pr: 1 }}>
                      {document.title || 'Unbenanntes Dokument'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuClick(e, document);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>
                  
                  {document.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1
                      }}
                    >
                      {document.description}
                    </Typography>
                  )}

                  {document.content && document.type === 'note' && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2,
                        fontStyle: 'italic'
                      }}
                    >
                      {document.content.substring(0, 150)}...
                    </Typography>
                  )}

                  {/* File info for file type */}
                  {document.type === 'file' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {document.original_name}
                      </Typography>
                      {document.file_size && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({Math.round(document.file_size / 1024)} KB)
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Tags */}
                  {document.tags && document.tags.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      {document.tags.slice(0, 3).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTagFilter(tag);
                          }}
                        />
                      ))}
                      {document.tags.length > 3 && (
                        <Chip
                          label={`+${document.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      )}
                    </Box>
                  )}

                  {/* Source info and date */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {document.source_type && (
                        <Chip
                          label={document.source_type}
                          size="small"
                          variant="outlined"
                          icon={<LinkIcon />}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(document.updated_at)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
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
          <PreviewIcon sx={{ mr: 1 }} /> 
          {selectedDocument?.type === 'note' ? 'Vorschau' : 'Öffnen'}
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleEditDocument(selectedDocument)}>
          <EditIcon sx={{ mr: 1 }} /> Bearbeiten
        </MenuItem>
        {selectedDocument?.type === 'file' && (
          <MenuItem onClick={() => {
            // Handle download
            setAnchorEl(null);
          }}>
            <DownloadIcon sx={{ mr: 1 }} /> Herunterladen
          </MenuItem>
        )}
        <Divider />
        <MenuItem 
          onClick={() => selectedDocument && handleDeleteDocument(selectedDocument)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Löschen
        </MenuItem>
      </Menu>

      {/* Create Note Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          Neue Notiz erstellen
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <TextField
            autoFocus
            label="Titel"
            fullWidth
            variant="outlined"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
          />

          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <MarkdownEditor
              value={documentContent}
              onChange={setDocumentContent}
              placeholder="Schreiben Sie hier Ihre Notiz..."
              minHeight={300}
              showPreview={true}
              showToolbar={true}
            />
          </Box>

          {/* Tags */}
          <Box>
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
                <TagIcon />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)} startIcon={<CancelIcon />}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveDocument}
            variant="contained"
            disabled={!documentContent.trim()}
            startIcon={<SaveIcon />}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          {editingDocument?.type === 'note' ? 'Notiz bearbeiten' : 'Dokument bearbeiten'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <TextField
            autoFocus
            label="Titel"
            fullWidth
            variant="outlined"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
          />

          {editingDocument?.type === 'file' && (
            <TextField
              label="Beschreibung"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
            />
          )}

          {editingDocument?.type === 'note' && (
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <MarkdownEditor
                value={documentContent}
                onChange={setDocumentContent}
                placeholder="Schreiben Sie hier Ihre Notiz..."
                minHeight={300}
                showPreview={true}
                showToolbar={true}
              />
            </Box>
          )}

          {/* Tags */}
          <Box>
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
                <TagIcon />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)} startIcon={<CancelIcon />}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveDocument}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '70vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {previewDocument?.title}
          </Typography>
          <Box>
            {previewDocument?.type === 'note' && (
              <IconButton onClick={() => previewDocument && handleEditDocument(previewDocument)}>
                <EditIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ overflow: 'auto' }}>
          {previewDocument?.type === 'note' ? (
            <MarkdownRenderer content={documentContent} />
          ) : (
            previewDocument && (
              <DocumentPreview
                open={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                documentId={previewDocument.id}
                documentName={previewDocument.title}
                mimeType={previewDocument.mime_type || 'application/octet-stream'}
              />
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Dokument hochladen</DialogTitle>
        <DialogContent>
          <DocumentUpload
            onUploadComplete={(documentId) => {
              setIsUploadDialogOpen(false);
              fetchDocuments();
              fetchStats();
              onStatsUpdate();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default UnifiedDocumentManager;
