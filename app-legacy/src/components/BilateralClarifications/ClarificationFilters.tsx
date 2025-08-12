// Filter-Komponente für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Vereinfachte Filter- und Sortieroptionen für Klärfälle

import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

// Import types
import { ClarificationFilters as FiltersType } from '../../types/bilateral';

interface ClarificationFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export const ClarificationFilters: React.FC<ClarificationFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  isLoading = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<FiltersType>(filters);

  const handleFilterChange = (key: keyof FiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: FiltersType = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const statusOptions = [
    { value: 'OPEN', label: 'Offen' },
    { value: 'IN_PROGRESS', label: 'In Bearbeitung' },
    { value: 'RESOLVED', label: 'Gelöst' },
    { value: 'CLOSED', label: 'Geschlossen' }
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Niedrig' },
    { value: 'MEDIUM', label: 'Mittel' },
    { value: 'HIGH', label: 'Hoch' },
    { value: 'CRITICAL', label: 'Kritisch' }
  ];

  const caseTypeOptions = [
    { value: 'B2B', label: 'B2B' },
    { value: 'GENERAL', label: 'Allgemein' },
    { value: 'TECHNICAL', label: 'Technisch' },
    { value: 'BILLING', label: 'Abrechnung' }
  ];

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterListIcon color="primary" />
          <Typography variant="h6">Filter</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            startIcon={<ClearIcon />}
          >
            Zurücksetzen
          </Button>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Always visible search */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Suche"
          placeholder="Suche nach Titel, Beschreibung oder Marktpartner..."
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            endAdornment: (
              <IconButton onClick={onSearch} disabled={isLoading}>
                <SearchIcon />
              </IconButton>
            )
          }}
        />
      </Box>

      <Collapse in={expanded}>
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Basic filters in a flex layout */}
          <Box display="flex" flexWrap="wrap" gap={2}>
            {/* Status Filter */}
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={localFilters.status || []}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip
                        key={value}
                        label={statusOptions.find(o => o.value === value)?.label || value}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Priority Filter */}
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Priorität</InputLabel>
              <Select
                multiple
                value={localFilters.priority || []}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip
                        key={value}
                        label={priorityOptions.find(o => o.value === value)?.label || value}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {priorityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Case Type Filter */}
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Falltyp</InputLabel>
              <Select
                multiple
                value={localFilters.caseType || []}
                onChange={(e) => handleFilterChange('caseType', e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip
                        key={value}
                        label={caseTypeOptions.find(o => o.value === value)?.label || value}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {caseTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Market Partner */}
            <TextField
              label="Marktpartner"
              placeholder="Code oder Name"
              value={localFilters.marketPartner || ''}
              onChange={(e) => handleFilterChange('marketPartner', e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            />
          </Box>

          {/* Date range filters */}
          <Box display="flex" flexWrap="wrap" gap={2}>
            <TextField
              label="Von Datum"
              type="date"
              size="small"
              value={localFilters.dateRange?.start || ''}
              onChange={(e) => 
                handleFilterChange('dateRange', {
                  ...localFilters.dateRange,
                  start: e.target.value
                })
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            
            <TextField
              label="Bis Datum"
              type="date"
              size="small"
              value={localFilters.dateRange?.end || ''}
              onChange={(e) => 
                handleFilterChange('dateRange', {
                  ...localFilters.dateRange,
                  end: e.target.value
                })
              }
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
          </Box>

          {/* Action buttons */}
          <Box display="flex" gap={1} justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={onSearch}
              disabled={isLoading}
              startIcon={<SearchIcon />}
            >
              Suchen
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};
