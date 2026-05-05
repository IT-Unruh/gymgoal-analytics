import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useProgression } from '../api/hooks';
import { useDateRange } from '../contexts/DateRangeContext';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { TREND_COLORS } from '../lib/colors';
import { formatDate, formatKg, formatNumber } from '../lib/format';
import type { ExerciseTrend } from '../types';

// Parses pandas Period("W") string "2024-01-01/2024-01-07"
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


function TrendBadge({ trend, is_plateau }: Pick<ExerciseTrend, 'trend' | 'is_plateau'>) {
  if (is_plateau) return <span className="text-xs text-yellow-400 font-medium">⚠ Plateau</span>;
  const map = { increasing: { label: '↑ Steigt', color: TREND_COLORS.increasing }, flat: { label: '→ Stabil', color: TREND_COLORS.flat }, decreasing: { label: '↓ Fällt', color: TREND_COLORS.decreasing } };
  const { label, color } = map[trend];
  return <span className="text-xs font-medium" style={{ color }}>{label}</span>;
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2.5 flex-1 min-w-0">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold text-gray-100 mt-0.5 truncate">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function E1rmTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; e1rm: number; max_weight_kg: number; sets: number; total_reps: number }; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{formatDate(d.date)}</p>
      <p className="text-blue-400 font-semibold">e1RM: {formatKg(d.e1rm)}</p>
      <p className="text-gray-300">Max: {formatKg(d.max_weight_kg)}</p>
      <p className="text-gray-400">{d.sets} Sätze · {d.total_reps} Wdh.</p>
    </div>
  );
}

function SetsTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { week: string; sets: number }; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const { week, sets } = payload[0].payload;
  const { kw, startLabel, endLabel } = parsePeriod(week);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-200">KW {kw}</p>
      <p className="text-gray-400">{startLabel} – {endLabel}</p>
      <p className="text-green-400 font-medium mt-1">{sets} {sets === 1 ? 'Satz' : 'Sätze'}</p>
    </div>
  );
}

function WeightTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; max_weight_kg: number; avg_weight_kg: number; sets: number }; value?: number; name?: string }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{formatDate(d.date)}</p>
      <p className="text-orange-400 font-semibold">Max: {formatKg(d.max_weight_kg)}</p>
      <p className="text-gray-400">Ø: {formatKg(d.avg_weight_kg)}</p>
      <p className="text-gray-500 mt-0.5">{d.sets} Sätze</p>
    </div>
  );
}

