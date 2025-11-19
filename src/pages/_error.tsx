import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Container, 
  Button,
  Paper,
  Stack
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Home as HomeIcon,
  Login as LoginIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';

interface ErrorProps {
  statusCode?: number;
  title?: string;
}

function Error({ statusCode, title }: ErrorProps) {
  const errorTitle = title || (statusCode === 404 
    ? 'Seite nicht gefunden' 
    : statusCode === 500 
      ? 'Serverfehler' 
      : 'Ein Fehler ist aufgetreten');

  const errorMessage = statusCode === 404
    ? 'Die von Ihnen gesuchte Seite existiert nicht oder ist nicht mehr verfügbar. Dies kann passieren, wenn ein Link abgelaufen ist oder die Seite verschoben wurde.'
    : statusCode === 500
      ? 'Es ist ein interner Serverfehler aufgetreten. Bitte versuchen Sie es später erneut.'
      : statusCode
        ? `Ein Fehler ${statusCode} ist aufgetreten.`
        : 'Ein unerwarteter Fehler ist aufgetreten.';

  return (
    <>
      <Head>
        <title>{errorTitle} - Willi Mako</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Layout>
        <Container maxWidth="md">
          <Box
            sx={{
              minHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 6,
                textAlign: 'center',
                maxWidth: 600,
                width: '100%'
              }}
            >
              <ErrorIcon 
                sx={{ 
                  fontSize: 120, 
                  color: statusCode === 404 ? 'warning.main' : 'error.main',
                  mb: 3
                }} 
              />
              
              {statusCode && (
                <Typography 
                  variant="h1" 
                  component="h1" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '3rem', md: '4rem' },
                    fontWeight: 700,
                    color: 'text.primary'
                  }}
                >
                  {statusCode}
                </Typography>
              )}
              
              <Typography 
                variant="h5" 
                component="h2" 
                gutterBottom
                sx={{ mb: 3 }}
              >
                {errorTitle}
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                {errorMessage}
              </Typography>

              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2}
                justifyContent="center"
                sx={{ mt: 4 }}
              >
                <Button
                  component={Link}
                  href="/"
                  variant="contained"
                  size="large"
                  startIcon={<HomeIcon />}
                  sx={{
                    minWidth: 200
                  }}
                >
                  Zur Startseite
                </Button>
                
                {statusCode !== 404 && (
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outlined"
                    size="large"
                    startIcon={<RefreshIcon />}
                    sx={{
                      minWidth: 200
                    }}
                  >
                    Seite neu laden
                  </Button>
                )}
                
                {statusCode === 404 && (
                  <Button
                    component={Link}
                    href="/app/"
                    variant="outlined"
                    size="large"
                    startIcon={<LoginIcon />}
                    sx={{
                      minWidth: 200
                    }}
                  >
                    Zum Login
                  </Button>
                )}
              </Stack>

              <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  {statusCode === 404 ? (
                    <>
                      Wenn Sie über einen alten Link hierher gelangt sind, melden Sie sich bitte in der{' '}
                      <Link href="/app/" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        Willi Mako App
                      </Link>
                      {' '}an, um auf Ihre Chats und Daten zuzugreifen.
                    </>
                  ) : (
                    <>
                      Bei anhaltenden Problemen wenden Sie sich bitte an unseren{' '}
                      <Link href="/impressum" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        Support
                      </Link>.
                    </>
                  )}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Layout>
    </>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
