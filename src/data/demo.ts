// Генератор ДЕМОНСТРАЦІЙНИХ даних. Вони зберігаються окремо від реальних
// (AppState.demo) і всюди в інтерфейсі позначаються як демо.
import type { ActivityLog, DailyCheckIn, DataSet, Level5, Mood, PlannedActivity } from '../types';
import { BUILT_IN_ACTIVITIES } from './activities';
import { addDays, dayKey } from '../lib/date';
import { clamp } from '../lib/validate';
import { emptyData } from '../store/defaults';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Умовні «вподобання» вигаданої демо-користувачки — щоб графіки мали що показати.
const CATEGORY_EFFECT: Record<string, { e: number; m: number; t: number }> = {
  creativity: { e: 6, m: 0.8, t: -0.6 },
  nature: { e: 9, m: 0.7, t: -0.8 },
  movement: { e: 10, m: 0.6, t: -0.5 },
  mind: { e: 3, m: 0.4, t: -1.0 },
  sensory: { e: 5, m: 0.6, t: -0.9 },
  social: { e: 4, m: 0.7, t: -0.3 },
  digital: { e: -2, m: 0.0, t: 0.1 },
  home: { e: 1, m: 0.2, t: -0.1 },
  basics: { e: 6, m: 0.4, t: -0.5 },
  beauty: { e: 4, m: 0.6, t: -0.4 },
  inspiration: { e: 3, m: 0.4, t: -0.3 },
  adventure: { e: 7, m: 0.8, t: -0.4 },
  emotional: { e: 3, m: 0.6, t: -0.5 },
};

const NOTES = ['Довгий робочий день, але вечір був теплим', 'Погано спала', 'Зустріч із подругою 💗', 'Хочеться тиші', 'Сонячно й легко', 'Багато дзвінків', ''];

