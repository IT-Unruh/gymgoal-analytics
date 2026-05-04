import { Link } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { useFrequency, useVolume, usePredictive, useProgression, useSettings } from '../api/hooks';
import { CardSkeleton, ChartSkeleton } from '../components/ChartSkeleton';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { SEVERITY_COLORS, TREND_COLORS } from '../lib/colors';
import { formatDate, formatKg, formatPct, formatVolume } from '../lib/format';

export function OverviewPage() {
  const { data: freq, isLoading: freqLoading } = useFrequency();
  const { data: vol } = useVolume();
  const { data: prog, isLoading: progLoading } = useProgression();
  const { data: pred } = usePredictive();
  useSettings();

  const hasData = freq && freq.total_sessions > 0;

  if (!hasData && !freqLoading) {
    return (
      <div>
        <PageHeader title="Übersicht" />
        <div className="p-12 text-center">
          <p className="text-4xl mb-4">💪</p>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">Noch keine Daten</h2>
          <p className="text-gray-400 mb-6">Importiere deine GymGoal Pro Exportdatei um zu starten.</p>
          <Link to="/import" className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
            Zur Import-Seite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Übersicht" subtitle={freq ? `${formatDate(freq.calendar_heatmap[0]?.date ?? '')} – heute` : ''} />
      <div className="p-6 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {freqLoading ? (
            [...Array(4)].map((_, i) => <CardSkeleton key={i} />)
          ) : freq ? (
            <>
              <KpiCard label="Trainingstage" value={freq.total_sessions} color="#3b82f6" />
              <KpiCard label="Gesamtvolumen" value={vol ? formatVolume(vol.total_volume_kg) : '…'} color="#22c55e" />
              <KpiCard label="Gesamte Sätze" value={vol?.total_sets ?? '…'} color="#f97316" />
              <KpiCard label="Aktuelle Streak" value={`${freq.current_streak} Tage`} sub={`Adherenz ${formatPct(freq.adherence_score)}`} color="#a855f7" />
            </>
          ) : null}
        </div>

        {/* This week vs last week */}
        {freq && freq.sessions_per_week.length >= 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Diese Woche vs. letzte Woche</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {['Diese Woche', 'Letzte Woche'].map((label, i) => {
                const w = freq.sessions_per_week[freq.sessions_per_week.length - 1 - i];
                return w ? (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{label} ({w.week.split('/')[1]})</p>
                    <p className="text-xl font-bold text-gray-100">{w.count} <span className="text-sm font-normal text-gray-400">Sessions</span></p>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Warnings */}
        {pred && pred.warnings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">⚡ Empfehlungen</h3>
            {pred.warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex gap-3 bg-gray-900 border border-gray-800 rounded-lg p-3" style={{ borderLeftColor: SEVERITY_COLORS[w.severity], borderLeftWidth: 3 }}>
                <div>
                  <p className="text-sm text-gray-200">{w.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">💡 {w.recommendation}</p>
                </div>
              </div>
            ))}
            {pred.warnings.length > 3 && (
              <Link to="/predictive" className="text-xs text-blue-400 hover:text-blue-300">+ {pred.warnings.length - 3} weitere anzeigen →</Link>
            )}
          </div>
        )}

        {/* Top 3 lift sparklines */}
        {progLoading ? (
          <div className="grid grid-cols-3 gap-4"><ChartSkeleton height={100} /><ChartSkeleton height={100} /><ChartSkeleton height={100} /></div>
        ) : prog && prog.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Lifts — e1RM Verlauf</h3>
            <div className="grid grid-cols-3 gap-4">
              {prog.slice(0, 3).map((ex) => (
                <div key={ex.exercise_id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 truncate mb-1">{ex.exercise_name}</p>
                  <p className="text-lg font-bold" style={{ color: TREND_COLORS[ex.trend] }}>
                    {ex.data_points.length > 0 ? formatKg(ex.data_points[ex.data_points.length - 1].e1rm) : '—'}
                  </p>
                  <ResponsiveContainer width="100%" height={50}>
                    <LineChart data={ex.data_points}>
                      <Line type="monotone" dataKey="e1rm" stroke={TREND_COLORS[ex.trend]} dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Calendar heatmap (simple) */}
        {freq && freq.calendar_heatmap.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Trainingskalender</h3>
            <div className="flex flex-wrap gap-1">
              {freq.calendar_heatmap.slice(-52 * 7).map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.session_count} Session(s)`}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: day.session_count === 0 ? '#1f2937' : day.session_count === 1 ? '#1d4ed8' : day.session_count >= 2 ? '#3b82f6' : '#93c5fd' }}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#1f2937' }} /> 0</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#1d4ed8' }} /> 1</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#3b82f6' }} /> 2+</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
