import type { Activity, ActivityLog } from '../types';

export interface ActivityStat {
  count: number;
  lastAt: string | null;
  rated: number; // записи з оцінкою до і після
  ratingSum: number;
  ratingCount: number;
  moodDeltaSum: number;
  moodDeltaN: number;
  energyDeltaSum: number;
  energyDeltaN: number;
  tensionDeltaSum: number;
  tensionDeltaN: number;
  improved: number;
  worsened: number;
  wantYes: number;
  wantNo: number;
}

export const completedLogs = (logs: ActivityLog[]) => logs.filter((l) => l.completedAt);

/** Чи вказують оцінки до/після на покращення самопочуття (за суб’єктивними оцінками). */
export function logOutcome(l: ActivityLog): 'improved' | 'worsened' | 'same' | 'unknown' {
  let score = 0;
  let known = false;
  if (l.moodBefore != null && l.moodAfter != null) {
    known = true;
    score += Math.sign(l.moodAfter - l.moodBefore);
  }
  if (l.energyBefore != null && l.energyAfter != null) {
    known = true;
    const d = l.energyAfter - l.energyBefore;
    score += Math.abs(d) >= 5 ? Math.sign(d) : 0;
  }
  if (l.tensionBefore != null && l.tensionAfter != null) {
    known = true;
    score += Math.sign(l.tensionBefore - l.tensionAfter);
  }
  if (!known) return 'unknown';
  return score > 0 ? 'improved' : score < 0 ? 'worsened' : 'same';
}

export function activityStats(logs: ActivityLog[]): Map<string, ActivityStat> {
  const map = new Map<string, ActivityStat>();
  for (const l of completedLogs(logs)) {
    let s = map.get(l.activityId);
    if (!s) {
      s = { count: 0, lastAt: null, rated: 0, ratingSum: 0, ratingCount: 0, moodDeltaSum: 0, moodDeltaN: 0, energyDeltaSum: 0, energyDeltaN: 0, tensionDeltaSum: 0, tensionDeltaN: 0, improved: 0, worsened: 0, wantYes: 0, wantNo: 0 };
      map.set(l.activityId, s);
    }
    s.count++;
    if (!s.lastAt || l.startedAt > s.lastAt) s.lastAt = l.startedAt;
    if (l.personalRating != null) {
      s.ratingSum += l.personalRating;
      s.ratingCount++;
    }
    if (l.moodBefore != null && l.moodAfter != null) {
      s.moodDeltaSum += l.moodAfter - l.moodBefore;
      s.moodDeltaN++;
    }
    if (l.energyBefore != null && l.energyAfter != null) {
      s.energyDeltaSum += l.energyAfter - l.energyBefore;
      s.energyDeltaN++;
    }
    if (l.tensionBefore != null && l.tensionAfter != null) {
      s.tensionDeltaSum += l.tensionAfter - l.tensionBefore;
      s.tensionDeltaN++;
    }
    const o = logOutcome(l);
    if (o !== 'unknown') s.rated++;
    if (o === 'improved') s.improved++;
    if (o === 'worsened') s.worsened++;
    if (l.wantRepeat === 'yes') s.wantYes++;
    if (l.wantRepeat === 'no') s.wantNo++;
  }
  return map;
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function avgRating(s: ActivityStat | undefined): number | null {
  return s && s.ratingCount ? s.ratingSum / s.ratingCount : null;
}

/** Особистий «бал» для сортування «найкраще оцінені особисто». */
export function personalScore(s: ActivityStat | undefined): number | null {
  if (!s || (s.ratingCount === 0 && s.rated === 0)) return null;
  const r = avgRating(s) ?? 3;
  const imp = s.rated ? (s.improved - s.worsened) / s.rated : 0;
  return r + imp + (s.wantYes - s.wantNo) * 0.2;
}

export function joinActivity(logs: ActivityLog[], byId: (id: string) => Activity | undefined) {
  return logs.map((l) => ({ log: l, activity: byId(l.activityId) })).filter((x): x is { log: ActivityLog; activity: Activity } => !!x.activity);
}
