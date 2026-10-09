import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { MOODS } from '../../data/labels';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

export function Card({ children, className, as: Tag = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' } & Record<string, unknown>) {
  return (
    <Tag className={cx('glass min-w-0 rounded-[28px] p-5 sm:p-6', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardTitle({ children, icon, action, sub }: { children: ReactNode; icon?: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="flex items-center gap-2 font-display text-[1.05rem] font-semibold tracking-tight text-ink">
          {icon && <span className="text-accent-ink">{icon}</span>}
          {children}
        </h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnVariant = 'primary' | 'hot' | 'soft' | 'ghost' | 'outline';
export function Button({ variant = 'soft', size = 'md', className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  const v: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    hot: 'btn-hot',
    soft: 'bg-chip text-accent-ink hover:bg-soft',
    ghost: 'text-accent-ink hover:bg-chip',
    outline: 'border border-line bg-surface-strong/70 text-ink hover:bg-chip',
  };
  const s = { sm: 'h-9 px-3.5 text-sm gap-1.5', md: 'h-11 px-5 text-sm gap-2', lg: 'h-14 px-7 text-base gap-2' }[size];
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center rounded-full font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50', v[variant], s, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95', active ? 'bg-hot text-white' : 'bg-chip text-accent-ink hover:bg-soft', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({ selected, children, onClick, className, ...rest }: { selected?: boolean; children: ReactNode; onClick?: () => void; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-[0.97]',
        selected ? 'border-transparent bg-gradient-to-br from-hot to-[#c2187a] text-white shadow-[0_6px_16px_-8px_rgba(255,45,149,0.9)]' : 'border-line bg-surface-strong/70 text-ink hover:border-barbie',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Сегментований перемикач (радіогрупа). */
export function Segmented<T extends string | number>({ value, options, onChange, label, className, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; className?: string; size?: 'sm' | 'md' }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + options.length) % options.length;
    if (n >= 0) {
      e.preventDefault();
      onChange(options[n].value);
      refs.current[n]?.focus();
    }
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-chip/80 p-1 no-scrollbar', className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={cx(
              'shrink-0 whitespace-nowrap rounded-full font-semibold transition',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'bg-surface-strong text-accent-ink shadow-[0_4px_14px_-6px_rgba(142,36,93,0.45)]' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function MoodPicker({ value, onChange, label = 'Настрій', size = 'md' }: { value: number | null; onChange: (v: 1 | 2 | 3 | 4 | 5 | null) => void; label?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5 sm:gap-2">
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={m.label}
            title={m.label}
            onClick={() => onChange(active ? null : m.value)}
            className={cx(
              'flex flex-col items-center justify-center rounded-2xl border transition active:scale-95',
              size === 'sm' ? 'h-11 w-11 text-xl' : 'h-14 w-14 text-2xl sm:h-16 sm:w-16 sm:text-3xl',
              active ? 'scale-105 border-hot bg-white shadow-[0_8px_20px_-8px_rgba(255,45,149,0.8)]' : 'border-line bg-surface-strong/60 opacity-80 hover:opacity-100',
            )}
          >
            <span aria-hidden>{m.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Шкала 1–5 з підписами (напруга, втома). */
export function LevelPicker({ value, onChange, labels, label }: { value: number | null; onChange: (v: 1 | 2 | 3 | 4 | 5 | null) => void; labels: string[]; label: string }) {
  return (
    <div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${n} — ${labels[n]}`}
              title={labels[n]}
              onClick={() => onChange(active ? null : (n as 1 | 2 | 3 | 4 | 5))}
              className={cx('h-10 rounded-xl border text-sm font-semibold transition', active ? 'border-transparent bg-gradient-to-br from-barbie to-hot text-white' : 'border-line bg-surface-strong/60 text-muted hover:text-ink')}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{labels[1]}</span>
        <span className="font-semibold text-accent-ink">{value ? labels[value] : ''}</span>
        <span>{labels[5]}</span>
      </div>
    </div>
  );
}

export function EnergySlider({ value, onChange, label = 'Рівень енергії' }: { value: number; onChange: (v: number) => void; label?: string }) {
  const id = useId();
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span className="font-display text-lg font-bold text-accent-ink">{value}%</span>
      </div>
      <input id={id} type="range" min={0} max={100} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="range" aria-valuetext={`${value}%`} />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>0 · порожньо</span>
        <span>50</span>
        <span>100 · повна</span>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputCls = 'w-full rounded-2xl border border-line bg-surface-strong/80 px-4 py-3 text-sm text-ink placeholder:text-muted/70 focus:border-barbie focus:outline-none focus:ring-4 focus:ring-soft';

export function Modal({ open, onClose, title, children, wide, labelledBy }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((x) => !x.hasAttribute('disabled'));
    setTimeout(() => (focusables()[0] ?? el)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-[#3b0d2c]/35 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        tabIndex={-1}
        className={cx(
          'relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[32px] bg-[#fff8fb] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-rise sm:rounded-[32px] sm:p-7',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? (
            <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <IconButton label="Закрити" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ emoji = '🌸', title, text, action }: { emoji?: string; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-soft to-lav text-3xl animate-float" aria-hidden>
        {emoji}
      </div>
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Sparkle({ className, size = 16, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden fill="currentColor">
      <path d="M12 0c.6 5.6 2.4 9.4 12 12-9.6 2.6-11.4 6.4-12 12-.6-5.6-2.4-9.4-12-12C9.6 9.4 11.4 5.6 12 0z" />
    </svg>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-onpage-muted">{eyebrow}</p>}
        <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-onpage sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-onpage-muted sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-gradient-to-r from-barbie to-hot' : 'bg-[#e8d3df]')}
      >
        <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-accent-ink', className)}>{children}</span>;
}
