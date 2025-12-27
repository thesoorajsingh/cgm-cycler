'use client';

import { useCycle } from '@/hooks/use-cycle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { Utensils, Activity } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { activeCycle, isCycleActive, isCycleExpired, daysRemaining, startNewCycle, closeCycle } = useCycle();

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 dark:bg-zinc-900 p-4">
      <header className="w-full max-w-md py-4 mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">HealthPWA</h1>
        {activeCycle && (
           <Button variant="ghost" size="sm" onClick={closeCycle} className="text-red-500">
             End Cycle
           </Button>
        )}
      </header>

      <main className="w-full max-w-md space-y-6">

        {/* Cycle Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Current Cycle</CardTitle>
            <CardDescription>
              {activeCycle
                ? `Started ${new Date(activeCycle.startDate).toLocaleDateString()}`
                : "No active cycle"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCycleActive ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                   <span>Days Remaining</span>
                   <span className="font-bold">{daysRemaining} / 14</span>
                </div>
                <Progress value={(14 - daysRemaining) / 14 * 100} />
              </div>
            ) : (
              <div className="text-center py-4">
                 {isCycleExpired ? (
                   <p className="text-red-500 mb-4">Cycle Expired. Please start a new one.</p>
                 ) : (
                   <p className="text-muted-foreground mb-4">Start a 14-day cycle to track data.</p>
                 )}
                 <Button onClick={startNewCycle} className="w-full">
                   Start New Cycle
                 </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            disabled={!isCycleActive}
            onClick={() => router.push('/add-meal')}
          >
            <Utensils className="h-6 w-6" />
            Log Meal
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            disabled={!isCycleActive}
            // Future placeholder for Glucose
            onClick={() => alert('Glucose logging coming soon')}
          >
            <Activity className="h-6 w-6" />
            Log Glucose
          </Button>
        </div>

      </main>
    </div>
  );
}
