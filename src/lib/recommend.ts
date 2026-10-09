// Персональні рекомендації. Жодних «наукових балів ефективності»:
// оцінка — це суміш відповідності поточному стану, налаштувань і ОСОБИСТОГО досвіду.
import type { Activity, ActivityLog, ActivityMeta, CategoryId, ContextTag, Level5, Mood, UserPreferences } from '../types';
import { CONTEXT_LABELS, EFFORT_RANK } from '../data/labels';
import { CATEGORY_MAP } from '../data/categories';
import { activityStats, completedLogs, logOutcome, type ActivityStat } from './stats';
import { isHomeOnly, isOutdoorOnly, isTogetherOnly, maxEffortForEnergy } from './filters';
import { dayKey, hashString } from './date';

export type Scenario = 'auto' | 'low-energy' | 'tension' | 'boredom' | 'social' | 'solitude' | 'unsure' | 'pleasure' | 'feel-better' | 'quick';

export const SCENARIO_LABELS: Record<Exclude<Scenario, 'auto'>, { label: string; emoji: string; hint: string }> = {
  'low-energy': { label: 'Мало енергії', emoji: '🪫', hint: 'Найпростіші, необов’язкові дії: пауза, базові потреби, затишок.' },
  tension: { label: 'Напружено', emoji: '🌪️', hint: 'Спокійна пауза, комфортне дихання, думки на папір, зміна контексту або людина, якій довіряєш.' },
  boredom: { label: 'Нудно', emoji: '🥱', hint: 'Маленький творчий експеримент, нова тема, гра чи мікропригода.' },
  social: { label: 'Хочу людей', emoji: '🫶', hint: 'Легкий контакт, спільна активність або коротка розмова.' },
  solitude: { label: 'Хочу побути сама', emoji: '🌙', hint: 'Заняття наодинці, без соціальних вимог.' },
  unsure: { label: 'Не знаю, чого хочу', emoji: '🎲', hint: 'Три дуже різні варіанти з мінімальним порогом входу. Можна відмовитися від усіх.' },
  pleasure: { label: 'Хочу приємного', emoji: '🍓', hint: 'Щось просто приємне — без користі й без мети.' },
  'feel-better': { label: 'Хочу почуватися краще', emoji: '🌷', hint: 'Те, після чого тобі раніше бувало краще, і м’які нові ідеї.' },
  quick: { label: 'Маю 5 хвилин', emoji: '⏱️', hint: 'Короткі заняття до 5 хвилин.' },
};

export type Minutes = 2 | 5 | 15 | 30 | 60;
export const MINUTE_OPTIONS: Minutes[] = [2, 5, 15, 30, 60];

export interface CoachContext {
  energy: number | null;
  mood: Mood | null;
  tension: Level5 | null;
  minutes: Minutes;
  social: 'any' | 'people' | 'alone';
  place: 'any' | 'home' | 'outside';
  hasMaterials: boolean;
  scenario: Scenario;
}

export const defaultCoachContext = (): CoachContext => ({
  energy: null,
  mood: null,
  tension: null,
  minutes: 15,
  social: 'any',
  place: 'any',
  hasMaterials: true,
  scenario: 'auto',
});

export interface RecommendInput {
  activities: Activity[];
  logs: ActivityLog[];
  meta: Record<string, ActivityMeta>;
  prefs: UserPreferences;
  now?: Date;
}

export interface Recommendation {
  activity: Activity;
  score: number;
  reasons: string[];
}

const allowedDurations = (m: Minutes) =>
  m <= 5 ? ['1-5'] : m <= 15 ? ['1-5', '5-15'] : m <= 30 ? ['1-5', '5-15', '15-30'] : ['1-5', '5-15', '15-30', '30+'];

export function resolveScenario(ctx: CoachContext): Exclude<Scenario, 'auto'> {
  if (ctx.scenario !== 'auto') return ctx.scenario;
  if (ctx.energy != null && ctx.energy < 30) return 'low-energy';
  if (ctx.tension != null && ctx.tension >= 4) return 'tension';
  if (ctx.social === 'people') return 'social';
  if (ctx.social === 'alone') return 'solitude';
  if (ctx.mood != null && ctx.mood <= 2) return 'feel-better';
  if (ctx.minutes <= 5) return 'quick';
  return 'pleasure';
}

interface ScenarioRule {
  context: ContextTag[];
  categories: CategoryId[];
  effortBonus?: Partial<Record<Activity['effortLevel'], number>>;
  maxDuration?: Minutes;
  maxEffort?: Activity['effortLevel'];
  history?: number; // вага особистої історії
  novelty?: number;
}

