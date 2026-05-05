import { Link, useLocation } from 'react-router-dom';
import { useDateRange } from '../contexts/DateRangeContext';

const NAV = [
  { to: '/', label: 'Übersicht', icon: '▦' },
  { to: '/import', label: 'Import', icon: '↑' },
  { to: '/frequency', label: 'Frequenz', icon: '◷' },
  { to: '/volume', label: 'Volumen', icon: '◈' },
  { to: '/prs', label: 'Bestleistungen', icon: '★' },
  { to: '/progression', label: 'Progression', icon: '↗' },
  { to: '/periodization', label: 'Periodisierung', icon: '⊞' },
  { to: '/predictive', label: 'Prognose', icon: '⚡' },
  { to: '/cardio', label: 'Cardio', icon: '♡' },
  { to: '/compare', label: 'Vergleich', icon: '⇔' },
  { to: '/exercises', label: 'Übungen', icon: '✎' },
  { to: '/settings', label: 'Einstellungen', icon: '⚙' },
];

const today = new Date().toISOString().split('T')[0];

function DateRangeBar() {
  const { from, to, setFrom, setTo, clear } = useDateRange();
  const isActive = !!from || !!to;

  return (
    <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-800 bg-gray-950 shrink-0">
      <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Zeitraum</span>
      <input
        type="date"
        value={from}
        max={to || today}
        onChange={(e) => setFrom(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
      />
      <span className="text-xs text-gray-600">–</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        max={today}
        onChange={(e) => setTo(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
      />
      {isActive && (
        <>
          <span className="text-[11px] text-blue-400 bg-blue-950 border border-blue-800 px-2 py-0.5 rounded-full">
            Gefiltert
          </span>
          <button
            onClick={clear}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            × Zurücksetzen
          </button>
        </>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-56 shrink-0 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <h1 className="text-sm font-bold text-gray-100 uppercase tracking-widest">GymGoal</h1>
          <p className="text-xs text-gray-500 mt-0.5">Analytics</p>
        </div>
        <nav className="flex-1 py-2">
          {NAV.map(({ to, label, icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-gray-800 text-white font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                <span className="w-4 text-center opacity-60">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">v0.1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden flex flex-col">
        <DateRangeBar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
