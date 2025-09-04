// Hauptkomponente für Bilaterale Klärfälle
// Erstellt: 12. August 2025
// Beschreibung: Container-Komponente für das Bilateral Clarification Management

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  TrendingUp as TrendingUpIcon,
  PlayCircleOutline as DemoIcon,
  Bookmark as BookmarkIcon,
  Save as SaveIcon
} from '@mui/icons-material';

// Import types and services
import {
  BilateralClarification,
  ClarificationFilters,
  ClarificationStats
} from '../../types/bilateral';
import { bilateralClarificationService } from '../../services/bilateralClarificationService';

// Import child components
import { ClarificationsList } from './ClarificationsList';
import { ClarificationsBoard } from './ClarificationsBoard';
import { deriveAll } from './clarificationDerive';
import { applyServerFieldsPolicy } from './serverFieldsUtils';
import { ClarificationFilters as FiltersComponent } from './ClarificationFilters';
import { CreateClarificationModal } from './CreateClarificationModal';
import { ClarificationDetailModal } from './ClarificationDetailModal';
import { StatsCards } from './StatsCards';
import { WorkflowDemoTab } from './WorkflowDemoTab';
import { countDueOnDate, computeAgingBuckets, computeOverdueBuckets } from './kpiUtils';
import { isOverdueClient } from './filterUtils';
import { featureFlags } from '../../config/featureFlags';

// Import existing components
import { useAuth } from '../../contexts/AuthContext';

