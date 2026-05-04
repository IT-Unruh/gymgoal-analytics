import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCompareExercises, useComparePeriods, useExercises } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatKg, formatVolume } from '../lib/format';

export function ComparePage() {
  const [tab, setTab] = useState<'exercises' | 'periods'>('exercises');
  const { data: exercises } = useExercises();

  const [exA, setExA] = useState<number | undefined>();
  const [exB, setExB] = useState<number | undefined>();
  const { data: exComp } = useCompareExercises(exA, exB);

  const [p1From, setP1From] = useState('');
  const [p1To, setP1To] = useState('');
  const [p2From, setP2From] = useState('');
  const [p2To, setP2To] = useState('');
  const { data: perComp } = useComparePeriods(p1From || undefined, p1To || undefined, p2From || undefined, p2To || undefined);

  return (
    <div>
      <PageHeader title="Vergleich" />
      <div className="p-6 space-y-6">
        <div className="flex gap-2 border-b border-gray-800 pb-4">
          {(['exercises', 'periods'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {t === 'exercises' ? 'Übungs-Vergleich' : 'Zeitraum-Vergleich'}
            </button>
          ))}
        </div>

        {tab === 'exercises' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Übung A" value={exA} onChange={setExA} exercises={exercises ?? []} />
              <Select label="Übung B" value={exB} onChange={setExB} exercises={exercises ?? []} />
            </div>
            {exComp ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={exComp.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => v.slice(0, 7)} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 12 }} formatter={(v) => [formatKg(v as number), '']} labelFormatter={(l: unknown) => formatDate(l as string)} />
                    <Legend />
                    <Line type="monotone" dataKey="e1rm_a" stroke="#3b82f6" dot={false} name={exComp.exercise_a_name} strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="e1rm_b" stroke="#f97316" dot={false} name={exComp.exercise_b_name} strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="Zwei Übungen auswählen" />}
          </div>
        )}

        {tab === 'periods' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <DateRange label="Periode 1" from={p1From} to={p1To} setFrom={setP1From} setTo={setP1To} />
              <DateRange label="Periode 2" from={p2From} to={p2To} setFrom={setP2From} setTo={setP2To} />
            </div>
            {perComp ? (
              <div className="grid grid-cols-2 gap-4">
                {[perComp.period_1, perComp.period_2].map((p) => (
                  <div key={p.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-gray-200">{p.label}</h3>
                    <p className="text-xs text-gray-500">{formatDate(p.date_from)} – {formatDate(p.date_to)}</p>
                    <div className="space-y-2 text-sm">
                      <Row label="Volumen" value={formatVolume(p.total_volume_kg)} />
                      <Row label="Sessions" value={p.total_sessions} />
                      <Row label="Sätze" value={p.total_sets} />
                      <Row label="Ø Vol/Woche" value={formatVolume(p.avg_weekly_volume)} />
                    </div>
                    {p.top_prs.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Top PRs</p>
                        {p.top_prs.map((pr) => (
                          <div key={pr.exercise} className="flex justify-between text-xs">
                            <span className="text-gray-400 truncate">{pr.exercise}</span>
                            <span className="text-blue-400 font-medium">{formatKg(pr.e1rm)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyState message="Zeiträume auswählen" />}
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, exercises }: { label: string; value?: number; onChange: (v: number) => void; exercises: { id: number; name: string }[] }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        <option value="">Übung wählen...</option>
        {exercises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
    </div>
  );
}

function DateRange({ label, from, to, setFrom, setTo }: { label: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      <div className="flex gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}
