import { useEffect } from 'react';
import type { UserPreferences } from '../types';
import { todayKey } from './date';

const KEY = 'recharge-club:last-reminder';

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Ненав’язливе нагадування раз на день у вибраний час.
 * Обмеження вебверсії: працює, лише поки вкладка застосунку відкрита (без сервера push-сповіщень).
 */
export function useDailyReminder(prefs: UserPreferences, onInApp: (text: string) => void) {
  useEffect(() => {
    if (!prefs.remindersEnabled) return;
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm < prefs.reminderTime) return;
      let last: string | null = null;
      try {
        last = localStorage.getItem(KEY);
      } catch {
        /* ignore */
      }
      if (last === todayKey()) return;
      // Нагадуємо лише в межах години після вибраного часу, щоб не «наздоганяти» пропущене.
      const [h, m] = prefs.reminderTime.split(':').map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (now.getTime() - target.getTime() > 3600_000) return;
      try {
        localStorage.setItem(KEY, todayKey());
      } catch {
        /* ignore */
      }
      const text = 'Як твоя батарейка? Можна відповісти — а можна й ні 💗';
      if (notificationsSupported() && Notification.permission === 'granted') {
        try {
          new Notification('Recharge Club', { body: text, tag: 'recharge-daily' });
          return;
        } catch {
          /* деякі мобільні браузери вимагають service worker — показуємо в застосунку */
        }
      }
      onInApp(text);
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [prefs.remindersEnabled, prefs.reminderTime, onInApp]);
}
