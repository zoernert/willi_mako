import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { ClarificationStats } from '../../types/bilateral';

interface StatsCardsProps {
  stats: ClarificationStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Lade Statistiken...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Gesamt',
      value: stats.totalCases,
      icon: <AssignmentIcon />,
      color: 'primary' as const,
      description: 'Alle Klärfälle'
    },
    {
      title: 'Offen',
      value: stats.openCases,
      icon: <ScheduleIcon />,
      color: 'warning' as const,
      description: 'Wartend auf Bearbeitung'
    },
    {
      title: 'In Bearbeitung',
      value: stats.resolvedThisMonth,
      icon: <TrendingUpIcon />,
      color: 'info' as const,
      description: 'Aktiv bearbeitet'
    },
    {
      title: 'Abgeschlossen',
      value: stats.resolvedThisMonth,
      icon: <CheckCircleIcon />,
      color: 'success' as const,
      description: 'Erfolgreich gelöst'
    },
    {
      title: 'Abgelehnt',
      value: stats.overdueCases,
      icon: <ErrorIcon />,
      color: 'error' as const,
      description: 'Nicht bearbeitbar'
    },
    {
      title: 'Mir zugewiesen',
      value: stats.myAssignedCases,
      icon: <AssignmentIcon />,
      color: 'secondary' as const,
      description: 'Meine Aufgaben'
    }
  ];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main stats cards */}
      <Box 
        sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2
        }}
      >
        {statCards.map((card, index) => (
          <Card 
            key={index}
            sx={{ 
              flex: '1 1 200px',
              minWidth: '200px',
              height: '120px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                  color: `${card.color}.main`
                }}
              >
                {card.icon}
              </Box>
              <Typography 
                variant="h4" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  color: `${card.color}.main`,
                  mb: 0.5
                }}
              >
                {card.value}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.primary"
                sx={{ fontWeight: 'medium', mb: 0.5 }}
              >
                {card.title}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {card.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      
      {/* Additional summary cards */}
      <Box 
        sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Card sx={{ flex: '1 1 200px', minWidth: '200px', height: '120px' }}>
          <CardContent sx={{ textAlign: 'center', p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ mb: 1 }}>
              <Chip 
                label="Team-Freigaben" 
                color="primary" 
                variant="outlined"
                size="small"
              />
            </Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {stats.teamSharedCases}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mit Team geteilt
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 200px', minWidth: '200px', height: '120px' }}>
          <CardContent sx={{ textAlign: 'center', p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ mb: 1 }}>
              <Chip 
                label="⌀ Dauer" 
                color="secondary" 
                variant="outlined"
                size="small"
              />
            </Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {stats.averageResolutionTime}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tage durchschnittlich
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
