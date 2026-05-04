import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { usePeriodization } from '../api/hooks';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PHASE_COLORS } from '../lib/colors';
import { formatVolume } from '../lib/format';

const PHASE_LABELS: Record<string, string> = {
  accumulation: 'Akkumulation',
  intensification: 'Intensivierung',
  deload: 'Deload',
  mixed: 'Gemischt',
};

export function PeriodizationPage() {
  const { data, isLoading } = usePeriodization();

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
              {data.deload_weeks.map((w) => (
                <span key={w} className="bg-purple-900/40 text-purple-200 text-xs px-2 py-1 rounded">{w}</span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Volumen nach Phase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.week_blocks.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.split('/')[1] ?? v} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                formatter={(v, _n, p) => [formatVolume(v as number), PHASE_LABELS[(p as { payload: { phase: string } }).payload.phase] ?? '']}
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
                labelFormatter={(_l, p) => (p as unknown as { payload: { week: string } }[])[0]?.payload?.week ?? ''}
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
