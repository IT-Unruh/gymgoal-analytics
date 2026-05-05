import { usePredictive } from '../api/hooks';
import { useDateRange } from '../contexts/DateRangeContext';
import { ChartSkeleton } from '../components/ChartSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SEVERITY_COLORS } from '../lib/colors';
import { formatKg, formatNumber, formatVolume } from '../lib/format';

const SEVERITY_LABEL: Record<string, string> = {
  info: 'Info',
  warning: 'Warnung',
  critical: 'Kritisch',
};

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-gray-400 bg-gray-800/60 rounded-lg p-3 space-y-1.5 leading-relaxed">
      {children}
    </div>
  );
}

function AcwrZoneBar({ acwr }: { acwr: number }) {
  const pct = Math.min(Math.max((acwr / 2) * 100, 2), 98);
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-gray-600" style={{ width: '40%' }} title="Unterbelastet (≤0.8)" />
          <div className="h-full bg-green-600" style={{ width: '25%' }} title="Optimal (0.8–1.3)" />
          <div className="h-full bg-yellow-500" style={{ width: '10%' }} title="Erhöht (1.3–1.5)" />
          <div className="h-full bg-red-600" style={{ width: '25%' }} title="Kritisch (>1.5)" />
        </div>
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white bg-gray-900 shadow"
          style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-0.5">
        <span>0</span>
        <span>0.8</span>
        <span>1.3</span>
        <span>1.5</span>
        <span>2.0+</span>
      </div>
    </div>
  );
}

