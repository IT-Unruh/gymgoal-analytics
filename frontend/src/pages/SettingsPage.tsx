import { useEffect, useState } from 'react';
import { useSettings, usePatchSettings } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import type { UserSettingsPatch } from '../types';

export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const patch = usePatchSettings();
  const [form, setForm] = useState<UserSettingsPatch>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const handleSave = () => {
    patch.mutate(form, { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } });
  };

  if (isLoading) return <div className="p-6 animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded" />)}</div>;

  return (
    <div>
      <PageHeader title="Einstellungen" />
      <div className="p-6 max-w-lg space-y-6">
        <Section title="Training">
          <Field label="Ziel Sessions / Woche">
            <input type="number" min={1} max={14} value={form.target_sessions_per_week ?? 4}
              onChange={(e) => setForm((f) => ({ ...f, target_sessions_per_week: Number(e.target.value) }))}
              className={inputCls} />
          </Field>
        </Section>

        <Section title="Körper">
          <Field label="Alter">
            <input type="number" min={10} max={100} value={form.age ?? ''} placeholder="—"
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value ? Number(e.target.value) : null }))}
              className={inputCls} />
          </Field>
          <Field label="Ruhepuls (bpm)">
            <input type="number" value={form.resting_hr ?? ''} placeholder="—"
              onChange={(e) => setForm((f) => ({ ...f, resting_hr: e.target.value ? Number(e.target.value) : null }))}
              className={inputCls} />
          </Field>
          <Field label="Max. Puls (bpm)">
            <input type="number" value={form.max_hr ?? ''} placeholder="220 - Alter"
              onChange={(e) => setForm((f) => ({ ...f, max_hr: e.target.value ? Number(e.target.value) : null }))}
              className={inputCls} />
          </Field>
          <Field label="Körpergewicht (kg)">
            <input type="number" step="0.5" value={form.bodyweight_kg ?? ''} placeholder="—"
              onChange={(e) => setForm((f) => ({ ...f, bodyweight_kg: e.target.value ? Number(e.target.value) : null }))}
              className={inputCls} />
          </Field>
        </Section>

        <Section title="Anzeige">
          <Field label="1RM Formel">
            <select value={form.preferred_1rm_formula ?? 'epley'} onChange={(e) => setForm((f) => ({ ...f, preferred_1rm_formula: e.target.value }))} className={inputCls}>
              <option value="epley">Epley</option>
              <option value="brzycki">Brzycki</option>
            </select>
          </Field>
          <Field label="Gewichtseinheit">
            <select value={form.weight_unit ?? 'kg'} onChange={(e) => setForm((f) => ({ ...f, weight_unit: e.target.value }))} className={inputCls}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </Field>
        </Section>

        <button
          onClick={handleSave}
          disabled={patch.isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {patch.isPending ? 'Speichern...' : saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-3 bg-gray-900 border border-gray-800 rounded-lg p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-gray-300 w-44 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
