'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCycle } from '@/hooks/use-cycle';
import { analyzeMeal, type MealNutrition } from '@/lib/gemini';
import { schedulePostMealReminder } from '@/lib/notifications';
import { addEntry } from '@/lib/entries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function AddMealPage() {
  const router = useRouter();
  const { activeCycle, isCycleActive } = useCycle();
  const [description, setDescription] = useState('');
  const [timestamp, setTimestamp] = useState<string>(
    new Date().toISOString().slice(0, 16) // Format for datetime-local
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealNutrition | null>(null);

  const handleAnalyze = async () => {
    if (!description.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeMeal(description);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Fallback manual entry could be shown here, for now just alert
      alert('Failed to analyze meal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!activeCycle || !analysisResult) return;

    try {
      const time = new Date(timestamp).getTime();

      // Save to Dexie
      await addEntry(
        activeCycle.id,
        'meal',
        analysisResult.name,
        {
          calories: analysisResult.calories,
          carbs: analysisResult.carbs,
          protein: analysisResult.protein,
          fat: analysisResult.fat,
          originalDescription: description
        },
        time
      );

      // Schedule Reminder
      await schedulePostMealReminder(time);

      // Navigate back (or to dashboard)
      router.push('/');
    } catch (error) {
      console.error('Failed to save entry:', error);
      alert('Failed to save meal.');
    }
  };

  if (!isCycleActive) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No Active Cycle</h2>
        <p className="mt-2 text-muted-foreground">Please start a cycle from the dashboard to log meals.</p>
        <Button className="mt-4" onClick={() => router.push('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-6">Log Meal</h1>

      <Card>
        <CardHeader>
          <CardTitle>Meal Details</CardTitle>
          <CardDescription>Describe your meal naturally. AI will estimate macros.</CardDescription>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="e.g. Grilled chicken breast with roasted veggies and quinoa"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter>
          {!analysisResult && (
            <Button
              className="w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !description.trim()}
            >
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Meal'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {analysisResult && (
        <Card className="animate-in fade-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle>Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
             <div className="flex justify-between font-medium text-lg">
                <span>{analysisResult.name}</span>
                <span>{analysisResult.calories} kcal</span>
             </div>
             <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div className="bg-slate-100 p-2 rounded">
                  <div className="font-bold text-slate-700">Carbs</div>
                  <div>{analysisResult.carbs}g</div>
                </div>
                <div className="bg-slate-100 p-2 rounded">
                  <div className="font-bold text-slate-700">Protein</div>
                  <div>{analysisResult.protein}g</div>
                </div>
                <div className="bg-slate-100 p-2 rounded">
                  <div className="font-bold text-slate-700">Fat</div>
                  <div>{analysisResult.fat}g</div>
                </div>
             </div>
             <div className="text-xs text-muted-foreground mt-2 text-center">
               Confidence: <span className="uppercase">{analysisResult.confidence}</span>
             </div>
          </CardContent>
          <CardFooter className="flex gap-2">
             <Button variant="outline" className="flex-1" onClick={() => setAnalysisResult(null)}>Edit</Button>
             <Button className="flex-1" onClick={handleSave}>Save & Set Reminder</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
