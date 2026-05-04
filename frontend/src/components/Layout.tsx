import { Link, useLocation } from 'react-router-dom';

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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
