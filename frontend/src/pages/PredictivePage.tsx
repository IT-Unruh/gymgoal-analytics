import { usePredictive } from '../api/hooks';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SEVERITY_COLORS } from '../lib/colors';
import { formatKg, formatNumber } from '../lib/format';

export function PredictivePage() {
  const { data, isLoading } = usePredictive();

  if (isLoading) return <div className="p-6"><ChartSkeleton /></div>;
  if (!data) return <><PageHeader title="Prognose & Empfehlungen" /><EmptyState message="Noch keine Daten" /></>;

  return (
    <div>
      <PageHeader title="Prognose & Empfehlungen" subtitle="Forecasts und Warnsignale" />
      <div className="p-6 space-y-6">
        {/* ACWR */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Akute Last (7T)</p>
            <p className="text-2xl font-bold text-gray-100">{formatNumber(data.acute_load)} kg</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Chronische Last (4W Ø)</p>
            <p className="text-2xl font-bold text-gray-100">{formatNumber(data.chronic_load)} kg</p>
          </div>
          <div className={`border rounded-lg p-4 ${data.acwr && data.acwr > 1.5 ? 'bg-red-900/20 border-red-700' : data.acwr && data.acwr > 1.3 ? 'bg-yellow-900/20 border-yellow-700' : 'bg-gray-900 border-gray-800'}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ACWR</p>
            <p className={`text-2xl font-bold ${data.acwr && data.acwr > 1.5 ? 'text-red-400' : data.acwr && data.acwr > 1.3 ? 'text-yellow-400' : 'text-green-400'}`}>
              {data.acwr != null ? formatNumber(data.acwr) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ziel: 0.8–1.3</p>
          </div>
        </div>

        {/* Warnings */}
        {data.warnings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Warnungen</h3>
            {data.warnings.map((w, i) => (
              <div key={i} className="flex gap-3 bg-gray-900 border border-gray-800 rounded-lg p-4" style={{ borderLeftColor: SEVERITY_COLORS[w.severity], borderLeftWidth: 3 }}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{w.message}</p>
                  <p className="text-xs text-gray-400 mt-1">💡 {w.recommendation}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded self-start" style={{ background: SEVERITY_COLORS[w.severity] + '33', color: SEVERITY_COLORS[w.severity] }}>
                  {w.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Forecasts */}
        {data.forecasts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">4-Wochen Prognose (Top 5 Lifts)</h3>
            <div className="space-y-2">
              {data.forecasts.map((f) => (
                <div key={f.exercise_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-200">{f.exercise_name}</h4>
                    <span className="text-xs text-gray-400">Aktuell: {formatKg(f.current_e1rm)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">In 4 Wochen</p>
                      <p className="text-lg font-bold text-blue-400">{formatKg(f.forecast_4w)}</p>
                      <p className="text-xs text-gray-600">±{formatKg((f.ci_upper_4w - f.ci_lower_4w) / 2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">In 8 Wochen</p>
                      <p className="text-lg font-bold text-purple-400">{formatKg(f.forecast_8w)}</p>
                      <p className="text-xs text-gray-600">±{formatKg((f.ci_upper_8w - f.ci_lower_8w) / 2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.warnings.length === 0 && data.forecasts.length === 0 && (
          <EmptyState message="Keine Empfehlungen" hint="Benötigt mehr Trainingsdaten für Vorhersagen" />
        )}
      </div>
    </div>
  );
}
