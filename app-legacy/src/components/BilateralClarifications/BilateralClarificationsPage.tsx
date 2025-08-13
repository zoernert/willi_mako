// Hauptkomponente für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Container-Komponente für das Bilateral Clarification Management

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Group as TeamIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

// Import types and services
import {
  BilateralClarification,
  ClarificationFilters,
  ClarificationListResponse,
  ClarificationStats
} from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';

// Import child components (will be created in subsequent tasks)
import { ClarificationsList } from './ClarificationsList';
import { ClarificationFilters as FiltersComponent } from './ClarificationFilters';
import { CreateClarificationModal } from './CreateClarificationModal';
import { ClarificationDetailModal } from './ClarificationDetailModal';
import { StatsCards } from './StatsCards';

// Import existing components
import { useAuth } from '../../contexts/AuthContext';

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
      id={`clarifications-tabpanel-${index}`}
      aria-labelledby={`clarifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const BilateralClarificationsPage: React.FC = () => {
  // Context
  const { state } = useAuth();
  const user = state.user;

  // State Management
  const [clarifications, setClarifications] = useState<BilateralClarification[]>([]);
  const [teamCases, setTeamCases] = useState<BilateralClarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClarificationFilters>({});
  const [stats, setStats] = useState<ClarificationStats | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // UI State
  const [currentTab, setCurrentTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClarification, setSelectedClarification] = useState<BilateralClarification | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Data Loading Functions
  const loadClarifications = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      
      const response: any = await bilateralClarificationService.getClarifications(
        filters, 
        pagination.page, 
        pagination.limit
      );
      
      // Handle simplified API response
      const clarifications = response.clarifications || [];
      setClarifications(clarifications);
      
      // Set default pagination if not provided by API
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || clarifications.length,
        totalPages: response.pagination?.totalPages || 1
      }));

      // Update stats with default values if summary not available
      const totalCases = response.pagination?.total || clarifications.length;
      setStats({
        totalCases: totalCases,
        openCases: response.summary?.totalOpen || clarifications.filter((c: any) => c.status === 'OPEN').length,
        myAssignedCases: clarifications.filter((c: any) => c.assignedTo === user?.id).length,
        overdueCases: response.summary?.overdueCases || 0,
        resolvedThisMonth: response.summary?.totalResolved || clarifications.filter((c: any) => c.status === 'RESOLVED').length,
        averageResolutionTime: 0, // TODO: Calculate from API
        teamSharedCases: clarifications.filter((c: any) => c.sharedWithTeam).length
      });
    } catch (err) {
      setError('Fehler beim Laden der Klärfälle');
      console.error('Error loading clarifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, user?.id]);

  const loadTeamCases = useCallback(async () => {
    try {
      const response = await bilateralClarificationService.getClarifications(filters, 1, 20);
      setTeamCases(response.clarifications);
    } catch (err) {
      console.error('Error loading team cases:', err);
    }
  }, [filters]);

  // Effects
  useEffect(() => {
    if (user) {
      loadClarifications();
      if (currentTab === 1) {
        loadTeamCases();
      }
    }
  }, [user, loadClarifications, loadTeamCases, currentTab]);

  // Auto-refresh every 30 seconds when tab is visible
  useEffect(() => {
    const startAutoRefresh = () => {
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadClarifications(false);
          if (currentTab === 1) {
            loadTeamCases();
          }
        }
      }, 30000);
      setRefreshInterval(interval);
    };

    startAutoRefresh();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [loadClarifications, loadTeamCases, currentTab]);

  // Event Handlers
  const handleCreateClarification = async (data: Partial<BilateralClarification>) => {
    try {
      // Transform data to match CreateClarificationRequest interface
      const createRequest = {
        title: data.title || '',
        description: data.description,
        marketPartnerCode: 'DEFAULT', // You may want to make this configurable
        caseType: (data as any).type || 'GENERAL', // Map from simple form field
        priority: data.priority?.toUpperCase() as any || 'MEDIUM',
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        tags: data.tags,
      };
      
      await bilateralClarificationService.create(createRequest);
      setShowCreateModal(false);
      setSuccess('Klärfall erfolgreich erstellt');
      await loadClarifications();
    } catch (err) {
      setError('Fehler beim Erstellen des Klärfalls');
      console.error('Error after creating clarification:', err);
    }
  };

  const handleFilterChange = (newFilters: ClarificationFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleClarificationUpdate = async () => {
    await loadClarifications();
    if (currentTab === 1) {
      await loadTeamCases();
    }
    setSelectedClarification(null);
  };

  const handleRefresh = () => {
    loadClarifications();
    if (currentTab === 1) {
      loadTeamCases();
    }
  };

  const handleExport = async () => {
    try {
      await bilateralClarificationService.exportClarifications(filters, 'excel');
      setSuccess('Export erfolgreich heruntergeladen');
    } catch (err) {
      setError('Fehler beim Exportieren');
      console.error('Error exporting:', err);
    }
  };

  // Render guards
  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Bitte melden Sie sich an, um Klärfälle zu verwalten.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Bilaterale Klärfälle
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Verwalten Sie Ihre Klärfälle effizient und transparent
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Tooltip title="Filter ein-/ausblenden">
                <IconButton 
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Aktualisieren">
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportieren">
                <IconButton onClick={handleExport}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateModal(true)}
                sx={{ ml: 1 }}
              >
                Neuer Klärfall
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ mb: 3 }}>
          <StatsCards stats={stats} />
        </Box>
      )}

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <FiltersComponent
            filters={filters}
            onFiltersChange={handleFilterChange}
            onSearch={() => loadClarifications()}
          />
        </Paper>
      )}

      {/* Main Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="clarifications tabs">
            <Tab 
              icon={<AssignmentIcon />}
              label={
                <Badge badgeContent={stats?.totalCases || 0} color="primary" max={999}>
                  Meine Klärfälle
                </Badge>
              }
              id="clarifications-tab-0"
            />
            <Tab 
              icon={<TeamIcon />}
              label={
                <Badge badgeContent={stats?.teamSharedCases || 0} color="secondary" max={999}>
                  Team-Klärfälle
                </Badge>
              }
              id="clarifications-tab-1"
            />
            <Tab 
              icon={<DashboardIcon />}
              label="Dashboard"
              id="clarifications-tab-2"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ClarificationsList
              clarifications={clarifications}
              pagination={pagination}
              onPageChange={handlePageChange}
              onClarificationClick={setSelectedClarification}
              loading={loading}
            />
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ClarificationsList
            clarifications={teamCases}
            pagination={{ page: 1, limit: 20, total: teamCases.length }}
            onPageChange={() => {}}
            onClarificationClick={setSelectedClarification}
            loading={loading}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Überfällige Klärfälle
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {stats?.overdueCases || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Gelöste Fälle (Monat)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {stats?.resolvedThisMonth || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Paper>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add clarification"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={() => setShowCreateModal(true)}
      >
        <AddIcon />
      </Fab>

      {/* Modals */}
      {showCreateModal && (
        <CreateClarificationModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClarification}
        />
      )}

      {selectedClarification && (
        <ClarificationDetailModal
          clarificationId={selectedClarification?.id.toString() || ''}
          open={!!selectedClarification}
          onClose={() => setSelectedClarification(null)}
          onUpdate={handleClarificationUpdate}
        />
      )}

      {/* Notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BilateralClarificationsPage;
