const DE_NUM = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const DE_BIG = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function formatKg(value: number): string {
  return `${DE_NUM.format(value)} kg`;
}

export function formatVolume(value: number): string {
  return `${DE_BIG.format(value)} kg`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)} %`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}
