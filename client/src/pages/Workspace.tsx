import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Notes as NotesIcon,
  Description as DocumentsIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  AutoAwesome as AIIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import NotesManager from '../components/Workspace/NotesManager';
import DocumentsManager from '../components/Workspace/DocumentsManager';
import WorkspaceSettings from '../components/Workspace/WorkspaceSettings';
import GlobalSearch from '../components/Workspace/GlobalSearch';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workspace-tabpanel-${index}`}
      aria-labelledby={`workspace-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface WorkspaceStats {
  totalDocuments: number;
  totalNotes: number;
  storageUsedMB: number;
  storageLimitMB: number;
  aiContextEnabled: boolean;
  recentActivity: number;
}

const Workspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchWorkspaceStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workspace/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workspace stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      showSnackbar('Fehler beim Laden der Workspace-Statistiken', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchWorkspaceStats();
  }, [fetchWorkspaceStats]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatStorageSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(1)} KB`;
    }
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  const getStoragePercentage = () => {
    if (!stats) return 0;
    return (stats.storageUsedMB / stats.storageLimitMB) * 100;
  };

  const getStorageColor = () => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'primary';
  };

  const handleSearchResult = (result: any) => {
    // Navigate to the appropriate tab based on result type
    if (result.type === 'document') {
      setActiveTab(1); // Documents tab
    } else if (result.type === 'note') {
      setActiveTab(0); // Notes tab
    }
    showSnackbar(`${result.type === 'document' ? 'Dokument' : 'Notiz'} "${result.title}" geöffnet`, 'info');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              fontSize: isMobile ? '1.8rem' : '2.5rem'
            }}
          >
            <DashboardIcon color="primary" />
            Mein Workspace
          </Typography>
          
          <IconButton 
            onClick={() => setIsSearchOpen(true)}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <SearchIcon />
          </IconButton>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          Verwalten Sie Ihre persönlichen Notizen und Dokumente mit KI-Unterstützung
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DocumentsIcon color="primary" />
                  <Box>
                    <Typography variant="h6" component="div">
                      {stats.totalDocuments}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dokumente
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <NotesIcon color="primary" />
                  <Box>
                    <Typography variant="h6" component="div">
                      {stats.totalNotes}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Notizen
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <StorageIcon color={getStorageColor()} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Speicher
                    </Typography>
                    <Typography variant="body2" component="div">
                      {formatStorageSize(stats.storageUsedMB)} / {formatStorageSize(stats.storageLimitMB)}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getStoragePercentage()}
                      color={getStorageColor()}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AIIcon color={stats.aiContextEnabled ? 'primary' : 'disabled'} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      KI-Kontext
                    </Typography>
                    <Chip
                      label={stats.aiContextEnabled ? 'Aktiviert' : 'Deaktiviert'}
                      color={stats.aiContextEnabled ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label="Meine Notizen"
            icon={<NotesIcon />}
            iconPosition="start"
            id="workspace-tab-0"
            aria-controls="workspace-tabpanel-0"
          />
          <Tab
            label="Meine Dokumente"
            icon={<DocumentsIcon />}
            iconPosition="start"
            id="workspace-tab-1"
            aria-controls="workspace-tabpanel-1"
          />
          <Tab
            label="Einstellungen"
            icon={<SettingsIcon />}
            iconPosition="start"
            id="workspace-tab-2"
            aria-controls="workspace-tabpanel-2"
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <NotesManager onStatsUpdate={fetchWorkspaceStats} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <DocumentsManager onStatsUpdate={fetchWorkspaceStats} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <WorkspaceSettings onStatsUpdate={fetchWorkspaceStats} />
        </TabPanel>
      </Paper>
      
      {/* Global Search Dialog */}
      <GlobalSearch
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onResultSelect={handleSearchResult}
      />
    </Container>
  );
};

export default Workspace;
