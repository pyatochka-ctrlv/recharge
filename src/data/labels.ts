import type { AccessibilityTag, ActivityFormat, ContextTag, CostLevel, DurationRange, EffortLevel, Mood } from '../types';

export const DURATION_LABELS: Record<DurationRange, string> = {
  '1-5': '1–5 хв',
  '5-15': '5–15 хв',
  '15-30': '15–30 хв',
  '30+': '30+ хв',
};
export const DURATIONS: DurationRange[] = ['1-5', '5-15', '15-30', '30+'];
/** Верхня межа діапазону у хвилинах (для таймера та порівнянь). */
export const DURATION_MINUTES: Record<DurationRange, number> = { '1-5': 5, '5-15': 15, '15-30': 30, '30+': 45 };

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  minimal: 'Мінімальні зусилля',
  low: 'Низькі зусилля',
  medium: 'Середні зусилля',
  high: 'Високі зусилля',
};
export const EFFORT_SHORT: Record<EffortLevel, string> = { minimal: 'мінімум', low: 'низькі', medium: 'середні', high: 'високі' };
export const EFFORTS: EffortLevel[] = ['minimal', 'low', 'medium', 'high'];
export const EFFORT_RANK: Record<EffortLevel, number> = { minimal: 0, low: 1, medium: 2, high: 3 };

export const COST_LABELS: Record<CostLevel, string> = { free: 'Безкоштовно', minimal: 'Мінімальні витрати', budget: 'Потребує бюджету' };
export const COSTS: CostLevel[] = ['free', 'minimal', 'budget'];

export const FORMAT_LABELS: Record<ActivityFormat, string> = {
  solo: 'Наодинці',
  together: 'З іншими',
  home: 'Вдома',
  outdoor: 'Надворі',
  online: 'Онлайн',
};
export const FORMATS: ActivityFormat[] = ['solo', 'together', 'home', 'outdoor', 'online'];

export const CONTEXT_LABELS: Record<ContextTag, string> = {
  fatigue: 'Втома',
  boredom: 'Нудьга',
  tension: 'Напруга',
  creative: 'Хочеться творчості',
  social: 'Потреба в людях',
  solitude: 'Хочеться побути наодинці',
  'low-mood': 'Сумно або неприємно',
  overwhelm: 'Перевантаження',
  restless: 'Неспокій, хочеться руху',
  stuck: 'Складно почати',
  cozy: 'Хочеться затишку',
  pleasure: 'Хочеться приємного',
  focus: 'Розсіяність',
};
export const CONTEXTS = Object.keys(CONTEXT_LABELS) as ContextTag[];

export const ACCESS_LABELS: Record<AccessibilityTag, string> = {
  seated: 'Можна сидячи',
  lying: 'Можна лежачи',
  'no-screen': 'Без екрана',
  quiet: 'Тихо',
  'no-talking': 'Без розмов',
  gentle: 'М’яке навантаження',
  anywhere: 'Майже будь-де',
};
export const ACCESS_TAGS = Object.keys(ACCESS_LABELS) as AccessibilityTag[];

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 1, emoji: '😣', label: 'Дуже неприємно' },
  { value: 2, emoji: '😕', label: 'Неприємно' },
  { value: 3, emoji: '😐', label: 'Нейтрально' },
  { value: 4, emoji: '🙂', label: 'Добре' },
  { value: 5, emoji: '🥰', label: 'Дуже добре' },
];

export const TENSION_LABELS = ['', 'Дуже спокійно', 'Спокійно', 'Помірно', 'Напружено', 'Дуже напружено'];
export const FATIGUE_LABELS = ['', 'Бадьоро', 'Трохи втомлена', 'Помірно', 'Втомлена', 'Дуже втомлена'];
export const WANT_LABELS = ['Не хочу', 'Трохи', 'Дуже'];

export function moodEmoji(m: number | null | undefined): string {
  if (m == null) return '·';
  return MOODS[Math.min(4, Math.max(0, Math.round(m) - 1))].emoji;
}
