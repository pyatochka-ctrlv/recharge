// Аналітика на основі ЗБЕРЕЖЕНИХ даних. Жодних вигаданих чисел.
// Висновки сформульовані як спостереження («частіше збігалося»), а не причинність.
import type { Activity, ActivityLog, CategoryId, DailyCheckIn, DurationRange, EffortLevel, PersonalInsight } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../data/categories';
import { DURATIONS, DURATION_LABELS, EFFORTS, EFFORT_SHORT } from '../data/labels';
import { addDays, dayKey, dayPart, DAY_PART_LABELS, fmt, timeOf, weekdayIndex, WEEKDAY_SHORT, type DayPart } from './date';
import { activityStats, avg, completedLogs, logOutcome, round1 } from './stats';
import { times } from './plural';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'all';
export const PERIOD_LABELS: Record<Period, string> = { day: 'Сьогодні', week: '7 днів', month: '30 днів', quarter: '90 днів', all: 'Увесь час' };

export const MIN_SAMPLE = 4; // мінімум спостережень для висновку про групу
export const MIN_TOTAL = 8; // мінімум записів загалом для порівнянь

export function periodRange(period: Period, now = new Date(), earliest?: string): { start: Date; end: Date; days: number } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const startOf = (d: Date) => {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s;
  };
  const back = { day: 0, week: 6, month: 29, quarter: 89 } as const;
  if (period === 'all') {
    const s = earliest ? startOf(new Date(earliest)) : startOf(addDays(now, -29));
    const days = Math.max(1, Math.round((end.getTime() - s.getTime()) / 86400000));
    return { start: s, end, days };
  }
  return { start: startOf(addDays(now, -back[period])), end, days: back[period] + 1 };
}

export const periodDescription = (period: Period, now = new Date(), earliest?: string) => {
  const { start, end } = periodRange(period, now, earliest);
  return period === 'day' ? fmt(end, 'd MMMM') : `${fmt(start, 'd MMM')} – ${fmt(end, 'd MMM')}`;
};

const inRange = (iso: string, start: Date, end: Date) => {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
};

export interface SeriesPoint {
  label: string;
  key: string;
  energy: number | null;
  mood: number | null;
  tension: number | null;
  n: number;
}

/** Динаміка: для «Сьогодні» — точки check-in, інакше — середні по днях (порожні дні = розрив). */
export function dynamicsSeries(checkIns: DailyCheckIn[], period: Period, now = new Date()): SeriesPoint[] {
  const earliest = checkIns[0]?.timestamp;
  const { start, end } = periodRange(period, now, earliest);
  const items = checkIns.filter((c) => inRange(c.timestamp, start, end));
  if (period === 'day') {
    return items.map((c) => ({ label: timeOf(c.timestamp), key: c.id, energy: c.energy, mood: c.mood, tension: c.tension, n: 1 }));
  }
  const byDay = new Map<string, DailyCheckIn[]>();
  for (const c of items) {
    const k = dayKey(c.timestamp);
    byDay.set(k, [...(byDay.get(k) ?? []), c]);
  }
  const points: SeriesPoint[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const k = dayKey(d);
    const cs = byDay.get(k) ?? [];
    const nums = (f: (c: DailyCheckIn) => number | null) => cs.map(f).filter((x): x is number => x != null);
    const e = avg(nums((c) => c.energy));
    const m = avg(nums((c) => c.mood));
    const t = avg(nums((c) => c.tension));
    points.push({ label: fmt(d, 'd.MM'), key: k, energy: e == null ? null : Math.round(e), mood: m == null ? null : round1(m), tension: t == null ? null : round1(t), n: cs.length });
  }
  return points;
}

export function logsInPeriod(logs: ActivityLog[], period: Period, now = new Date()): ActivityLog[] {
  const earliest = logs[0]?.startedAt;
  const { start, end } = periodRange(period, now, earliest);
  return completedLogs(logs).filter((l) => inRange(l.startedAt, start, end));
}

