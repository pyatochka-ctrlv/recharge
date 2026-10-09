// М’яка гейміфікація: відзначаємо ДОСЛІДЖЕННЯ себе, а не регулярність чи високі показники.
// Жодних streaks, рейтингів і покарань за пропуски.
import type { Activity, CategoryId, DataSet } from '../types';
import { CATEGORIES } from '../data/categories';
import { addDays } from './date';
import { activityStats, completedLogs, logOutcome } from './stats';

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
  progress?: { value: number; total: number };
}

export function computeBadges(data: DataSet, activities: Activity[], now = new Date()): Badge[] {
  const byId = new Map(activities.map((a) => [a.id, a]));
  const logs = completedLogs(data.logs);
  const stats = activityStats(data.logs);
  const tried = [...stats.keys()].map((id) => byId.get(id)).filter((a): a is Activity => !!a);
  const cats = new Set(tried.map((a) => a.category));
  const countCat = (c: CategoryId) => tried.filter((a) => a.category === c).length;
  const quiet = tried.filter((a) => a.accessibilityTags.includes('quiet')).length;
  const rated = logs.filter((l) => logOutcome(l) !== 'unknown').length;
  const weekAgo = addDays(now, -7).toISOString();
  const firstTimes = new Map<string, string>();
  logs.forEach((l) => {
    const prev = firstTimes.get(l.activityId);
    if (!prev || l.startedAt < prev) firstTimes.set(l.activityId, l.startedAt);
  });
  const newThisWeek = [...firstTimes.values()].filter((t) => t >= weekAgo).length;
  const favoriteFound = [...stats.values()].some((s) => s.wantYes >= 2 || (s.ratingCount > 0 && s.ratingSum / s.ratingCount >= 4.5));
  const metas = Object.values(data.activityMeta);
  const p = (value: number, total: number) => ({ value: Math.min(value, total), total });

  return [
    { id: 'first', emoji: '🌱', title: 'Перший крок', description: 'Записала перше заняття для відновлення.', earned: logs.length > 0, progress: p(logs.length, 1) },
    { id: 'new-week', emoji: '✨', title: 'Спробувала щось нове', description: 'Цього тижня з’явилося заняття, якого ти раніше не пробувала.', earned: newThisWeek > 0 },
    { id: 'favorite', emoji: '💖', title: 'Знайшла свою улюблену', description: 'Є заняття, яке ти хочеш повторювати або оцінила дуже високо.', earned: favoriteFound },
    { id: 'explorer-5', emoji: '🧭', title: 'Дослідниця', description: 'Спробувала 5 різних занять.', earned: tried.length >= 5, progress: p(tried.length, 5) },
    { id: 'explorer-25', emoji: '🗺️', title: 'Картографиня ресурсу', description: 'Спробувала 25 різних занять.', earned: tried.length >= 25, progress: p(tried.length, 25) },
    { id: 'cat-5', emoji: '🎀', title: 'Різнобарвна', description: 'Заняття з 5 різних категорій.', earned: cats.size >= 5, progress: p(cats.size, 5) },
    { id: 'cat-all', emoji: '👑', title: 'Уся палітра', description: `Хоча б одне заняття з кожної з ${CATEGORIES.length} категорій.`, earned: cats.size >= CATEGORIES.length, progress: p(cats.size, CATEGORIES.length) },
    { id: 'listener', emoji: '🎧', title: 'Слухаю себе', description: 'Оцінила свій стан до і після 5 разів.', earned: rated >= 5, progress: p(rated, 5) },
    { id: 'not-mine', emoji: '🙅‍♀️', title: 'Знаю, що мені не підходить', description: 'Позначила заняття як «не моє». Це теж знання про себе.', earned: metas.some((m) => m.notMine) },
    { id: 'own', emoji: '🪄', title: 'Власний рецепт', description: 'Додала власне заняття в бібліотеку.', earned: data.customActivities.length > 0 },
    { id: 'quiet', emoji: '🤍', title: 'Тиха гавань', description: 'Спробувала 3 тихі заняття.', earned: quiet >= 3, progress: p(quiet, 3) },
    { id: 'social', emoji: '🫶', title: 'Тепло поруч', description: 'Спробувала 3 соціальні заняття.', earned: countCat('social') >= 3, progress: p(countCat('social'), 3) },
    { id: 'nature', emoji: '🌿', title: 'Подруга природи', description: 'Спробувала 3 заняття на природі.', earned: countCat('nature') >= 3, progress: p(countCat('nature'), 3) },
    { id: 'creative', emoji: '🎨', title: 'Творча студія', description: 'Спробувала 3 творчі заняття.', earned: countCat('creativity') >= 3, progress: p(countCat('creativity'), 3) },
    { id: 'planner', emoji: '📅', title: 'Приємність у календарі', description: 'Запланувала приємне заняття наперед.', earned: data.planned.length > 0 },
  ];
}

/** Персональна карта відновлення: скільки занять кожної категорії вже відкрито. */
export function recoveryMap(data: DataSet, activities: Activity[]) {
  const stats = activityStats(data.logs);
  return CATEGORIES.map((c) => {
    const inCat = activities.filter((a) => a.category === c.id);
    const triedN = inCat.filter((a) => stats.has(a.id)).length;
    return { category: c, tried: triedN, total: inCat.length };
  });
}
