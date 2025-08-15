import React from 'react';
import { Typography, Box } from '@mui/material';

const BulkClarificationManager: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Bulk-Klärungen
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Feature wird in der nächsten Version verfügbar sein.
      </Typography>
    </Box>
  );
};

export default BulkClarificationManager;