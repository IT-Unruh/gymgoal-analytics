import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { usePeriodization } from '../api/hooks';
import { useDateRange } from '../contexts/DateRangeContext';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PHASE_COLORS } from '../lib/colors';
import { formatVolume } from '../lib/format';

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

const PHASE_LABELS: Record<string, string> = {
  accumulation: 'Akkumulation',
  intensification: 'Intensivierung',
  deload: 'Deload',
  mixed: 'Gemischt',
};

export function PeriodizationPage() {
  const { from, to } = useDateRange();
  const { data, isLoading } = usePeriodization(from || undefined, to || undefined);

  if (isLoading) return <div className="p-6 space-y-4"><ChartSkeleton /><ChartSkeleton /></div>;
  if (!data?.week_blocks.length) return <><PageHeader title="Periodisierung" /><EmptyState message="Noch keine Daten" /></>;

  return (
    <div>
      <PageHeader title="Periodisierung" subtitle="Trainingsphasen & Deload-Erkennung" />
      <div className="p-6 space-y-6">
        {data.deload_weeks.length > 0 && (
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
            <h3 className="text-purple-300 font-semibold text-sm mb-2">Erkannte Deload-Wochen</h3>
            <div className="flex flex-wrap gap-2">
              {data.deload_weeks.map((w) => {
                const { kw, startLabel, endLabel } = parsePeriod(w);
                return (
                  <span key={w} className="bg-purple-900/40 text-purple-200 text-xs px-2 py-1 rounded" title={`${startLabel} – ${endLabel}`}>
                    KW {kw}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Volumen nach Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.week_blocks.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `KW ${parsePeriod(v).kw}`} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12, color: '#f9fafb' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v, _n, p) => [formatVolume(v as number), PHASE_LABELS[(p as { payload: { phase: string } }).payload.phase] ?? '']}
                labelFormatter={(v) => { const { kw, startLabel, endLabel } = parsePeriod(v); return `KW ${kw} · ${startLabel} – ${endLabel}`; }}
              />
              <Bar dataKey="volume_kg" radius={[3, 3, 0, 0]} name="Volumen">
                {data.week_blocks.slice(-20).map((b, i) => (
                  <Cell key={i} fill={b.is_deload ? PHASE_COLORS.deload : PHASE_COLORS[b.phase] ?? '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-1">Volumen-Intensität Plot</h3>
          <p className="text-xs text-gray-500 mb-4">Jeder Punkt = eine Trainingswoche</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" dataKey="intensity_pct" name="Intensität %" tick={{ fontSize: 10, fill: '#6b7280' }} label={{ value: 'Intensität %', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 11 }} />
              <YAxis type="number" dataKey="volume_kg" name="Volumen" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                formatter={(v, name) => [name === 'volume_kg' ? formatVolume(v as number) : `${(v as number).toFixed(1)}%`, name === 'volume_kg' ? 'Volumen' : 'Intensität']}
                labelFormatter={(_l, p) => {
                  const week = (p as unknown as { payload: { week: string } }[])[0]?.payload?.week;
                  if (!week) return '';
                  const { kw, startLabel, endLabel } = parsePeriod(week);
                  return `KW ${kw} · ${startLabel} – ${endLabel}`;
                }}
              />
              <Scatter data={data.volume_intensity_plot} fill="#3b82f6">
                {data.volume_intensity_plot.map((p, i) => (
                  <Cell key={i} fill={PHASE_COLORS[p.phase] ?? '#6b7280'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {Object.entries(PHASE_LABELS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: PHASE_COLORS[k] }} />
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