const RULES: Record<Exclude<Scenario, 'auto'>, ScenarioRule> = {
  'low-energy': { context: ['fatigue', 'cozy', 'stuck'], categories: ['basics', 'sensory'], effortBonus: { minimal: 3, low: 1 }, maxEffort: 'low', history: 1 },
  tension: { context: ['tension', 'overwhelm'], categories: ['mind', 'sensory', 'nature', 'adventure', 'social'], effortBonus: { minimal: 1, low: 1 }, history: 1.2 },
  boredom: { context: ['boredom', 'creative'], categories: ['creativity', 'inspiration', 'adventure'], history: 0.6, novelty: 1.5 },
  social: { context: ['social'], categories: ['social'], history: 1 },
  solitude: { context: ['solitude'], categories: ['creativity', 'sensory', 'mind', 'inspiration', 'digital'], history: 1 },
  unsure: { context: ['stuck', 'pleasure', 'cozy'], categories: [], effortBonus: { minimal: 2, low: 1 }, maxEffort: 'low', maxDuration: 15, history: 0.5, novelty: 0.5 },
  pleasure: { context: ['pleasure', 'cozy'], categories: ['sensory', 'beauty', 'creativity', 'emotional'], history: 1.6 },
  'feel-better': { context: ['low-mood'], categories: ['emotional', 'nature', 'social', 'sensory'], history: 2.2 },
  quick: { context: ['stuck', 'fatigue', 'focus'], categories: [], effortBonus: { minimal: 1.5, low: 1 }, maxDuration: 5, history: 1.2 },
};

/** Детермінований «шум» для різноманіття: стабільний протягом сесії, змінюється з seed. */
const jitter = (id: string, seed: number) => (hashString(`${id}:${seed}`) % 1000) / 1000;

function categoryHistory(logs: ActivityLog[], byId: Map<string, Activity>): Map<CategoryId, { n: number; improvedRate: number }> {
  const acc = new Map<CategoryId, { n: number; imp: number }>();
  for (const l of completedLogs(logs)) {
    const a = byId.get(l.activityId);
    if (!a) continue;
    const o = logOutcome(l);
    if (o === 'unknown') continue;
    const s = acc.get(a.category) ?? { n: 0, imp: 0 };
    s.n++;
    if (o === 'improved') s.imp++;
    acc.set(a.category, s);
  }
  return new Map([...acc].map(([k, v]) => [k, { n: v.n, improvedRate: v.imp / v.n }]));
}

function historyScore(s: ActivityStat | undefined): { score: number; reason?: string } {
  if (!s || s.count === 0) return { score: 0 };
  const md = s.moodDeltaN ? s.moodDeltaSum / s.moodDeltaN : 0;
  const ed = s.energyDeltaN ? s.energyDeltaSum / s.energyDeltaN : 0;
  const td = s.tensionDeltaN ? s.tensionDeltaSum / s.tensionDeltaN : 0;
  const r = s.ratingCount ? s.ratingSum / s.ratingCount - 3 : 0;
  const confidence = Math.min(s.count, 4) / 4;
  let score = (md * 1.2 + ed / 12 - td * 0.8 + r * 0.6) * confidence + s.wantYes * 0.6 - s.wantNo * 1.5;
  score = Math.max(-4, Math.min(4, score));
  let reason: string | undefined;
  if (s.improved > 0 && s.improved >= s.worsened && score > 0.4) reason = `Тобі раніше бувало краще після цього (${s.improved} з ${s.count})`;
  else if (s.wantYes > 0 && score > 0) reason = 'Ти хотіла повторити це заняття';
  return { score, reason };
}

