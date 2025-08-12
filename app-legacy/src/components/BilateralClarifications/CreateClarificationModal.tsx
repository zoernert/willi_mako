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
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import { BilateralClarification } from '../../types/bilateral';

interface CreateClarificationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BilateralClarification>) => Promise<void>;
}

export const CreateClarificationModal: React.FC<CreateClarificationModalProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    caseType: '' as any,
    priority: 'MEDIUM' as any,
    status: 'OPEN' as any,
    assignedTo: '',
    dueDate: '',
    tags: [] as string[]
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!formData.title.trim()) {
        setError('Titel ist erforderlich');
        return;
      }
      
      if (!formData.caseType) {
        setError('Typ ist erforderlich');
        return;
      }

      await onSubmit(formData);
      onClose();
      
      setFormData({
        title: '',
        description: '',
        caseType: '' as any,
        priority: 'MEDIUM' as any,
        status: 'OPEN' as any,
        assignedTo: '',
        dueDate: '',
        tags: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Klärfalls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Neuen Klärfall erstellen</DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Titel"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Beschreibung"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            fullWidth
            multiline
            rows={3}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Typ</InputLabel>
              <Select
                value={formData.caseType}
                onChange={(e) => handleInputChange('caseType', e.target.value)}
                label="Typ"
              >
                <MenuItem value="B2B">B2B</MenuItem>
                <MenuItem value="GENERAL">Allgemein</MenuItem>
                <MenuItem value="TECHNICAL">Technisch</MenuItem>
                <MenuItem value="BILLING">Abrechnung</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priorität</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                label="Priorität"
              >
                <MenuItem value="LOW">Niedrig</MenuItem>
                <MenuItem value="MEDIUM">Mittel</MenuItem>
                <MenuItem value="HIGH">Hoch</MenuItem>
                <MenuItem value="CRITICAL">Kritisch</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Zugewiesen an"
              value={formData.assignedTo}
              onChange={(e) => handleInputChange('assignedTo', e.target.value)}
              fullWidth
            />

            <TextField
              label="Fälligkeitsdatum"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                placeholder="Tag hinzufügen"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                Hinzufügen
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Wird erstellt...' : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClarificationModal;
