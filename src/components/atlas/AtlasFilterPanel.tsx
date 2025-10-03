import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Autocomplete,
  TextField,
  Chip,
  Box,
} from '@mui/material';

interface AtlasFilterPanelProps {
  processes: Array<{ slug: string; name: string }>;
  messageTypes: string[];
  laws: string[];
  value: {
    processes: string[];
    messageTypes: string[];
    laws: string[];
  };
  onChange: (value: AtlasFilterPanelProps['value']) => void;
}

export const AtlasFilterPanel = ({ processes, messageTypes, laws, value, onChange }: AtlasFilterPanelProps) => {
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader title="Filter" subheader="Grenze die Auswahl nach Relevanz ein" />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <Autocomplete
            multiple
            options={processes}
            value={processes.filter((process) => value.processes.includes(process.slug))}
            onChange={(_, options) =>
              onChange({
                ...value,
                processes: options.map((option) => option.slug),
              })
            }
            getOptionLabel={(option) => option.name}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip {...getTagProps({ index })} key={option.slug} label={option.name} />
              ))
            }
            renderInput={(params) => <TextField {...params} label="Prozesse" placeholder="Prozess wählen" />}
          />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                multiple
                options={messageTypes}
                value={value.messageTypes}
                onChange={(_, options) =>
                  onChange({
                    ...value,
                    messageTypes: options,
                  })
                }
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option} label={option} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="Nachrichtentyp" placeholder="z. B. INVOIC" />}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                multiple
                options={laws}
                value={value.laws}
                onChange={(_, options) =>
                  onChange({
                    ...value,
                    laws: options,
                  })
                }
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option} label={option} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="Rechtsgrundlagen" placeholder="z. B. StromNZV" />}
              />
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AtlasFilterPanel;
