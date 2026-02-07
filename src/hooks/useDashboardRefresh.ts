/**
 * useDashboardRefresh
 *
 * Manages auto-refresh of the daily report while the dashboard is visible.
 * Calls refreshFn immediately on open, then every 30 minutes.
 * Interval is cleared when dashboard closes to avoid background work.
 */

import { useEffect } from 'react';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useDashboardRefresh(
  isVisible: boolean,
  refreshFn: () => void
): void {
  useEffect(() => {
    if (!isVisible) return;

    // Refresh immediately when dashboard opens
    refreshFn();

    const id = setInterval(refreshFn, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isVisible, refreshFn]);
}
