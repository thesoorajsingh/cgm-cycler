'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCycle } from '@/hooks/use-cycle';
import { addEntry } from '@/lib/entries';
import { parseCGMData, type ParsedData } from '@/lib/parser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { db } from '@/lib/db'; // Direct DB access for bulk add transaction

export default function ImportCGMPage() {
  const router = useRouter();
  const { activeCycle, isCycleActive } = useCycle();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedData[]>([]);
  const [importStats, setImportStats] = useState<{ total: number, valid: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData([]);
      setImportStats(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const type = file.name.endsWith('.csv') ? 'csv' : 'json'; // Simple extension check
      const data = await parseCGMData(text, type);
      setPreviewData(data);
    } catch (error) {
      alert(`Error parsing file: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!activeCycle || previewData.length === 0) return;

    setIsProcessing(true);
    try {
      // Filter data within cycle range
      // We rely on activeCycle.endDate if closed, or just startDate check if active
      // Actually, standard isCycleValid logic or simplified check:
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const cycleLimit = activeCycle.startDate + (14 * ONE_DAY_MS);

      const validEntries = previewData.filter(d =>
        d.timestamp >= activeCycle.startDate && d.timestamp < cycleLimit
      );

      // Bulk Add
      await db.transaction('rw', db.entries, async () => {
        const entriesToAdd = validEntries.map(d => ({
          cycleId: activeCycle.id,
          timestamp: d.timestamp,
          type: 'bg' as const,
          content: d.value,
          metadata: { unit: 'mg/dL', source: 'import' }
        }));

        await db.entries.bulkAdd(entriesToAdd);
      });

      setImportStats({ total: previewData.length, valid: validEntries.length });
      setPreviewData([]); // Clear preview to show success state

    } catch (error) {
      console.error(error);
      alert('Import failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isCycleActive) {
     return (
       <div className="p-8 text-center">
         <h2 className="text-xl font-bold">No Active Cycle</h2>
         <p>Please start a cycle to import data.</p>
         <Button className="mt-4" onClick={() => router.push('/')}>Go to Dashboard</Button>
       </div>
     );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-6">Import CGM Data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Supported formats: CSV, JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input id="file" type="file" accept=".csv,.json" onChange={handleFileChange} />
          </div>

          {previewData.length > 0 && (
            <div className="bg-slate-50 p-4 rounded text-sm">
              <p className="font-bold mb-2">Preview ({previewData.length} records found)</p>
              <ul className="list-disc pl-5 max-h-32 overflow-auto">
                {previewData.slice(0, 5).map((d, i) => (
                  <li key={i}>{new Date(d.timestamp).toLocaleString()}: {d.value}</li>
                ))}
                {previewData.length > 5 && <li>...</li>}
              </ul>
            </div>
          )}

          {importStats && (
            <div className="bg-green-50 p-4 rounded text-sm text-green-800">
              <p>Import Successful!</p>
              <p>Total Records: {importStats.total}</p>
              <p>Imported (In Cycle): {importStats.valid}</p>
              <Button variant="link" onClick={() => router.push('/')}>Return to Dashboard</Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {previewData.length === 0 ? (
             <Button className="w-full" onClick={handlePreview} disabled={!file || isProcessing}>
               {isProcessing ? <Loader2 className="animate-spin" /> : 'Preview Data'}
             </Button>
          ) : (
             <Button className="w-full" onClick={handleImport} disabled={isProcessing}>
               {isProcessing ? <Loader2 className="animate-spin" /> : 'Import Data'}
             </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
