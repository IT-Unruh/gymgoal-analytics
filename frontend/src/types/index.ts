export interface UserRead {
  id: string;
  email: string | null;
}

export interface UserSettingsRead {
  target_sessions_per_week: number;
  age: number | null;
  resting_hr: number | null;
  max_hr: number | null;
  preferred_1rm_formula: string;
  weight_unit: string;
  bodyweight_kg: number | null;
}

export interface UserSettingsPatch {
  target_sessions_per_week?: number;
  age?: number | null;
  resting_hr?: number | null;
  max_hr?: number | null;
  preferred_1rm_formula?: string;
  weight_unit?: string;
  bodyweight_kg?: number | null;
}

export interface ExerciseRead {
  id: number;
  gymgoal_id: number;
  name: string;
  is_user_created: boolean;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  category: string;
  equipment: string;
  is_user_overridden: boolean;
}

export interface ExercisePatch {
  primary_muscle_group?: string;
  secondary_muscle_groups?: string[];
  category?: string;
  equipment?: string;
}

export interface ImportSummary {
  rows_parsed: number;
  sets_created: number;
  sets_skipped: number;
  new_exercises: number;
  date_range_start: string | null;
  date_range_end: string | null;
  import_id: number | null;
}

export interface ImportLogRead {
  id: number;
  filename: string;
  imported_at: string;
  rows_parsed: number;
  sets_created: number;
  sets_skipped: number;
  new_exercises: number;
  date_range_start: string | null;
  date_range_end: string | null;
}

export interface CalendarDay {
  date: string;
  session_count: number;
  total_sets: number;
}

export interface FrequencyStats {
  sessions_per_week: { week: string; count: number }[];
  sessions_per_month: { month: string; count: number }[];
  rolling_4w_avg: number;
  longest_streak: number;
  current_streak: number;
  longest_gap_days: number;
  day_of_week_distribution: Record<string, number>;
  adherence_score: number;
  calendar_heatmap: CalendarDay[];
  total_sessions: number;
}

export interface MuscleGroupVolume {
  muscle_group: string;
  sets_per_week: number;
  total_sets: number;
  total_volume_kg: number;
  status: 'optimal' | 'undertrained' | 'overtrained';
}

export interface VolumeStats {
  total_volume_kg: number;
  total_sets: number;
  volume_per_week: { week: string; volume_kg: number }[];
  volume_per_month: { month: string; volume_kg: number }[];
  muscle_group_volumes: MuscleGroupVolume[];
  volume_by_category: Record<string, number>;
  volume_by_equipment: Record<string, number>;
}

export interface PREntry {
  date: string;
  exercise_id: number;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  estimated_1rm_epley: number;
  estimated_1rm_brzycki: number;
  is_weight_pr: boolean;
  is_estimated_1rm_pr: boolean;
  is_volume_session_pr: boolean;
}

export interface ExercisePRs {
  exercise_id: number;
  exercise_name: string;
  actual_1rm: number;
  best_estimated_1rm_epley: number;
  best_estimated_1rm_brzycki: number;
  pr_timeline: PREntry[];
}

export interface SessionDataPoint {
  date: string;
  e1rm: number;
  max_weight_kg: number;
  avg_weight_kg: number;
  sets: number;
  total_reps: number;
  volume_kg: number;
}

export interface ExerciseTrend {
  exercise_id: number;
  exercise_name: string;
  slope_kg_per_week: number;
  r_squared: number;
  p_value: number;
  trend: 'increasing' | 'flat' | 'decreasing';
  is_plateau: boolean;
  total_sets: number;
  avg_sets_per_week: number;
  max_weight_kg: number;
  sets_per_week: { week: string; sets: number }[];
  data_points: SessionDataPoint[];
}

export interface WeekBlock {
  week: string;
  volume_kg: number;
  avg_intensity_pct: number;
  phase: 'accumulation' | 'intensification' | 'deload' | 'mixed';
  is_deload: boolean;
}

export interface PeriodizationStats {
  week_blocks: WeekBlock[];
  deload_weeks: string[];
  volume_intensity_plot: { week: string; volume_kg: number; intensity_pct: number; phase: string }[];
}

export interface Forecast {
  exercise_id: number;
  exercise_name: string;
  current_e1rm: number;
  forecast_4w: number;
  forecast_8w: number;
  ci_lower_4w: number;
  ci_upper_4w: number;
  ci_lower_8w: number;
  ci_upper_8w: number;
}

export interface Warning {
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  message: string;
  recommendation: string;
}

export interface PredictiveStats {
  forecasts: Forecast[];
  warnings: Warning[];
  acwr: number | null;
  acute_load: number;
  chronic_load: number;
}

export interface CardioSession {
  date: string;
  exercise_name: string;
  duration_minutes: number;
  distance_km: number | null;
  calories: number | null;
  avg_hr: number | null;
  pace_min_per_km: number | null;
}

export interface CardioStats {
  total_duration_hours: number;
  total_distance_km: number;
  total_calories: number;
  sessions: CardioSession[];
  weekly_duration: { week: string; duration_min: number }[];
  weekly_distance: { week: string; distance_km: number }[];
  has_data: boolean;
}

export interface ExerciseComparison {
  exercise_a_id: number;
  exercise_a_name: string;
  exercise_b_id: number;
  exercise_b_name: string;
  timeline: { date: string; e1rm_a?: number; e1rm_b?: number }[];
}

export interface PeriodMetrics {
  label: string;
  date_from: string;
  date_to: string;
  total_volume_kg: number;
  total_sessions: number;
  total_sets: number;
  avg_weekly_volume: number;
  muscle_distribution: Record<string, number>;
  top_prs: { exercise: string; e1rm: number }[];
}

export interface PeriodComparison {
  period_1: PeriodMetrics;
  period_2: PeriodMetrics;
}

export interface MuscleBalance {
  push_pull_ratio: number;
  push_pull_status: string;
  quad_ham_ratio: number;
  quad_ham_status: string;
  anterior_posterior_ratio: number;
}
