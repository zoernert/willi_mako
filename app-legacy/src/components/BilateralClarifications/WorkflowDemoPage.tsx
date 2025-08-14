import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { BilateralClarification, MarketPartnerInfo, MarketPartnerContact, MarketRole, DataExchangeReference } from '../../types/bilateral';
import { CreateClarificationModal } from './CreateClarificationModal';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';
import { useAuth } from '../../contexts/AuthContext';

interface WorkflowDemoPageProps {}

export const WorkflowDemoPage: React.FC<WorkflowDemoPageProps> = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const authContext = useAuth();

  const handleCreateClarification = async (data: Partial<BilateralClarification>) => {
    try {
      console.log('Creating clarification with data:', data);
      // In echter Implementierung würde hier der Service aufgerufen
      // await bilateralClarificationService.create(data);
      
      // Für Demo nur Console-Output
      alert('Klärfall wurde erfolgreich erstellt!');
      setCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating clarification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      alert('Fehler beim Erstellen des Klärfalls: ' + errorMessage);
    }
  };

  const workflowSteps = [
    {
      label: 'Klärfall erstellen',
      description: 'Neuen bilateralen Klärfall mit Marktpartner und DAR anlegen',
      icon: <AddIcon />
    },
    {
      label: 'Marktpartner auswählen',
      description: 'Marktpartner über die Suche finden und Rolle/Kontakt auswählen',
      icon: <BusinessIcon />
    },
    {
      label: 'DAR eingeben',
      description: 'Datenaustauschreferenz zur eindeutigen Zuordnung hinzufügen',
      icon: <AssignmentIcon />
    },
    {
      label: 'Interne Klärung',
      description: 'Sachstand intern zusammentragen und Situation analysieren',
      icon: <SearchIcon />
    },
    {
      label: 'Qualifizierte Anfrage senden',
      description: 'E-Mail an Marktpartner mit allen relevanten Informationen',
      icon: <EmailIcon />
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bilaterale Klärung - Workflow Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Diese Demo zeigt die wichtigsten Konzepte der bilateralen Klärung: Marktpartner-Integration, 
        DAR-Validierung und den strukturierten Workflow von interner Klärung bis zur qualifizierten Anfrage.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Marktpartner-Integration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Jede bilaterale Klärung erfolgt mit einem spezifischen Marktpartner. 
              Die Marktrolle (LF, VNB, MSB, etc.) bestimmt den Ansprechpartner und die E-Mail-Adresse.
            </Typography>
            <Typography variant="body2">
              <strong>Beispiele:</strong><br />
              • Lieferant (LF) - Stammdatenprobleme<br />
              • Verteilnetzbetreiber (VNB) - Netzanschluss<br />
              • Messstellenbetreiber (MSB) - Messwerte
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Datenaustauschreferenz (DAR)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Die DAR ermöglicht dem Marktpartner die eindeutige Zuordnung der Anfrage 
              zu einem konkreten Geschäftsvorfall.
            </Typography>
            <Typography variant="body2">
              <strong>Format-Beispiele:</strong><br />
              • UTIL-20250813-143022-ABC123<br />
              • MSCO-20250813-143022-DEF456<br />
              • APER-20250813-143022-GHI789
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflow-Prozess
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Der Prozess der bilateralen Klärung folgt einem strukturierten Workflow:
          </Typography>
          
          <Stepper activeStep={demoStep} orientation="vertical">
            {workflowSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel icon={step.icon}>
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={() => setDemoStep(index + 1)}
                      sx={{ mr: 1 }}
                      disabled={index >= workflowSteps.length - 1}
                    >
                      {index >= workflowSteps.length - 1 ? 'Abgeschlossen' : 'Weiter'}
                    </Button>
                    {index > 0 && (
                      <Button onClick={() => setDemoStep(index - 1)}>
                        Zurück
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Demo starten
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Klicken Sie auf "Neuen Klärfall erstellen", um den kompletten Workflow zu testen:
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            size="large"
          >
            Neuen Klärfall erstellen
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => setDemoStep(0)}
          >
            Workflow-Demo zurücksetzen
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Hinweis:</strong> Diese Demo zeigt die Frontend-Funktionalität. 
            In der Produktivumgebung werden die Daten in der Datenbank gespeichert und 
            E-Mails tatsächlich versendet.
          </Typography>
        </Box>
      </Paper>

      <CreateClarificationModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateClarification}
      />
    </Box>
  );
};

export default WorkflowDemoPage;
