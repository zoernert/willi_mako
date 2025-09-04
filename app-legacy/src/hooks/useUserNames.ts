import { useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../services/apiEndpoints';

// Simple in-memory cache across hook instances
const nameCache = new Map<string, string>();

export function useUserNames(userIds: Array<string | undefined | null>, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const ids = useMemo(() => Array.from(new Set((userIds || []).filter((x): x is string => !!x))), [userIds]);
  const [mapState, setMapState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    ids.forEach(id => {
      const cached = nameCache.get(id);
      if (cached) init[id] = cached;
    });
    return init;
  });

  useEffect(() => {
    if (!enabled) return;
    const missing = ids.filter(id => !nameCache.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        // Admin Users endpoint returns array of users with id and name fields in this app
        const users: any[] = await apiClient.get(API_ENDPOINTS.admin.users);
        const next: Record<string, string> = {};
        users.forEach((u: any) => {
          if (u?.id && typeof u.name === 'string') {
            nameCache.set(u.id, u.name);
            next[u.id] = u.name;
          }
        });
        if (!cancelled) {
          setMapState(prev => ({ ...next, ...prev }));
        }
      } catch {
        // Silent fallback; keep id short when names not available
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids, enabled]);

  return mapState;
}
