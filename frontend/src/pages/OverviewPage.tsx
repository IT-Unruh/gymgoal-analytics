import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { useFrequency, useVolume, usePredictive, useProgression, useSettings } from '../api/hooks';
import { CardSkeleton, ChartSkeleton } from '../components/ChartSkeleton';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { SEVERITY_COLORS, TREND_COLORS } from '../lib/colors';
import { formatDate, formatKg, formatPct, formatVolume } from '../lib/format';
import type { CalendarDay } from '../types';

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

  const acwr = pred?.acwr ?? null;
  const acwrColor = acwr === null ? '#6b7280' : acwr < 0.8 ? '#6b7280' : acwr < 1.3 ? '#22c55e' : acwr < 1.5 ? '#eab308' : '#ef4444';
  const acwrLabel = acwr === null ? '—' : acwr < 0.8 ? 'Unterbelastet' : acwr < 1.3 ? 'Optimal' : acwr < 1.5 ? 'Erhöhtes Risiko' : 'Kritisch';

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
              <KpiCard label="Trainingstage" value={freq.total_sessions} sub="Gesamt importiert" color="#3b82f6" />
              <KpiCard label="Gesamtvolumen" value={vol ? formatVolume(vol.total_volume_kg) : '…'} sub="Gehobene Last gesamt" color="#22c55e" />
              <KpiCard label="Gesamte Sätze" value={vol?.total_sets ?? '…'} sub="Alle Arbeitssätze" color="#f97316" />
              <KpiCard label="Aktuelle Streak" value={`${freq.current_streak} Tage`} sub={`Adherenz ${formatPct(freq.adherence_score)}`} color="#a855f7" />
            </>
          ) : null}
        </div>

        {/* ACWR / Belastungssteuerung */}
        {pred && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300">Belastungssteuerung</h3>
                <p className="text-xs text-gray-500 mt-0.5">Akut-Chronisches Belastungsverhältnis (ACWR)</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: acwrColor }}>
                  {acwr !== null ? acwr.toFixed(2) : '—'}
                </span>
                <p className="text-xs mt-0.5" style={{ color: acwrColor }}>{acwrLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Akute Last (7 Tage)</p>
                <p className="text-lg font-bold text-gray-100">{formatVolume(pred.acute_load)}</p>
                <p className="text-xs text-gray-500 mt-1">Trainingsvolumen der letzten Woche</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Chronische Last (28 Tage)</p>
                <p className="text-lg font-bold text-gray-100">{formatVolume(pred.chronic_load)}</p>
                <p className="text-xs text-gray-500 mt-1">Ø wöchentliches Volumen (4 Wochen)</p>
              </div>
            </div>

            {/* ACWR bar */}
            {acwr !== null && (
              <div className="mb-4">
                <div className="relative h-2 rounded-full bg-gray-700 overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div className="h-full bg-gray-600" style={{ width: '40%' }} />
                    <div className="h-full bg-green-600" style={{ width: '25%' }} />
                    <div className="h-full bg-yellow-500" style={{ width: '10%' }} />
                    <div className="h-full bg-red-600" style={{ width: '25%' }} />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-900 shadow"
                    style={{ left: `${Math.min(Math.max((acwr / 2) * 100, 2), 98)}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>0</span>
                  <span className="text-gray-400">0.8</span>
                  <span className="text-gray-400">1.3</span>
                  <span className="text-gray-400">1.5</span>
                  <span>2.0</span>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-800/60 rounded-lg p-3 space-y-1.5">
              <p className="text-gray-300 font-medium">Was ist ACWR?</p>
              <p>
                Das ACWR vergleicht deine <span className="text-blue-400">aktuelle Wochenbelastung</span> (letzte 7 Tage)
                mit deiner <span className="text-purple-400">durchschnittlichen Wochenbelastung</span> der letzten 28 Tage.
                Ein Wert nahe 1.0 bedeutet: du trainierst so viel wie gewöhnlich.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="text-gray-500">≤ 0.8 — Unterbelastet</span>
                <span className="text-green-400">0.8–1.3 — Optimale Zone</span>
                <span className="text-yellow-400">1.3–1.5 — Erhöhtes Risiko</span>
                <span className="text-red-400">&gt; 1.5 — Überlastung</span>
              </div>
            </div>
          </div>
        )}

        {/* This week vs last week */}
        {freq && freq.sessions_per_week.length >= 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Diese Woche vs. letzte Woche</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {['Diese Woche', 'Letzte Woche'].map((label, i) => {
                const w = freq.sessions_per_week[freq.sessions_per_week.length - 1 - i];
                return w ? (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">{label} (KW {w.week.split('/')[1]})</p>
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">⚡ Empfehlungen</h3>
              <span className="text-xs text-gray-500">Basierend auf deinen letzten 4 Wochen</span>
            </div>
            {pred.warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex gap-3 bg-gray-900 border border-gray-800 rounded-lg p-3" style={{ borderLeftColor: SEVERITY_COLORS[w.severity], borderLeftWidth: 3 }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: SEVERITY_COLORS[w.severity] + '22', color: SEVERITY_COLORS[w.severity] }}>
                      {w.severity === 'critical' ? 'Kritisch' : w.severity === 'warning' ? 'Warnung' : 'Info'}
                    </span>
                    <span className="text-xs text-gray-500">{w.metric}</span>
                  </div>
                  <p className="text-sm text-gray-200">{w.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">💡 {w.recommendation}</p>
                </div>
              </div>
            ))}
            {pred.warnings.length > 3 && (
              <Link to="/predictive" className="text-xs text-blue-400 hover:text-blue-300">+ {pred.warnings.length - 3} weitere auf der Prognose-Seite →</Link>
            )}
          </div>
        )}

        {/* Top 3 lift sparklines */}
        {progLoading ? (
          <div className="grid grid-cols-3 gap-4"><ChartSkeleton height={100} /><ChartSkeleton height={100} /><ChartSkeleton height={100} /></div>
        ) : prog && prog.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Top Lifts — e1RM Verlauf</h3>
              <Link to="/progression" className="text-xs text-blue-400 hover:text-blue-300">Alle anzeigen →</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {prog.slice(0, 3).map((ex) => {
                const last = ex.data_points[ex.data_points.length - 1];
                const first = ex.data_points[0];
                const delta = last && first ? last.e1rm - first.e1rm : 0;
                return (
                  <div key={ex.exercise_id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-400 truncate mb-0.5">{ex.exercise_name}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-bold" style={{ color: TREND_COLORS[ex.trend] }}>
                        {last ? formatKg(last.e1rm) : '—'}
                      </p>
                      {delta !== 0 && (
                        <span className="text-xs" style={{ color: TREND_COLORS[ex.trend] }}>
                          {delta > 0 ? '+' : ''}{formatKg(delta)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mb-1">geschätztes 1RM (e1RM)</p>
                    <ResponsiveContainer width="100%" height={50}>
                      <LineChart data={ex.data_points}>
                        <Line type="monotone" dataKey="e1rm" stroke={TREND_COLORS[ex.trend]} dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Real calendar */}
        {freq && freq.calendar_heatmap.length > 0 && (
          <MonthCalendar heatmap={freq.calendar_heatmap} />
        )}

      </div>
    </div>
  );
}

function MonthCalendar({ heatmap }: { heatmap: CalendarDay[] }) {
  const byDate = new Map(heatmap.map((d) => [d.date, d]));

  const today = new Date();
  const lastEntryDate = heatmap.length > 0 ? new Date(heatmap[heatmap.length - 1].date + 'T00:00:00') : today;
  const initYear = lastEntryDate.getFullYear();
  const initMonth = lastEntryDate.getMonth();

  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const canGoNext = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: Mon=0 … Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;

  const todayStr = today.toISOString().split('T')[0];
  const monthName = firstDay.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  // Count training days in this month
  let trainingDaysThisMonth = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if ((byDate.get(ds)?.session_count ?? 0) > 0) trainingDaysThisMonth++;
  }

  const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-300">Trainingskalender</h3>
        <span className="text-xs text-gray-500">{trainingDaysThisMonth} Trainingstage</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors text-base leading-none"
          aria-label="Vorheriger Monat"
        >
          ←
        </button>
        <span className="text-sm font-medium text-gray-200 capitalize">{monthName}</span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
          aria-label="Nächster Monat"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[11px] text-gray-500 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty offset cells */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = byDate.get(ds);
          const sessions = entry?.session_count ?? 0;
          const sets = entry?.total_sets ?? 0;
          const isToday = ds === todayStr;
          const isFuture = ds > todayStr;
          const hasTraining = sessions > 0;

          return (
            <div
              key={ds}
              title={
                isFuture ? '' :
                hasTraining
                  ? `${sessions} Session${sessions > 1 ? 's' : ''}, ${sets} Sätze`
                  : 'Ruhetag'
              }
              className={`
                aspect-square flex flex-col items-center justify-center rounded-md text-xs select-none
                ${isToday ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900' : ''}
                ${isFuture
                  ? 'text-gray-700'
                  : hasTraining
                    ? sessions === 1
                      ? 'bg-blue-700 text-white font-semibold'
                      : 'bg-blue-500 text-white font-bold'
                    : 'bg-gray-800 text-gray-500'
                }
              `}
            >
              <span>{day}</span>
              {hasTraining && sessions > 1 && (
                <span className="text-[9px] opacity-80 leading-none">×{sessions}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-blue-700" /> Training
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-blue-500" /> 2+ Sessions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-gray-800" /> Ruhetag
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block border-2 border-blue-400 bg-transparent" /> Heute
        </span>
      </div>
    </div>
  );
}
