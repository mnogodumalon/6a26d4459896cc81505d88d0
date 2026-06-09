import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Schichtplan, Mitarbeitende } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schichtplan, setSchichtplan] = useState<Schichtplan[]>([]);
  const [mitarbeitende, setMitarbeitende] = useState<Mitarbeitende[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schichtplanData, mitarbeitendeData] = await Promise.all([
        LivingAppsService.getSchichtplan(),
        LivingAppsService.getMitarbeitende(),
      ]);
      setSchichtplan(schichtplanData);
      setMitarbeitende(mitarbeitendeData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [schichtplanData, mitarbeitendeData] = await Promise.all([
          LivingAppsService.getSchichtplan(),
          LivingAppsService.getMitarbeitende(),
        ]);
        setSchichtplan(schichtplanData);
        setMitarbeitende(mitarbeitendeData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const mitarbeitendeMap = useMemo(() => {
    const m = new Map<string, Mitarbeitende>();
    mitarbeitende.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeitende]);

  return { schichtplan, setSchichtplan, mitarbeitende, setMitarbeitende, loading, error, fetchAll, mitarbeitendeMap };
}