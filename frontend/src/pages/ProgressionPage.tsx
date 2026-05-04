import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useProgression } from '../api/hooks';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TREND_COLORS } from '../lib/colors';
import { formatDate, formatKg, formatNumber } from '../lib/format';

export function ProgressionPage() {
  const { data, isLoading } = useProgression();
  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading) return <div className="p-6"><ChartSkeleton /></div>;
  if (!data?.length) return <><PageHeader title="Progression" /><EmptyState message="Noch keine Daten" /></>;

  const selectedExercise = selected !== null ? data[selected] : null;

  return (
    <div>
      <PageHeader title="Progression & Trends" subtitle="Lineare Regression auf geschätztes 1RM" />
      <div className="p-6 grid grid-cols-5 gap-6">
        {/* Table */}
        <div className="col-span-2 overflow-y-auto max-h-[700px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-950">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="pb-2 pr-3">Übung</th>
                <th className="pb-2 pr-3">Trend</th>
                <th className="pb-2">∆/Woche</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ex, i) => (
                <tr
                  key={ex.exercise_id}
                  onClick={() => setSelected(i === selected ? null : i)}
                  className={`border-b border-gray-800/50 cursor-pointer transition-colors ${i === selected ? 'bg-blue-900/20' : 'hover:bg-gray-900'}`}
                >
                  <td className="py-2.5 pr-3">
                    <p className="text-gray-200 truncate max-w-[160px]">{ex.exercise_name}</p>
                    {ex.is_plateau && <span className="text-xs text-yellow-500">⚠ Plateau</span>}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs font-medium" style={{ color: TREND_COLORS[ex.trend] }}>
                      {ex.trend === 'increasing' ? '↑ Steigt' : ex.trend === 'decreasing' ? '↓ Fällt' : '→ Stabil'}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs" style={{ color: ex.slope_kg_per_week >= 0 ? '#22c55e' : '#ef4444' }}>
                    {ex.slope_kg_per_week >= 0 ? '+' : ''}{formatNumber(ex.slope_kg_per_week, 2)} kg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="col-span-3">
          {selectedExercise ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-200 mb-1">{selectedExercise.exercise_name}</h3>
              <div className="flex gap-4 text-xs text-gray-500 mb-4">
                <span>R² = {formatNumber(selectedExercise.r_squared)}</span>
                <span>p = {selectedExercise.p_value.toFixed(4)}</span>
                <span style={{ color: TREND_COLORS[selectedExercise.trend] }}>
                  {selectedExercise.slope_kg_per_week >= 0 ? '+' : ''}{formatNumber(selectedExercise.slope_kg_per_week, 2)} kg/Woche
                </span>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={selectedExercise.data_points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(0, 7)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                    formatter={(v) => [formatKg(v as number), 'e1RM']}
                    labelFormatter={(l) => formatDate(l)}
                  />
                  <Line type="monotone" dataKey="e1rm" stroke="#3b82f6" dot={{ r: 3, fill: '#3b82f6' }} name="e1RM" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center h-48">
              <p className="text-gray-500 text-sm">Übung links auswählen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
