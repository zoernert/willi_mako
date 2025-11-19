import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Typography,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Description as DocumentIcon,
  Note as NoteIcon,
  Psychology as AIIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface ContextInfo {
  userContextUsed: boolean;
  userDocumentsUsed: number;
  userNotesUsed: number;
  contextSummary: string;
  contextReason: string;
  suggestedDocuments?: any[];
  relatedNotes?: any[];
}

interface ContextIndicatorProps {
  contextInfo: ContextInfo | null;
  onContextToggle?: (enabled: boolean) => void;
  contextEnabled?: boolean;
  loading?: boolean;
}

const ContextIndicator: React.FC<ContextIndicatorProps> = ({
  contextInfo,
  onContextToggle,
  contextEnabled = true,
  loading = false
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!contextInfo && !loading) {
    return null;
  }

  const hasUserContent = contextInfo && (
    contextInfo.userDocumentsUsed > 0 || contextInfo.userNotesUsed > 0
  );

  const getContextIconColor = (): "inherit" | "primary" | "secondary" | "disabled" => {
    if (!contextEnabled) return 'disabled';
    if (hasUserContent) return 'primary';
    if (contextInfo?.userContextUsed) return 'secondary';
    return 'inherit';
  };

  const getChipColor = (): "default" | "primary" | "secondary" => {
    if (!contextEnabled) return 'default';
    if (hasUserContent) return 'primary';
    if (contextInfo?.userContextUsed) return 'secondary';
    return 'default';
  };

  const getContextLabel = () => {
    if (loading) return 'Analyzing context...';
    if (!contextEnabled) return 'Personal context disabled';
    if (!contextInfo) return 'No context info';
    if (hasUserContent) {
      const parts = [];
      if (contextInfo.userDocumentsUsed > 0) {
        parts.push(`${contextInfo.userDocumentsUsed} document${contextInfo.userDocumentsUsed > 1 ? 's' : ''}`);
      }
      if (contextInfo.userNotesUsed > 0) {
        parts.push(`${contextInfo.userNotesUsed} note${contextInfo.userNotesUsed > 1 ? 's' : ''}`);
      }
      return `Using ${parts.join(' + ')}`;
    }
    return 'Public context only';
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 2, 
          bgcolor: hasUserContent ? 'primary.light' : 'grey.50',
          borderColor: hasUserContent ? 'primary.main' : 'grey.300'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color={getContextIconColor()} />
          
          <Chip
            label={getContextLabel()}
            color={getChipColor()}
            size="small"
            variant={hasUserContent ? 'filled' : 'outlined'}
            icon={hasUserContent ? <VisibilityIcon /> : <VisibilityOffIcon />}
          />

          {onContextToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={contextEnabled}
                  onChange={(e) => onContextToggle(e.target.checked)}
                  size="small"
                />
              }
              label="Personal context"
              sx={{ ml: 'auto', mr: 1 }}
            />
          )}

          {contextInfo && ((contextInfo.suggestedDocuments?.length || 0) > 0 || (contextInfo.relatedNotes?.length || 0) > 0) && (
            <Tooltip title={expanded ? 'Hide details' : 'Show context details'}>
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {contextInfo?.contextSummary && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {contextInfo.contextSummary}
          </Typography>
        )}

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            {contextInfo?.suggestedDocuments && contextInfo.suggestedDocuments.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocumentIcon fontSize="small" />
                  Documents used ({contextInfo.suggestedDocuments.length})
                </Typography>
                <List dense>
                  {contextInfo.suggestedDocuments.slice(0, 3).map((doc, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <DocumentIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.title}
                        secondary={doc.content ? `${doc.content.substring(0, 100)}...` : 'No preview available'}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                  {contextInfo.suggestedDocuments.length > 3 && (
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={`... and ${contextInfo.suggestedDocuments.length - 3} more documents`}
                        primaryTypographyProps={{ variant: 'caption', style: { fontStyle: 'italic' } }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {contextInfo?.relatedNotes && contextInfo.relatedNotes.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NoteIcon fontSize="small" />
                  Notes used ({contextInfo.relatedNotes.length})
                </Typography>
                <List dense>
                  {contextInfo.relatedNotes.slice(0, 3).map((note, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <NoteIcon fontSize="small" color="secondary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={note.title || 'Untitled Note'}
                        secondary={note.content ? `${note.content.substring(0, 100)}...` : 'No content preview'}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                  {contextInfo.relatedNotes.length > 3 && (
                    <ListItem sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={`... and ${contextInfo.relatedNotes.length - 3} more notes`}
                        primaryTypographyProps={{ variant: 'caption', style: { fontStyle: 'italic' } }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {contextInfo?.contextReason && (
              <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Kontext-Entscheidung:</strong> {contextInfo.contextReason}
                </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default ContextIndicator;
