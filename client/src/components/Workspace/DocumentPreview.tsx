import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Toolbar,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { documentsApi } from '../../services/documentsApi';

interface DocumentPreviewProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  mimeType: string;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  open,
  onClose,
  documentId,
  documentName,
  mimeType
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const blob = await documentsApi.getDocumentPreview(documentId);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open && documentId) {
      loadDocument();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, documentId, loadDocument]);

  const handleDownload = async () => {
    try {
      const blob = await documentsApi.downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handlePrint = () => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '400px' 
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    if (!previewUrl) {
      return (
        <Alert severity="info" sx={{ m: 2 }}>
          Kein Vorschau verfügbar für diesen Dateityp.
        </Alert>
      );
    }

    // Handle different file types
    if (mimeType.startsWith('image/')) {
      return (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <img 
            src={previewUrl} 
            alt={documentName}
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              transform: `scale(${zoom / 100})`
            }}
          />
        </Box>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <Box sx={{ height: '70vh', width: '100%' }}>
          <iframe
            src={previewUrl}
            width="100%"
            height="100%"
            style={{ border: 'none', transform: `scale(${zoom / 100})` }}
            title={documentName}
          />
        </Box>
      );
    }

    if (mimeType.startsWith('text/')) {
      return (
        <Box sx={{ p: 2, height: '400px', overflow: 'auto' }}>
          <iframe
            src={previewUrl}
            width="100%"
            height="100%"
            style={{ border: '1px solid #ccc', fontSize: `${zoom}%` }}
            title={documentName}
          />
        </Box>
      );
    }

    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Vorschau für diesen Dateityp nicht unterstützt. Sie können das Dokument herunterladen.
      </Alert>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
            {documentName}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Toolbar variant="dense" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Herunterladen">
            <IconButton onClick={handleDownload} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Drucken">
            <IconButton onClick={handlePrint} size="small">
              <PrintIcon />
            </IconButton>
          </Tooltip>
          
          <Box sx={{ mx: 1, height: 24, width: 1, bgcolor: 'divider' }} />
          
          <Tooltip title="Verkleinern">
            <IconButton onClick={handleZoomOut} size="small" disabled={zoom <= 50}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ mx: 1, minWidth: 50, textAlign: 'center' }}>
            {zoom}%
          </Typography>
          
          <Tooltip title="Vergrößern">
            <IconButton onClick={handleZoomIn} size="small" disabled={zoom >= 200}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {renderPreview()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreview;
