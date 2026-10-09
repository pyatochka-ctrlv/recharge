import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Sparkle } from './index';

interface Toast {
  id: number;
  text: string;
  emoji?: string;
}

interface UIState {
  toast: (text: string, emoji?: string) => void;
  celebrate: (text?: string) => void;
  openActivity: (id: string, opts?: { plannedId?: string; startNow?: boolean }) => void;
  closeActivity: () => void;
  activitySheet: { id: string; plannedId?: string; startNow?: boolean } | null;
}

const UIContext = createContext<UIState | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [celebration, setCelebration] = useState<{ key: number; text: string } | null>(null);
  const [activitySheet, setActivitySheet] = useState<UIState['activitySheet']>(null);

  const toast = useCallback((text: string, emoji = '💗') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, emoji }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const celebrate = useCallback((text = 'Готово!') => {
    const key = Date.now();
    setCelebration({ key, text });
    setTimeout(() => setCelebration((c) => (c?.key === key ? null : c)), 2200);
  }, []);

  const value = useMemo<UIState>(
    () => ({
      toast,
      celebrate,
      activitySheet,
      openActivity: (id, opts) => setActivitySheet({ id, ...opts }),
      closeActivity: () => setActivitySheet(null),
    }),
    [toast, celebrate, activitySheet],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-[#3b0d2c] px-5 py-3 text-sm font-medium text-white shadow-xl animate-rise">
            <span aria-hidden>{t.emoji}</span>
            {t.text}
          </div>
        ))}
      </div>
      {celebration && <Celebration key={celebration.key} text={celebration.text} />}
    </UIContext.Provider>
  );
}

const CONFETTI_COLORS = ['#FF2D95', '#FF69B4', '#FFD6E7', '#E9DFFF', '#C7B5FF', '#FFC36B'];

function Celebration({ text }: { text: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2;
        const dist = 120 + Math.random() * 120;
        return {
          i,
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist}px`,
          rot: `${Math.random() * 540 - 270}deg`,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          star: i % 3 === 0,
          delay: Math.random() * 0.15,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-hidden>
      <div className="relative">
        {pieces.map((p) =>
          p.star ? (
            <Sparkle
              key={p.i}
              size={18}
              className="absolute left-1/2 top-1/2"
              style={{ color: p.color, animation: `confetti 1.4s ${p.delay}s cubic-bezier(.2,.7,.3,1) both`, ['--dx' as string]: p.dx, ['--dy' as string]: p.dy, ['--rot' as string]: p.rot }}
            />
          ) : (
            <span
              key={p.i}
              className="absolute left-1/2 top-1/2 block h-2.5 w-2.5 rounded-full"
              style={{ background: p.color, animation: `confetti 1.4s ${p.delay}s cubic-bezier(.2,.7,.3,1) both`, ['--dx' as string]: p.dx, ['--dy' as string]: p.dy, ['--rot' as string]: p.rot }}
            />
          ),
        )}
        <div className="rounded-full bg-white/95 px-6 py-3 font-display text-lg font-bold text-accent-ink shadow-2xl animate-pop">{text} 💖</div>
      </div>
    </div>
  );
}

export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
