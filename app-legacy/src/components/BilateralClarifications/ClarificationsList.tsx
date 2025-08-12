// Liste der Bilateralen Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Komponente zur Anzeige einer Liste von Klärfällen mit erweiterten Features

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  TextField,
  InputAdornment,
  Collapse,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TableView as TableViewIcon,
  ViewModule as ViewModuleIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { BilateralClarification } from '../../types/bilateral';

// Utility functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'error';
    case 'in_progress': return 'warning';
    case 'resolved': return 'success';
    case 'closed': return 'default';
    default: return 'default';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'open': return 'Offen';
    case 'in_progress': return 'In Bearbeitung';
    case 'resolved': return 'Gelöst';
    case 'closed': return 'Geschlossen';
    default: return status;
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'high': return 'Hoch';
    case 'medium': return 'Mittel';
    case 'low': return 'Niedrig';
    default: return priority;
  }
};

interface ClarificationsListProps {
  clarifications: BilateralClarification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  onPageChange: (page: number, limit: number) => void;
  onClarificationClick: (clarification: BilateralClarification) => void;
  loading?: boolean;
  selectable?: boolean;
  onBulkAction?: (action: string, selectedIds: number[]) => void;
}

export const ClarificationsList: React.FC<ClarificationsListProps> = ({
  clarifications,
  pagination,
  onPageChange,
  onClarificationClick,
  loading = false,
  selectable = false,
  onBulkAction
}) => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClarification, setSelectedClarification] = useState<BilateralClarification | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const filteredClarifications = clarifications.filter(clarification => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      clarification.title.toLowerCase().includes(term) ||
      (clarification.description && clarification.description.toLowerCase().includes(term)) ||
      (clarification as any).type?.toLowerCase().includes(term) ||
      clarification.tags.some(tag => tag.toLowerCase().includes(term))
    );
  });

  const handleSelectRow = (event: React.ChangeEvent<HTMLInputElement> | React.MouseEvent, id: number) => {
    event.stopPropagation();
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }

    setSelected(newSelected);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredClarifications.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleExpandRow = (id: number) => {
    const currentIndex = expandedRows.indexOf(id);
    const newExpanded = [...expandedRows];

    if (currentIndex === -1) {
      newExpanded.push(id);
    } else {
      newExpanded.splice(currentIndex, 1);
    }

    setExpandedRows(newExpanded);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, clarification: BilateralClarification) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedClarification(clarification);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClarification(null);
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedRows.length > 0) {
      onBulkAction(action, selectedRows);
      setSelectedRows([]);
    }
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  const renderExpandedContent = (clarification: BilateralClarification) => (
    <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Beschreibung:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {clarification.description || 'Keine Beschreibung verfügbar'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tags:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {clarification.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Erstellt: {format(new Date(clarification.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
            </Typography>
            {clarification.dueDate && (
              <Typography variant="caption" color="text.secondary">
                Fällig: {format(new Date(clarification.dueDate), 'dd.MM.yyyy', { locale: de })}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {clarification.daysSinceCreated} Tage alt
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // Empty state
  if (!loading && filteredClarifications.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {searchTerm ? 'Keine Ergebnisse gefunden' : 'Keine Klärfälle vorhanden'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {searchTerm 
            ? 'Versuchen Sie einen anderen Suchbegriff'
            : 'Erstellen Sie Ihren ersten Klärfall'
          }
        </Typography>
      </Paper>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Paper>
        <LinearProgress />
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Klärfälle werden geladen...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Table view
  return (
    <Paper>
      {/* Search and Controls */}
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          placeholder="Klärfälle durchsuchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        
        <Tooltip title="Ansicht wechseln">
          <IconButton onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            {viewMode === 'table' ? <ViewModuleIcon /> : <TableViewIcon />}
          </IconButton>
        </Tooltip>

        {selectable && selectedRows.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={() => handleBulkAction('export')}
            >
              Exportieren ({selectedRows.length})
            </Button>
            <Button
              size="small"
              startIcon={<DeleteIcon />}
              color="error"
              onClick={() => handleBulkAction('delete')}
            >
              Löschen ({selectedRows.length})
            </Button>
          </Box>
        )}
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < filteredClarifications.length}
                    checked={filteredClarifications.length > 0 && selected.length === filteredClarifications.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              <TableCell></TableCell>
              <TableCell>Titel / Typ</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priorität</TableCell>
              <TableCell>Zugewiesen</TableCell>
              <TableCell>Fälligkeitsdatum</TableCell>
              <TableCell>Erstellt</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClarifications.map((clarification) => {
              const isItemSelected = isSelected(clarification.id);
              const isExpanded = expandedRows.includes(clarification.id);

              return (
                <React.Fragment key={clarification.id}>
                  <TableRow
                    hover
                    onClick={() => onClarificationClick(clarification)}
                    selected={isItemSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onChange={(event) => handleSelectRow(event, clarification.id)}
                        />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandRow(clarification.id);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {clarification.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {clarification.caseType}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={getStatusLabel(clarification.status)}
                        color={getStatusColor(clarification.status) as any}
                        size="small"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={getPriorityLabel(clarification.priority)}
                        color={getPriorityColor(clarification.priority) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      {clarification.assignedTo ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {clarification.assignedTo?.charAt(0) || 'U'}
                          </Avatar>
                          <Typography variant="body2" noWrap>
                            {clarification.assignedTo || 'Unbekannt'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nicht zugewiesen
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {clarification.dueDate ? (
                        <Typography variant="body2">
                          {format(new Date(clarification.dueDate), 'dd.MM.yyyy', { locale: de })}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(clarification.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, clarification)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow>
                      <TableCell
                        colSpan={selectable ? 9 : 8}
                        sx={{ p: 0, border: 0 }}
                      >
                        <Collapse in={isExpanded}>
                          {renderExpandedContent(clarification)}
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={pagination.total}
        page={pagination.page}
        onPageChange={(_, newPage) => onPageChange(newPage, pagination.limit)}
        rowsPerPage={pagination.limit}
        onRowsPerPageChange={(e) => onPageChange(0, parseInt(e.target.value, 10))}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Zeilen pro Seite:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { 
          if (selectedClarification) onClarificationClick(selectedClarification);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Anzeigen</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bearbeiten</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Teilen</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Löschen</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default ClarificationsList;
