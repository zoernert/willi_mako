import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import SmartSearch from '../components/Workspace/SmartSearch';

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
  const [showMobileStats, setShowMobileStats] = useState(false);
  
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Touch navigation for mobile
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  // Touch navigation handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    
    const deltaX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && activeTab < 2) {
        // Swipe left - next tab
        setActiveTab(activeTab + 1);
      } else if (deltaX < 0 && activeTab > 0) {
        // Swipe right - previous tab
        setActiveTab(activeTab - 1);
      }
    }
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
            aria-label="Open global search"
            title="Globale Suche öffnen"
          >
            <SearchIcon />
          </IconButton>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Verwalten Sie Ihre persönlichen Notizen und Dokumente mit KI-Unterstützung
        </Typography>

        {/* Smart Search Bar */}
        <Box sx={{ maxWidth: 600, mx: 'auto' }}>
          <SmartSearch
            placeholder="Durchsuchen Sie Ihre Notizen und Dokumente..."
            showChatAction={true}
            onResultSelect={handleSearchResult}
            onStartChat={(query, context) => {
              // Navigate to chat with context
              window.location.href = `/chat?query=${encodeURIComponent(query)}&context=${context.map(c => c.id).join(',')}`;
            }}
          />
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <>
          {/* Mobile: Collapsible Stats Summary */}
          {isMobile && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowMobileStats(!showMobileStats)}
                >
                  <Typography variant="h6">
                    Workspace-Übersicht
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`${stats.totalDocuments} Docs`} 
                      size="small" 
                      color="primary" 
                    />
                    <Chip 
                      label={`${stats.totalNotes} Notizen`} 
                      size="small" 
                      color="secondary" 
                    />
                    <IconButton size="small">
                      {showMobileStats ? '▲' : '▼'}
                    </IconButton>
                  </Box>
                </Box>
                
                {showMobileStats && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Speicher: {formatStorageSize(stats.storageUsedMB)} / {formatStorageSize(stats.storageLimitMB)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getStoragePercentage()}
                        color={getStorageColor()}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Chip
                      label={stats.aiContextEnabled ? 'KI-Kontext Aktiviert' : 'KI-Kontext Deaktiviert'}
                      color={stats.aiContextEnabled ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Desktop: Full Stats Grid */}
          {!isMobile && (
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
        </>
      )}

      {/* Main Content */}
      <Paper 
        sx={{ width: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          aria-label="Workspace navigation tabs"
        >
          <Tab
            label="Meine Notizen"
            icon={<NotesIcon />}
            iconPosition="start"
            id="workspace-tab-0"
            aria-controls="workspace-tabpanel-0"
            aria-label="Navigate to my notes"
          />
          <Tab
            label="Meine Dokumente"
            icon={<DocumentsIcon />}
            iconPosition="start"
            id="workspace-tab-1"
            aria-controls="workspace-tabpanel-1"
            aria-label="Navigate to my documents"
          />
          <Tab
            label="Einstellungen"
            icon={<SettingsIcon />}
            iconPosition="start"
            id="workspace-tab-2"
            aria-controls="workspace-tabpanel-2"
            aria-label="Navigate to workspace settings"
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
