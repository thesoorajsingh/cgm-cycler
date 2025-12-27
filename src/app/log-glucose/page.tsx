'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCycle } from '@/hooks/use-cycle';
import { addEntry } from '@/lib/entries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LogGlucosePage() {
  const router = useRouter();
  const { activeCycle, isCycleActive } = useCycle();
  const [value, setValue] = useState('');
  const [timestamp, setTimestamp] = useState<string>(
    new Date().toISOString().slice(0, 16) // Format for datetime-local
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!activeCycle || !value) return;

    setIsSaving(true);
    try {
      const time = new Date(timestamp).getTime();
      const bgValue = parseFloat(value);

      if (isNaN(bgValue)) {
        alert('Please enter a valid number');
        return;
      }

      // Save to Dexie
      await addEntry(
        activeCycle.id,
        'bg',
        bgValue,
        { unit: 'mg/dL' }, // Metadata
        time
      );

      // Navigate back
      router.push('/');
    } catch (error) {
      console.error('Failed to save entry:', error);
      alert('Failed to save glucose reading.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isCycleActive) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No Active Cycle</h2>
        <p className="mt-2 text-muted-foreground">Please start a cycle from the dashboard to log data.</p>
        <Button className="mt-4" onClick={() => router.push('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-6">Log Glucose</h1>

      <Card>
        <CardHeader>
          <CardTitle>Reading Details</CardTitle>
          <CardDescription>Enter your blood glucose level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timestamp">Time</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Glucose (mg/dL)</Label>
            <Input
              id="value"
              type="number"
              placeholder="e.g. 110"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving || !value}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Reading'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
