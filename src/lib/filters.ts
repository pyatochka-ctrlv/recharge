import type { AccessibilityTag, Activity, ActivityMeta, CategoryId, ContextTag, CostLevel, DurationRange, EffortLevel } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { EFFORT_RANK } from '../data/labels';
import { type ActivityStat, personalScore } from './stats';

export type Collection = 'all' | 'favorites' | 'saved' | 'recent' | 'new' | 'untried' | 'top' | 'custom' | 'notMine' | 'hidden';
export type Place = 'any' | 'home' | 'outdoor' | 'online';
export type SocialFormat = 'any' | 'solo' | 'together';
export type SortKey = 'default' | 'title' | 'short' | 'easy' | 'personal';

export interface FilterState {
  query: string;
  categories: CategoryId[];
  durations: DurationRange[];
  energy: number | null; // доступний рівень енергії → максимальні зусилля
  efforts: EffortLevel[];
  costs: CostLevel[];
  place: Place;
  social: SocialFormat;
  moods: ContextTag[];
  access: AccessibilityTag[];
  noMaterials: boolean;
  collection: Collection;
  sort: SortKey;
}

export const defaultFilters = (): FilterState => ({
  query: '',
  categories: [],
  durations: [],
  energy: null,
  efforts: [],
  costs: [],
  place: 'any',
  social: 'any',
  moods: [],
  access: [],
  noMaterials: false,
  collection: 'all',
  sort: 'default',
});

export const COLLECTION_LABELS: Record<Collection, string> = {
  all: 'Усі',
  favorites: 'Обране',
  saved: 'На потім',
  recent: 'Нещодавні',
  new: 'Нові для мене',
  untried: 'Ще не пробувала',
  top: 'Найкраще оцінені',
  custom: 'Мої заняття',
  notMine: '«Не моє»',
  hidden: 'Приховані',
};

export const SORT_LABELS: Record<SortKey, string> = {
  default: 'За категоріями',
  title: 'За назвою',
  short: 'Спершу коротші',
  easy: 'Спершу легші',
  personal: 'За моїми оцінками',
};

/** Енергія 0–100 → найвищий рівень зусиль, який варто пропонувати. */
export function maxEffortForEnergy(energy: number): EffortLevel {
  if (energy < 20) return 'minimal';
  if (energy < 40) return 'low';
  if (energy < 70) return 'medium';
  return 'high';
}

export interface Preset {
  id: string;
  label: string;
  emoji: string;
  patch: Partial<FilterState>;
  special?: 'unsure';
}

export const PRESETS: Preset[] = [
  { id: 'two-min', label: 'У мене лише 2 хвилини', emoji: '⏱️', patch: { durations: ['1-5'] } },
  { id: 'min-effort', label: 'Мінімум зусиль', emoji: '🛋️', patch: { efforts: ['minimal'] } },
  { id: 'creative', label: 'Хочу творчості', emoji: '🎨', patch: { moods: ['creative'] } },
  { id: 'quiet', label: 'Хочу тиші', emoji: '🤫', patch: { access: ['quiet'], social: 'solo' } },
  { id: 'people', label: 'Хочу людей', emoji: '🫶', patch: { social: 'together' } },
  { id: 'outside', label: 'Хочу вийти з дому', emoji: '🌤️', patch: { place: 'outdoor' } },
  { id: 'cozy', label: 'Хочу затишку', emoji: '🧸', patch: { moods: ['cozy'] } },
  { id: 'unsure', label: 'Не знаю, чого хочу', emoji: '🎲', patch: {}, special: 'unsure' },
  { id: 'hard-start', label: 'Мені складно навіть почати', emoji: '🌱', patch: { durations: ['1-5'], efforts: ['minimal'] } },
];

