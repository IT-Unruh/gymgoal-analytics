import { useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceDot } from 'recharts';
import { usePRs, useSettings } from '../api/hooks';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatKg } from '../lib/format';

export function PRsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: settings } = useSettings();
  const formula = settings?.preferred_1rm_formula ?? 'epley';
  const { data: prs, isLoading } = usePRs();

  if (isLoading) return <div className="p-6"><ChartSkeleton /></div>;
  if (!prs?.length) {
    return <><PageHeader title="Bestleistungen" /><EmptyState message="Noch keine Daten" /></>;
  }

  const filtered = prs.filter((p) => p.exercise_name.toLowerCase().includes(search.toLowerCase()));
  const selected = selectedId ? prs.find((p) => p.exercise_id === selectedId) : null;

  return (
    <div>
      <PageHeader title="Bestleistungen (PRs)" subtitle={`1RM Formel: ${formula}`} />
      <div className="p-6 grid grid-cols-3 gap-6">
        {/* Left: PR table */}
        <div className="col-span-1 space-y-3">
          <input
            type="text"
            placeholder="Übung suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {filtered.map((pr) => {
              const e1rm = formula === 'epley' ? pr.best_estimated_1rm_epley : pr.best_estimated_1rm_brzycki;
              return (
                <button
                  key={pr.exercise_id}
                  onClick={() => setSelectedId(pr.exercise_id === selectedId ? null : pr.exercise_id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedId === pr.exercise_id
                      ? 'bg-blue-900/40 border-blue-600'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <p className="text-sm text-gray-200 font-medium truncate">{pr.exercise_name}</p>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-gray-500">e1RM</span>
                    <span className="text-xs font-bold text-blue-400">{formatKg(e1rm)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: timeline chart */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-200 mb-1">{selected.exercise_name}</h3>
              <p className="text-xs text-gray-500 mb-4">
                Tatsächlich 1RM: {formatKg(selected.actual_1rm)} · e1RM (Epley): {formatKg(selected.best_estimated_1rm_epley)} · (Brzycki): {formatKg(selected.best_estimated_1rm_brzycki)}
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={selected.pr_timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(0, 7)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => `${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }}
                    formatter={(v, name) => [formatKg(v as number), name as string]}
                    labelFormatter={(l) => formatDate(l)}
                  />
                  <Line type="monotone" dataKey="estimated_1rm_epley" stroke="#3b82f6" dot={false} name="e1RM (Epley)" strokeWidth={2} />
                  <Line type="monotone" dataKey="estimated_1rm_brzycki" stroke="#f97316" dot={false} name="e1RM (Brzycki)" strokeWidth={1} strokeDasharray="4 2" />
                  {selected.pr_timeline
                    .filter((p) => p.is_estimated_1rm_pr)
                    .map((p, i) => (
                      <ReferenceDot key={i} x={p.date} y={p.estimated_1rm_epley} r={4} fill="#22c55e" stroke="none" />
                    ))}
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">● Grüne Punkte = neues PR</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center h-64">
              <p className="text-gray-500 text-sm">Übung links auswählen</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
