import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  AutoAwesome as AIIcon,
  Search as SearchIcon,
  Group as TeamIcon,
  Article as UnifiedIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import { workspaceApi } from '../services/workspaceApi';
import TeamService from '../services/teamService';
// New unified component
import UnifiedDocumentManager from '../components/Workspace/UnifiedDocumentManager';
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
  // Team-related stats
  teamDocuments?: number;
  teamNotes?: number;
  teamName?: string;
  isTeamMember?: boolean;
}

const Workspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);
  const [showTeamDocuments, setShowTeamDocuments] = useState(true);
  const [userTeam, setUserTeam] = useState<any>(null);
  
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Touch navigation for mobile
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Parse URL parameters
  const urlTab = searchParams.get('tab');
  const urlFilter = searchParams.get('filter');

  const fetchWorkspaceStats = async () => {
    try {
      setLoading(true);
      const data = await workspaceApi.getDashboard();
      setStats(data);
      
      // Check if user is in a team
      try {
        const team = await TeamService.getCurrentUserTeam();
        setUserTeam(team);
        if (team) {
          const teamData = await workspaceApi.getTeamWorkspaceDashboard();
          setStats(prev => ({ ...prev, ...teamData }));
        }
      } catch (teamError) {
        // User is not in a team, continue without team features
        console.log('User is not in a team:', teamError);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      showSnackbar('Fehler beim Laden der Workspace-Statistiken', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies needed for one-time fetch

  // Handle URL parameters
  useEffect(() => {
    // Set tab based on URL parameter
    if (urlTab === 'notes' || urlTab === 'documents') {
      setActiveTab(0); // Both notes and documents are in the unified manager (tab 0)
    } else if (urlTab === 'settings') {
      setActiveTab(1);
    }
  }, [urlTab]);

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
            {userTeam && (
              <Chip 
                icon={<TeamIcon />} 
                label={userTeam.name} 
                size="small" 
                color="secondary"
                sx={{ ml: 1 }}
              />
            )}
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
          {userTeam && (
            <>
              <br />
              Als Mitglied von "{userTeam.name}" haben Sie auch Zugriff auf Team-Dokumente
            </>
          )}
        </Typography>

        {/* Team Document Filter */}
        {userTeam && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={showTeamDocuments} 
                  onChange={(e) => setShowTeamDocuments(e.target.checked)}
                  color="primary"
                />
              }
              label="Team-Dokumente anzeigen"
            />
          </Box>
        )}

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
            <Box 
              sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 3, 
                mb: 4 
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '45%', md: '22%' } }}>
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
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '45%', md: '22%' } }}>
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
              </Box>
            </Box>
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
            label="Meine Dokumente"
            icon={<UnifiedIcon />}
            iconPosition="start"
            id="workspace-tab-0"
            aria-controls="workspace-tabpanel-0"
            aria-label="Navigate to unified documents and notes"
          />
          <Tab
            label="Einstellungen"
            icon={<SettingsIcon />}
            iconPosition="start"
            id="workspace-tab-1"
            aria-controls="workspace-tabpanel-1"
            aria-label="Navigate to workspace settings"
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <UnifiedDocumentManager 
            onStatsUpdate={fetchWorkspaceStats} 
            initialFilter={urlFilter}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
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
