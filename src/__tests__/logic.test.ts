import { describe, expect, it } from 'vitest';
import { generateDemoData } from '../data/demo';
import { BUILT_IN_ACTIVITIES, BUILT_IN_MAP } from '../data/activities';
import { personalInsights, dynamicsSeries, beforeAfterByCategory, logsInPeriod, sustainedLowMood } from '../lib/insights';
import { recommend, defaultCoachContext } from '../lib/recommend';
import { applyFilters, defaultFilters, PRESETS } from '../lib/filters';
import { activityStats } from '../lib/stats';
import { defaultPrefs, defaultState } from '../store/defaults';
import { sanitizeState } from '../store/persistence';
import { computeBadges } from '../lib/achievements';
import { dayKey, combineLocal } from '../lib/date';
import type { ActivityLog, DailyCheckIn } from '../types';

const byId = (id: string) => BUILT_IN_MAP[id];
const now = new Date('2026-10-09T15:00:00');
const demo = generateDemoData(now);

describe('демо-дані', () => {
  it('детерміновані й не в майбутньому', () => {
    const again = generateDemoData(now);
    expect(again.logs.length).toBe(demo.logs.length);
    expect(demo.checkIns.every((c) => new Date(c.timestamp) <= now)).toBe(true);
    expect(demo.logs.every((l) => new Date(l.startedAt) <= now)).toBe(true);
  });
  it('дають достатньо даних для персональних висновків', () => {
    const ins = personalInsights(demo.checkIns, demo.logs, byId, 'month', now);
    expect(ins.length).toBeGreaterThan(0);
    for (const i of ins) {
      expect(i.sampleSize).toBeGreaterThanOrEqual(0);
      expect(i.period.length).toBeGreaterThan(0);
    }
    console.log(ins.map((i) => `${i.insightType}: ${i.description}`).join('\n'));
  });
});

describe('аналітика', () => {
  it('порожні дані → «недостатньо даних», без вигаданих чисел', () => {
    const ins = personalInsights([], [], byId, 'month', now);
    expect(ins).toHaveLength(1);
    expect(ins[0].insightType).toBe('not-enough-data');
    expect(dynamicsSeries([], 'week', now).every((p) => p.energy == null)).toBe(true);
  });
  it('середні до/після рахуються з реальних записів', () => {
    const logs: ActivityLog[] = [
      { id: '1', activityId: 'cr-001', startedAt: '2026-10-08T10:00:00Z', completedAt: '2026-10-08T10:10:00Z', energyBefore: 40, energyAfter: 60, moodBefore: 2, moodAfter: 4, tensionBefore: 4, tensionAfter: 2, personalRating: 5, wantRepeat: 'yes', liked: '', notes: '', ratingSkipped: false },
      { id: '2', activityId: 'cr-002', startedAt: '2026-10-08T12:00:00Z', completedAt: '2026-10-08T12:10:00Z', energyBefore: 50, energyAfter: 50, moodBefore: 3, moodAfter: 3, tensionBefore: 3, tensionAfter: 3, personalRating: 3, wantRepeat: null, liked: '', notes: '', ratingSkipped: false },
    ];
    const ba = beforeAfterByCategory(logsInPeriod(logs, 'week', now), byId);
    expect(ba.overall.n).toBe(2);
    expect(ba.overall.energyBefore).toBe(45);
    expect(ba.overall.energyAfter).toBe(55);
    expect(ba.rows[0].moodDelta).toBe(1);
  });
  it('м’яка підказка про фахівця лише при тривалому погіршенні', () => {
    const mk = (d: number, mood: 1 | 4): DailyCheckIn => ({ id: `c${d}`, timestamp: new Date(now.getTime() - d * 86400000).toISOString(), energy: 15, mood, tension: 4, fatigue: 5, socialPreference: null, note: '' });
    expect(sustainedLowMood([1, 2, 3, 4, 5, 6].map((d) => mk(d, 1)), now)).toBe(true);
    expect(sustainedLowMood([1, 2, 3, 4, 5, 6].map((d) => mk(d, 4)), now)).toBe(false);
    expect(sustainedLowMood([1, 2].map((d) => mk(d, 1)), now)).toBe(false);
  });
});