const norm = (s: string) => s.toLowerCase().replace(/[’'`ʼ]/g, '').replace(/ё/g, 'е').trim();

export function matchesQuery(a: Activity, q: string): boolean {
  if (!q) return true;
  const hay = norm([a.title, a.description, CATEGORY_MAP[a.category]?.label ?? '', CATEGORY_MAP[a.category]?.short ?? '', a.materials.join(' ')].join(' '));
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export interface FilterContext {
  meta: Record<string, ActivityMeta>;
  stats: Map<string, ActivityStat>;
}

const isOutdoorOnly = (a: Activity) => a.formats.includes('outdoor') && !a.formats.includes('home');
const isHomeOnly = (a: Activity) => a.formats.includes('home') && !a.formats.includes('outdoor');
const isTogetherOnly = (a: Activity) => a.formats.includes('together') && !a.formats.includes('solo');

export function applyFilters(list: Activity[], f: FilterState, ctx: FilterContext): Activity[] {
  const { meta, stats } = ctx;
  const out = list.filter((a) => {
    const m = meta[a.id] ?? {};
    // Колекції
    switch (f.collection) {
      case 'hidden':
        if (!m.hidden) return false;
        break;
      case 'notMine':
        if (!m.notMine) return false;
        break;
      default:
        if (m.hidden || m.notMine) return false;
    }
    if (f.collection === 'favorites' && !m.favorite) return false;
    if (f.collection === 'saved' && !m.savedForLater) return false;
    if (f.collection === 'recent' && !stats.get(a.id)) return false;
    if (f.collection === 'new' && m.viewedAt) return false;
    if (f.collection === 'untried' && stats.get(a.id)) return false;
    if (f.collection === 'top' && personalScore(stats.get(a.id)) == null) return false;
    if (f.collection === 'custom' && !a.isCustom) return false;

    if (!matchesQuery(a, f.query)) return false;
    if (f.categories.length && !f.categories.includes(a.category)) return false;
    if (f.durations.length && !f.durations.includes(a.durationRange)) return false;
    if (f.efforts.length && !f.efforts.includes(a.effortLevel)) return false;
    if (f.energy != null && EFFORT_RANK[a.effortLevel] > EFFORT_RANK[maxEffortForEnergy(f.energy)]) return false;
    if (f.costs.length && !f.costs.includes(a.costLevel)) return false;
    if (f.place === 'home' && isOutdoorOnly(a)) return false;
    if (f.place === 'outdoor' && !a.formats.includes('outdoor')) return false;
    if (f.place === 'online' && !a.formats.includes('online')) return false;
    if (f.social === 'solo' && isTogetherOnly(a)) return false;
    if (f.social === 'together' && !a.formats.includes('together')) return false;
    if (f.moods.length && !f.moods.some((t) => a.contextTags.includes(t))) return false;
    if (f.access.length && !f.access.every((t) => a.accessibilityTags.includes(t))) return false;
    if (f.noMaterials && a.materials.length > 0) return false;
    return true;
  });

  const durRank = { '1-5': 0, '5-15': 1, '15-30': 2, '30+': 3 } as const;
  switch (f.sort) {
    case 'title':
      out.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
      break;
    case 'short':
      out.sort((a, b) => durRank[a.durationRange] - durRank[b.durationRange]);
      break;
    case 'easy':
      out.sort((a, b) => EFFORT_RANK[a.effortLevel] - EFFORT_RANK[b.effortLevel]);
      break;
    case 'personal':
      out.sort((a, b) => (personalScore(stats.get(b.id)) ?? -1) - (personalScore(stats.get(a.id)) ?? -1));
      break;
    default:
      if (f.collection === 'recent') out.sort((a, b) => (stats.get(b.id)?.lastAt ?? '').localeCompare(stats.get(a.id)?.lastAt ?? ''));
      else if (f.collection === 'top') out.sort((a, b) => (personalScore(stats.get(b.id)) ?? 0) - (personalScore(stats.get(a.id)) ?? 0));
  }
  return out;
}

export function countActiveFilters(f: FilterState): number {
  return (
    f.categories.length +
    f.durations.length +
    (f.energy != null ? 1 : 0) +
    f.efforts.length +
    f.costs.length +
    (f.place !== 'any' ? 1 : 0) +
    (f.social !== 'any' ? 1 : 0) +
    f.moods.length +
    f.access.length +
    (f.noMaterials ? 1 : 0)
  );
}

export { isHomeOnly, isOutdoorOnly, isTogetherOnly };
