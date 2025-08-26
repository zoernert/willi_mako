import React from 'react';
import { Box, Typography, Paper, Breadcrumbs, Link, Container } from '@mui/material';
import APIKeyUsageMetrics from '../components/admin/APIKeyUsageMetrics';
import { SnackbarProvider } from 'notistack';

const APIKeyMetricsPage = () => {
  return (
    <SnackbarProvider maxSnack={3}>
      <Container maxWidth="lg">
        <Box sx={{ mt: 3, mb: 4 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/admin">
              Admin
            </Link>
            <Typography color="textPrimary">API-Schlüssel Metriken</Typography>
          </Breadcrumbs>
          
          <Typography variant="h4" component="h1" sx={{ mt: 2, mb: 4 }}>
            API-Schlüssel Verwaltung
          </Typography>
          
          <Paper sx={{ p: 3 }}>
            <APIKeyUsageMetrics />
          </Paper>
        </Box>
      </Container>
    </SnackbarProvider>
  );
};

export default APIKeyMetricsPage;
