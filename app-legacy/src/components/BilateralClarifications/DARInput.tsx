import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert
} from '@mui/material';
import { DataExchangeReference } from '../../types/bilateral';

interface DARInputProps {
  value?: DataExchangeReference;
  onChange: (dar: DataExchangeReference | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

export const DARInput: React.FC<DARInputProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText
}) => {
  const [darString, setDarString] = useState(value?.dar || '');
  const [messageType, setMessageType] = useState(value?.originalMessageType || '');

  // EDIFACT-Nachrichtentypen (erweitert)
  const MESSAGE_TYPES = [
    { value: '', label: 'Keine Angabe' },
    { value: 'UTILMD', label: 'UTILMD - Stammdaten' },
    { value: 'MSCONS', label: 'MSCONS - Messwerte' },
    { value: 'APERAK', label: 'APERAK - Anwendungsquittung' },
    { value: 'ORDERS', label: 'ORDERS - Bestellung' },
    { value: 'CONTRL', label: 'CONTRL - Syntaxquittung' },
    { value: 'PRICAT', label: 'PRICAT - Preiskatalog' },
    { value: 'QUOTES', label: 'QUOTES - Preisanfrage' },
    { value: 'INVOIC', label: 'INVOIC - Rechnung' },
    { value: 'ORDRSP', label: 'ORDRSP - Bestellantwort' },
    { value: 'REQOTE', label: 'REQOTE - Angebotsanfrage' },
    { value: 'REMADV', label: 'REMADV - Zahlungsavis' },
    { value: 'OTHER', label: 'Sonstiger Typ' }
  ];

  // Einfache DAR-Aktualisierung ohne Validierung
  useEffect(() => {
    const darData: DataExchangeReference = {
      dar: darString.trim(),
      originalMessageType: messageType || undefined,
      isValid: darString.trim().length > 0,
      validationMessage: darString.trim().length > 0 ? 'DAR ist gültig' : 'DAR ist erforderlich'
    };

    onChange(darString.trim() ? darData : null);
  }, [darString, messageType, onChange]);

  return (
    <Box>
      {/* DAR-Eingabe */}
      <TextField
        fullWidth
        label="Datenaustauschreferenz (DAR)"
        placeholder="Beliebiges Format, z.B. UTIL-20250813-120000-ABC123 oder REF12345"
        value={darString}
        onChange={(e) => setDarString(e.target.value)}
        disabled={disabled}
        required={required}
        error={error}
        helperText={
          helperText || 
          'Eindeutige Referenz zum ursprünglichen Geschäftsvorfall (beliebiges Format)'
        }
        sx={{ mb: 2 }}
      />

      {/* Nachrichtentyp (optional) */}
      <FormControl fullWidth disabled={disabled}>
        <InputLabel>EDIFACT-Nachrichtentyp (optional)</InputLabel>
        <Select
          value={messageType}
          onChange={(e) => setMessageType(e.target.value)}
          label="EDIFACT-Nachrichtentyp (optional)"
        >
          {MESSAGE_TYPES.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Info-Text */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>DAR:</strong> Die Datenaustauschreferenz kann in beliebigem Format eingegeben werden.
          Sie dient zur eindeutigen Identifikation des ursprünglichen Geschäftsvorfalls.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Nachrichtentyp:</strong> Optional - EDIFACT-Nachrichtentyp zur besseren Kategorisierung.
        </Typography>
      </Alert>
    </Box>
  );
};

export default DARInput;
