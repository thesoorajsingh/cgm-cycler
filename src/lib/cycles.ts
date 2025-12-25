import { db, type Cycle } from './db';

// Constants
const CYCLE_DURATION_DAYS = 14;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function startNewCycle(startDate: number = Date.now()): Promise<number> {
  // Optional: close any existing active cycle
  const activeCycle = await getActiveCycle();
  if (activeCycle) {
    await closeCycle(activeCycle.id);
  }

  const id = await db.cycles.add({
    startDate,
    status: 'active',
    name: `Cycle from ${new Date(startDate).toLocaleDateString()}`
  });
  return id;
}

export async function getActiveCycle(): Promise<Cycle | undefined> {
  return await db.cycles.where('status').equals('active').first();
}

export async function closeCycle(id: number): Promise<void> {
  await db.cycles.update(id, {
    status: 'closed',
    endDate: Date.now()
  });
}

/**
 * Checks if a cycle is strictly within the 14-day limit.
 * Returns true if the cycle is active and less than 14 days have passed since start.
 */
export function isCycleValid(cycle: Cycle, currentDate: number = Date.now()): boolean {
  if (cycle.status !== 'active') return false;

  const diff = currentDate - cycle.startDate;
  // Use strictly less than 14 days worth of milliseconds
  // Or maybe <= 14 days? "exceeds 14 days" implies > 14.
  // Let's say exactly 14*24 hours.
  return diff < (CYCLE_DURATION_DAYS * ONE_DAY_MS);
}

export function getDaysRemaining(cycle: Cycle, currentDate: number = Date.now()): number {
  if (cycle.status !== 'active') return 0;

  const limit = cycle.startDate + (CYCLE_DURATION_DAYS * ONE_DAY_MS);
  const remaining = limit - currentDate;

  if (remaining <= 0) return 0;
  return Math.ceil(remaining / ONE_DAY_MS);
}
