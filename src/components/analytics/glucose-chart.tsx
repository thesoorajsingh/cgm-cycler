'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCycle } from '@/hooks/use-cycle';

export function GlucoseChart() {
  const { activeCycle } = useCycle();

  // Query all entries for the active cycle
  const data = useLiveQuery(async () => {
    if (!activeCycle) return [];

    // Fetch all entries for this cycle
    const entries = await db.entries
      .where('cycleId')
      .equals(activeCycle.id)
      .sortBy('timestamp');

    // Transform for Recharts
    // We want a unified timeline.
    // BG entries provide the line. Meal entries provide the dots.

    // We can map them into a single array, but Recharts Line expects numeric keys.
    // Let's create an array where each point has 'timestamp', 'glucose', 'meal'.

    return entries.map(e => ({
      timestamp: e.timestamp,
      // Format time for axis
      timeLabel: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      glucose: e.type === 'bg' ? (e.content as number) : null,
      meal: e.type === 'meal' ? (e.content as string) : null
    }));
  }, [activeCycle?.id]);

  if (!activeCycle || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Glucose Trends</CardTitle></CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Filter out just meals if we want a continuous line for glucose?
  // If we have mixed data, Recharts handles nulls in Line by breaking it or connecting.
  // connectNulls={true} connects them.
  // But wait, if we have a meal entry at 12:00 (null glucose) and BG at 11:00 and 13:00,
  // we want the line 11:00 -> 13:00 to pass "behind" or "through" 12:00?
  // Actually, standard practice: filter BG data for the Line, and render Meals as Custom ReferenceDots or a Scatter plot on top.
  // ComposedChart is best for this.
  // But simpler: ReferenceDot requires specific coordinates.

  // Let's stick to LineChart. We will feed it only glucose points for the line.
  // And we will add ReferenceLines or ReferenceDots for meals?
  // ReferenceDot needs x and y. Meal doesn't have a Y (glucose) value unless we interpolate or pin it to a fixed height.
  // Let's pin meals to the bottom or top, or average.

  // Alternative: "Event Overlays: Overlay meal icons on the BG chart"
  // Let's use ComposedChart if we can, or just customized dot in LineChart?
  // If we mix the data array, we can have points with { glucose: null, meal: "Lunch" }.
  // If we use `connectNulls`, the line ignores the meal point.
  // But we want to render a dot there.

  // Strategy:
  // 1. Line draws `glucose`.
  // 2. We render a specialized dot for points where `meal` is present.
  // But wait, if `glucose` is null, Line won't render a dot there normally.

  // Let's separate the data:
  // glucoseData = data.filter(d => d.glucose !== null)
  // mealData = data.filter(d => d.meal !== null)

  const glucoseData = data.filter(d => d.glucose !== null);
  const mealData = data.filter(d => d.meal !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Glucose Trends</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={glucoseData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis domain={[40, 200]} /> {/* Standard CGM range often 40-400 but focus on 70-180 */}
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Line
              type="monotone"
              dataKey="glucose"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />

            {/* Render Meals as ReferenceLines or Dots.
                Since we don't have Y for meals, we can put them at a fixed Y (e.g. 50)
                or try to find closest Glucose value? Fixed is safer.
            */}
            {mealData.map((meal, idx) => (
              <ReferenceDot
                key={idx}
                x={meal.timestamp}
                y={60} // Arbitrary Y near bottom
                r={6}
                fill="#f59e0b"
                stroke="none"
                ifOverflow="extendDomain"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 text-xs mt-2">
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-blue-600"></div>
             <span>Glucose</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-amber-500"></div>
             <span>Meal</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
