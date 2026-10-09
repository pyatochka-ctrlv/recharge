// Збереження стану в localStorage з версіонуванням і безпечним відновленням.
// Усі дані залишаються лише на цьому пристрої.
import type { Activity, ActivityLog, AppState, DailyCheckIn, DataSet, PlannedActivity } from '../types';
import { SCHEMA_VERSION, defaultPrefs, defaultState, emptyData } from './defaults';
import { isIsoDate, isRecord, toEnergy, toLevel5, toMood, toText, toWant } from '../lib/validate';
import { DURATIONS, EFFORTS, COSTS, FORMATS } from '../data/labels';
import { CATEGORIES } from '../data/categories';

export const STORAGE_KEY = 'recharge-club:state';

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function sanitizeCheckIn(v: unknown): DailyCheckIn | null {
  if (!isRecord(v) || typeof v.id !== 'string' || !isIsoDate(v.timestamp)) return null;
  const energy = toEnergy(v.energy);
  if (energy == null) return null;
  const sp = isRecord(v.socialPreference) ? { social: toWant(v.socialPreference.social), alone: toWant(v.socialPreference.alone) } : null;
  return {
    id: v.id,
    timestamp: v.timestamp,
    energy,
    mood: toMood(v.mood),
    tension: toLevel5(v.tension),
    fatigue: toLevel5(v.fatigue),
    socialPreference: sp,
    note: toText(v.note),
    source: v.source === 'after-activity' ? 'after-activity' : 'check-in',
  };
}

function sanitizeLog(v: unknown): ActivityLog | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.activityId !== 'string' || !isIsoDate(v.startedAt)) return null;
  const want = v.wantRepeat === 'yes' || v.wantRepeat === 'maybe' || v.wantRepeat === 'no' ? v.wantRepeat : null;
  return {
    id: v.id,
    activityId: v.activityId,
    startedAt: v.startedAt,
    completedAt: isIsoDate(v.completedAt) ? v.completedAt : null,
    energyBefore: toEnergy(v.energyBefore),
    energyAfter: toEnergy(v.energyAfter),
    moodBefore: toMood(v.moodBefore),
    moodAfter: toMood(v.moodAfter),
    tensionBefore: toLevel5(v.tensionBefore),
    tensionAfter: toLevel5(v.tensionAfter),
    personalRating: toLevel5(v.personalRating),
    wantRepeat: want,
    liked: toText(v.liked),
    notes: toText(v.notes),
    ratingSkipped: v.ratingSkipped === true,
  };
}

function sanitizePlanned(v: unknown): PlannedActivity | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.activityId !== 'string' || !isIsoDate(v.scheduledAt)) return null;
  const status = v.status === 'done' || v.status === 'skipped' ? v.status : 'planned';
  return { id: v.id, activityId: v.activityId, scheduledAt: v.scheduledAt, status, note: toText(v.note), logId: typeof v.logId === 'string' ? v.logId : undefined };
}

const catIds = new Set(CATEGORIES.map((c) => c.id));

export function sanitizeActivity(v: unknown): Activity | null {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.title !== 'string' || !v.title.trim()) return null;
  const category = catIds.has(v.category as never) ? (v.category as Activity['category']) : 'emotional';
  const strs = (x: unknown) => arr(x).filter((s): s is string => typeof s === 'string');
  return {
    id: v.id,
    title: toText(v.title, 120),
    description: toText(v.description, 600),
    category,
    durationRange: DURATIONS.includes(v.durationRange as never) ? (v.durationRange as Activity['durationRange']) : '5-15',
    effortLevel: EFFORTS.includes(v.effortLevel as never) ? (v.effortLevel as Activity['effortLevel']) : 'low',
    costLevel: COSTS.includes(v.costLevel as never) ? (v.costLevel as Activity['costLevel']) : 'free',
    formats: strs(v.formats).filter((f) => FORMATS.includes(f as never)) as Activity['formats'],
    materials: strs(v.materials).slice(0, 20),
    contextTags: strs(v.contextTags) as Activity['contextTags'],
    accessibilityTags: strs(v.accessibilityTags) as Activity['accessibilityTags'],
    steps: strs(v.steps).slice(0, 20),
    isCustom: true,
    createdAt: isIsoDate(v.createdAt) ? v.createdAt : undefined,
  };
}

