import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
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
import { CreateClarificationModal } from './CreateClarificationModal';

interface WorkflowDemoTabProps {
  onCreateClarification?: (clarification: any) => void;
}

export const WorkflowDemoTab: React.FC<WorkflowDemoTabProps> = ({ onCreateClarification }) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const handleCreateClarification = async (data: any) => {
    try {
      console.log('Creating clarification with data:', data);
      setCreateModalOpen(false);
      if (onCreateClarification) {
        onCreateClarification(data);
      }
      alert('Klärfall wurde erfolgreich erstellt! Wechseln Sie zum Tab "Meine Klärfälle", um den neuen Fall zu sehen.');
    } catch (error) {
      console.error('Error creating clarification:', error);
      alert('Fehler beim Erstellen des Klärfalls');
    }
  };

  const workflowSteps = [
    {
      label: 'Marktpartner auswählen',
      description: 'Auswahl des relevanten Marktpartners und der entsprechenden Rolle',
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
      <Typography variant="h5" gutterBottom>
        Workflow Demo - Bilaterale Klärung
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Diese Demo zeigt die wichtigsten Konzepte der bilateralen Klärung: Marktpartner-Integration, 
        DAR-Validierung und den strukturierten Workflow von interner Klärung bis zur qualifizierten Anfrage.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
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
            <Typography variant="body2" color="text.secondary">
              Beispiel: Bei einem VNB wird automatisch die entsprechende E-Mail-Adresse 
              für Marktprozesse verwendet (z.B. marktprozesse@stadtwerke-beispiel.de).
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              DAR-Konzept
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Die Datenaustauschreferenz (DAR) ist der Schlüssel für eindeutige 
              Zuordnung und Nachverfolgbarkeit von Marktprozessen.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Format: Abhängig vom Nachrichtentyp (z.B. für UTILMD: 15-stellig, 
              für ORDERS: alphanumerisch).
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Workflow-Schritte
          </Typography>
          <Stepper activeStep={demoStep} orientation="vertical">
            {workflowSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  icon={step.icon}
                  onClick={() => setDemoStep(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {step.description}
                  </Typography>
                  {index < workflowSteps.length - 1 && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setDemoStep(index + 1)}
                      sx={{ mt: 1 }}
                    >
                      Weiter
                    </Button>
                  )}
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
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
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
            Demo zurücksetzen
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

export default WorkflowDemoTab;
