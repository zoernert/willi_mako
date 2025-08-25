import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Container, 
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { VideoCall as VideoCallIcon, Info as InfoIcon } from '@mui/icons-material';
import Layout from '../../components/Layout';

export default function MeetingJoin() {
  const router = useRouter();
  const { meetingID } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [costAcknowledged, setCostAcknowledged] = useState(false);
  
  useEffect(() => {
    // Validate the meeting ID when component mounts or when meetingID changes
    if (meetingID) {
      // Simple validation for a Google Meet ID format (can be customized)
      // Google Meet IDs are typically in the format xxx-xxxx-xxx
      const isValidMeetingID = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meetingID as string);
      
      if (!isValidMeetingID) {
        setError('Ungültige Meeting-ID. Bitte überprüfen Sie den Link, den Sie erhalten haben.');
      }
      
      setLoading(false);
    }
  }, [meetingID]);
  
  const handleJoinMeeting = () => {
    setDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  
  const handleCostAcknowledgementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCostAcknowledged(event.target.checked);
  };
  
  const handleConfirmAndJoin = () => {
    setDialogOpen(false);
    
    // Open Google Meet in a new tab
    if (meetingID) {
      window.open(`https://meet.google.com/${meetingID}`, '_blank');
    }
  };
  
  if (loading) {
    return (
      <Layout title="Meeting beitreten | Willi-Mako">
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout title="Fehler | Willi-Mako">
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
              Fehler beim Beitreten zum Meeting
            </Typography>
            
            <Alert severity="error" sx={{ mt: 4 }}>
              {error}
            </Alert>
            
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => router.push('/')}
              >
                Zurück zur Startseite
              </Button>
            </Box>
          </Paper>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout title="Meeting beitreten | Willi-Mako">
      <Head>
        <title>Beratungsgespräch beitreten | Willi-Mako</title>
        <meta 
          name="description" 
          content="Beitreten zum Beratungsgespräch für Willi-Mako - der Plattform für professionelle Marktkommunikation in der Energiewirtschaft."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Beratungsgespräch beitreten
          </Typography>
          
          <Alert severity="info" sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <InfoIcon sx={{ mr: 1, mt: 0.5 }} />
              <Typography variant="body1">
                <strong>Wichtiger Hinweis:</strong> Sie nehmen an einem Beratungsgespräch für Willi-Mako teil. 
                Bitte beachten Sie, dass dieses Gespräch unter Umständen kostenpflichtig sein kann. 
                Die genauen Konditionen wurden oder werden mit Ihnen individuell besprochen.
              </Typography>
            </Box>
          </Alert>
          
          <Box sx={{ my: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Meeting-ID: <strong>{meetingID}</strong>
            </Typography>
            <Typography variant="body1" paragraph>
              Sie werden mit Google Meet verbunden, sobald Sie auf "Meeting beitreten" klicken.
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<VideoCallIcon />}
              onClick={handleJoinMeeting}
              sx={{ 
                mt: 2,
                py: 1.5, 
                px: 4,
                bgcolor: '#147a50',
                '&:hover': {
                  bgcolor: '#0d5538',
                }
              }}
            >
              Meeting beitreten
            </Button>
          </Box>
          
          <Typography variant="body2" align="center" sx={{ mt: 4, color: 'text.secondary' }}>
            Bei technischen Problemen wenden Sie sich bitte an Ihren Ansprechpartner oder 
            kontaktieren Sie uns per E-Mail an willi@stromhaltig.de
          </Typography>
        </Paper>
      </Container>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Hinweis zu Kosten
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Bitte beachten Sie, dass für dieses Beratungsgespräch Kosten entstehen können. 
            Die genauen Konditionen wurden oder werden mit Ihnen individuell besprochen.
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={costAcknowledged}
                onChange={handleCostAcknowledgementChange}
                color="primary"
              />
            }
            label="Ich verstehe, dass dieses Beratungsgespräch kostenpflichtig sein kann."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirmAndJoin} 
            color="primary" 
            variant="contained"
            disabled={!costAcknowledged}
            autoFocus
          >
            Bestätigen und beitreten
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
