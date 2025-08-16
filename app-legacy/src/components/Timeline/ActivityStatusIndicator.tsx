import React from 'react';
import { Box, CircularProgress, Tooltip } from '@mui/material';
import {
  HourglassEmpty as HourglassEmptyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface ActivityStatusIndicatorProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  size?: 'small' | 'medium';
  onRetry?: () => void;
  showText?: boolean;
}

const ActivityStatusIndicator: React.FC<ActivityStatusIndicatorProps> = ({ 
  status, 
  size = 'medium',
  onRetry,
  showText = false
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return { 
          icon: <HourglassEmptyIcon fontSize={size} />, 
          color: 'warning.main', 
          tooltip: 'Wartet auf Verarbeitung',
          text: 'Wartend'
        };
      case 'processing':
        return { 
          icon: <CircularProgress size={size === 'small' ? 16 : 20} />, 
          color: 'info.main', 
          tooltip: 'Wird von KI verarbeitet',
          text: 'Verarbeitung...'
        };
      case 'completed':
        return { 
          icon: <CheckCircleIcon fontSize={size} />, 
          color: 'success.main', 
          tooltip: 'Erfolgreich verarbeitet',
          text: 'Abgeschlossen'
        };
      case 'failed':
        return { 
          icon: onRetry ? <RefreshIcon fontSize={size} /> : <ErrorIcon fontSize={size} />, 
          color: 'error.main', 
          tooltip: onRetry ? 'Verarbeitung fehlgeschlagen - Klicken zum Wiederholen' : 'Verarbeitung fehlgeschlagen',
          text: 'Fehlgeschlagen'
        };
    }
  };

  const config = getStatusConfig();

  const handleClick = () => {
    if (status === 'failed' && onRetry) {
      onRetry();
    }
  };

  return (
    <Tooltip title={config.tooltip}>
      <Box 
        sx={{ 
          display: 'inline-flex', 
          alignItems: 'center',
          gap: showText ? 1 : 0,
          color: config.color,
          cursor: (status === 'failed' && onRetry) ? 'pointer' : 'default'
        }}
        onClick={handleClick}
      >
        {config.icon}
        {showText && (
          <Box component="span" sx={{ fontSize: size === 'small' ? '0.75rem' : '0.875rem' }}>
            {config.text}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

export default ActivityStatusIndicator;
