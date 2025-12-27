import { describe, it, expect } from 'vitest';
import { parseCGMData } from './parser';

describe('CGM Parser', () => {
  it('should parse JSON correctly', async () => {
    const json = JSON.stringify([
      { timestamp: '2023-01-01T10:00:00Z', value: 100 },
      { timestamp: '2023-01-01T10:05:00Z', value: 105 }
    ]);
    const result = await parseCGMData(json, 'json');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(105);
  });

  it('should parse CSV correctly with headers', async () => {
    const csv = `Date,Glucose
2023-01-01T10:00:00Z,100
2023-01-01T10:05:00Z,105`;
    const result = await parseCGMData(csv, 'csv');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(100);
    expect(result[1].value).toBe(105);
  });

  it('should handle alternative CSV headers', async () => {
    const csv = `Timestamp,Value (mg/dL)
2023-01-01T10:00:00Z,100`;
    const result = await parseCGMData(csv, 'csv');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(100);
  });

  it('should throw on invalid CSV headers', async () => {
    const csv = `Foo,Bar
1,2`;
    await expect(parseCGMData(csv, 'csv')).rejects.toThrow();
  });
});
