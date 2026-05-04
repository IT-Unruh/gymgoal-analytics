import { useState } from 'react';
import { useExercises, usePatchExercise, useRemapExercises } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import type { ExerciseRead } from '../types';

const MUSCLE_GROUPS = [
  'Brust', 'Rücken', 'Schultern', 'Arme_Bizeps', 'Arme_Trizeps',
  'Beine_Quads', 'Beine_Hamstrings', 'Beine_Glutes', 'Beine_Waden',
  'Core', 'Funktionell', 'Cardio', 'Sonstige',
];
const CATEGORIES = ['compound', 'isolation', 'bodyweight', 'cardio', 'functional'];
const EQUIPMENT = ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'cardio_machine', 'other'];

export function ExercisesPage() {
  const { data: exercises, isLoading } = useExercises();
  const patch = usePatchExercise();
  const remap = useRemapExercises();
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExerciseRead>>({});

  const filtered = (exercises ?? []).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (e: ExerciseRead) => {
    setEditId(e.id);
    setEditForm({ primary_muscle_group: e.primary_muscle_group, category: e.category, equipment: e.equipment, secondary_muscle_groups: e.secondary_muscle_groups });
  };

  const saveEdit = (id: number) => {
    patch.mutate({ id, patch: { primary_muscle_group: editForm.primary_muscle_group, category: editForm.category, equipment: editForm.equipment } }, { onSuccess: () => setEditId(null) });
  };

  return (
    <div>
      <PageHeader
        title="Übungskatalog"
        subtitle={`${exercises?.length ?? 0} Übungen`}
        actions={
          <button
            onClick={() => remap.mutate()}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
          >
            {remap.isPending ? 'Neu mappt...' : 'Neu mappen'}
          </button>
        }
      />
      <div className="p-6 space-y-4">
        <input
          type="text"
          placeholder="Übung suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />

        {isLoading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded animate-pulse" />)}</div>
        ) : !filtered.length ? (
          <EmptyState message="Keine Übungen gefunden" />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Übung</th>
                  <th className="px-4 py-3">Primär</th>
                  <th className="px-4 py-3">Kategorie</th>
                  <th className="px-4 py-3">Equipment</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ex) => (
                  <tr key={ex.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-200 font-medium">{ex.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        {ex.is_user_created && <span className="text-xs text-purple-400">Eigene</span>}
                        {ex.is_user_overridden && <span className="text-xs text-yellow-400">✎ Bearbeitet</span>}
                      </div>
                    </td>
                    {editId === ex.id ? (
                      <>
                        <td className="px-4 py-2">
                          <select value={editForm.primary_muscle_group} onChange={(e) => setEditForm((f) => ({ ...f, primary_muscle_group: e.target.value }))} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none">
                            {MUSCLE_GROUPS.map((mg) => <option key={mg}>{mg}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none">
                            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select value={editForm.equipment} onChange={(e) => setEditForm((f) => ({ ...f, equipment: e.target.value }))} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none">
                            {EQUIPMENT.map((e) => <option key={e}>{e}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 flex gap-2">
                          <button onClick={() => saveEdit(ex.id)} className="text-xs text-green-400 hover:text-green-300">Speichern</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-300">Abbrechen</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-gray-300">{ex.primary_muscle_group}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{ex.category}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{ex.equipment}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => startEdit(ex)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Bearbeiten</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
