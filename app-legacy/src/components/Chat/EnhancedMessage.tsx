import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
  BugReport as BugReportIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: {
    screenshot_url?: string;
    screenshot_analysis?: ScreenshotAnalysis;
    type?: string;
    [key: string]: any;
  };
}

interface ScreenshotAnalysis {
  detectedElements: DetectedElement[];
  errorMessages: string[];
  uiComponents: UIComponent[];
  confidence: number;
  isSchleupnCS30: boolean;
}

interface DetectedElement {
  type: 'error' | 'warning' | 'dialog' | 'menu' | 'form' | 'button' | 'table';
  text: string;
  confidence: number;
  position?: { x: number; y: number; width: number; height: number };
}

interface UIComponent {
  name: string;
  visible: boolean;
  text?: string;
}

interface EnhancedMessageProps {
  message: Message;
  formatTime: (dateString: string) => string;
}

const EnhancedMessage: React.FC<EnhancedMessageProps> = ({ message, formatTime }) => {
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);

  const hasScreenshot = message.metadata?.screenshot_url;
  const analysis = message.metadata?.screenshot_analysis;

  const renderScreenshotAnalysis = () => {
    if (!analysis) return null;

    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Screenshot-Analyse
          </Typography>
          <Button
            size="small"
            onClick={() => setAnalysisExpanded(!analysisExpanded)}
          >
            {analysisExpanded ? 'Weniger' : 'Mehr'} anzeigen
          </Button>
        </Box>

        {analysis.isSchleupnCS30 && (
          <Chip
            label="Schleupen CS 3.0 Interface"
            color="info"
            size="small"
            sx={{ mb: 1, mr: 1 }}
          />
        )}

        <Chip
          label={`Vertrauen: ${Math.round(analysis.confidence * 100)}%`}
          color={analysis.confidence > 0.8 ? 'success' : analysis.confidence > 0.6 ? 'warning' : 'error'}
          size="small"
          sx={{ mb: 1 }}
        />

        {analysis.errorMessages.length > 0 && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Erkannte Fehlermeldungen:
            </Typography>
            {analysis.errorMessages.map((error, index) => (
              <Typography key={index} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BugReportIcon fontSize="small" />
                {error}
              </Typography>
            ))}
          </Alert>
        )}

        {analysisExpanded && analysis.detectedElements.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Erkannte UI-Elemente:
            </Typography>
            {analysis.detectedElements.map((element, index) => (
              <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'white', borderRadius: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {element.type === 'error' && <BugReportIcon fontSize="small" color="error" />}
                  {element.type === 'warning' && <WarningIcon fontSize="small" color="warning" />}
                  <Typography variant="caption" fontWeight="bold">
                    {element.type.toUpperCase()}
                  </Typography>
                  <Chip
                    label={`${Math.round(element.confidence * 100)}%`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {element.text}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderScreenshotPreview = () => {
    if (!hasScreenshot) return null;

    return (
      <Box sx={{ mt: 1, mb: 1 }}>
        <Paper
          sx={{
            p: 1,
            display: 'inline-block',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setScreenshotDialogOpen(true)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img
              src={message.metadata?.screenshot_url}
              alt="Screenshot"
              style={{
                width: 120,
                height: 80,
                objectFit: 'cover',
                borderRadius: 4,
              }}
            />
            <Box>
              <Typography variant="body2" fontWeight="bold">
                📷 Screenshot
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Klicken zum Vergrößern
              </Typography>
              <IconButton size="small">
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          mb: 2,
          flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
        }}
      >
        <Avatar
          sx={{
            mx: 1,
            bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
          }}
        >
          {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
        </Avatar>
        
        <Paper
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
            color: message.role === 'user' ? 'white' : 'text.primary',
          }}
        >
          {message.role === 'user' ? (
            <Box>
              <Typography 
                variant="body1" 
                sx={{ whiteSpace: 'pre-wrap' }}
                className="chat-message user-message"
              >
                {message.content}
              </Typography>
              {renderScreenshotPreview()}
              {renderScreenshotAnalysis()}
            </Box>
          ) : (
            <Box>
              <div className="chat-message assistant-message">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {children}
                      </Typography>
                    ),
                    h1: ({ children }) => (
                      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {children}
                      </Typography>
                    ),
                    h2: ({ children }) => (
                      <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {children}
                      </Typography>
                    ),
                    h3: ({ children }) => (
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {children}
                      </Typography>
                    ),
                    ul: ({ children }) => (
                      <Box component="ul" sx={{ mb: 1, pl: 2 }}>
                        {children}
                      </Box>
                    ),
                    ol: ({ children }) => (
                      <Box component="ol" sx={{ mb: 1, pl: 2 }}>
                        {children}
                      </Box>
                    ),
                    li: ({ children }) => (
                      <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
                        {children}
                      </Typography>
                    ),
                    blockquote: ({ children }) => (
                      <Box
                        sx={{
                          p: 1,
                          borderLeft: '4px solid',
                          borderLeftColor: 'primary.main',
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          mb: 1,
                        }}
                      >
                        {children}
                      </Box>
                    ),
                    // Tabellen-Komponenten
                    table: ({ children }) => (
                      <TableContainer component={Paper} sx={{ mb: 2, overflow: 'auto' }}>
                        <Table size="small">{children}</Table>
                      </TableContainer>
                    ),
                    thead: ({ children }) => <TableHead>{children}</TableHead>,
                    tbody: ({ children }) => <TableBody>{children}</TableBody>,
                    tr: ({ children }) => <TableRow>{children}</TableRow>,
                    th: ({ children }) => (
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                        {children}
                      </TableCell>
                    ),
                    td: ({ children }) => <TableCell>{children}</TableCell>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </Box>
          )}
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            {formatTime(message.created_at)}
          </Typography>
        </Paper>
      </Box>

      {/* Screenshot Dialog */}
      <Dialog 
        open={screenshotDialogOpen} 
        onClose={() => setScreenshotDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Screenshot
          <IconButton
            onClick={() => setScreenshotDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {hasScreenshot && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={message.metadata?.screenshot_url}
                alt="Screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                }}
              />
            </Box>
          )}
          {renderScreenshotAnalysis()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScreenshotDialogOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnhancedMessage;
