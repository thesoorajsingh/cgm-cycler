import 'fake-indexeddb/auto'; // Ensure DB works in test
import { describe, it, expect, beforeEach } from 'vitest';
import { startNewCycle, getActiveCycle, closeCycle, isCycleValid, getDaysRemaining } from './cycles';
import { db } from './db';

describe('Cycle Logic', () => {
  beforeEach(async () => {
    // Reset DB state
    await db.delete();
    await db.open();
  });

  it('should start a new cycle', async () => {
    const id = await startNewCycle();
    const cycle = await db.cycles.get(id);
    expect(cycle).toBeDefined();
    expect(cycle?.status).toBe('active');
  });

  it('should retrieve the active cycle', async () => {
    await startNewCycle();
    const active = await getActiveCycle();
    expect(active).toBeDefined();
    expect(active?.status).toBe('active');
  });

  it('should close a cycle', async () => {
    const id = await startNewCycle();
    await closeCycle(id);
    const cycle = await db.cycles.get(id);
    expect(cycle?.status).toBe('closed');
    expect(cycle?.endDate).toBeDefined();
  });

  it('should auto-close existing active cycle when starting a new one', async () => {
    const id1 = await startNewCycle();
    const id2 = await startNewCycle();

    const cycle1 = await db.cycles.get(id1);
    const cycle2 = await db.cycles.get(id2);

    expect(cycle1?.status).toBe('closed');
    expect(cycle2?.status).toBe('active');
  });

  it('should validate 14-day limit', async () => {
    const start = Date.now();
    const id = await startNewCycle(start);
    const cycle = (await db.cycles.get(id))!;

    // Day 1
    expect(isCycleValid(cycle, start)).toBe(true);

    // Day 13
    const day13 = start + (13 * 24 * 60 * 60 * 1000);
    expect(isCycleValid(cycle, day13)).toBe(true);

    // Day 15 (Expired)
    const day15 = start + (15 * 24 * 60 * 60 * 1000);
    expect(isCycleValid(cycle, day15)).toBe(false);
  });

  it('should calculate days remaining correctly', async () => {
    const start = Date.now();
    const id = await startNewCycle(start);
    const cycle = (await db.cycles.get(id))!;

    expect(getDaysRemaining(cycle, start)).toBe(14); // Or 14 full days

    const day1 = start + (24 * 60 * 60 * 1000) + 1000; // 1 day and bit passed
    expect(getDaysRemaining(cycle, day1)).toBe(13);
  });
});
