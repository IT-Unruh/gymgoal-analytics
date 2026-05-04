interface EmptyStateProps {
  message?: string;
  hint?: string;
}

export function EmptyState({ message = 'Noch keine Daten', hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3 opacity-20">◌</div>
      <p className="text-gray-400 font-medium">{message}</p>
      {hint && <p className="text-gray-600 text-sm mt-1">{hint}</p>}
    </div>
  );
}
