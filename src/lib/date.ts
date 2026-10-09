// Робота з датами. Ключі днів — завжди ЛОКАЛЬНА дата користувачки (YYYY-MM-DD),
// а не UTC, щоб записи після опівночі не «перескакували» на інший день.
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

export const dayKey = (d: Date | string): string => format(typeof d === 'string' ? parseISO(d) : d, 'yyyy-MM-dd');

export const fromDayKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => dayKey(new Date());

export const fmt = (d: Date | string, pattern: string) => format(typeof d === 'string' ? parseISO(d) : d, pattern, { locale: uk });

export const timeOf = (iso: string) => fmt(iso, 'HH:mm');

export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

export const weekDays = (d: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(d), i));

export { addDays, isSameDay, parseISO };

/** Комбінує локальний день і час HH:mm у ISO-рядок. */
export function combineLocal(day: string, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = fromDayKey(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

export function relativeTime(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'щойно';
  if (diff < 60) return `${Math.round(diff)} хв тому`;
  if (diff < 60 * 24 && dayKey(iso) === dayKey(now)) return `сьогодні о ${timeOf(iso)}`;
  if (dayKey(iso) === dayKey(addDays(now, -1))) return `учора о ${timeOf(iso)}`;
  return fmt(iso, "d MMMM 'о' HH:mm");
}

export type DayPart = 'morning' | 'day' | 'evening' | 'night';
export function dayPart(d: Date = new Date()): DayPart {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'day';
  if (h >= 17 && h < 23) return 'evening';
  return 'night';
}
export const DAY_PART_LABELS: Record<DayPart, string> = { morning: 'Ранок', day: 'День', evening: 'Вечір', night: 'Ніч' };

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
/** 0 = понеділок */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** Детермінований хеш рядка — для «нотатки дня» тощо. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
