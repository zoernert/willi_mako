import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { styled } from '@mui/material/styles';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const StyledMarkdown = styled(Box)(({ theme }) => ({
  '& h1': {
    ...theme.typography.h4,
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(3),
    color: theme.palette.text.primary,
  },
  '& h2': {
    ...theme.typography.h5,
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(2.5),
    color: theme.palette.text.primary,
  },
  '& h3': {
    ...theme.typography.h6,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(2),
    color: theme.palette.text.primary,
  },
  '& p': {
    ...theme.typography.body1,
    marginBottom: theme.spacing(1.5),
    lineHeight: 1.6,
  },
  '& ul, & ol': {
    marginBottom: theme.spacing(1.5),
    paddingLeft: theme.spacing(3),
  },
  '& li': {
    ...theme.typography.body1,
    marginBottom: theme.spacing(0.5),
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    fontStyle: 'italic',
  },
  '& code': {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(0.25, 0.5),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.875em',
  },
  '& pre': {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    overflow: 'auto',
    marginBottom: theme.spacing(1.5),
    '& code': {
      backgroundColor: 'transparent',
      padding: 0,
    },
  },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: theme.spacing(2),
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1, 2),
    textAlign: 'left',
  },
  '& th': {
    backgroundColor: theme.palette.grey[100],
    fontWeight: 'bold',
  },
  '& tr:nth-of-type(even)': {
    backgroundColor: theme.palette.grey[50],
  },
  '& strong': {
    fontWeight: 'bold',
  },
  '& em': {
    fontStyle: 'italic',
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children, className }) => {
  return (
    <StyledMarkdown className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom table rendering with Material-UI components
          table: ({ children }) => (
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                {children}
              </Table>
            </TableContainer>
          ),
          thead: ({ children }) => (
            <TableHead>
              {children}
            </TableHead>
          ),
          tbody: ({ children }) => (
            <TableBody>
              {children}
            </TableBody>
          ),
          tr: ({ children }) => (
            <TableRow>
              {children}
            </TableRow>
          ),
          th: ({ children }) => (
            <TableCell component="th" scope="col" sx={{ fontWeight: 'bold' }}>
              {children}
            </TableCell>
          ),
          td: ({ children }) => (
            <TableCell>
              {children}
            </TableCell>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </StyledMarkdown>
  );
};

export default MarkdownRenderer;
