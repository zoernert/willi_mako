import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  Login as LoginIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { trackEvent } from '../lib/analytics';

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Track 404 error with context information
    trackEvent('404_error', {
      path: router.asPath,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      timestamp: new Date().toISOString(),
    });
  }, [router.asPath]);

  const handleHomeClick = () => {
    trackEvent('404_navigation', {
      destination: 'home',
      path: router.asPath,
    });
  };

  const handleLoginClick = () => {
    trackEvent('404_navigation', {
      destination: 'login',
      path: router.asPath,
    });
  };

  return (
    <>
      <Head>
        <title>Seite nicht gefunden - Willi Mako</title>
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
                  color: 'error.main',
                  mb: 3
                }} 
              />
              
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
                404
              </Typography>
              
              <Typography 
                variant="h5" 
                component="h2" 
                gutterBottom
                sx={{ mb: 3 }}
              >
                Seite nicht gefunden
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                Die von Ihnen gesuchte Seite existiert nicht oder ist nicht mehr verfügbar.
                Dies kann passieren, wenn ein Link abgelaufen ist oder die Seite verschoben wurde.
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
                  onClick={handleHomeClick}
                  sx={{
                    minWidth: 200
                  }}
                >
                  Zur Startseite
                </Button>
                
                <Button
                  component={Link}
                  href="/app/"
                  variant="outlined"
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={handleLoginClick}
                  sx={{
                    minWidth: 200
                  }}
                >
                  Zum Login
                </Button>
              </Stack>

              <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Wenn Sie über einen alten Link hierher gelangt sind, melden Sie sich bitte in der{' '}
                  <Link href="/app/" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Willi Mako App
                  </Link>
                  {' '}an, um auf Ihre Chats und Daten zuzugreifen.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Layout>
    </>
  );
}
