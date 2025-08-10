import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Preview as PreviewIcon,
  Edit as EditIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatListBulleted as ListIcon,
  FormatQuote as QuoteIcon,
  Code as CodeIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  showPreview?: boolean;
  showToolbar?: boolean;
  disabled?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && children}
  </div>
);

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Schreiben Sie hier...',
  minHeight = 200,
  showPreview = true,
  showToolbar = true,
  disabled = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [textFieldRef, setTextFieldRef] = useState<HTMLTextAreaElement | null>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    if (!textFieldRef) return;

    const start = textFieldRef.selectionStart;
    const end = textFieldRef.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newValue = 
      value.substring(0, start) + 
      before + textToInsert + after + 
      value.substring(end);
    
    onChange(newValue);

    // Set cursor position after insertion
    setTimeout(() => {
      if (textFieldRef) {
        const newCursorPos = start + before.length + textToInsert.length;
        textFieldRef.setSelectionRange(newCursorPos, newCursorPos);
        textFieldRef.focus();
      }
    }, 0);
  }, [value, onChange, textFieldRef]);

  const toolbarActions = [
    {
      icon: <BoldIcon />,
      tooltip: 'Fett (Strg+B)',
      action: () => insertMarkdown('**', '**', 'fetter Text')
    },
    {
      icon: <ItalicIcon />,
      tooltip: 'Kursiv (Strg+I)',
      action: () => insertMarkdown('*', '*', 'kursiver Text')
    },
    {
      icon: <ListIcon />,
      tooltip: 'Liste',
      action: () => insertMarkdown('\n- ', '', 'Listenelement')
    },
    {
      icon: <QuoteIcon />,
      tooltip: 'Zitat',
      action: () => insertMarkdown('\n> ', '', 'Zitat')
    },
    {
      icon: <CodeIcon />,
      tooltip: 'Code',
      action: () => insertMarkdown('`', '`', 'code')
    },
    {
      icon: <LinkIcon />,
      tooltip: 'Link',
      action: () => insertMarkdown('[', '](url)', 'Link-Text')
    }
  ];

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          insertMarkdown('**', '**', 'fetter Text');
          break;
        case 'i':
          event.preventDefault();
          insertMarkdown('*', '*', 'kursiver Text');
          break;
        default:
          break;
      }
    }
  };

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {/* Header with tabs and toolbar */}
      {showPreview && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab 
                icon={<EditIcon />} 
                label="Bearbeiten" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
              <Tab 
                icon={<PreviewIcon />} 
                label="Vorschau" 
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            </Tabs>
            
            {showToolbar && activeTab === 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, px: 1 }}>
                {toolbarActions.map((action, index) => (
                  <Tooltip key={index} title={action.tooltip}>
                    <IconButton
                      size="small"
                      onClick={action.action}
                      disabled={disabled}
                      sx={{ p: 0.5 }}
                    >
                      {action.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Content area */}
      <Box sx={{ minHeight, position: 'relative' }}>
        {showPreview ? (
          <>
            <TabPanel value={activeTab} index={0}>
              <TextField
                fullWidth
                multiline
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                inputRef={setTextFieldRef}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    p: 2,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: minHeight,
                    alignItems: 'flex-start'
                  },
                  '& .MuiInputBase-input': {
                    resize: 'none'
                  }
                }}
              />
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 2, minHeight: minHeight - 16 }}>
                {value.trim() ? (
                  <MarkdownRenderer content={value} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Keine Vorschau verfügbar - beginnen Sie mit dem Schreiben im Bearbeiten-Tab
                  </Typography>
                )}
              </Box>
            </TabPanel>
          </>
        ) : (
          <Box sx={{ p: showToolbar ? 1 : 0 }}>
            {showToolbar && (
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                {toolbarActions.map((action, index) => (
                  <Tooltip key={index} title={action.tooltip}>
                    <IconButton
                      size="small"
                      onClick={action.action}
                      disabled={disabled}
                    >
                      {action.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              inputRef={setTextFieldRef}
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: minHeight - (showToolbar ? 48 : 0),
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.5
                }
              }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};
