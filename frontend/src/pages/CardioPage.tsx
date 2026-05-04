import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCardio } from '../api/hooks';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatDuration, formatNumber } from '../lib/format';

export function CardioPage() {
  const { data, isLoading } = useCardio();

  if (isLoading) return <div className="p-6"><ChartSkeleton /></div>;
  if (!data?.has_data) {
    return (
      <>
        <PageHeader title="Cardio" />
        <EmptyState message="Keine Cardio-Daten vorhanden" hint="Cardio-Übungen aus GymGoal werden automatisch erkannt" />
      </>
    );
  }

  return (
    <div>
      <PageHeader title="Cardio" subtitle="Ausdauertraining & Herzfrequenz" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Gesamt Dauer" value={formatDuration(data.total_duration_hours * 60)} color="#14b8a6" />
          <KpiCard label="Gesamt Distanz" value={`${formatNumber(data.total_distance_km)} km`} color="#3b82f6" />
          <KpiCard label="Gesamt Kalorien" value={`${Math.round(data.total_calories)} kcal`} color="#f97316" />
        </div>

        {data.weekly_duration.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Wöchentliche Dauer (min)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.weekly_duration}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.split('/')[1] ?? v} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }} formatter={(v) => [formatDuration(v as number), 'Dauer']} />
                <Bar dataKey="duration_min" fill="#14b8a6" radius={[3, 3, 0, 0]} name="Dauer (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Übung</th>
                <th className="px-4 py-3">Dauer</th>
                <th className="px-4 py-3">Distanz</th>
                <th className="px-4 py-3">Ø HF</th>
                <th className="px-4 py-3">Pace</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s, i) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-2.5 text-gray-400">{formatDate(s.date)}</td>
                  <td className="px-4 py-2.5 text-gray-200">{s.exercise_name}</td>
                  <td className="px-4 py-2.5">{formatDuration(s.duration_minutes)}</td>
                  <td className="px-4 py-2.5">{s.distance_km != null ? `${formatNumber(s.distance_km)} km` : '—'}</td>
                  <td className="px-4 py-2.5">{s.avg_hr != null ? `${s.avg_hr} bpm` : '—'}</td>
                  <td className="px-4 py-2.5">{s.pace_min_per_km != null ? `${formatNumber(s.pace_min_per_km)} min/km` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