export function checkInsInPeriod(checkIns: DailyCheckIn[], period: Period, now = new Date()): DailyCheckIn[] {
  const { start, end } = periodRange(period, now, checkIns[0]?.timestamp);
  return checkIns.filter((c) => inRange(c.timestamp, start, end));
}

export interface BeforeAfterRow {
  category: CategoryId;
  label: string;
  n: number;
  energyDelta: number | null;
  moodDelta: number | null;
  tensionDelta: number | null;
}

export function beforeAfterByCategory(logs: ActivityLog[], byId: (id: string) => Activity | undefined): { rows: BeforeAfterRow[]; overall: { n: number; energyBefore: number | null; energyAfter: number | null; moodBefore: number | null; moodAfter: number | null; tensionBefore: number | null; tensionAfter: number | null } } {
  const groups = new Map<CategoryId, ActivityLog[]>();
  const rated = logs.filter((l) => logOutcome(l) !== 'unknown');
  for (const l of rated) {
    const a = byId(l.activityId);
    if (!a) continue;
    groups.set(a.category, [...(groups.get(a.category) ?? []), l]);
  }
  const delta = (ls: ActivityLog[], b: keyof ActivityLog, a: keyof ActivityLog) => {
    const ds = ls.filter((l) => l[b] != null && l[a] != null).map((l) => (l[a] as number) - (l[b] as number));
    const v = avg(ds);
    return v == null ? null : round1(v);
  };
  const rows: BeforeAfterRow[] = [...groups].map(([category, ls]) => ({
    category,
    label: CATEGORY_MAP[category].short,
    n: ls.length,
    energyDelta: delta(ls, 'energyBefore', 'energyAfter'),
    moodDelta: delta(ls, 'moodBefore', 'moodAfter'),
    tensionDelta: delta(ls, 'tensionBefore', 'tensionAfter'),
  }));
  rows.sort((a, b) => b.n - a.n);
  const pick = (f: (l: ActivityLog) => number | null) => {
    const v = avg(rated.map(f).filter((x): x is number => x != null));
    return v == null ? null : round1(v);
  };
  return {
    rows,
    overall: {
      n: rated.length,
      energyBefore: pick((l) => l.energyBefore),
      energyAfter: pick((l) => l.energyAfter),
      moodBefore: pick((l) => l.moodBefore),
      moodAfter: pick((l) => l.moodAfter),
      tensionBefore: pick((l) => l.tensionBefore),
      tensionAfter: pick((l) => l.tensionAfter),
    },
  };
}

