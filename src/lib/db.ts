import Dexie, { type EntityTable } from 'dexie';

// Define types for our schema
export type CycleStatus = 'active' | 'closed';

export interface Cycle {
  id: number;
  startDate: number; // Unix timestamp for easier math
  endDate?: number;  // Optional, set when closed
  name?: string;     // User friendly name e.g. "Cycle 1"
  status: CycleStatus;
}

export type EntryType = 'bg' | 'meal';

export interface Entry {
  id: number;
  cycleId: number;
  timestamp: number;
  type: EntryType;
  value?: number; // BG value (number)
  content?: string | number; // Generic content
  metadata?: any; // Calories, macros, or other sensor data
}

// Define the database
export const db = new Dexie('HealthPWADB') as Dexie & {
  cycles: EntityTable<Cycle, 'id'>;
  entries: EntityTable<Entry, 'id'>;
};

// Schema definition
db.version(1).stores({
  cycles: '++id, startDate, status', // Indexes
  entries: '++id, cycleId, timestamp, type, [cycleId+type]' // Added compound index
});

export { Dexie };
