import type { AccessibilityTag, Activity, ActivityFormat, CategoryId, ContextTag, CostLevel, DurationRange, EffortLevel } from '../../types';

/**
 * Компактний рядок опису заняття. Порядок полів:
 * [назва, опис, тривалість(1|5|15|30), зусилля(0–3), витрати(0–2), формати, матеріали, контекст, доступність, кроки]
 * — формати/контекст/доступність: рядок із тегами через пробіл;
 * — матеріали: через кому ('' — не потрібні);
 * — кроки: через ' | '.
 * Нові заняття додаються лише в кінець списку категорії, щоб ID лишалися стабільними.
 */
export type Row = [string, string, 1 | 5 | 15 | 30, 0 | 1 | 2 | 3, 0 | 1 | 2, string, string, string, string, string];

const DUR: Record<number, DurationRange> = { 1: '1-5', 5: '5-15', 15: '15-30', 30: '30+' };
const EFF: EffortLevel[] = ['minimal', 'low', 'medium', 'high'];
const COST: CostLevel[] = ['free', 'minimal', 'budget'];

const words = (s: string) => s.split(/\s+/).filter(Boolean);

export function defineCategory(category: CategoryId, prefix: string, rows: Row[]): Activity[] {
  return rows.map(([title, description, dur, effort, cost, formats, materials, context, access, steps], i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    title,
    description,
    category,
    durationRange: DUR[dur],
    effortLevel: EFF[effort],
    costLevel: COST[cost],
    formats: words(formats) as ActivityFormat[],
    materials: materials ? materials.split(',').map((m) => m.trim()).filter(Boolean) : [],
    contextTags: words(context) as ContextTag[],
    accessibilityTags: words(access) as AccessibilityTag[],
    steps: steps.split('|').map((s) => s.trim()).filter(Boolean),
    isCustom: false,
  }));
}