export function categoryCounts(logs: ActivityLog[], byId: (id: string) => Activity | undefined) {
  const counts = new Map<CategoryId, number>();
  for (const l of logs) {
    const a = byId(l.activityId);
    if (a) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  }
  return CATEGORIES.map((c) => ({ id: c.id, label: c.short, emoji: c.emoji, color: c.from, count: counts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function durationDistribution(logs: ActivityLog[], byId: (id: string) => Activity | undefined) {
  const c: Record<DurationRange, number> = { '1-5': 0, '5-15': 0, '15-30': 0, '30+': 0 };
  logs.forEach((l) => {
    const a = byId(l.activityId);
    if (a) c[a.durationRange]++;
  });
  return DURATIONS.map((d) => ({ key: d, label: DURATION_LABELS[d], count: c[d] }));
}

export function effortDistribution(logs: ActivityLog[], byId: (id: string) => Activity | undefined) {
  const c: Record<EffortLevel, number> = { minimal: 0, low: 0, medium: 0, high: 0 };
  logs.forEach((l) => {
    const a = byId(l.activityId);
    if (a) c[a.effortLevel]++;
  });
  return EFFORTS.map((e) => ({ key: e, label: EFFORT_SHORT[e], count: c[e] }));
}

export interface HeatCell {
  key: string;
  date: Date;
  energy: number | null;
  mood: number | null;
  logs: number;
  inFuture: boolean;
}

/** Теплова карта: тижні × дні (пн–нд), останні `weeks` тижнів. */
export function heatmap(checkIns: DailyCheckIn[], logs: ActivityLog[], weeks = 12, now = new Date()): HeatCell[][] {
  const byDay = new Map<string, DailyCheckIn[]>();
  checkIns.forEach((c) => {
    const k = dayKey(c.timestamp);
    byDay.set(k, [...(byDay.get(k) ?? []), c]);
  });
  const logCount = new Map<string, number>();
  completedLogs(logs).forEach((l) => logCount.set(dayKey(l.startedAt), (logCount.get(dayKey(l.startedAt)) ?? 0) + 1));
  const lastMonday = addDays(now, -weekdayIndex(now));
  const firstMonday = addDays(lastMonday, -(weeks - 1) * 7);
  const out: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstMonday, w * 7 + d);
      const k = dayKey(date);
      const cs = byDay.get(k) ?? [];
      const e = avg(cs.map((c) => c.energy));
      const m = avg(cs.map((c) => c.mood).filter((x): x is NonNullable<typeof x> => x != null));
      col.push({ key: k, date, energy: e == null ? null : Math.round(e), mood: m == null ? null : round1(m), logs: logCount.get(k) ?? 0, inFuture: k > dayKey(now) });
    }
    out.push(col);
  }
  return out;
}

export function topActivities(logs: ActivityLog[], byId: (id: string) => Activity | undefined, limit = 6) {
  const stats = activityStats(logs);
  return [...stats]
    .map(([id, s]) => ({ activity: byId(id), stat: s }))
    .filter((x): x is { activity: Activity; stat: (typeof x)['stat'] } => !!x.activity)
    .sort((a, b) => b.stat.count - a.stat.count)
    .slice(0, limit);
}

/** Заняття з ≥2 оціненими записами, впорядковані за часткою покращень. */
export function outcomeLists(logs: ActivityLog[], byId: (id: string) => Activity | undefined) {
  const stats = activityStats(logs);
  const rows = [...stats]
    .map(([id, s]) => ({ activity: byId(id), stat: s, rate: s.rated ? s.improved / s.rated : 0 }))
    .filter((x): x is { activity: Activity; stat: (typeof x)['stat']; rate: number } => !!x.activity && x.stat.rated >= 2);
  const helpful = rows.filter((r) => r.rate >= 0.5).sort((a, b) => b.rate - a.rate || b.stat.rated - a.stat.rated).slice(0, 6);
  const notHelpful = rows.filter((r) => r.rate < 0.34 || r.stat.worsened > r.stat.improved).sort((a, b) => a.rate - b.rate).slice(0, 6);
  return { helpful, notHelpful };
}

export interface TimePatterns {
  enough: boolean;
  n: number;
  byPart: { part: DayPart; label: string; energy: number | null; mood: number | null; n: number }[];
  byWeekday: { label: string; energy: number | null; n: number }[];
}

export function timePatterns(checkIns: DailyCheckIn[]): TimePatterns {
  const parts: DayPart[] = ['morning', 'day', 'evening', 'night'];
  const byPart = parts.map((p) => {
    const cs = checkIns.filter((c) => dayPart(new Date(c.timestamp)) === p);
    const e = avg(cs.map((c) => c.energy));
    const m = avg(cs.map((c) => c.mood).filter((x): x is NonNullable<typeof x> => x != null));
    return { part: p, label: DAY_PART_LABELS[p], energy: e == null ? null : Math.round(e), mood: m == null ? null : round1(m), n: cs.length };
  });
  const byWeekday = WEEKDAY_SHORT.map((label, i) => {
    const cs = checkIns.filter((c) => weekdayIndex(new Date(c.timestamp)) === i);
    const e = avg(cs.map((c) => c.energy));
    return { label, energy: e == null ? null : Math.round(e), n: cs.length };
  });
  const enough = checkIns.length >= 14 && byPart.filter((p) => p.n >= 3).length >= 2;
  return { enough, n: checkIns.length, byPart, byWeekday };
}

/** Текстові персональні спостереження з розміром вибірки та періодом. */
export function personalInsights(checkIns: DailyCheckIn[], logs: ActivityLog[], byId: (id: string) => Activity | undefined, period: Period, now = new Date()): PersonalInsight[] {
  const out: PersonalInsight[] = [];
  const periodText = periodDescription(period, now, logs[0]?.startedAt ?? checkIns[0]?.timestamp);
  const generatedAt = now.toISOString();
  const pl = logsInPeriod(logs, period, now);
  const pc = checkInsInPeriod(checkIns, period, now);
  const rated = pl.filter((l) => l.moodBefore != null && l.moodAfter != null);

  // 1. Категорії, після яких частіше відзначався кращий настрій
  if (rated.length >= MIN_TOTAL) {
    const overall = rated.filter((l) => (l.moodAfter as number) > (l.moodBefore as number)).length / rated.length;
    const groups = new Map<CategoryId, ActivityLog[]>();
    rated.forEach((l) => {
      const a = byId(l.activityId);
      if (a) groups.set(a.category, [...(groups.get(a.category) ?? []), l]);
    });
    const cands = [...groups]
      .filter(([, ls]) => ls.length >= MIN_SAMPLE)
      .map(([cat, ls]) => ({ cat, n: ls.length, up: ls.filter((l) => (l.moodAfter as number) > (l.moodBefore as number)).length }))
      .map((x) => ({ ...x, rate: x.up / x.n }));
    const best = cands.filter((c) => c.rate >= overall + 0.15 && c.up >= 3).sort((a, b) => b.rate - a.rate)[0];
    if (best) {
      out.push({
        id: `cat-mood-${best.cat}`,
        period: periodText,
        insightType: 'category-mood',
        description: `Після занять категорії «${CATEGORY_MAP[best.cat].short}» ти частіше відзначала покращення настрою: ${best.up} з ${best.n} записів (загалом — ${Math.round(overall * 100)}% записів). Це спостереження, а не гарантія.`,
        sampleSize: best.n,
        generatedAt,
      });
    }
    const low = cands.filter((c) => c.rate <= overall - 0.2).sort((a, b) => a.rate - b.rate)[0];
    if (low) {
      out.push({
        id: `cat-mood-low-${low.cat}`,
        period: periodText,
        insightType: 'category-mood',
        description: `Заняття категорії «${CATEGORY_MAP[low.cat].short}» рідше збігалися з покращенням настрою (${low.up} з ${low.n}). Можливо, вони тобі зараз менше відгукуються — і це теж корисне знання.`,
        sampleSize: low.n,
        generatedAt,
      });
    }
  }

  // 2. Тривалість занять у дні з низькою/вищою енергією
  const withEnergy = pl.filter((l) => l.energyBefore != null);
  const lowE = withEnergy.filter((l) => (l.energyBefore as number) < 40);
  const highE = withEnergy.filter((l) => (l.energyBefore as number) >= 60);
  if (lowE.length >= 6 && highE.length >= 6) {
    const shortShare = (ls: ActivityLog[]) => ls.filter((l) => byId(l.activityId)?.durationRange === '1-5' || byId(l.activityId)?.durationRange === '5-15').length / ls.length;
    const a = shortShare(lowE);
    const b = shortShare(highE);
    if (a - b >= 0.15) {
      out.push({
        id: 'duration-energy',
        period: periodText,
        insightType: 'duration-energy',
        description: `Короткі заняття (до 15 хв) частіше трапляються, коли твоя енергія нижча: ${Math.round(a * 100)}% проти ${Math.round(b * 100)}% у моменти з вищою енергією.`,
        sampleSize: lowE.length + highE.length,
        generatedAt,
      });
    }
  }

  // 3. Частина доби
  const tp = timePatterns(pc);
  if (tp.enough) {
    const valid = tp.byPart.filter((p) => p.n >= 3 && p.energy != null);
    const hi = [...valid].sort((x, y) => (y.energy as number) - (x.energy as number))[0];
    const lo = [...valid].sort((x, y) => (x.energy as number) - (y.energy as number))[0];
    if (hi && lo && hi !== lo && (hi.energy as number) - (lo.energy as number) >= 8) {
      out.push({
        id: 'time-of-day',
        period: periodText,
        insightType: 'time-of-day',
        description: `У записах цього періоду твоя суб’єктивна енергія в середньому вища в часі «${hi.label.toLowerCase()}» (${hi.energy}%), ніж у часі «${lo.label.toLowerCase()}» (${lo.energy}%).`,
        sampleSize: hi.n + lo.n,
        generatedAt,
      });
    }
  }

  // 4. Повторювані улюблені формати
  const stats = activityStats(pl);
  const catYes = new Map<CategoryId, number>();
  stats.forEach((s, id) => {
    const a = byId(id);
    if (a && s.wantYes) catYes.set(a.category, (catYes.get(a.category) ?? 0) + s.wantYes);
  });
  const favCat = [...catYes].sort((a, b) => b[1] - a[1])[0];
  if (favCat && favCat[1] >= 3) {
    out.push({
      id: `fav-${favCat[0]}`,
      period: periodText,
      insightType: 'favorite-format',
      description: `«${CATEGORY_MAP[favCat[0]].short}» може бути одним із форматів, які тобі подобаються: ти ${times(favCat[1])} позначала, що хочеш повторити такі заняття.`,
      sampleSize: favCat[1],
      generatedAt,
    });
  }

  if (!out.length) {
    out.push({
      id: 'not-enough',
      period: periodText,
      insightType: 'not-enough-data',
      description:
        rated.length + pc.length < 5
          ? 'У тебе поки недостатньо записів для надійних висновків — продовжуй досліджувати себе у власному темпі.'
          : 'Записів уже трохи є, але чітких закономірностей поки не видно. Це нормально: досліджуй далі без поспіху.',
      sampleSize: rated.length + pc.length,
      generatedAt,
    });
  }
  return out;
}

/** М’яка перевірка тривалого погіршення самопочуття (без діагнозів). */
export function sustainedLowMood(checkIns: DailyCheckIn[], now = new Date()): boolean {
  const since = addDays(now, -14).getTime();
  const recent = checkIns.filter((c) => new Date(c.timestamp).getTime() >= since && c.mood != null);
  if (recent.length < 6) return false;
  const days = new Set(recent.map((c) => dayKey(c.timestamp)));
  const lowDays = new Set(recent.filter((c) => (c.mood as number) <= 1 || ((c.mood as number) <= 2 && c.energy < 20)).map((c) => dayKey(c.timestamp)));
  return days.size >= 5 && lowDays.size / days.size >= 0.6;
}

export function weeklySummary(checkIns: DailyCheckIn[], logs: ActivityLog[], byId: (id: string) => Activity | undefined, now = new Date()) {
  const cs = checkInsInPeriod(checkIns, 'week', now);
  const ls = logsInPeriod(logs, 'week', now);
  const cats = categoryCounts(ls, byId);
  const e = avg(cs.map((c) => c.energy));
  const tried = new Set(ls.map((l) => l.activityId)).size;
  return { checkIns: cs.length, logs: ls.length, avgEnergy: e == null ? null : Math.round(e), topCategory: cats[0] ?? null, tried, days: new Set([...cs.map((c) => dayKey(c.timestamp)), ...ls.map((l) => dayKey(l.startedAt))]).size };
}

