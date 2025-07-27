import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const ChatConfigurationComponents: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Chat Konfiguration Komponenten
      </Typography>
      <Alert severity="info">
        Diese Komponente ist derzeit in Entwicklung und wird in einer zukünftigen Version verfügbar sein.
      </Alert>
    </Box>
  );
};

export default ChatConfigurationComponents;
