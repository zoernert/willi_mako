import React from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  sx?: any;
}

// Custom component overrides for Material-UI styling
const markdownComponents: Components = {
  h1: ({ children }) => (
    <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 2 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2, mb: 1.5 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2, mb: 1 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body1" paragraph>
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Typography component="span" sx={{ fontWeight: 'bold' }}>
      {children}
    </Typography>
  ),
  em: ({ children }) => (
    <Typography component="span" sx={{ fontStyle: 'italic' }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 2, mb: 2 }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 2, mb: 2 }}>
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
        borderLeft: 4, 
        borderColor: 'primary.main', 
        pl: 2, 
        py: 1, 
        bgcolor: 'grey.50', 
        my: 2,
        fontStyle: 'italic'
      }}
    >
      {children}
    </Box>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    
    if (isInline) {
      return (
        <Typography 
          component="code" 
          sx={{ 
            bgcolor: 'grey.100', 
            px: 0.5, 
            py: 0.25, 
            borderRadius: 1, 
            fontFamily: 'monospace',
            fontSize: '0.875em'
          }}
        >
          {children}
        </Typography>
      );
    }
    
    return (
      <Box 
        component="pre"
        sx={{ 
          bgcolor: 'grey.100', 
          p: 2, 
          borderRadius: 1, 
          overflow: 'auto',
          my: 2
        }}
      >
        <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {children}
        </Typography>
      </Box>
    );
  },
  a: ({ children, href }) => (
    <Typography 
      component="a" 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ 
        color: 'primary.main', 
        textDecoration: 'underline',
        '&:hover': {
          textDecoration: 'none'
        }
      }}
    >
      {children}
    </Typography>
  ),
  hr: () => (
    <Box 
      component="hr" 
      sx={{ 
        border: 'none', 
        borderTop: 1, 
        borderColor: 'divider', 
        my: 3 
      }} 
    />
  )
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  sx = {} 
}) => {
  if (!content || content.trim() === '') {
    return (
      <Typography variant="body2" color="text.secondary" sx={sx}>
        Kein Inhalt verfügbar
      </Typography>
    );
  }

  return (
    <Box sx={{ 
      '& > *:first-of-type': { mt: 0 },
      '& > *:last-child': { mb: 0 },
      ...sx 
    }}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </Box>
  );
};
