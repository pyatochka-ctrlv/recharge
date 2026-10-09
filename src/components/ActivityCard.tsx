import { Heart, Clock, Zap, Check } from 'lucide-react';
import type { Activity, ActivityMeta } from '../types';
import { categoryInfo } from '../data/categories';
import { DURATION_LABELS, EFFORT_SHORT } from '../data/labels';
import { cx, Sparkle } from './ui';
import type { ActivityStat } from '../lib/stats';

export function ActivityIllustration({ activity, size = 'md', className }: { activity: Activity; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const c = categoryInfo(activity.category);
  const dims = { sm: 'h-11 w-11 text-xl rounded-2xl', md: 'h-14 w-14 text-2xl rounded-[20px]', lg: 'h-28 w-28 text-5xl rounded-[34px]' }[size];
  return (
    <div className={cx('relative flex shrink-0 items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]', dims, className)} style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} aria-hidden>
      <span className="drop-shadow-sm">{c.emoji}</span>
      {size === 'lg' && (
        <>
          <Sparkle className="absolute -right-2 -top-2 text-white animate-twinkle" size={20} />
          <Sparkle className="absolute -bottom-1 -left-2 text-white/80 animate-twinkle" size={14} style={{ animationDelay: '1s' }} />
        </>
      )}
    </div>
  );
}

interface CardProps {
  activity: Activity;
  meta?: ActivityMeta;
  stat?: ActivityStat;
  onOpen: () => void;
  onToggleFavorite: () => void;
}

export function ActivityCard({ activity, meta, stat, onOpen, onToggleFavorite }: CardProps) {
  const c = categoryInfo(activity.category);
  const isNew = !meta?.viewedAt && !stat;
  return (
    <article className="glass group relative flex flex-col rounded-[24px] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-20px_rgba(142,36,93,0.45)]">
      <div className="flex items-start gap-3">
        <ActivityIllustration activity={activity} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{c.short}</p>
          <h3 className="mt-0.5 font-semibold leading-snug text-ink">
            <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-[24px] after:content-[''] focus-visible:outline-none">
              {activity.title}
            </button>
          </h3>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={!!meta?.favorite}
          aria-label={meta?.favorite ? `Прибрати «${activity.title}» з обраного` : `Додати «${activity.title}» в обране`}
          className={cx('relative z-10 -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-chip', meta?.favorite ? 'text-hot' : 'text-muted')}
        >
          <Heart size={18} fill={meta?.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted">{activity.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-chip px-2.5 py-1 font-medium text-accent-ink">
          <Clock size={12} /> {DURATION_LABELS[activity.durationRange]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-lav/70 px-2.5 py-1 font-medium text-[#4b2a7a]">
          <Zap size={12} /> {EFFORT_SHORT[activity.effortLevel]}
        </span>
        {stat && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e3f7ee] px-2.5 py-1 font-medium text-[#1f6b4a]">
            <Check size={12} /> {stat.count}×
          </span>
        )}
        {isNew && <span className="rounded-full bg-white px-2 py-1 font-bold text-hot">нове</span>}
        {activity.isCustom && <span className="rounded-full bg-white px-2 py-1 font-bold text-berry">моє</span>}
      </div>
    </article>
  );
}
