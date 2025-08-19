import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';
import {
  Gavel as GavelIcon,
  Close as CloseIcon,
  AutoFixHigh as AutoIcon
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BilateralClarificationService } from '../../services/bilateralClarificationService';
import { CreateClarificationModal } from './CreateClarificationModal';
import { 
  ChatContext, 
  MessageAnalyzerContext,
  ClarificationContext,
  BilateralClarification,
  ClarificationPriority,
  ClarificationCaseType
} from '../../types/bilateral';

interface CreateFromContextButtonProps {
  variant?: 'button' | 'fab' | 'chip';
  size?: 'small' | 'medium' | 'large';
  context: {
    source: 'chat' | 'message_analyzer';
    chatContext?: ChatContext;
    messageAnalyzerContext?: MessageAnalyzerContext;
  };
  onSuccess?: (clarification: BilateralClarification) => void;
  disabled?: boolean;
}

// Helper functions to map priority and caseType values
const mapPriorityToCreateModal = (priority?: ClarificationPriority): 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (!priority) return 'MEDIUM';
  
  // Map CRITICAL to HIGH, all other values pass through (they're already compatible)
  return priority === 'CRITICAL' ? 'HIGH' : (priority as 'HIGH' | 'MEDIUM' | 'LOW');
};

const mapCaseTypeToCreateModal = (caseType?: ClarificationCaseType): 'GENERAL' | 'TECHNICAL' | 'B2B' | 'B2C' => {
  if (!caseType) return 'GENERAL';
  
  // Map BILLING to GENERAL, all other values pass through
  return caseType === 'BILLING' ? 'GENERAL' : (caseType as 'GENERAL' | 'TECHNICAL' | 'B2B' | 'B2C');
};

export const CreateFromContextButton: React.FC<CreateFromContextButtonProps> = ({
  variant = 'button',
  size = 'medium',
  context,
  onSuccess,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewContext, setPreviewContext] = useState<ClarificationContext | null>(null);
  const { showSnackbar } = useSnackbar();
  const bilateralService = new BilateralClarificationService();

  const handleOpen = async () => {
    setCreating(true);
    try {
      // Extract context data for preview
      let extractedContext: Partial<ClarificationContext> = {};
      
      if (context.source === 'chat' && context.chatContext) {
        extractedContext = (bilateralService as any).extractContextData(
          context.chatContext.content, 
          'chat'
        );
      } else if (context.source === 'message_analyzer' && context.messageAnalyzerContext) {
        extractedContext = (bilateralService as any).extractContextData(
          context.messageAnalyzerContext.originalMessage, 
          'analyzer',
          context.messageAnalyzerContext.analysisResult
        );
      }

      setPreviewContext({
        source: context.source,
        chatContext: context.chatContext,
        messageAnalyzerContext: context.messageAnalyzerContext,
        ...extractedContext
      });
      setOpen(true);
    } catch (error) {
      console.error('Error preparing context:', error);
      showSnackbar('Fehler beim Vorbereiten des Kontexts', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreviewContext(null);
  };

  const handleCreate = async (clarificationData: Partial<BilateralClarification>) => {
    try {
      let result: BilateralClarification;

      if (context.source === 'chat' && context.chatContext) {
        result = await bilateralService.createFromChatContext(
          context.chatContext,
          clarificationData
        );
      } else if (context.source === 'message_analyzer' && context.messageAnalyzerContext) {
        result = await bilateralService.createFromMessageAnalyzerContext(
          context.messageAnalyzerContext,
          clarificationData
        );
      } else {
        throw new Error('Invalid context configuration');
      }

      showSnackbar('Bilaterale Klärung erfolgreich erstellt!', 'success');
      handleClose();
      onSuccess?.(result);
    } catch (error) {
      console.error('Error creating clarification from context:', error);
      showSnackbar('Fehler beim Erstellen der bilateralen Klärung', 'error');
    }
  };

  const renderButton = () => {
    const buttonProps = {
      onClick: handleOpen,
      disabled: disabled || creating,
      startIcon: creating ? <AutoIcon className="animate-spin" /> : <GavelIcon />
    };

    switch (variant) {
      case 'fab':
        return (
          <Button
            {...buttonProps}
            variant="contained"
            color="primary"
            size={size}
            sx={{ borderRadius: 28 }}
          >
            {creating ? 'Verarbeite...' : 'Klärung erstellen'}
          </Button>
        );

      case 'chip':
        return (
          <Chip
            {...buttonProps}
            label={creating ? 'Verarbeite...' : 'Bilaterale Klärung'}
            clickable
            color="primary"
            variant="outlined"
            icon={creating ? <AutoIcon className="animate-spin" /> : <GavelIcon />}
          />
        );

      default:
        return (
          <Button
            {...buttonProps}
            variant="outlined"
            color="primary"
            size={size}
          >
            {creating ? 'Verarbeite...' : 'Bilaterale Klärung erstellen'}
          </Button>
        );
    }
  };

  return (
    <>
      {renderButton()}

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              Bilaterale Klärung erstellen
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {previewContext && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Kontext aus {context.source === 'chat' ? 'Chat-Unterhaltung' : 'Nachrichten-Analyse'} wird automatisch übernommen.
                </Typography>
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Automatisch erkannte Daten:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {previewContext.suggestedMarketPartner && (
                    <Chip 
                      label={`Marktpartner: ${previewContext.suggestedMarketPartner.code}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {previewContext.edifactMessageType && (
                    <Chip 
                      label={`EDIFACT: ${previewContext.edifactMessageType}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                  {previewContext.problemType && (
                    <Chip 
                      label={`Problem: ${previewContext.problemType}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {previewContext.suggestedPriority && (
                    <Chip 
                      label={`Priorität: ${previewContext.suggestedPriority}`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              <CreateClarificationModal
                open={true}
                onClose={handleClose}
                onSubmit={handleCreate}
                initialData={{
                  title: previewContext.suggestedTitle || '',
                  description: previewContext.suggestedDescription || '',
                  priority: mapPriorityToCreateModal(previewContext.suggestedPriority),
                  marketPartnerCode: previewContext.suggestedMarketPartner?.code || '',
                  caseType: mapCaseTypeToCreateModal(previewContext.suggestedCaseType)
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateFromContextButton;
