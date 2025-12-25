'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Cycle } from '@/lib/db';
import { startNewCycle, closeCycle, isCycleValid, getDaysRemaining } from '@/lib/cycles';
import { useCallback, useState, useEffect } from 'react';

export function useCycle() {
  // Query active cycle. Dexie updates this automatically when DB changes.
  const activeCycle = useLiveQuery(async () => {
    return await db.cycles.where('status').equals('active').first();
  });

  // Calculate derived state
  // Note: we might want to re-calculate this periodically or just on render
  // Since `useLiveQuery` triggers re-render on DB change, this is fine.
  // For time-based expiry (e.g. crossing midnight), we might need an interval,
  // but for now, we assume user interaction triggers updates or checking on load is enough.

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Update 'now' every minute to keep daysRemaining accurate if app is open
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isValid = activeCycle ? isCycleValid(activeCycle, now) : false;
  const daysRemaining = activeCycle ? getDaysRemaining(activeCycle, now) : 0;

  const handleStartCycle = useCallback(async () => {
    await startNewCycle();
  }, []);

  const handleCloseCycle = useCallback(async () => {
    if (activeCycle) {
      await closeCycle(activeCycle.id);
    }
  }, [activeCycle]);

  return {
    activeCycle,
    isCycleActive: isValid, // True if active AND within 14 days
    isCycleExpired: activeCycle && !isValid, // True if active BUT exceeded 14 days
    daysRemaining,
    startNewCycle: handleStartCycle,
    closeCycle: handleCloseCycle
  };
}
