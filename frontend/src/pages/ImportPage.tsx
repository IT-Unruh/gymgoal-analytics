import { useCallback, useState } from 'react';
import { useImports, useUploadImport, useDeleteImport } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { formatDate } from '../lib/format';
import type { ImportSummary } from '../types';

export function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null);
  const { data: imports, isLoading } = useImports();
  const upload = useUploadImport();
  const del = useDeleteImport();

  const handleFile = useCallback((file: File) => {
    upload.mutate(file, { onSuccess: (s) => setLastSummary(s) });
  }, [upload]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <PageHeader title="Import" subtitle="GymGoal .tab Datei importieren" />
      <div className="p-6 space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            dragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-700 hover:border-gray-500'
          }`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".tab,.csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {upload.isPending ? (
            <p className="text-gray-300 animate-pulse">Importiere...</p>
          ) : (
            <>
              <p className="text-3xl mb-3 text-gray-600">↑</p>
              <p className="text-gray-300 font-medium">Datei hierher ziehen oder klicken</p>
              <p className="text-gray-500 text-sm mt-1">.tab Exportdatei aus GymGoal Pro</p>
            </>
          )}
        </div>

        {upload.error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
            {(upload.error as Error).message}
          </div>
        )}

        {lastSummary && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <h3 className="text-green-300 font-semibold mb-2">Import erfolgreich</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Zeilen" value={lastSummary.rows_parsed} />
              <Stat label="Neue Sätze" value={lastSummary.sets_created} color="text-green-400" />
              <Stat label="Übersprungen" value={lastSummary.sets_skipped} color="text-gray-400" />
              <Stat label="Neue Übungen" value={lastSummary.new_exercises} />
            </div>
            {lastSummary.date_range_start && (
              <p className="text-gray-400 text-xs mt-2">
                Zeitraum: {formatDate(lastSummary.date_range_start)} – {formatDate(lastSummary.date_range_end!)}
              </p>
            )}
          </div>
        )}

        {/* Import history */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Import-Verlauf</h2>
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded" />)}
            </div>
          ) : !imports?.length ? (
            <EmptyState message="Noch kein Import" hint="Lade eine .tab Datei hoch um zu starten" />
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between bg-gray-900 rounded-lg border border-gray-800 px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-100 font-medium">{imp.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(imp.imported_at)} · {imp.sets_created} Sätze · {imp.date_range_start && `${formatDate(imp.date_range_start)} – ${formatDate(imp.date_range_end!)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm('Import löschen?')) del.mutate(imp.id); }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-gray-100' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-gray-900 rounded p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
