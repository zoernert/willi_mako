import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Link
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const NotFound = () => {
  return (
    <Container maxWidth="sm">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2,
          border: '1px solid #e0e0e0'
        }}
      >
        <ErrorOutlineIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Seite nicht gefunden
        </Typography>
        
        <Typography variant="body1" paragraph align="center" color="text.secondary">
          Die von Ihnen gesuchte Seite existiert nicht oder Ihre Sitzung ist abgelaufen.
        </Typography>
        
        <Typography variant="body1" paragraph align="center" sx={{ fontWeight: 'bold', mb: 3 }}>
          Bitte melden Sie sich erneut an unter{' '}
          <Link 
            href="https://stromhaltig.de/app/" 
            target="_blank" 
            rel="noopener"
            sx={{ fontWeight: 'bold' }}
          >
            stromhaltig.de/app
          </Link>
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            color="primary"
            size="large"
          >
            Zum Login
          </Button>
          
          <Button
            component="a"
            href="https://stromhaltig.de/app/"
            variant="outlined"
            color="primary"
            size="large"
          >
            Zur Hauptseite
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;