describe('рекомендації', () => {
  const input = { activities: BUILT_IN_ACTIVITIES, logs: [], meta: {}, prefs: defaultPrefs(), now };
  it('низька енергія → лише мінімальні/низькі зусилля', () => {
    const recs = recommend({ ...defaultCoachContext(), energy: 10 }, input, { count: 5 });
    expect(recs.length).toBe(5);
    recs.forEach((r) => expect(['minimal', 'low']).toContain(r.activity.effortLevel));
  });
  it('враховує доступний час, приховані та небажані категорії', () => {
    const meta = { 'se-001': { hidden: true }, 'se-002': { notMine: true } };
    const recs = recommend({ ...defaultCoachContext(), minutes: 5 }, { ...input, meta, prefs: { ...defaultPrefs(), excludedCategories: ['social'] } }, { count: 30, diverse: false });
    recs.forEach((r) => {
      expect(r.activity.durationRange).toBe('1-5');
      expect(r.activity.category).not.toBe('social');
      expect(['se-001', 'se-002']).not.toContain(r.activity.id);
    });
  });
  it('бажання побути наодинці виключає заняття лише з іншими', () => {
    const recs = recommend({ ...defaultCoachContext(), social: 'alone', minutes: 60 }, input, { count: 40, diverse: false });
    recs.forEach((r) => expect(r.activity.formats.includes('together') && !r.activity.formats.includes('solo')).toBe(false));
  });
  it('особистий досвід піднімає заняття, після яких було краще', () => {
    const logs: ActivityLog[] = Array.from({ length: 4 }, (_, i) => ({ id: `l${i}`, activityId: 'em-010', startedAt: `2026-10-0${i + 1}T10:00:00Z`, completedAt: `2026-10-0${i + 1}T10:05:00Z`, energyBefore: 30, energyAfter: 55, moodBefore: 2, moodAfter: 4, tensionBefore: 4, tensionAfter: 2, personalRating: 5, wantRepeat: 'yes', liked: '', notes: '', ratingSkipped: false }));
    const recs = recommend({ ...defaultCoachContext(), scenario: 'feel-better', minutes: 15 }, { ...input, logs }, { count: 4 });
    expect(recs.map((r) => r.activity.id)).toContain('em-010');
  });
  it('сценарій «не знаю» дає 3 різні категорії', () => {
    const recs = recommend({ ...defaultCoachContext(), scenario: 'unsure' }, input, { count: 3 });
    expect(new Set(recs.map((r) => r.activity.category)).size).toBe(3);
  });
});

describe('фільтри', () => {
  const ctx = { meta: {}, stats: activityStats([]) };
  it('кожен пресет повертає результати', () => {
    for (const p of PRESETS.filter((x) => !x.special)) {
      const res = applyFilters(BUILT_IN_ACTIVITIES, { ...defaultFilters(), ...p.patch }, ctx);
      expect(res.length, p.label).toBeGreaterThan(5);
    }
  });
  it('пошук нечутливий до регістру й апострофів', () => {
    expect(applyFilters(BUILT_IN_ACTIVITIES, { ...defaultFilters(), query: "м'яка" }, ctx).length).toBeGreaterThan(0);
    expect(applyFilters(BUILT_IN_ACTIVITIES, { ...defaultFilters(), query: 'ЧАЙ' }, ctx).length).toBeGreaterThan(0);
  });
  it('без матеріалів і доступна енергія працюють', () => {
    const res = applyFilters(BUILT_IN_ACTIVITIES, { ...defaultFilters(), noMaterials: true, energy: 10 }, ctx);
    expect(res.length).toBeGreaterThan(0);
    res.forEach((a) => {
      expect(a.materials).toHaveLength(0);
      expect(a.effortLevel).toBe('minimal');
    });
  });
  it('приховані не показуються, але є в колекції «Приховані»', () => {
    const meta = { 'cr-001': { hidden: true } };
    expect(applyFilters(BUILT_IN_ACTIVITIES, defaultFilters(), { ...ctx, meta }).find((a) => a.id === 'cr-001')).toBeUndefined();
    expect(applyFilters(BUILT_IN_ACTIVITIES, { ...defaultFilters(), collection: 'hidden' }, { ...ctx, meta }).map((a) => a.id)).toEqual(['cr-001']);
  });
});

describe('збереження', () => {
  it('санітизує пошкоджені дані без падіння', () => {
    const s = sanitizeState({ onboarded: true, prefs: { theme: 'neon', name: 5 }, real: { checkIns: [{ id: 'x', timestamp: 'nope', energy: 50 }, { id: 'y', timestamp: '2026-10-01T10:00:00Z', energy: 900 }], logs: 'bad' } });
    expect(s.prefs.theme).toBe('soft');
    expect(s.real.checkIns).toHaveLength(1);
    expect(s.real.checkIns[0].energy).toBe(100);
    expect(s.real.logs).toEqual([]);
    expect(sanitizeState(null)).toEqual(defaultState());
  });
  it('round-trip JSON зберігає дані', () => {
    const st = { ...defaultState(), onboarded: true, mode: 'demo' as const, demo };
    const back = sanitizeState(JSON.parse(JSON.stringify(st)));
    expect(back.demo?.logs.length).toBe(demo.logs.length);
    expect(back.mode).toBe('demo');
  });
});

describe('дати', () => {
  it('ключ дня — локальна дата', () => {
    const d = new Date(2026, 9, 9, 23, 30);
    expect(dayKey(d)).toBe('2026-10-09');
    expect(dayKey(combineLocal('2026-10-09', '23:30'))).toBe('2026-10-09');
  });
});

describe('бейджі', () => {
  it('не залежать від streak і рахуються з даних', () => {
    const b = computeBadges(demo, BUILT_IN_ACTIVITIES, now);
    expect(b.find((x) => x.id === 'first')?.earned).toBe(true);
    expect(b.some((x) => /streak|поспіль/i.test(x.title + x.description))).toBe(false);
  });
});
