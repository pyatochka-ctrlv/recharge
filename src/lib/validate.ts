// Валідація та «санітизація» вхідних даних (форми, імпорт, localStorage).
import type { Level5, Mood, Want } from '../types';

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function toEnergy(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(clamp(n, 0, 100));
}

export function toLevel5(v: unknown): Level5 | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return clamp(Math.round(v), 1, 5) as Level5;
}
export const toMood = (v: unknown) => toLevel5(v) as Mood | null;

export function toWant(v: unknown): Want {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return clamp(Math.round(v), 0, 2) as Want;
}

export function toText(v: unknown, max = 2000): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function uid(prefix = ''): string {
  const c = globalThis.crypto;
  const id = c && 'randomUUID' in c ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}-${id}` : id;
}
