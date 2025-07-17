import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

interface DemoStep {
  title: string;
  description: string;
  example: string;
  score?: number;
  active?: boolean;
}

const FlipModeDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const demoSteps: DemoStep[] = [
    {
      title: "1. Benutzeranfrage",
      description: "Benutzer stellt eine mehrdeutige Frage",
      example: "Wie funktioniert der Lieferantenwechsel?",
      active: true
    },
    {
      title: "2. Ambiguity-Analyse",
      description: "System analysiert verschiedene Unklarheitsfaktoren",
      example: "Themenbreite: 0.5, Spezifität: 0.8, Kontext: 0.7, Stakeholder: 0.8, Energietyp: 0.7",
      score: 0.72,
      active: false
    },
    {
      title: "3. Flip Mode aktiviert",
      description: "Score > 0.7 → Präzisierungsfragen werden generiert",
      example: "3 Fragen zu Energieträger, Perspektive und Detailgrad",
      active: false
    },
    {
      title: "4. Benutzerführung",
      description: "Schritt-für-Schritt Präzisierung mit intuitiver UI",
      example: "Welchen Energieträger? → Strom\nWelche Perspektive? → Endkunde\nWelcher Detailgrad? → Schritt-für-Schritt",
      active: false
    },
    {
      title: "5. Präzisierte Antwort",
      description: "Zielgerichtete Antwort basierend auf Präzisierung",
      example: "Detaillierte Anleitung für Strom-Lieferantenwechsel aus Endkunden-Sicht",
      active: false
    }
  ];

  const nextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => (prev + 1) % demoSteps.length);
      setIsAnimating(false);
    }, 300);
  };

  const resetDemo = () => {
    setCurrentStep(0);
  };

  const currentStepData = demoSteps[currentStep];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <LightbulbIcon color="primary" />
            <Typography variant="h5" component="h2">
              Flip Mode Demo
            </Typography>
          </Stack>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Erleben Sie, wie der Flip Mode mehrdeutige Anfragen intelligent präzisiert
          </Typography>
          
          <LinearProgress
            variant="determinate"
            value={(currentStep + 1) / demoSteps.length * 100}
            sx={{ mb: 2, height: 8, borderRadius: 4 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            Schritt {currentStep + 1} von {demoSteps.length}
          </Typography>
        </CardContent>
      </Card>

      <Card 
        elevation={2} 
        sx={{ 
          mb: 3, 
          transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.3s ease-in-out',
          opacity: isAnimating ? 0.7 : 1
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <QuestionAnswerIcon color="secondary" />
            <Typography variant="h6">
              {currentStepData.title}
            </Typography>
          </Stack>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            {currentStepData.description}
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
              {currentStepData.example}
            </Typography>
          </Alert>
          
          {currentStepData.score && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Ambiguity Score: {currentStepData.score}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={currentStepData.score * 100}
                color={currentStepData.score > 0.7 ? 'warning' : 'success'}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary">
                {currentStepData.score > 0.7 ? 'Flip Mode aktiviert' : 'Keine Präzisierung notwendig'}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              variant="contained"
              onClick={nextStep}
              disabled={isAnimating}
              endIcon={currentStep === demoSteps.length - 1 ? <CheckIcon /> : null}
            >
              {currentStep === demoSteps.length - 1 ? 'Demo beenden' : 'Nächster Schritt'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={resetDemo}
              disabled={isAnimating}
            >
              Neustart
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={1}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Alle Schritte im Überblick
          </Typography>
          
          <Stack spacing={1}>
            {demoSteps.map((step, index) => (
              <Chip
                key={index}
                label={step.title}
                color={index === currentStep ? 'primary' : 'default'}
                variant={index === currentStep ? 'filled' : 'outlined'}
                onClick={() => setCurrentStep(index)}
                sx={{ justifyContent: 'flex-start' }}
              />
            ))}
          </Stack>
          
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Vorteile:</strong> Präzisere Antworten, bessere Nutzererfahrung, 
              weniger Missverständnisse und zielgerichtete Informationen für Energiewirtschaft-Experten.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FlipModeDemo;