export function recommend(ctx: CoachContext, input: RecommendInput, opts: { count?: number; exclude?: Set<string>; seed?: number; diverse?: boolean } = {}): Recommendation[] {
  const { activities, logs, meta, prefs } = input;
  const now = input.now ?? new Date();
  const count = opts.count ?? 4;
  const seed = opts.seed ?? hashString(dayKey(now));
  const scenario = resolveScenario(ctx);
  const rule = RULES[scenario];
  const stats = activityStats(logs);
  const byId = new Map(activities.map((a) => [a.id, a]));
  const catHist = categoryHistory(logs, byId);
  const todayKey = dayKey(now);
  const doneToday = new Set(completedLogs(logs).filter((l) => dayKey(l.startedAt) === todayKey).map((l) => l.activityId));

  const minutes = rule.maxDuration ? (Math.min(rule.maxDuration, ctx.minutes) as Minutes) : ctx.minutes;
  const durOk = allowedDurations(minutes);
  const effortCaps = [rule.maxEffort, ctx.energy != null ? maxEffortForEnergy(ctx.energy) : undefined].filter(Boolean) as Activity['effortLevel'][];
  const maxEffortRank = effortCaps.length ? Math.min(...effortCaps.map((e) => EFFORT_RANK[e])) : 3;

  const scored: Recommendation[] = [];
  for (const a of activities) {
    const m = meta[a.id] ?? {};
    if (m.hidden || m.notMine) continue;
    if (prefs.excludedCategories.includes(a.category)) continue;
    if (opts.exclude?.has(a.id)) continue;
    if (!durOk.includes(a.durationRange)) continue;
    if (EFFORT_RANK[a.effortLevel] > maxEffortRank) continue;
    if (ctx.place === 'home' && isOutdoorOnly(a)) continue;
    if (ctx.place === 'outside' && isHomeOnly(a)) continue;
    if (!ctx.hasMaterials && a.materials.length > 0) continue;
    if ((ctx.social === 'alone' || scenario === 'solitude') && isTogetherOnly(a)) continue;
    if (scenario === 'social' && !a.formats.includes('together') && !a.contextTags.includes('social')) continue;

    const reasons: string[] = [];
    let score = 0;

    const ctxHits = a.contextTags.filter((t) => rule.context.includes(t));
    if (ctxHits.length) {
      score += 2 + ctxHits.length;
      reasons.push(`Може підійти, коли: ${CONTEXT_LABELS[ctxHits[0]].toLowerCase()}`);
    }
    if (rule.categories.includes(a.category)) score += 1.5;
    score += rule.effortBonus?.[a.effortLevel] ?? 0;
    if (ctx.mood != null && ctx.mood <= 2 && a.contextTags.includes('low-mood')) score += 1;
    if (ctx.social === 'people' && a.formats.includes('together')) score += 1.5;
    if (ctx.social === 'alone' && a.formats.includes('solo')) score += 0.8;

    const st = stats.get(a.id);
    const h = historyScore(st);
    score += h.score * (rule.history ?? 1);
    if (h.reason) reasons.unshift(h.reason);

    const ch = catHist.get(a.category);
    if (ch && ch.n >= 3) score += (ch.improvedRate - 0.5) * 1.5;

    if (m.favorite) {
      score += 2;
      reasons.push('У твоєму обраному');
    }
    if (m.savedForLater) score += 0.8;
    if (prefs.favoriteCategories.includes(a.category)) {
      score += 1.5;
      reasons.push(`З улюбленої категорії «${CATEGORY_MAP[a.category].short}»`);
    }
    if (prefs.preferredDurations.includes(a.durationRange)) score += 0.7;
    if (prefs.preferredEffort.includes(a.effortLevel)) score += 0.7;
    if (prefs.preferredFormats.some((f) => a.formats.includes(f))) score += 0.5;

    if (!st) {
      score += rule.novelty ?? 0.3;
      if ((rule.novelty ?? 0) >= 1) reasons.push('Нове для тебе — можна дослідити');
    }
    if (doneToday.has(a.id)) score -= 2.5;

    if (a.durationRange === '1-5') reasons.push('Займе лише кілька хвилин');
    if (a.effortLevel === 'minimal') reasons.push('Мінімум зусиль');

    score += jitter(a.id, seed) * 1.6;
    scored.push({ activity: a, score, reasons: reasons.slice(0, 3) });
  }

  scored.sort((x, y) => y.score - x.score);
  const diverse = opts.diverse ?? true;
  if (!diverse) return scored.slice(0, count);

  // Різноманіття: спершу по одному заняттю з категорії.
  const picked: Recommendation[] = [];
  const usedCats = new Set<CategoryId>();
  for (const r of scored) {
    if (picked.length >= count) break;
    if (usedCats.has(r.activity.category)) continue;
    picked.push(r);
    usedCats.add(r.activity.category);
  }
  for (const r of scored) {
    if (picked.length >= count) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked;
}

/** Surprise Me: випадковий вибір з найкращих кандидатів (зважений). */
export function surprise(ctx: CoachContext, input: RecommendInput, exclude?: Set<string>): Recommendation | null {
  const pool = recommend(ctx, input, { count: 30, exclude, seed: Math.floor(Math.random() * 1e9), diverse: false });
  if (!pool.length) return null;
  const min = Math.min(...pool.map((p) => p.score));
  const weights = pool.map((p) => p.score - min + 0.5);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}
