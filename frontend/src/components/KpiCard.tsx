interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function KpiCard({ label, value, sub, color = '#3b82f6' }: KpiCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