// TabPanel helper
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
  type SavedView = { name: string; filters: ClarificationFilters };
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
  const [useBoardView, setUseBoardView] = useState<boolean>(() => {
    const saved = localStorage.getItem('clarificationsViewMode');
    const defaultBoard = featureFlags.boardView.enabled ? 'board' : 'list';
    return saved ? saved === 'board' : defaultBoard === 'board';
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClarification, setSelectedClarification] = useState<BilateralClarification | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewsMenuAnchor, setViewsMenuAnchor] = useState<null | HTMLElement>(null);
  const didInitRef = useRef(false);

  // Saved Views helpers
  const getDefaultViews = useCallback((): SavedView[] => {
    const openStatuses = ['DRAFT','INTERNAL','READY_TO_SEND','SENT','PENDING','IN_PROGRESS','ESCALATED'] as any;
    return [
      { name: 'Meine aktiven', filters: { status: openStatuses, assignedTo: user?.id } },
      { name: 'Wartet > 7 Tage', filters: { status: ['SENT','PENDING'] as any, isOverdue: true } },
      { name: 'Heute fällig', filters: { dateRange: { start: new Date().toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) } } },
      { name: 'Team offen', filters: { status: openStatuses, sharedWithTeam: true } }
    ];
  }, [user?.id]);

  const loadSavedViews = useCallback(() => {
    try {
      const raw = localStorage.getItem('clarificationsSavedViewsV1');
      const parsed = raw ? (JSON.parse(raw) as SavedView[]) : [];
      // Merge defaults if they are missing (by name)
      const defaults = getDefaultViews();
      const names = new Set((parsed || []).map(v => v.name));
      const merged = [...parsed, ...defaults.filter(d => !names.has(d.name))];
      setSavedViews(merged);
      localStorage.setItem('clarificationsSavedViewsV1', JSON.stringify(merged));
    } catch {
      setSavedViews(getDefaultViews());
    }
  }, [getDefaultViews]);

  const saveCurrentAsView = () => {
    const name = window.prompt('Name der Sicht speichern:', 'Meine Sicht');
    if (!name) return;
    const existing = savedViews.filter(v => v.name !== name);
    const next: SavedView[] = [...existing, { name, filters }];
    setSavedViews(next);
    localStorage.setItem('clarificationsSavedViewsV1', JSON.stringify(next));
  };

  const applyView = (view: SavedView) => {
    setFilters(view.filters || {});
    setPagination(prev => ({ ...prev, page: 1 }));
    setViewsMenuAnchor(null);
    // Trigger reload with new filters
    loadClarifications();
    if (currentTab === 1) {
      loadTeamCases();
    }
  };
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
      // Client-side filter helper (supports saved views like isOverdue)
      const applyClientFilters = (items: BilateralClarification[], f: ClarificationFilters) => {
        let result = [...items];
        // Basic filters
        if (f.status && f.status.length) result = result.filter(c => (f.status as any).includes(c.status));
        if (f.priority && f.priority.length) result = result.filter(c => (f.priority as any).includes(c.priority || ''));
        if (f.assignedTo) result = result.filter(c => (c.assignedTo || '') === f.assignedTo);
        if (typeof f.sharedWithTeam === 'boolean') result = result.filter(c => !!c.sharedWithTeam === f.sharedWithTeam);
        if (f.marketPartner) {
          const term = f.marketPartner.toLowerCase();
          result = result.filter(c =>
            (c.marketPartner?.companyName || '').toLowerCase().includes(term) ||
            (c.marketPartner?.code || '').toLowerCase().includes(term)
          );
        }
        if (f.search) {
          const term = f.search.toLowerCase();
          result = result.filter(c =>
            (c.title || '').toLowerCase().includes(term) ||
            (c.description || '').toLowerCase().includes(term) ||
            (c.marketPartner?.companyName || '').toLowerCase().includes(term)
          );
        }
        if (f.dateRange?.start || f.dateRange?.end) {
          const start = f.dateRange?.start ? new Date(f.dateRange.start + 'T00:00:00').getTime() : -Infinity;
          const end = f.dateRange?.end ? new Date(f.dateRange.end + 'T23:59:59').getTime() : Infinity;
          result = result.filter(c => {
            const t = new Date(c.createdAt).getTime();
            return t >= start && t <= end;
          });
        }
  if (f.isOverdue) result = result.filter(c => isOverdueClient(c));
        return result;
      };

  const items = applyServerFieldsPolicy(clarifications, featureFlags.serverFields.enabled);
  setClarifications(applyClientFilters(items, filters));
      
      // Set default pagination if not provided by API
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || clarifications.length,
        totalPages: response.pagination?.totalPages || 1
      }));

      // Update stats: prefer server summary when available; otherwise try server statistics endpoint; else client fallback
      const totalCases = response.pagination?.total || clarifications.length;
      if (featureFlags.kpiServer.enabled && response.summary) {
        setStats({
          totalCases,
          openCases: response.summary.totalOpen ?? 0,
          myAssignedCases: clarifications.filter((c: any) => c.assignedTo === user?.id).length,
          overdueCases: response.summary.overdueCases ?? 0,
          resolvedThisMonth: response.summary.totalResolved ?? 0,
          averageResolutionTime: (response as any).summary?.averageResolutionTime ?? 0,
          teamSharedCases: (response as any).summary?.teamSharedCases ?? clarifications.filter((c: any) => c.sharedWithTeam).length
        });
      } else if (featureFlags.kpiServer.enabled && !response.summary) {
        try {
          const serverStats = await bilateralClarificationService.getStatistics();
          setStats({
            totalCases,
            openCases: serverStats.totalActive ?? clarifications.filter((c: any) => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
            myAssignedCases: clarifications.filter((c: any) => c.assignedTo === user?.id).length,
            overdueCases: serverStats.overdue ?? 0,
            resolvedThisMonth: response.summary?.totalResolved || clarifications.filter((c: any) => c.status === 'RESOLVED').length,
            averageResolutionTime: 0,
            teamSharedCases: (response as any).summary?.teamSharedCases ?? clarifications.filter((c: any) => c.sharedWithTeam).length
          });
        } catch (statsErr) {
          // Graceful fallback on 401 or any error
          setStats({
            totalCases,
            openCases: response.summary?.totalOpen || clarifications.filter((c: any) => c.status === 'OPEN').length,
            myAssignedCases: clarifications.filter((c: any) => c.assignedTo === user?.id).length,
            overdueCases: response.summary?.overdueCases || 0,
            resolvedThisMonth: response.summary?.totalResolved || clarifications.filter((c: any) => c.status === 'RESOLVED').length,
            averageResolutionTime: 0,
            teamSharedCases: clarifications.filter((c: any) => c.sharedWithTeam).length
          });
        }
      } else {
        setStats({
          totalCases,
          openCases: response.summary?.totalOpen || clarifications.filter((c: any) => c.status === 'OPEN').length,
          myAssignedCases: clarifications.filter((c: any) => c.assignedTo === user?.id).length,
          overdueCases: response.summary?.overdueCases || 0,
          resolvedThisMonth: response.summary?.totalResolved || clarifications.filter((c: any) => c.status === 'RESOLVED').length,
          averageResolutionTime: 0,
          teamSharedCases: clarifications.filter((c: any) => c.sharedWithTeam).length
        });
      }
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
  const derived = applyServerFieldsPolicy(response.clarifications || [], featureFlags.serverFields.enabled);
      // Reuse client filters from above by simple inline logic to avoid ref duplication
      const now = Date.now();
      let list = [...derived];
  if (filters.isOverdue) list = list.filter(c => isOverdueClient(c));
      setTeamCases(list);
    } catch (err) {
      console.error('Error loading team cases:', err);
    }
  }, [filters]);

  // Effects
  useEffect(() => {
    if (!user) return;
    // Ensure saved views are loaded only once on initial mount to avoid loops in tests
    if (!didInitRef.current) {
      didInitRef.current = true;
      loadSavedViews();
    }
    loadClarifications();
    if (currentTab === 1) {
      loadTeamCases();
    }
  }, [user, loadClarifications, loadTeamCases, currentTab, loadSavedViews]);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('clarificationsViewMode', useBoardView ? 'board' : 'list');
  }, [useBoardView]);

  // Auto-refresh every 30 seconds when tab is visible (disabled in tests)
  useEffect(() => {
    // Skip interval setup in test environment to prevent hanging timers
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Clear any existing interval before starting a new one
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    refreshIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadClarifications(false);
        if (currentTab === 1) {
          loadTeamCases();
        }
      }
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
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
        marketPartnerCode: data.marketPartner?.code || 'DEFAULT', // Use selected market partner code
        caseType: (data as any).caseType || 'GENERAL', // Get case type from form data
        priority: data.priority || 'MEDIUM',
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        tags: data.tags,
        // Add DAR reference if available
        externalCaseId: data.dataExchangeReference?.dar,
        sourceSystem: 'BILATERAL_FORM'
      };
      
      console.log('Sending clarification data:', createRequest);
      
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
              <Tooltip title="Gespeicherte Sichten">
                <IconButton onClick={(e) => setViewsMenuAnchor(e.currentTarget)}>
                  <BookmarkIcon />
                </IconButton>
              </Tooltip>
              {featureFlags.boardView.enabled && (
                <Tooltip title={useBoardView ? 'Listenansicht' : 'Boardansicht'}>
                  <IconButton onClick={() => setUseBoardView(v => !v)}>
                    <DashboardIcon color={useBoardView ? 'primary' : 'disabled'} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Aktualisieren">
                <span>
                  <IconButton onClick={handleRefresh} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </span>
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
            <Tab 
              icon={<DemoIcon />}
              label="Workflow Demo"
              id="clarifications-tab-3"
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (featureFlags.boardView.enabled && useBoardView) ? (
            <ClarificationsBoard
              clarifications={clarifications}
              onClarificationClick={setSelectedClarification}
              loading={loading}
            />
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
          {useBoardView ? (
            <ClarificationsBoard
              clarifications={teamCases}
              onClarificationClick={setSelectedClarification}
              loading={loading}
            />
          ) : (
            <ClarificationsList
              clarifications={teamCases}
              pagination={{ page: 1, limit: 20, total: teamCases.length }}
              onPageChange={() => {}}
              onClarificationClick={setSelectedClarification}
              loading={loading}
            />
          )}
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
                    Heute fällig
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUpIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h4" color="info.main">{countDueOnDate(clarifications as any, new Date())}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Aging buckets */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Aging-Buckets (wartet auf MP)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {(() => {
                const { buckets, counts } = computeAgingBuckets(clarifications as any);
                return buckets.map((b, i) => (
                  <Card key={b.label} sx={{ flex: '1 1 200px', minWidth: 200 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">{b.label}</Typography>
                      <Typography variant="h5">{counts[i]}</Typography>
                    </CardContent>
                  </Card>
                ));
              })()}
            </Box>
          </Box>
          {/* Overdue by bucket */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Überfällig (wartet auf MP) – Buckets
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {(() => {
                const { buckets, counts } = computeOverdueBuckets(clarifications as any);
                return buckets.map((b, i) => (
                  <Card key={b.label} sx={{ flex: '1 1 200px', minWidth: 200 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">{b.label}</Typography>
                      <Typography variant="h5">{counts[i]}</Typography>
                    </CardContent>
                  </Card>
                ));
              })()}
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <WorkflowDemoTab onCreateClarification={handleCreateClarification} />
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
      {/* Saved Views Menu */}
      {Boolean(viewsMenuAnchor) && (
        <Paper
          elevation={6}
          sx={{ position: 'absolute', zIndex: 10, mt: 1, right: 24, p: 1, minWidth: 260 }}
          onMouseLeave={() => setViewsMenuAnchor(null)}
        >
          <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BookmarkIcon fontSize="small" />
            <Typography variant="subtitle2">Gespeicherte Sichten</Typography>
          </Box>
          <Box>
            {savedViews.map((v) => (
              <Button key={v.name} onClick={() => applyView(v)} fullWidth sx={{ justifyContent: 'flex-start' }}>
                {v.name}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" startIcon={<SaveIcon />} onClick={saveCurrentAsView}>
              Aktuelle Sicht speichern
            </Button>
            <Button size="small" onClick={() => { localStorage.removeItem('clarificationsSavedViewsV1'); loadSavedViews(); }}>
              Zurücksetzen
            </Button>
          </Box>
        </Paper>
      )}
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
