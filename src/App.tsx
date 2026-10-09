import { lazy, Suspense, useCallback, useEffect } from 'react';
import { useStore } from './store/store';
import { useRoute } from './lib/router';
import { Layout } from './components/Layout';
import { ActivitySheetHost } from './components/ActivitySheet';
import { useUI } from './components/ui/feedback';
import { useDailyReminder } from './lib/reminders';
import { Onboarding } from './pages/Onboarding';
import { HomePage } from './pages/Home';
import { ActivitiesPage } from './pages/Activities';
import { CoachPage } from './pages/Coach';
import { ProfilePage } from './pages/Profile';

// Сторінки з графіками завантажуються окремо, щоб головна відкривалася швидше.
const CalendarPage = lazy(() => import('./pages/Calendar'));
const InsightsPage = lazy(() => import('./pages/Insights'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-full bg-white/80 px-5 py-3 text-sm font-semibold text-accent-ink shadow">
        <span className="h-3 w-3 animate-ping rounded-full bg-hot" aria-hidden /> Завантаження…
      </div>
    </div>
  );
}

export function App() {
  const { state } = useStore();
  const route = useRoute();
  const { toast } = useUI();
  const { theme, reduceMotion } = state.prefs;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.motion = reduceMotion ? 'reduce' : 'full';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'barbie' ? '#FF2D95' : '#FFD6E7');
  }, [theme, reduceMotion]);

  useEffect(() => {
    const titles: Record<string, string> = { home: 'My Energy', activities: 'Activities', calendar: 'Calendar', insights: 'My Insights', coach: 'Pink Coach', profile: 'Profile' };
    document.title = `${titles[route]} · Recharge Club`;
  }, [route]);

  const onInApp = useCallback((t: string) => toast(t, '🔔'), [toast]);
  useDailyReminder(state.prefs, onInApp);

  if (!state.onboarded) return <Onboarding />;

  return (
    <Layout route={route}>
      <Suspense fallback={<PageLoader />}>
        <div key={route} className="animate-rise">
          {route === 'home' && <HomePage />}
          {route === 'activities' && <ActivitiesPage />}
          {route === 'calendar' && <CalendarPage />}
          {route === 'insights' && <InsightsPage />}
          {route === 'coach' && <CoachPage />}
          {route === 'profile' && <ProfilePage />}
        </div>
      </Suspense>
      <ActivitySheetHost />
    </Layout>
  );
}
