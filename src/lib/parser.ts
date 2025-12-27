export interface ParsedData {
  timestamp: number;
  value: number;
}

export async function parseCGMData(
  fileContent: string,
  type: 'csv' | 'json'
): Promise<ParsedData[]> {
  const results: ParsedData[] = [];

  if (type === 'json') {
    try {
      const data = JSON.parse(fileContent);
      if (!Array.isArray(data)) throw new Error('JSON is not an array');

      // Attempt to map common fields
      for (const item of data) {
        const val = item.value ?? item.Value ?? item.glucose ?? item.Glucose;
        const time = item.timestamp ?? item.Timestamp ?? item.date ?? item.Date;

        if (val && time) {
          results.push({
            timestamp: new Date(time).getTime(),
            value: parseFloat(val)
          });
        }
      }
    } catch (e) {
      throw new Error('Invalid JSON format');
    }
  } else if (type === 'csv') {
    const lines = fileContent.split(/\r?\n/);
    if (lines.length < 2) return [];

    // Simple heuristic parser: Look for "Glucose" and "Date" or "Timestamp" columns in header
    // Assumes first line is header.
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

    let valIdx = header.findIndex(h => h.includes('glucose') || h.includes('value'));
    let timeIdx = header.findIndex(h => h.includes('timestamp') || h.includes('date') || h.includes('time'));

    // Fallback indices if header detection fails (standard column positions for some exports?)
    // But let's require detection for safety or throw.
    if (valIdx === -1 || timeIdx === -1) {
      // Try strictly position 0 and 1 if header is confusing? No, unsafe.
      throw new Error('Could not identify "Glucose" and "Timestamp/Date" columns in CSV.');
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted CSV cells roughly
      // This is a naive split. Use a library like PapaParse for production robustness if needed.
      // But for this task "Build a robust CSV/JSON parser utility", I should handle quotes or assume simple CSV.
      // Given constraints, I'll use a regex splitter or simple split if no quotes expected.
      // Let's implement a basic quote-aware splitter or just split by comma if simplicity matches "given format".

      const parts = line.split(','); // Simple split

      if (parts.length > Math.max(valIdx, timeIdx)) {
        const rawVal = parts[valIdx]?.trim();
        const rawTime = parts[timeIdx]?.trim();

        if (rawVal && rawTime) {
           const val = parseFloat(rawVal);
           const time = new Date(rawTime).getTime();

           if (!isNaN(val) && !isNaN(time)) {
             results.push({ timestamp: time, value: val });
           }
        }
      }
    }
  }

  return results.sort((a, b) => a.timestamp - b.timestamp);
}
