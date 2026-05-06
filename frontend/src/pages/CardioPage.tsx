import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCardio } from '../api/hooks';
import { useDateRange } from '../contexts/DateRangeContext';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatDuration, formatNumber } from '../lib/format';
import type { CardioSession } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

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

function getWeekPeriod(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toISOString().slice(0, 10)}/${sunday.toISOString().slice(0, 10)}`;
}

function buildWeeklyDuration(sessions: CardioSession[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const w = getWeekPeriod(s.date);
    map.set(w, (map.get(w) ?? 0) + s.duration_minutes);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, duration_min]) => ({ week, duration_min: Math.round(duration_min * 10) / 10 }));
}

function buildWeeklyDistance(sessions: CardioSession[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.distance_km != null) {
      const w = getWeekPeriod(s.date);
      map.set(w, (map.get(w) ?? 0) + s.distance_km);
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, distance_km]) => ({ week, distance_km: Math.round(distance_km * 100) / 100 }));
}

// ── tooltips ─────────────────────────────────────────────────────────────────

function WeekTooltip({ active, payload, label, unit, formatter }: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  unit: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  const { kw, startLabel, endLabel } = parsePeriod(label);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-200">KW {kw}</p>
      <p className="text-gray-400">{startLabel} – {endLabel}</p>
      <p className="text-teal-400 font-medium mt-1">{formatter(payload[0].value ?? 0)} {unit}</p>
    </div>
  );
}

function PaceTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: CardioSession }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-1">{formatDate(d.date)}</p>
      <p className="text-gray-200 font-medium">{d.exercise_name}</p>
      <p className="text-orange-400 font-semibold mt-1">
        Pace: {d.pace_min_per_km != null ? `${formatNumber(d.pace_min_per_km)} min/km` : '—'}
      </p>
      {d.distance_km != null && <p className="text-gray-400">{formatNumber(d.distance_km)} km</p>}
      <p className="text-gray-500">{formatDuration(d.duration_minutes)}</p>
    </div>
  );
}

// ── mini calendar ─────────────────────────────────────────────────────────────

const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function CardioCalendar({ sessions }: { sessions: CardioSession[] }) {
  const activeDates = new Set(sessions.map((s) => s.date));
  const allDates = [...activeDates].sort();

  const latestDate = allDates.length ? new Date(allDates[allDates.length - 1] + 'T00:00:00') : new Date();
  const [year, setYear] = useState(latestDate.getFullYear());
  const [month, setMonth] = useState(latestDate.getMonth()); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 w-72 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="text-gray-500 hover:text-gray-300 px-1">‹</button>
        <span className="text-xs font-semibold text-gray-300">{MONTHS_DE[month]} {year}</span>
        <button onClick={next} className="text-gray-500 hover:text-gray-300 px-1">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DOW.map((d) => (
          <div key={d} className="w-8 h-6 flex items-center justify-center text-[10px] text-gray-600 font-medium">{d}</div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`pad-${i}`} className="w-8 h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isActive = activeDates.has(dateStr);
          return (
            <div
              key={day}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium
                ${isActive ? 'bg-teal-600 text-white' : 'text-gray-600'}`}
              title={isActive ? sessions.filter(s => s.date === dateStr).map(s => s.exercise_name).join(', ') : undefined}
            >
              {day}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-600 mt-3 text-center">
        {activeDates.size} Cardio-Einheit{activeDates.size !== 1 ? 'en' : ''} gesamt
      </p>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function CardioPage() {
  const { from, to } = useDateRange();
  const { data, isLoading } = useCardio(from || undefined, to || undefined);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  if (isLoading) return <div className="p-6"><ChartSkeleton /></div>;
  if (!data?.has_data) {
    return (
      <>
        <PageHeader title="Cardio" />
        <EmptyState message="Keine Cardio-Daten vorhanden" hint="Cardio-Übungen aus GymGoal werden automatisch erkannt" />
      </>
    );
  }

  const exerciseNames = [...new Set(data.sessions.map((s) => s.exercise_name))].sort();
  const sessions = selectedExercise
    ? data.sessions.filter((s) => s.exercise_name === selectedExercise)
    : data.sessions;

  const weeklyDuration = buildWeeklyDuration(sessions);
  const weeklyDistance = buildWeeklyDistance(sessions);
  const sessionsWithPace = sessions.filter((s) => s.pace_min_per_km != null);
  const sessionsWithDist = sessions.filter((s) => s.distance_km != null);

  const totalDuration = sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / 60;
  const totalDistance = sessions.reduce((acc, s) => acc + (s.distance_km ?? 0), 0);
  const totalCalories = sessions.reduce((acc, s) => acc + (s.calories ?? 0), 0);

  return (
    <div>
      <PageHeader title="Cardio" subtitle="Ausdauertraining & Herzfrequenz" />
      <div className="p-6 space-y-6">

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 shrink-0">Übung:</label>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">Alle Übungen</option>
            {exerciseNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {selectedExercise && (
            <button
              onClick={() => setSelectedExercise('')}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              × Zurücksetzen
            </button>
          )}
        </div>

        {/* KPI + Calendar row */}
        <div className="flex gap-6 items-start">
          <div className="flex-1 grid grid-cols-3 gap-4">
            <KpiCard label="Gesamt Dauer" value={formatDuration(totalDuration * 60)} color="#14b8a6" />
            <KpiCard label="Gesamt Distanz" value={`${formatNumber(totalDistance)} km`} color="#3b82f6" />
            <KpiCard label="Gesamt Kalorien" value={`${Math.round(totalCalories)} kcal`} color="#f97316" />
          </div>
          <CardioCalendar sessions={sessions} />
        </div>

        {/* Weekly duration */}
        {weeklyDuration.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Wöchentliche Dauer (min)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyDuration}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `KW ${parsePeriod(v).kw}`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip content={(props) => (
                  <WeekTooltip active={props.active} payload={props.payload as Array<{ value?: number }>} label={props.label as string} unit="min" formatter={formatDuration} />
                )} />
                <Bar dataKey="duration_min" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekly distance */}
        {weeklyDistance.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Wöchentliche Distanz (km)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyDistance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `KW ${parsePeriod(v).kw}`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip content={(props) => (
                  <WeekTooltip active={props.active} payload={props.payload as Array<{ value?: number }>} label={props.label as string} unit="km" formatter={(v) => formatNumber(v)} />
                )} />
                <Bar dataKey="distance_km" fill="#3b82f6" radius={[3, 3, 0, 0]} />
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
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} reversed tickFormatter={(v) => `${formatNumber(v)}'`} domain={['auto', 'auto']} />
                <Tooltip content={<PaceTooltip />} />
                <Line type="monotone" dataKey="pace_min_per_km" stroke="#f97316" dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} strokeWidth={2} />
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
                <Bar dataKey="distance_km" fill="#3b82f6" radius={[3, 3, 0, 0]} />
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
              {sessions.map((s, i) => (
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
