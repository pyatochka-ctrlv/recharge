import type { ReactNode } from 'react';
import { BatteryCharging, CalendarHeart, ChartSpline, House, Sparkles, UserRound } from 'lucide-react';
import { navigate, type Route } from '../lib/router';
import { useStore } from '../store/store';
import { Button, cx, Sparkle } from './ui';

const NAV: { route: Route; label: string; short: string; icon: typeof House }[] = [
  { route: 'home', label: 'My Energy', short: 'Home', icon: House },
  { route: 'activities', label: 'Activities', short: 'Заняття', icon: BatteryCharging },
  { route: 'calendar', label: 'Calendar', short: 'Календар', icon: CalendarHeart },
  { route: 'insights', label: 'My Insights', short: 'Insights', icon: ChartSpline },
  { route: 'coach', label: 'Pink Coach', short: 'Coach', icon: Sparkles },
  { route: 'profile', label: 'Profile', short: 'Профіль', icon: UserRound },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-barbie to-hot shadow-[0_8px_20px_-8px_rgba(255,45,149,0.9)]">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <rect x="6" y="4" width="12" height="17" rx="3.5" fill="none" stroke="#fff" strokeWidth="2" />
          <rect x="9.5" y="2" width="5" height="2.5" rx="1" fill="#fff" />
          <path d="M12.8 8 9.8 13h2.6l-1.1 4 3.2-5.2h-2.6z" fill="#fff" />
        </svg>
        <Sparkle className="absolute -right-1 -top-1 text-white" size={10} />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-display text-[1.05rem] font-extrabold tracking-tight text-ink">Recharge Club</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">your pink era</p>
        </div>
      )}
    </div>
  );
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { isDemo, actions, storageError } = useStore();
  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-berry">
        Перейти до вмісту
      </a>

      {/* Бічна панель (десктоп) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col p-4 lg:flex">
        <div className="glass flex h-full flex-col rounded-[32px] p-5" style={{ background: 'var(--nav-bg)' }}>
          <Logo />
          <nav aria-label="Основна навігація" className="mt-8 flex flex-col gap-1.5">
            {NAV.map(({ route: r, label, icon: Icon }) => {
              const active = r === route;
              return (
                <a
                  key={r}
                  href={r === 'home' ? '#/' : `#/${r}`}
                  aria-current={active ? 'page' : undefined}
                  className={cx('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition', active ? 'text-white shadow-[0_10px_24px_-12px_rgba(142,36,93,0.8)]' : 'text-muted hover:bg-chip hover:text-ink')}
                  style={active ? { background: 'var(--nav-active)' } : undefined}
                >
                  <Icon size={19} />
                  {label}
                </a>
              );
            })}
          </nav>
          <div className="mt-auto rounded-3xl bg-gradient-to-br from-soft via-white to-lav p-4">
            <p className="font-display text-sm font-bold leading-snug text-ink">
              Your energy.
              <br />
              Your rules.
              <br />
              <span className="chrome-text shimmer">Your pink era.</span>
            </p>
            <p className="mt-2 text-xs text-muted">Дані зберігаються лише на цьому пристрої.</p>
          </div>
        </div>
      </aside>

      {/* Мобільна шапка */}
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
        <div className="rounded-full bg-white/80 py-1.5 pl-1.5 pr-4 shadow-sm backdrop-blur">
          <Logo />
        </div>
      </div>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        {isDemo && (
          <div role="note" className="mb-5 flex flex-col gap-3 rounded-3xl border-2 border-dashed border-white/80 bg-[#3b0d2c]/85 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              <span className="mr-1 rounded-full bg-hot px-2 py-0.5 text-xs font-bold uppercase tracking-wide">Демо-режим</span> Ти переглядаєш вигадані демонстраційні дані. Це не твої реальні спостереження.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="hot" onClick={() => actions.leaveDemo(false)}>
                Очистити демо й почати свій профіль
              </Button>
            </div>
          </div>
        )}
        {storageError && (
          <div role="alert" className="mb-5 rounded-3xl bg-white/90 p-4 text-sm text-berry">
            ⚠️ {storageError}
          </div>
        )}
        {children}
      </main>

      {/* Нижня навігація (мобільні та планшети) */}
      <nav aria-label="Основна навігація" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="glass mx-auto flex max-w-xl items-stretch justify-between rounded-[28px] p-1.5" style={{ background: 'var(--nav-bg)' }}>
          {NAV.map(({ route: r, short, icon: Icon }) => {
            const active = r === route;
            return (
              <a
                key={r}
                href={r === 'home' ? '#/' : `#/${r}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(r)}
                className={cx('flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[22px] px-1 py-2 text-[10px] font-semibold transition sm:text-xs', active ? 'text-white' : 'text-muted')}
                style={active ? { background: 'var(--nav-active)' } : undefined}
              >
                <Icon size={20} aria-hidden />
                <span className="max-w-full truncate">{short}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