export function PredictivePage() {
  const { from, to } = useDateRange();
  const { data, isLoading } = usePredictive(from || undefined, to || undefined);

  if (isLoading) return <div className="p-6 space-y-4"><ChartSkeleton /><ChartSkeleton /></div>;
  if (!data) return <><PageHeader title="Prognose & Empfehlungen" /><EmptyState message="Noch keine Daten" /></>;

  const acwr = data.acwr;
  const acwrColor = acwr === null ? '#6b7280'
    : acwr < 0.8 ? '#6b7280'
    : acwr < 1.3 ? '#22c55e'
    : acwr < 1.5 ? '#eab308'
    : '#ef4444';
  const acwrStatus = acwr === null ? '—'
    : acwr < 0.8 ? 'Unterbelastet'
    : acwr < 1.3 ? 'Optimale Zone'
    : acwr < 1.5 ? 'Erhöhtes Risiko'
    : 'Überlastung';

  return (
    <div>
      <PageHeader title="Prognose & Empfehlungen" subtitle="Belastungssteuerung, Warnhinweise und Kraftprognosen" />
      <div className="p-6 space-y-6">

        {/* ── ACWR Section ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Belastungssteuerung (ACWR)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Akut-Chronisches Belastungsverhältnis — misst ob du mehr trainierst als dein Körper gewöhnt ist
            </p>
          </div>

          {/* Three metric cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Acute load */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Akute Last</p>
              <p className="text-2xl font-bold text-gray-100">{formatVolume(data.acute_load)}</p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Gesamtvolumen (Gewicht × Wiederholungen) der <span className="text-gray-300">letzten 7 Tage</span>.
                Entspricht deiner aktuellen Trainingswoche.
              </p>
            </div>

            {/* Chronic load */}
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Chronische Last</p>
              <p className="text-2xl font-bold text-gray-100">{formatVolume(data.chronic_load)}</p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Durchschnittliches Wochenvolumen der <span className="text-gray-300">letzten 28 Tage</span>.
                Spiegelt deine eingespielte Belastungskapazität wider.
              </p>
            </div>

            {/* ACWR */}
            <div
              className="rounded-lg p-4 border"
              style={{
                background: acwrColor + '15',
                borderColor: acwrColor + '55',
              }}
            >
              <p className="text-xs text-gray-400 font-medium mb-1">ACWR</p>
              <p className="text-2xl font-bold" style={{ color: acwrColor }}>
                {acwr !== null ? formatNumber(acwr) : '—'}
              </p>
              <p className="text-xs mt-1 font-medium" style={{ color: acwrColor }}>{acwrStatus}</p>
              {acwr !== null && <AcwrZoneBar acwr={acwr} />}
            </div>
          </div>

          {/* Formula explanation */}
          <InfoBox>
            <p className="text-gray-300 font-medium">Wie wird ACWR berechnet?</p>
            <p>
              <span className="text-blue-400 font-mono">ACWR = Akute Last ÷ Chronische Last</span>
              {' '}— ein Wert von 1.0 bedeutet: du trainierst exakt so viel wie in den letzten 4 Wochen im Schnitt.
            </p>
            <p>
              Ein Wert über 1.5 ist mit einem erhöhten Verletzungsrisiko assoziiert (Forschung: Gabbett, 2016).
              Optimal ist die «Sweet Spot»-Zone zwischen 0.8 und 1.3.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="text-center"><span className="text-gray-400">≤ 0.8</span><br /><span className="text-gray-500">Unterbelastet</span></div>
              <div className="text-center"><span className="text-green-400">0.8 – 1.3</span><br /><span className="text-gray-500">Optimal ✓</span></div>
              <div className="text-center"><span className="text-yellow-400">1.3 – 1.5</span><br /><span className="text-gray-500">Erhöht</span></div>
              <div className="text-center"><span className="text-red-400">&gt; 1.5</span><br /><span className="text-gray-500">Kritisch</span></div>
            </div>
          </InfoBox>
        </section>

        {/* ── Warnings ── */}
        {data.warnings.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">Warnhinweise & Empfehlungen</h2>
              <span className="text-xs text-gray-500">{data.warnings.length} Hinweis{data.warnings.length !== 1 ? 'e' : ''}</span>
            </div>
            <InfoBox>
              <p>
                Hinweise werden automatisch aus deinen Trainingsdaten der letzten 4 Wochen abgeleitet —
                z.B. aus ACWR, Muskelgruppenbalance und Plateau-Erkennung.
              </p>
            </InfoBox>
            <div className="space-y-2">
              {data.warnings.map((w, i) => (
                <div
                  key={i}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                  style={{ borderLeftColor: SEVERITY_COLORS[w.severity], borderLeftWidth: 3 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ background: SEVERITY_COLORS[w.severity] + '25', color: SEVERITY_COLORS[w.severity] }}
                        >
                          {SEVERITY_LABEL[w.severity]}
                        </span>
                        <span className="text-xs text-gray-500">{w.metric}</span>
                      </div>
                      <p className="text-sm text-gray-200">{w.message}</p>
                      <p className="text-xs text-gray-400 mt-1.5">💡 {w.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Forecasts ── */}
        {data.forecasts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-200">Kraftprognose (Top 5 Lifts)</h2>
            <InfoBox>
              <p className="text-gray-300 font-medium">Wie werden Prognosen berechnet?</p>
              <p>
                Für jeden Lift wird eine <span className="text-blue-400">lineare Regression</span> auf das geschätzte 1-Rep-Max (e1RM)
                über alle Trainingseinheiten gelegt. Die Steigung dieser Geraden wird verwendet, um 4 und 8 Wochen vorauszusagen.
              </p>
              <p>
                Das <span className="text-gray-300">Konfidenzintervall (±)</span> basiert auf der Streuung deiner bisherigen Werte —
                je konsistenter du trainierst, desto enger das Intervall.
                Prognosen bei wenig Datenpunkten oder Plateaus sind entsprechend ungenau.
              </p>
            </InfoBox>
            <div className="space-y-2">
              {data.forecasts.map((f) => {
                const delta4w = f.forecast_4w - f.current_e1rm;
                const delta8w = f.forecast_8w - f.current_e1rm;
                const ci4 = (f.ci_upper_4w - f.ci_lower_4w) / 2;
                const ci8 = (f.ci_upper_8w - f.ci_lower_8w) / 2;
                return (
                  <div key={f.exercise_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-200">{f.exercise_name}</h4>
                      <span className="text-xs text-gray-500">
                        Aktuell: <span className="text-gray-300 font-medium">{formatKg(f.current_e1rm)}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">In 4 Wochen</p>
                        <p className="text-xl font-bold text-blue-400">{formatKg(f.forecast_4w)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className={delta4w >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {delta4w >= 0 ? '+' : ''}{formatKg(delta4w)}
                          </span>
                          {' '}· Konfidenz ±{formatKg(ci4)}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          Bereich: {formatKg(f.ci_lower_4w)} – {formatKg(f.ci_upper_4w)}
                        </p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">In 8 Wochen</p>
                        <p className="text-xl font-bold text-purple-400">{formatKg(f.forecast_8w)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className={delta8w >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {delta8w >= 0 ? '+' : ''}{formatKg(delta8w)}
                          </span>
                          {' '}· Konfidenz ±{formatKg(ci8)}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          Bereich: {formatKg(f.ci_lower_8w)} – {formatKg(f.ci_upper_8w)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.warnings.length === 0 && data.forecasts.length === 0 && (
          <EmptyState
            message="Keine Empfehlungen verfügbar"
            hint="Für ACWR und Prognosen werden mindestens 4 Wochen Trainingsdaten benötigt"
          />
        )}
      </div>
    </div>
  );
}
