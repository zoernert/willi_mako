import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert
} from '@mui/material';

interface EmailImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (payload: { content: string; source: 'MANUAL_PASTE' | 'IMPORT'; file?: File }) => Promise<void>;
}

export const EmailImportDialog: React.FC<EmailImportDialogProps> = ({ open, onClose, onImport }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!content && !file) {
        setError('Bitte fügen Sie E-Mail-Inhalt ein oder wählen Sie eine .eml Datei');
        return;
      }
      await onImport({ content, source: file ? 'IMPORT' : 'MANUAL_PASTE', file });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Import fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>E-Mail in Klärfall importieren</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="E-Mail-Inhalt (Kopieren/Einfügen)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            minRows={10}
            placeholder="Fügen Sie hier den E-Mail-Text inklusive Header ein..."
          />
          <Box>
            <input
              id="eml-file-input"
              type="file"
              accept=".eml"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Abbrechen</Button>
        <Button variant="contained" onClick={handleImport} disabled={loading}>Importieren</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailImportDialog;
