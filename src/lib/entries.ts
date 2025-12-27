import { db, type Entry, type EntryType } from './db';

/**
 * Adds a new entry to the database.
 * Ensures that the entry is associated with the given cycleId.
 */
export async function addEntry(
  cycleId: number,
  type: EntryType,
  content: string | number,
  metadata?: any,
  timestamp: number = Date.now()
): Promise<number> {
  // Validate cycleId exists (optional integrity check)
  const cycle = await db.cycles.get(cycleId);
  if (!cycle) {
    throw new Error(`Cycle with ID ${cycleId} not found.`);
  }

  // We could also enforce "active" status here if desired,
  // but "Hard Cut-off" logic might handle that at the UI/Controller level
  // to prevent creating the entry in the first place.
  // However, keeping the data layer flexible is usually better.

  return await db.entries.add({
    cycleId,
    timestamp,
    type,
    content,
    metadata
  });
}

/**
 * Retrieves all entries for a specific cycle.
 * Sorted by timestamp (default for queries on timestamp index if used, but let's be explicit)
 */
export async function getEntriesForCycle(cycleId: number): Promise<Entry[]> {
  return await db.entries
    .where('cycleId')
    .equals(cycleId)
    .sortBy('timestamp');
}

/**
 * Retrieves entries of a specific type for a cycle.
 */
export async function getEntriesByType(cycleId: number, type: EntryType): Promise<Entry[]> {
  return await db.entries
    .where({ cycleId, type }) // This requires a compound index [cycleId+type]
    .sortBy('timestamp');
}
