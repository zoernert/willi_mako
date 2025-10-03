import { useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
} from '@mui/material';

import { createAtlasSearch } from '../../lib/atlas/search';
import type { AtlasSearchItem } from '../../lib/atlas/types';

interface AtlasSearchBarProps {
  items: AtlasSearchItem[];
  label?: string;
  placeholder?: string;
  onSelect: (item: AtlasSearchItem) => void;
}

export const AtlasSearchBar = ({
  items,
  label = 'Daten Atlas durchsuchen',
  placeholder = 'Segment, Datenelement, Prozess oder Visualisierung suchen …',
  onSelect,
}: AtlasSearchBarProps) => {
  const fuse = useMemo(() => createAtlasSearch(items), [items]);

  return (
    <Autocomplete
      options={items}
      getOptionLabel={(option) => option.title}
      filterOptions={(options, state) => {
        const query = state.inputValue.trim();
        if (!query) {
          return options.slice(0, 10);
        }
        return fuse.search(query, { limit: 8 }).map((result) => result.item);
      }}
      onChange={(_, value) => {
        if (value) {
          onSelect(value);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="outlined"
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="subtitle2">{option.title}</Typography>
          {option.description && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {option.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip size="small" label={option.type} />
            {option.keywords.slice(0, 2).map((keyword) => (
              <Chip key={keyword} size="small" variant="outlined" label={keyword} />
            ))}
          </Box>
        </Box>
      )}
      ListboxProps={{ sx: { maxHeight: 360 } }}
      sx={{ width: '100%' }}
    />
  );
};

export default AtlasSearchBar;
