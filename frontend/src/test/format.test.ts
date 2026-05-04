import { describe, expect, it } from 'vitest';
import { formatKg, formatVolume, formatDate, formatPct, formatDuration } from '../lib/format';

describe('formatKg', () => {
  it('formats with German decimal comma', () => {
    expect(formatKg(100.5)).toContain('100,5');
    expect(formatKg(100.5)).toContain('kg');
  });
  it('handles integers', () => {
    expect(formatKg(80)).toContain('80,0');
  });
});

describe('formatVolume', () => {
  it('formats large numbers with thousand separator', () => {
    expect(formatVolume(12345)).toContain('12');
  });
});

describe('formatDate', () => {
  it('formats ISO date to German format', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatPct', () => {
  it('converts fraction to percentage string', () => {
    expect(formatPct(0.85)).toBe('85 %');
    expect(formatPct(1.0)).toBe('100 %');
  });
});

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45 min');
  });
  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30min');
  });
});
