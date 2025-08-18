import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { state } = useAuth();

  // Zeige Loading während der App-Initialisierung
  if (!state.isInitialized || state.loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="textSecondary">
          {!state.isInitialized ? 'App wird initialisiert...' : 'Laden...'}
        </Typography>
      </Box>
    );
  }

  // Zeige Fehler wenn Token-Validierung fehlgeschlagen ist
  if (state.error && !state.user) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
        p={2}
      >
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {state.error}
        </Alert>
        <Typography variant="body2" color="textSecondary" align="center">
          Sie werden zur Anmeldung weitergeleitet...
        </Typography>
      </Box>
    );
  }

  // Umleitung zur Login-Seite wenn nicht authentifiziert
  if (!state.user) {
    return <Navigate to="/login" replace />;
  }

  // Admin-Prüfung
  if (adminOnly && state.user.role !== 'admin') {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
        p={2}
      >
        <Alert severity="warning" sx={{ maxWidth: 400 }}>
          Sie haben nicht die erforderlichen Berechtigungen für diese Seite.
        </Alert>
        <Typography variant="body2" color="textSecondary">
          Administrator-Zugriff erforderlich
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