function ExerciseDetail({ ex }: { ex: ExerciseTrend }) {
  const lastPoint = ex.data_points[ex.data_points.length - 1];
  const avgSetsPerSession = ex.total_sets > 0 && ex.data_points.length > 0
    ? ex.total_sets / ex.data_points.length
    : 0;

  // Average sets per week for reference line
  const avgWeeklySets = ex.sets_per_week.length > 0
    ? ex.sets_per_week.reduce((s, w) => s + w.sets, 0) / ex.sets_per_week.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-100 text-base">{ex.exercise_name}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <TrendBadge trend={ex.trend} is_plateau={ex.is_plateau} />
            <span style={{ color: ex.slope_kg_per_week >= 0 ? TREND_COLORS.increasing : TREND_COLORS.decreasing }}>
              {ex.slope_kg_per_week >= 0 ? '+' : ''}{formatNumber(ex.slope_kg_per_week, 2)} kg/Woche
            </span>
            <span>R² = {formatNumber(ex.r_squared)}</span>
            <span>p = {ex.p_value.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2">
        <StatBox label="Gesamt Sätze" value={String(ex.total_sets)} sub={`Ø ${formatNumber(avgSetsPerSession, 1)} pro Einheit`} />
        <StatBox label="Ø Sätze / Woche" value={formatNumber(ex.avg_sets_per_week, 1)} sub="über gesamten Zeitraum" />
        <StatBox label="Max Gewicht" value={formatKg(ex.max_weight_kg)} sub="bestes Set" />
        <StatBox label="Akt. e1RM" value={lastPoint ? formatKg(lastPoint.e1rm) : '—'} sub="letztes Training" />
      </div>

      {/* e1RM Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">e1RM Verlauf (geschätztes 1-Rep-Max)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={ex.data_points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(0, 7)} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${v.toFixed(0)}`} width={36} />
            <Tooltip content={<E1rmTooltip />} />
            <Line
              type="monotone" dataKey="e1rm" stroke="#3b82f6"
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              name="e1RM" strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-gray-600 mt-1">
          e1RM = Gewicht × (1 + Wiederholungen ÷ 30) — Epley-Formel
        </p>
      </div>

      {/* Sätze pro Woche Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sätze pro Woche</p>
          <span className="text-xs text-gray-500">Ø {formatNumber(avgWeeklySets, 1)} Sätze/Woche</span>
        </div>
        {ex.sets_per_week.length === 0 ? (
          <p className="text-xs text-gray-600 py-4 text-center">Keine Daten</p>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={ex.sets_per_week} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: '#6b7280' }}
                tickFormatter={(v) => `KW ${parsePeriod(v).kw}`}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={24} />
              <Tooltip content={<SetsTooltip />} cursor={{ fill: '#ffffff0a' }} />
              <ReferenceLine y={avgWeeklySets} stroke="#6b7280" strokeDasharray="4 2" />
              <Bar dataKey="sets" fill="#22c55e" radius={[3, 3, 0, 0]} name="Sätze" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gewicht pro Einheit Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gewicht pro Trainingseinheit</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={ex.data_points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(0, 7)} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${v.toFixed(0)}`} width={36} />
            <Tooltip content={<WeightTooltip />} />
            <Line type="monotone" dataKey="max_weight_kg" stroke="#f97316" dot={false} strokeWidth={2} name="Max" />
            <Line type="monotone" dataKey="avg_weight_kg" stroke="#f97316" dot={false} strokeWidth={1} strokeDasharray="5 3" name="Ø" opacity={0.6} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-orange-400" /> Max-Gewicht</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-px bg-orange-400 opacity-60" style={{ borderTop: '1px dashed' }} /> Ø-Gewicht</span>
        </div>
      </div>
    </div>
  );
}

export function ProgressionPage() {
  const { from, to } = useDateRange();
  const { data, isLoading } = useProgression(from || undefined, to || undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isLoading) return <div className="p-6 space-y-4"><ChartSkeleton /><ChartSkeleton /></div>;
  if (!data?.length) return <><PageHeader title="Progression" /><EmptyState message="Noch keine Daten" /></>;

  const selectedExercise = data.find((ex) => ex.exercise_id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Progression & Trends"
        subtitle={`${data.length} Übungen · Lineare Regression auf e1RM`}
      />
      <div className="p-6 flex gap-6 items-start">

        {/* Exercise list */}
        <div className="w-72 shrink-0 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-800 bg-gray-900/80">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Übungen ({data.length})</p>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            {data.map((ex) => (
              <button
                key={ex.exercise_id}
                onClick={() => setSelectedId(ex.exercise_id === selectedId ? null : ex.exercise_id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-800/60 transition-colors ${
                  selectedId === ex.exercise_id ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-200 truncate font-medium">{ex.exercise_name}</p>
                  <TrendBadge trend={ex.trend} is_plateau={ex.is_plateau} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                  <span>
                    <span style={{ color: ex.slope_kg_per_week >= 0 ? TREND_COLORS.increasing : TREND_COLORS.decreasing }}>
                      {ex.slope_kg_per_week >= 0 ? '+' : ''}{formatNumber(ex.slope_kg_per_week, 2)} kg/W
                    </span>
                  </span>
                  <span>{formatNumber(ex.avg_sets_per_week, 1)} S/Wo</span>
                  <span>Max {formatKg(ex.max_weight_kg)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {selectedExercise ? (
            <ExerciseDetail ex={selectedExercise} />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg flex flex-col items-center justify-center h-64 gap-2">
              <p className="text-gray-400 text-sm">Übung aus der Liste auswählen</p>
              <p className="text-gray-600 text-xs">Dann siehst du e1RM-Verlauf, Sätze/Woche und Gewichtsverlauf</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
