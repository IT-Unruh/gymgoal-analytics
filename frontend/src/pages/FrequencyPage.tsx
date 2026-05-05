import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

import { useFrequency } from '../api/hooks';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { formatNumber, formatPct } from '../lib/format';

/** Returns Monday and Sunday of an ISO week given "YYYY/WW". */
function isoWeekBounds(yearWeek: string): { monday: Date; sunday: Date } {
  const [y, w] = yearWeek.split('/').map(Number);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(y, 0, 4);
  const jan4Dow = (jan4.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - jan4Dow + (w - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function WeekTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { week: string }; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const week: string = payload[0].payload.week;
  const count: number = payload[0].value ?? 0;
  const kw = week.split('/')[1];
  const { monday, sunday } = isoWeekBounds(week);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-200 mb-0.5">KW {kw}</p>
      <p className="text-gray-400">{fmtShort(monday)} – {fmtShort(sunday)}</p>
      <p className="text-blue-400 font-medium mt-1">{count} {count === 1 ? 'Session' : 'Sessions'}</p>
    </div>
  );
}

export function FrequencyPage() {
  const { data, isLoading } = useFrequency();

  if (isLoading) return <div className="p-6 space-y-4"><ChartSkeleton /><ChartSkeleton /></div>;
  if (!data || data.total_sessions === 0) {
    return <><PageHeader title="Trainingsfrequenz" /><EmptyState message="Noch keine Trainingsdaten" hint="Importiere zuerst eine GymGoal .tab Datei" /></>;
  }

  const dowData = Object.entries(data.day_of_week_distribution).map(([day, count]) => ({ day: day.slice(0, 2), count }));

  return (
    <div>
      <PageHeader title="Trainingsfrequenz" subtitle="Konsistenz & Adherenz" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Gesamt Sessions" value={data.total_sessions} color="#3b82f6" />
          <KpiCard label="Aktuelle Streak" value={`${data.current_streak} T`} color="#22c55e" />
          <KpiCard label="Längste Streak" value={`${data.longest_streak} T`} color="#f97316" />
          <KpiCard label="Adherenz" value={formatPct(data.adherence_score)} sub={`${formatNumber(data.rolling_4w_avg)} ∅/Woche`} color="#a855f7" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Sessions pro Woche</h3>
          {data.sessions_per_week.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.sessions_per_week} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={(v: string) => `KW ${v.split('/')[1] ?? v}`}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={24} />
                <Tooltip content={<WeekTooltip />} cursor={{ fill: '#ffffff0a' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Verteilung nach Wochentag</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Sessions">
                {dowData.map((_, i) => <Cell key={i} fill={i >= 5 ? '#f97316' : '#3b82f6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 mb-1">Längste Pause</p>
            <p className="text-2xl font-bold text-yellow-400">{data.longest_gap_days} Tage</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 mb-1">Ø Sessions / Woche (4W)</p>
            <p className="text-2xl font-bold text-blue-400">{formatNumber(data.rolling_4w_avg)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
