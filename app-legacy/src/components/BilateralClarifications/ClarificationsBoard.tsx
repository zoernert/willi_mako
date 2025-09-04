import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Skeleton
} from '@mui/material';
import { BilateralClarification, ClarificationStatus } from '../../types/bilateral';
import { useAuth } from '../../contexts/AuthContext';
import { useUserNames } from '../../hooks/useUserNames';

interface ClarificationsBoardProps {
  clarifications: BilateralClarification[];
  onClarificationClick: (clarification: BilateralClarification) => void;
  loading?: boolean;
}

const COLUMN_ORDER: Array<{ key: ClarificationStatus; title: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' }> = [
  { key: 'DRAFT', title: 'In Vorbereitung', color: 'default' },
  { key: 'INTERNAL', title: 'Interne Klärung', color: 'warning' },
  { key: 'READY_TO_SEND', title: 'Bereit zum Senden', color: 'info' },
  { key: 'SENT', title: 'Gesendet (wartet)', color: 'primary' },
  { key: 'PENDING', title: 'Antwort ausstehend', color: 'primary' },
  { key: 'IN_PROGRESS', title: 'In Bearbeitung', color: 'info' },
  { key: 'RESOLVED', title: 'Geklärt', color: 'success' },
  { key: 'CLOSED', title: 'Abgeschlossen', color: 'success' },
  { key: 'ESCALATED', title: 'Eskalation', color: 'error' }
];

export const ClarificationsBoard: React.FC<ClarificationsBoardProps> = ({ clarifications, onClarificationClick, loading }) => {
  const { state } = useAuth();
  const currentUserId = state.user?.id;
  const lastEditors = useMemo(() => (clarifications || []).map(c => c.lastEditedBy).filter(Boolean) as string[], [clarifications]);
  const nameMap = useUserNames(lastEditors);
  const grouped = useMemo(() => {
    const map: Record<ClarificationStatus, BilateralClarification[]> = {
      DRAFT: [],
      INTERNAL: [],
      READY_TO_SEND: [],
      SENT: [],
      PENDING: [],
      IN_PROGRESS: [],
      RESOLVED: [],
      CLOSED: [],
      ESCALATED: []
    };
    (clarifications || []).forEach(c => {
      const key = c.status as ClarificationStatus;
      if (map[key]) map[key].push(c);
    });
    // Sort within columns: nextActionAt asc, then priority, then createdAt desc
    const prioRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    (Object.keys(map) as ClarificationStatus[]).forEach(k => {
      map[k].sort((a, b) => {
        const na = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
        const nb = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
        if (na !== nb) return na - nb;
        const pa = prioRank[a.priority || 'MEDIUM'] ?? 99;
        const pb = prioRank[b.priority || 'MEDIUM'] ?? 99;
        if (pa !== pb) return pa - pb;
        const ca = new Date(a.createdAt).getTime();
        const cb = new Date(b.createdAt).getTime();
        return cb - ca;
      });
    });
    return map;
  }, [clarifications]);

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          gap: 2
        }}
      >
        {COLUMN_ORDER.map(col => (
          <Paper key={col.key} variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {col.title}
              </Typography>
              <Chip size="small" color={col.color} label={grouped[col.key]?.length || 0} />
            </Box>
            <Divider />
            <Box sx={{ p: 1, flex: 1, overflowY: 'auto', maxHeight: 520 }}>
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Skeleton variant="rectangular" height={56} />
                    </Box>
                  ))}
                </>
              ) : grouped[col.key] && grouped[col.key].length > 0 ? (
                <List dense>
                  {grouped[col.key].map(item => (
                    <Tooltip key={item.id} title={`${item.marketPartner.companyName} • DAR: ${item.dataExchangeReference?.dar || '—'}`} placement="top-start">
                      <ListItemButton onClick={() => onClarificationClick(item)} sx={{ borderRadius: 1, mb: 0.5 }}>
                        <Box sx={{ width: '100%' }}>
                          <ListItemText
                            primary={item.title || `Klärfall #${item.id}`}
                            secondary={`${item.marketPartner.companyName} · ${new Date(item.createdAt).toLocaleDateString('de-DE')}${item.lastEditedBy ? ` · zuletzt: ${item.lastEditedBy === currentUserId ? 'ich' : (nameMap[item.lastEditedBy] || String(item.lastEditedBy).slice(0, 8))}` : ''}`}
                            primaryTypographyProps={{ noWrap: true }}
                            secondaryTypographyProps={{ noWrap: true }}
                          />
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {item.priority && <Chip size="small" label={item.priority} />}
                            {item.dataExchangeReference?.dar && <Chip size="small" variant="outlined" label={`DAR ${item.dataExchangeReference.dar}`} />}
                            {/* Simple age chip */}
                            {item.createdAt && (
                              <Chip size="small" variant="outlined" label={`${Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000*60*60*24)))}d`} />
                            )}
                            {/* WaitingOn derived hint */}
                            {item.waitingOn === 'PARTNER' && (
                              <Chip size="small" color="primary" variant="outlined" label="wartet auf MP" />
                            )}
                            {item.waitingOn === 'US' && (
                              <Chip size="small" color="warning" variant="outlined" label="wir sind dran" />
                            )}
                            {/* SLA / Next action */}
                            {item.nextActionAt && (() => {
                              const due = new Date(item.nextActionAt).getTime();
                              const now = Date.now();
                              const days = Math.floor((due - now) / (1000 * 60 * 60 * 24));
                              if (now > due) {
                                return <Chip size="small" color="error" label={`überfällig ${Math.abs(days)}d`} />;
                              }
                              return <Chip size="small" color={days <= 1 ? 'warning' : 'default'} variant="outlined" label={`fällig in ${days}d`} />;
                            })()}
                          </Box>
                        </Box>
                      </ListItemButton>
                    </Tooltip>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: 'center' }}>
                  Keine Einträge
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default ClarificationsBoard;
