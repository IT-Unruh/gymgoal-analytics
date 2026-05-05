import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useVolume } from '../api/hooks';
import { useDateRange } from '../contexts/DateRangeContext';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { MUSCLE_LABELS, STATUS_COLORS } from '../lib/colors';
import { formatVolume } from '../lib/format';

export function VolumePage() {
  const { from, to } = useDateRange();
  const { data, isLoading } = useVolume(from || undefined, to || undefined);

  if (isLoading) return <div className="p-6 space-y-4"><ChartSkeleton /><ChartSkeleton height={300} /></div>;
  if (!data || data.total_sets === 0) {
    return <><PageHeader title="Volumen & Tonnage" /><EmptyState message="Noch keine Trainingsdaten" /></>;
  }

  const mgData = data.muscle_group_volumes.map((mg) => ({
    name: MUSCLE_LABELS[mg.muscle_group] ?? mg.muscle_group,
    sets_per_week: mg.sets_per_week,
    status: mg.status,
    fill: STATUS_COLORS[mg.status],
  }));

  const weeklyData = data.volume_per_week.slice(-16);

  return (
    <div>
      <PageHeader title="Volumen & Tonnage" subtitle="Gesamtvolumen und Muskelgruppen-Analyse" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Gesamtvolumen" value={formatVolume(data.total_volume_kg)} color="#3b82f6" />
          <KpiCard label="Gesamt Sätze" value={data.total_sets} color="#22c55e" />
          {data.volume_per_week.length > 0 && (
            <KpiCard
              label="Ø Vol / Woche"
              value={formatVolume(data.total_volume_kg / data.volume_per_week.length)}
              color="#f97316"
            />
          )}
          <KpiCard
            label="Übungskategorien"
            value={Object.keys(data.volume_by_category).length}
            color="#a855f7"
          />
        </div>

        {/* Schoenfeld muscle group chart — hero element */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-1">Sätze pro Woche nach Muskelgruppe</h3>
          <p className="text-xs text-gray-500 mb-4">
            Grün = 10–22 Sätze/Woche (Hypertrophie-Bereich nach Schoenfeld)
          </p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={mgData} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9ca3af' }} width={130} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12, color: '#f9fafb' }}
                itemStyle={{ color: '#f9fafb' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v) => [`${(v as number).toFixed(1)} Sätze/W`, '']}
              />
              {/* Reference lines for 10 and 22 */}
              <Bar dataKey="sets_per_week" radius={[0, 3, 3, 0]} name="Sätze/Woche">
                {mgData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLORS.undertrained }} /> Zu wenig (&lt;10)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLORS.optimal }} /> Optimal (10–22)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: STATUS_COLORS.overtrained }} /> Zu viel (&gt;22)</span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Wöchentliches Volumen (letzte 16 Wochen)</h3>
          {weeklyData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.split('/')[1] ?? v} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                  formatter={(v) => [formatVolume(v as number), 'Volumen']}
                />
                <Bar dataKey="volume_kg" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Volumen" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Nach Kategorie</h3>
            <div className="space-y-2">
              {Object.entries(data.volume_by_category).sort(([, a], [, b]) => b - a).map(([cat, vol]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-400 capitalize">{cat}</span>
                  <span className="text-gray-200 font-medium">{formatVolume(vol)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Nach Equipment</h3>
            <div className="space-y-2">
              {Object.entries(data.volume_by_equipment).sort(([, a], [, b]) => b - a).map(([eq, vol]) => (
                <div key={eq} className="flex justify-between text-sm">
                  <span className="text-gray-400 capitalize">{eq}</span>
                  <span className="text-gray-200 font-medium">{formatVolume(vol)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
