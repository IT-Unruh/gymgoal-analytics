import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCardio } from '../api/hooks';
import { useDateRange } from '../contexts/DateRangeContext';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatDuration, formatNumber } from '../lib/format';

function parsePeriod(period: string) {
  const [startStr, endStr] = period.split('/');
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date((endStr ?? startStr) + 'T00:00:00');
  const tmp = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const kw = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return { kw, startLabel: fmt(start), endLabel: fmt(end) };
}

function WeekTooltip({ active, payload, label, unit, formatter }: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  unit: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  const { kw, startLabel, endLabel } = parsePeriod(label);
  const val = payload[0].value ?? 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-200">KW {kw}</p>
      <p className="text-gray-400">{startLabel} – {endLabel}</p>
      <p className="text-teal-400 font-medium mt-1">{formatter(val)} {unit}</p>
    </div>
  );
}

function PaceTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; exercise_name: string; pace_min_per_km: number | null; distance_km: number | null; duration_minutes: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const paceStr = d.pace_min_per_km != null ? `${formatNumber(d.pace_min_per_km)} min/km` : '—';
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{formatDate(d.date)}</p>
      <p className="text-gray-200 font-medium">{d.exercise_name}</p>
      <p className="text-orange-400 font-semibold mt-1">Pace: {paceStr}</p>
      {d.distance_km != null && <p className="text-gray-400">{formatNumber(d.distance_km)} km</p>}
      <p className="text-gray-500">{formatDuration(d.duration_minutes)}</p>
    </div>
  );
}

export function CardioPage() {
  const { from, to } = useDateRange();
  const { data, isLoading } = useCardio(from || undefined, to || undefined);

  if (isLoading) return <div className="p-6"><ChartSkeleton /></div>;
  if (!data?.has_data) {
    return (
      <>
        <PageHeader title="Cardio" />
        <EmptyState message="Keine Cardio-Daten vorhanden" hint="Cardio-Übungen aus GymGoal werden automatisch erkannt" />
      </>
    );
  }

  const sessionsWithPace = data.sessions.filter((s) => s.pace_min_per_km != null);
  const sessionsWithDist = data.sessions.filter((s) => s.distance_km != null);

  return (
    <div>
      <PageHeader title="Cardio" subtitle="Ausdauertraining & Herzfrequenz" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Gesamt Dauer" value={formatDuration(data.total_duration_hours * 60)} color="#14b8a6" />
          <KpiCard label="Gesamt Distanz" value={`${formatNumber(data.total_distance_km)} km`} color="#3b82f6" />
          <KpiCard label="Gesamt Kalorien" value={`${Math.round(data.total_calories)} kcal`} color="#f97316" />
        </div>

        {/* Weekly duration */}
        {data.weekly_duration.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Wöchentliche Dauer (min)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.weekly_duration}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `KW ${parsePeriod(v).kw}`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip content={(props) => (
                  <WeekTooltip
                    active={props.active}
                    payload={props.payload as Array<{ value?: number }>}
                    label={props.label as string}
                    unit="min"
                    formatter={formatDuration}
                  />
                )} />
                <Bar dataKey="duration_min" fill="#14b8a6" radius={[3, 3, 0, 0]} name="Dauer (min)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekly distance */}
        {data.weekly_distance.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Wöchentliche Distanz (km)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.weekly_distance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `KW ${parsePeriod(v).kw}`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip content={(props) => (
                  <WeekTooltip
                    active={props.active}
                    payload={props.payload as Array<{ value?: number }>}
                    label={props.label as string}
                    unit="km"
                    formatter={(v) => formatNumber(v)}
                  />
                )} />
                <Bar dataKey="distance_km" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Distanz (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pace per workout */}
        {sessionsWithPace.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-1">Pace pro Workout (min/km)</h3>
            <p className="text-xs text-gray-500 mb-4">Niedrigere Werte = schneller</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={sessionsWithPace} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(0, 7)} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  reversed
                  tickFormatter={(v) => `${formatNumber(v)}'`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<PaceTooltip />} />
                <Line
                  type="monotone"
                  dataKey="pace_min_per_km"
                  stroke="#f97316"
                  dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  strokeWidth={2}
                  name="Pace"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distance per workout */}
        {sessionsWithDist.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Distanz pro Workout (km)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sessionsWithDist} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12, color: '#f9fafb' }}
                  itemStyle={{ color: '#f9fafb' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v) => [`${formatNumber(v as number)} km`, 'Distanz']}
                  labelFormatter={(l) => formatDate(l)}
                />
                <Bar dataKey="distance_km" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Distanz (km)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session table */}
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
