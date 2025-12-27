import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { addEntry, getEntriesForCycle, getEntriesByType } from './entries';
import { startNewCycle } from './cycles';
import { db } from './db';

describe('Entries Data Access', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should add an entry linked to a cycle', async () => {
    const cycleId = await startNewCycle();
    const entryId = await addEntry(cycleId, 'bg', 100);

    const entry = await db.entries.get(entryId);
    expect(entry).toBeDefined();
    expect(entry?.cycleId).toBe(cycleId);
    expect(entry?.content).toBe(100);
    expect(entry?.type).toBe('bg');
  });

  it('should throw error if cycle does not exist', async () => {
    await expect(addEntry(999, 'bg', 100)).rejects.toThrow();
  });

  it('should retrieve entries for a cycle sorted by timestamp', async () => {
    const cycleId = await startNewCycle();
    await addEntry(cycleId, 'bg', 100, {}, 1000);
    await addEntry(cycleId, 'meal', 'Lunch', {}, 2000);
    await addEntry(cycleId, 'bg', 120, {}, 500); // Earliest

    const entries = await getEntriesForCycle(cycleId);
    expect(entries).toHaveLength(3);
    expect(entries[0].timestamp).toBe(500);
    expect(entries[1].timestamp).toBe(1000);
    expect(entries[2].timestamp).toBe(2000);
  });

  it('should filter entries by type', async () => {
    const cycleId = await startNewCycle();
    await addEntry(cycleId, 'bg', 100);
    await addEntry(cycleId, 'meal', 'Lunch');
    await addEntry(cycleId, 'bg', 110);

    const bgEntries = await getEntriesByType(cycleId, 'bg');
    expect(bgEntries).toHaveLength(2);
    expect(bgEntries.every(e => e.type === 'bg')).toBe(true);
  });
});
