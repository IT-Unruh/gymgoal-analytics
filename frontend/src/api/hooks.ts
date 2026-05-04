import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  CardioStats, ExerciseComparison, ExercisePRs, ExerciseRead, ExercisePatch,
  ExerciseTrend, FrequencyStats, ImportLogRead, ImportSummary,
  MuscleBalance, PeriodComparison, PeriodizationStats, PredictiveStats,
  UserRead, UserSettingsPatch, UserSettingsRead, VolumeStats,
} from '../types';

function dateParams(from?: string, to?: string): string {
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api.get<UserRead>('/auth/me') });
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api.get<UserSettingsRead>('/settings') });
export const usePatchSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UserSettingsPatch) => api.patch<UserSettingsRead>('/settings', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
};

export const useExercises = () => useQuery({ queryKey: ['exercises'], queryFn: () => api.get<ExerciseRead[]>('/exercises') });
export const usePatchExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ExercisePatch }) => api.patch<ExerciseRead>(`/exercises/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
};
export const useRemapExercises = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ remapped: number }>('/exercises/remap'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
};

export const useImports = () => useQuery({ queryKey: ['imports'], queryFn: () => api.get<ImportLogRead[]>('/imports') });
export const useUploadImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<ImportSummary>('/imports', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};
export const useDeleteImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/imports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
};

export const useFrequency = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'frequency', from, to], queryFn: () => api.get<FrequencyStats>(`/analytics/frequency${dateParams(from, to)}`) });

export const useVolume = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'volume', from, to], queryFn: () => api.get<VolumeStats>(`/analytics/volume${dateParams(from, to)}`) });

export const usePRs = (exerciseId?: number, from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'prs', exerciseId, from, to], queryFn: () => api.get<ExercisePRs[]>(`/analytics/prs${dateParams(from, to)}${exerciseId ? `&exercise_id=${exerciseId}` : ''}`) });

export const useProgression = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'progression', from, to], queryFn: () => api.get<ExerciseTrend[]>(`/analytics/progression${dateParams(from, to)}`) });

export const usePeriodization = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'periodization', from, to], queryFn: () => api.get<PeriodizationStats>(`/analytics/periodization${dateParams(from, to)}`) });

export const usePredictive = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'predictive', from, to], queryFn: () => api.get<PredictiveStats>(`/analytics/predictive${dateParams(from, to)}`) });

export const useCardio = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'cardio', from, to], queryFn: () => api.get<CardioStats>(`/analytics/cardio${dateParams(from, to)}`) });

export const useCompareExercises = (a?: number, b?: number) =>
  useQuery({
    queryKey: ['analytics', 'compare', 'exercises', a, b],
    queryFn: () => api.get<ExerciseComparison>(`/analytics/compare/exercises?a=${a}&b=${b}`),
    enabled: !!a && !!b,
  });

export const useComparePeriods = (p1From?: string, p1To?: string, p2From?: string, p2To?: string) =>
  useQuery({
    queryKey: ['analytics', 'compare', 'periods', p1From, p1To, p2From, p2To],
    queryFn: () => api.get<PeriodComparison>(`/analytics/compare/periods?p1_from=${p1From}&p1_to=${p1To}&p2_from=${p2From}&p2_to=${p2To}`),
    enabled: !!p1From && !!p1To && !!p2From && !!p2To,
  });

export const useMuscleBalance = (from?: string, to?: string) =>
  useQuery({ queryKey: ['analytics', 'muscle-balance', from, to], queryFn: () => api.get<MuscleBalance>(`/analytics/muscle-balance${dateParams(from, to)}`) });