const notNull = <T,>(x: T | null): x is T => x != null;

export function sanitizeData(v: unknown): DataSet {
  if (!isRecord(v)) return emptyData();
  const meta: DataSet['activityMeta'] = {};
  if (isRecord(v.activityMeta)) {
    for (const [k, m] of Object.entries(v.activityMeta)) {
      if (!isRecord(m)) continue;
      meta[k] = {
        favorite: m.favorite === true || undefined,
        notMine: m.notMine === true || undefined,
        hidden: m.hidden === true || undefined,
        savedForLater: m.savedForLater === true || undefined,
        personalNote: typeof m.personalNote === 'string' ? m.personalNote.slice(0, 1000) : undefined,
        viewedAt: isIsoDate(m.viewedAt) ? m.viewedAt : undefined,
      };
    }
  }
  const strMap = (x: unknown) => (isRecord(x) ? Object.fromEntries(Object.entries(x).filter(([, s]) => typeof s === 'string')) as Record<string, string> : {});
  return {
    checkIns: arr(v.checkIns).map(sanitizeCheckIn).filter(notNull),
    logs: arr(v.logs).map(sanitizeLog).filter(notNull),
    planned: arr(v.planned).map(sanitizePlanned).filter(notNull),
    customActivities: arr(v.customActivities).map(sanitizeActivity).filter(notNull),
    activityMeta: meta,
    dayNotes: strMap(v.dayNotes),
    dismissed: strMap(v.dismissed),
  };
}

/** Міграції між версіями схеми. Поки що v1 — базова. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version < 1) {
    // майбутні міграції додаються тут послідовно
  }
  return { ...raw, version: SCHEMA_VERSION };
}

export function sanitizeState(input: unknown): AppState {
  if (!isRecord(input)) return defaultState();
  const raw = migrate(input);
  const base = defaultState();
  const p = isRecord(raw.prefs) ? raw.prefs : {};
  const prefs = { ...defaultPrefs(), ...p };
  prefs.theme = prefs.theme === 'barbie' ? 'barbie' : 'soft';
  prefs.detailLevel = prefs.detailLevel === 'short' ? 'short' : 'detailed';
  prefs.name = toText(prefs.name, 40);
  prefs.reminderTime = typeof prefs.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(prefs.reminderTime) ? prefs.reminderTime : '20:00';
  for (const k of ['favoriteCategories', 'excludedCategories', 'preferredDurations', 'preferredEffort', 'preferredFormats'] as const) {
    if (!Array.isArray(prefs[k])) (prefs as Record<string, unknown>)[k] = [];
  }
  for (const k of ['remindersEnabled', 'storeNotes', 'blurNotes', 'reduceMotion'] as const) {
    if (typeof prefs[k] !== 'boolean') (prefs as Record<string, unknown>)[k] = defaultPrefs()[k];
  }
  return {
    ...base,
    onboarded: raw.onboarded === true,
    mode: raw.mode === 'demo' && raw.demo ? 'demo' : 'real',
    prefs,
    real: sanitizeData(raw.real),
    demo: raw.demo ? sanitizeData(raw.demo) : null,
  };
}

export function loadState(): { state: AppState; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: defaultState(), error: null };
    return { state: sanitizeState(JSON.parse(raw)), error: null };
  } catch (e) {
    console.warn('Recharge Club: не вдалося прочитати збережені дані', e);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(`${STORAGE_KEY}:backup-${Date.now()}`, raw);
    } catch {
      /* сховище недоступне — нічого не робимо */
    }
    return { state: defaultState(), error: 'Не вдалося прочитати збережені дані. Застосунок відкрито з чистого аркуша, а копію старих даних збережено окремо в сховищі браузера.' };
  }
}

export function saveState(state: AppState): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch (e) {
    console.warn('Recharge Club: не вдалося зберегти дані', e);
    return 'Не вдалося зберегти зміни на пристрої (можливо, сховище переповнене або вимкнене в приватному режимі).';
  }
}