export function generateDemoData(now = new Date(), seed = 20250214): DataSet {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const data = emptyData();
  const DAYS = 63;

  const favPool = BUILT_IN_ACTIVITIES.filter((a) => ['creativity', 'nature', 'sensory', 'mind', 'movement', 'social', 'digital', 'basics', 'beauty', 'emotional'].includes(a.category));
  const usual = Array.from({ length: 22 }, () => pick(favPool));

  for (let i = DAYS; i >= 0; i--) {
    const day = addDays(now, -i);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    if (r() < 0.12 && i !== 0) continue; // пропущені дні — це нормально
    const base = 52 + (weekend ? 10 : 0) + Math.sin(i / 6) * 8;
    const slots: [number, number][] = [
      [8 + Math.floor(r() * 2), 0],
      [13 + Math.floor(r() * 3), -10],
      [19 + Math.floor(r() * 3), -6],
    ];
    let lastEnergy = base;
    let lastMood: Mood = 3;
    let lastTension: Level5 = 3;
    for (const [h, shift] of slots) {
      if (r() < 0.38) continue;
      const ts = new Date(day);
      ts.setHours(h, Math.floor(r() * 60), 0, 0);
      if (ts > now) continue;
      const energy = Math.round(clamp(base + shift + (r() - 0.5) * 30, 5, 98));
      const mood = clamp(Math.round(energy / 22 + (r() - 0.3) * 1.6), 1, 5) as Mood;
      const tension = clamp(Math.round(5 - energy / 25 + (r() - 0.5) * 2), 1, 5) as Level5;
      const ci: DailyCheckIn = {
        id: `demo-ci-${i}-${h}`,
        timestamp: ts.toISOString(),
        energy,
        mood,
        tension,
        fatigue: clamp(Math.round(5.5 - energy / 22), 1, 5) as Level5,
        socialPreference: { social: Math.floor(r() * 3) as 0 | 1 | 2, alone: Math.floor(r() * 3) as 0 | 1 | 2 },
        note: r() < 0.2 ? pick(NOTES) : '',
        source: 'check-in',
      };
      data.checkIns.push(ci);
      lastEnergy = energy;
      lastMood = mood;
      lastTension = tension;
    }

    const nLogs = 1 + Math.floor(r() * 3);
    for (let k = 0; k < nLogs; k++) {
      const a = r() < 0.65 ? pick(usual) : pick(BUILT_IN_ACTIVITIES);
      const fx = CATEGORY_EFFECT[a.category] ?? { e: 2, m: 0.3, t: -0.3 };
      const start = new Date(day);
      start.setHours(10 + Math.floor(r() * 11), Math.floor(r() * 60), 0, 0);
      if (start > now) continue;
      const mins = a.durationRange === '1-5' ? 4 : a.durationRange === '5-15' ? 12 : a.durationRange === '15-30' ? 25 : 50;
      const end = new Date(start.getTime() + mins * 60000);
      const skipped = r() < 0.12;
      const eB = Math.round(clamp(lastEnergy + (r() - 0.5) * 10, 5, 95));
      const noise = (r() - 0.45) * 2;
      const log: ActivityLog = {
        id: `demo-log-${i}-${k}`,
        activityId: a.id,
        startedAt: start.toISOString(),
        completedAt: end.toISOString(),
        energyBefore: skipped ? null : eB,
        energyAfter: skipped ? null : Math.round(clamp(eB + fx.e + noise * 8, 0, 100)),
        moodBefore: skipped ? null : lastMood,
        moodAfter: skipped ? null : (clamp(Math.round(lastMood + fx.m + noise * 0.6), 1, 5) as Mood),
        tensionBefore: skipped ? null : lastTension,
        tensionAfter: skipped ? null : (clamp(Math.round(lastTension + fx.t + noise * 0.5), 1, 5) as Level5),
        personalRating: skipped ? null : (clamp(Math.round(3 + fx.m * 1.5 + noise), 1, 5) as Level5),
        wantRepeat: skipped ? null : fx.m + noise * 0.5 > 0.5 ? 'yes' : fx.m + noise * 0.5 > 0 ? 'maybe' : 'no',
        liked: !skipped && r() < 0.25 ? pick(['Тиша', 'Що було просто', 'Кольори', 'Свіже повітря', 'Сміялися разом', 'Нікуди не поспішала']) : '',
        notes: '',
        ratingSkipped: skipped,
      };
      data.logs.push(log);
    }
  }

  // Заплановане: кілька минулих виконаних і кілька майбутніх
  const planned: PlannedActivity[] = [];
  for (let d = -5; d <= 9; d++) {
    if (r() < 0.45) continue;
    const day = addDays(now, d);
    day.setHours(d % 2 === 0 ? 18 : 12, 30, 0, 0);
    const a = pick(usual);
    planned.push({
      id: `demo-plan-${d}`,
      activityId: a.id,
      scheduledAt: day.toISOString(),
      status: day < now ? (r() < 0.7 ? 'done' : 'skipped') : 'planned',
      note: r() < 0.3 ? 'Після роботи' : '',
    });
  }
  data.planned = planned;

  // Особисті позначки
  usual.slice(0, 6).forEach((a) => (data.activityMeta[a.id] = { ...data.activityMeta[a.id], favorite: true }));
  data.activityMeta['mo-016'] = { notMine: true };
  data.activityMeta['ho-015'] = { notMine: true };
  ['cr-003', 'na-012', 'ad-006'].forEach((id) => (data.activityMeta[id] = { ...data.activityMeta[id], savedForLater: true }));

  data.dayNotes[dayKey(addDays(now, -2))] = 'Помітила, що після прогулянки легше заснути.';
  data.dayNotes[dayKey(addDays(now, -9))] = 'День був важкий. Дозволила собі нічого не робити ввечері.';

  data.customActivities.push({
    id: 'custom-demo-1',
    title: 'Танці з котом на кухні',
    description: 'Увімкнути щось ритмічне, поки закипає чайник, і потанцювати (кіт може не погоджуватися).',
    category: 'movement',
    durationRange: '1-5',
    effortLevel: 'low',
    costLevel: 'free',
    formats: ['home', 'solo'],
    materials: [],
    contextTags: ['low-mood', 'pleasure'],
    accessibilityTags: [],
    steps: ['Увімкни улюблену пісню', 'Танцюй, поки закипає вода'],
    isCustom: true,
    createdAt: addDays(now, -20).toISOString(),
  });

  data.checkIns.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  data.logs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return data;
}
