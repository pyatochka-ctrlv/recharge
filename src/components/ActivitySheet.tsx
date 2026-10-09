import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, CalendarPlus, Ban, EyeOff, Heart, Pause, Play, Pencil, Trash2, Timer, Check, RotateCcw } from 'lucide-react';
import type { Activity, Level5, Mood } from '../types';
import { useStore } from '../store/store';
import { useUI } from './ui/feedback';
import { ActivityIllustration } from './ActivityCard';
import { Button, Chip, cx, EnergySlider, Field, IconButton, inputCls, LevelPicker, Modal, MoodPicker, Tag } from './ui';
import { categoryInfo } from '../data/categories';
import { ACCESS_LABELS, CONTEXT_LABELS, COST_LABELS, DURATION_LABELS, DURATION_MINUTES, EFFORT_LABELS, FORMAT_LABELS, TENSION_LABELS } from '../data/labels';
import { activityStats } from '../lib/stats';
import { dayKey, relativeTime, todayKey, combineLocal } from '../lib/date';
import { CustomActivityForm } from './CustomActivityForm';
import { times } from '../lib/plural';

type Step = 'detail' | 'before' | 'running' | 'after' | 'done' | 'plan' | 'edit';

interface Before {
  energy: number;
  mood: Mood | null;
  tension: Level5 | null;
  skipped: boolean;
}

export function ActivitySheetHost() {
  const { activitySheet, closeActivity } = useUI();
  const { activityById } = useStore();
  const activity = activitySheet ? activityById(activitySheet.id) : undefined;
  if (!activitySheet || !activity) return null;
  return <ActivitySheet key={activitySheet.id + (activitySheet.plannedId ?? '')} activity={activity} plannedId={activitySheet.plannedId} startNow={activitySheet.startNow} onClose={closeActivity} />;
}

function ActivitySheet({ activity, plannedId, startNow, onClose }: { activity: Activity; plannedId?: string; startNow?: boolean; onClose: () => void }) {
  const { data, actions, state } = useStore();
  const ui = useUI();
  const [step, setStep] = useState<Step>(startNow ? 'before' : 'detail');
  const meta = data.activityMeta[activity.id] ?? {};
  const stat = useMemo(() => activityStats(data.logs).get(activity.id), [data.logs, activity.id]);
  const c = categoryInfo(activity.category);

  // Позначаємо заняття як переглянуте (для фільтра «Нові для мене»).
  useEffect(() => {
    if (!meta.viewedAt) actions.setMeta(activity.id, { viewedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  const latest = data.checkIns[data.checkIns.length - 1];
  const recent = latest && Date.now() - new Date(latest.timestamp).getTime() < 3 * 3600_000 ? latest : undefined;
  const [before, setBefore] = useState<Before>({ energy: recent?.energy ?? 50, mood: recent?.mood ?? null, tension: recent?.tension ?? null, skipped: false });
  const startedAt = useRef<string>(new Date().toISOString());
  const [savedLog, setSavedLog] = useState<{ energyAfter: number | null; outcome: 'better' | 'worse' | 'same' | 'unknown' } | null>(null);

  const titleId = `act-title-${activity.id}`;

  return (
    <Modal open onClose={onClose} wide labelledBy={titleId}>
      {/* Заголовок */}
      <div className="-mt-12 mb-5 flex items-center gap-4 pr-12">
        <ActivityIllustration activity={activity} size={step === 'detail' ? 'lg' : 'md'} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {c.emoji} {c.label}
          </p>
          <h2 id={titleId} className="mt-1 font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
            {activity.title}
          </h2>
        </div>
      </div>

      {step === 'detail' && (
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-ink">{activity.description}</p>
          <div className="flex flex-wrap gap-2">
            <Tag>⏱ {DURATION_LABELS[activity.durationRange]}</Tag>
            <Tag>⚡ {EFFORT_LABELS[activity.effortLevel]}</Tag>
            <Tag>💸 {COST_LABELS[activity.costLevel]}</Tag>
            {activity.formats.map((f) => (
              <Tag key={f} className="bg-lav/70 text-[#4b2a7a]">
                {FORMAT_LABELS[f]}
              </Tag>
            ))}
          </div>

          {activity.steps.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink">Як можна зробити</h3>
              <ol className="space-y-2">
                {activity.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-barbie to-hot text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-muted">Це лише ідея. Змінюй кроки як зручно — або зупинись будь-коли.</p>
            </div>
          )}

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {activity.materials.length > 0 && (
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-xs font-bold text-muted">Що знадобиться</p>
                <p className="mt-1 text-ink">{activity.materials.join(', ')}</p>
              </div>
            )}
            {activity.contextTags.length > 0 && (
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-xs font-bold text-muted">Може підійти, коли</p>
                <p className="mt-1 text-ink">{activity.contextTags.map((t) => CONTEXT_LABELS[t].toLowerCase()).join(', ')}</p>
              </div>
            )}
            {activity.accessibilityTags.length > 0 && (
              <div className="rounded-2xl bg-white/70 p-3">
                <p className="text-xs font-bold text-muted">Доступність</p>
                <p className="mt-1 text-ink">{activity.accessibilityTags.map((t) => ACCESS_LABELS[t]).join(' · ')}</p>
              </div>
            )}
            <div className="rounded-2xl bg-white/70 p-3">
              <p className="text-xs font-bold text-muted">Мій досвід</p>
              <p className="mt-1 text-ink">
                {stat ? `Записано ${times(stat.count)}, востаннє ${relativeTime(stat.lastAt as string)}. Покращення відзначено ${stat.improved} з ${stat.rated} оцінених.` : 'Ти ще не пробувала це заняття.'}
              </p>
            </div>
          </div>

          <Field label="Моя нотатка до заняття" htmlFor="personal-note" hint="Особисті вподобання: як тобі зручніше, що змінити, з ким робити.">
            <textarea
              id="personal-note"
              className={cx(inputCls, 'min-h-[70px]')}
              placeholder="Наприклад: краще ввечері, з лавандовим чаєм"
              defaultValue={meta.personalNote ?? ''}
              disabled={!state.prefs.storeNotes}
              onBlur={(e) => actions.setMeta(activity.id, { personalNote: e.target.value.slice(0, 1000) || undefined })}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <IconButton label={meta.favorite ? 'Прибрати з обраного' : 'Додати в обране'} active={meta.favorite} onClick={() => actions.setMeta(activity.id, { favorite: !meta.favorite })}>
              <Heart size={18} fill={meta.favorite ? 'currentColor' : 'none'} />
            </IconButton>
            <Chip selected={meta.savedForLater} onClick={() => { actions.setMeta(activity.id, { savedForLater: !meta.savedForLater }); ui.toast(meta.savedForLater ? 'Прибрано з «На потім»' : 'Збережено на потім', '🔖'); }}>
              <Bookmark size={15} /> {meta.savedForLater ? 'Збережено' : 'Зберегти на потім'}
            </Chip>
            <Chip onClick={() => setStep('plan')}>
              <CalendarPlus size={15} /> Запланувати
            </Chip>
            <Chip selected={meta.notMine} onClick={() => { actions.setMeta(activity.id, { notMine: !meta.notMine }); ui.toast(meta.notMine ? 'Повернула в бібліотеку' : 'Позначено як «не моє» — і це теж знання про себе', '🙅‍♀️'); }}>
              <Ban size={15} /> Не моє
            </Chip>
            <Chip selected={meta.hidden} onClick={() => { actions.setMeta(activity.id, { hidden: !meta.hidden }); ui.toast(meta.hidden ? 'Знову показується' : 'Приховано. Знайдеш у колекції «Приховані»', '🙈'); }}>
              <EyeOff size={15} /> {meta.hidden ? 'Показувати' : 'Приховати'}
            </Chip>
            {activity.isCustom && (
              <>
                <Chip onClick={() => setStep('edit')}>
                  <Pencil size={15} /> Редагувати
                </Chip>
                <Chip
                  onClick={() => {
                    if (window.confirm('Видалити це власне заняття? Записи в історії залишаться, але без назви заняття.')) {
                      actions.deleteCustomActivity(activity.id);
                      ui.toast('Заняття видалено', '🗑️');
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} /> Видалити
                </Chip>
              </>
            )}
          </div>

          <div className="sticky bottom-0 -mx-5 flex gap-2 bg-gradient-to-t from-[#fff8fb] via-[#fff8fb] to-transparent px-5 pt-4 sm:-mx-7 sm:px-7">
            <Button variant="primary" size="lg" className="flex-1" onClick={() => setStep('before')}>
              <Play size={18} /> Почати
            </Button>
          </div>
        </div>
      )}

      {step === 'before' && (
        <div className="space-y-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">Як ти зараз?</h3>
            <p className="text-sm text-muted">Коротка оцінка до початку допоможе потім побачити, що тобі відгукується. Можна пропустити.</p>
          </div>
          <EnergySlider value={before.energy} onChange={(v) => setBefore((b) => ({ ...b, energy: v }))} label="Енергія зараз" />
          <Field label="Настрій">
            <MoodPicker value={before.mood} onChange={(v) => setBefore((b) => ({ ...b, mood: v }))} />
          </Field>
          <Field label="Напруга">
            <LevelPicker label="Напруга" labels={TENSION_LABELS} value={before.tension} onChange={(v) => setBefore((b) => ({ ...b, tension: v }))} />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" size="lg" className="flex-1" onClick={() => { startedAt.current = new Date().toISOString(); setStep('running'); }}>
              <Play size={18} /> Почати
            </Button>
            <Button variant="ghost" size="lg" onClick={() => { setBefore((b) => ({ ...b, skipped: true })); startedAt.current = new Date().toISOString(); setStep('running'); }}>
              Пропустити оцінку
            </Button>
          </div>
        </div>
      )}

      {step === 'running' && <Running activity={activity} onFinish={() => setStep('after')} onCancel={() => setStep('detail')} />}

      {step === 'after' && (
        <AfterForm
          activity={activity}
          before={before}
          onSave={(res) => {
            const log = actions.addLog({
              activityId: activity.id,
              startedAt: startedAt.current,
              completedAt: new Date().toISOString(),
              energyBefore: before.skipped ? null : before.energy,
              moodBefore: before.skipped ? null : before.mood,
              tensionBefore: before.skipped ? null : before.tension,
              energyAfter: res.skipped ? null : res.energy,
              moodAfter: res.skipped ? null : res.mood,
              tensionAfter: res.skipped ? null : res.tension,
              personalRating: res.skipped ? null : res.rating,
              wantRepeat: res.skipped ? null : res.wantRepeat,
              liked: res.skipped ? '' : res.liked,
              notes: res.skipped ? '' : res.notes,
              ratingSkipped: res.skipped,
            });
            if (plannedId) actions.updatePlanned(plannedId, { status: 'done', logId: log.id });
            let outcome: 'better' | 'worse' | 'same' | 'unknown' = 'unknown';
            if (!res.skipped && !before.skipped) {
              let s = 0;
              if (res.mood && before.mood) s += Math.sign(res.mood - before.mood);
              if (Math.abs(res.energy - before.energy) >= 5) s += Math.sign(res.energy - before.energy);
              if (res.tension && before.tension) s += Math.sign(before.tension - res.tension);
              outcome = s > 0 ? 'better' : s < 0 ? 'worse' : 'same';
            }
            setSavedLog({ energyAfter: res.skipped ? null : res.energy, outcome });
            ui.celebrate(res.skipped ? 'Записано' : 'Чудово');
            setStep('done');
          }}
        />
      )}

      {step === 'done' && savedLog && (
        <Done
          outcome={savedLog.outcome}
          energyAfter={savedLog.energyAfter}
          onUpdateBattery={(energy) => {
            actions.addCheckIn({ energy, mood: null, tension: null, fatigue: null, socialPreference: null, note: '', source: 'after-activity' });
            ui.toast(`Батарейку оновлено: ${energy}%`, '🔋');
            onClose();
          }}
          onClose={onClose}
        />
      )}

      {step === 'plan' && (
        <PlanForm
          onCancel={() => setStep('detail')}
          onSave={(iso, note) => {
            actions.addPlanned({ activityId: activity.id, scheduledAt: iso, note });
            ui.toast('Додано в календар', '📅');
            setStep('detail');
          }}
        />
      )}

      {step === 'edit' && activity.isCustom && (
        <CustomActivityForm
          initial={activity}
          onCancel={() => setStep('detail')}
          onSave={(patch) => {
            actions.updateCustomActivity(activity.id, patch);
            ui.toast('Зміни збережено', '✨');
            setStep('detail');
          }}
        />
      )}
    </Modal>
  );
}

function Running({ activity, onFinish, onCancel }: { activity: Activity; onFinish: () => void; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [timerMin, setTimerMin] = useState<number | null>(null);
  const [notified, setNotified] = useState(false);
  const presets = [1, 3, 5, 10, 15, 30, DURATION_MINUTES[activity.durationRange]].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  const remaining = timerMin != null ? Math.max(0, timerMin * 60 - elapsed) : null;
  useEffect(() => {
    if (remaining === 0 && !notified) setNotified(true);
  }, [remaining, notified]);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const progress = timerMin ? Math.min(1, elapsed / (timerMin * 60)) : (elapsed % 60) / 60;
  const R = 70;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center">
        <div className="relative h-48 w-48">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="80" cy="80" r={R} fill="none" stroke="#FFE6F1" strokeWidth="12" />
            <circle cx="80" cy="80" r={R} fill="none" stroke="url(#ring)" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FF69B4" />
                <stop offset="1" stopColor="#FF2D95" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-live="off">
            <span className="font-display text-4xl font-bold text-ink">{mmss(remaining ?? elapsed)}</span>
            <span className="text-xs text-muted">{timerMin ? (remaining === 0 ? 'час минув — без поспіху 💗' : 'залишилось') : 'минуло'}</span>
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-muted">Таймер необов’язковий. Можна завершити будь-коли — навіть раніше.</p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Timer size={16} /> Таймер
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={timerMin == null} onClick={() => setTimerMin(null)}>
            Без таймера
          </Chip>
          {presets.map((m) => (
            <Chip key={m} selected={timerMin === m} onClick={() => { setTimerMin(m); setElapsed(0); setNotified(false); }}>
              {m} хв
            </Chip>
          ))}
        </div>
      </div>

      {activity.steps.length > 0 && (
        <ol className="space-y-1.5 rounded-2xl bg-white/70 p-4 text-sm text-ink">
          {activity.steps.map((s, i) => (
            <li key={i}>
              <span className="font-bold text-accent-ink">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" size="lg" className="flex-1" onClick={onFinish}>
          <Check size={18} /> Завершити
        </Button>
        <Button variant="soft" size="lg" onClick={() => setPaused((p) => !p)}>
          {paused ? <Play size={18} /> : <Pause size={18} />} {paused ? 'Продовжити' : 'Пауза'}
        </Button>
        <Button variant="ghost" size="lg" onClick={onCancel}>
          <RotateCcw size={16} /> Скасувати
        </Button>
      </div>
    </div>
  );
}

interface AfterResult {
  skipped: boolean;
  energy: number;
  mood: Mood | null;
  tension: Level5 | null;
  rating: Level5 | null;
  wantRepeat: 'yes' | 'maybe' | 'no' | null;
  liked: string;
  notes: string;
}

function AfterForm({ before, onSave }: { activity: Activity; before: Before; onSave: (r: AfterResult) => void }) {
  const { state } = useStore();
  const [r, setR] = useState<AfterResult>({ skipped: false, energy: before.energy, mood: null, tension: null, rating: null, wantRepeat: null, liked: '', notes: '' });
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">Як ти зараз почуваєшся?</h3>
        <p className="text-sm text-muted">Будь-яка відповідь — правильна. Якщо стало гірше або нічого не змінилося — це теж цінна інформація.</p>
      </div>
      <Field label="Настрій після">
        <MoodPicker value={r.mood} onChange={(v) => setR({ ...r, mood: v })} />
      </Field>
      <div>
        <EnergySlider value={r.energy} onChange={(v) => setR({ ...r, energy: v })} label="Чи змінився твій рівень енергії?" />
        {!before.skipped && (
          <p className="mt-1 text-xs text-muted">
            До початку: {before.energy}% · {r.energy === before.energy ? 'без змін' : r.energy > before.energy ? `+${r.energy - before.energy}` : `${r.energy - before.energy}`}
          </p>
        )}
      </div>
      <Field label="Напруга після">
        <LevelPicker label="Напруга після" labels={TENSION_LABELS} value={r.tension} onChange={(v) => setR({ ...r, tension: v })} />
      </Field>
      <Field label="Наскільки приємно було?">
        <div role="radiogroup" aria-label="Наскільки приємно було" className="flex gap-1">
          {([1, 2, 3, 4, 5] as Level5[]).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={r.rating === n}
              aria-label={`${n} з 5`}
              onClick={() => setR({ ...r, rating: r.rating === n ? null : n })}
              className={cx('text-2xl transition hover:scale-110', r.rating != null && n <= r.rating ? 'opacity-100' : 'opacity-30 grayscale')}
            >
              💗
            </button>
          ))}
        </div>
      </Field>
      <Field label="Чи хочеш повторити цю активність?">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['yes', 'Так, хочу'],
              ['maybe', 'Можливо'],
              ['no', 'Ні, не моє'],
            ] as const
          ).map(([v, l]) => (
            <Chip key={v} selected={r.wantRepeat === v} onClick={() => setR({ ...r, wantRepeat: r.wantRepeat === v ? null : v })}>
              {l}
            </Chip>
          ))}
        </div>
      </Field>
      {state.prefs.storeNotes && (
        <Field label="Що тобі найбільше сподобалося?" htmlFor="liked">
          <input id="liked" className={inputCls} maxLength={500} value={r.liked} onChange={(e) => setR({ ...r, liked: e.target.value })} placeholder="Необов’язково" />
        </Field>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" size="lg" className="flex-1" onClick={() => onSave(r)}>
          Зберегти
        </Button>
        <Button variant="ghost" size="lg" onClick={() => onSave({ ...r, skipped: true })}>
          Пропустити оцінювання
        </Button>
      </div>
    </div>
  );
}

function Done({ outcome, energyAfter, onUpdateBattery, onClose }: { outcome: 'better' | 'worse' | 'same' | 'unknown'; energyAfter: number | null; onUpdateBattery: (e: number) => void; onClose: () => void }) {
  const text = {
    better: 'Схоже, після цього заняття тобі трохи краще. Записала — це допоможе з майбутніми рекомендаціями.',
    same: 'Записано. Не кожне заняття має щось змінювати — іноді достатньо просто побути з собою.',
    worse: 'Дякую, що чесно відзначила. Те, що не допомогло, — теж цінна інформація: рекомендації це врахують. Може, зараз варто просто відпочити?',
    unknown: 'Записано в історію. Ти можеш оцінювати лише тоді, коли хочеться.',
  }[outcome];
  return (
    <div className="space-y-5 text-center">
      <div className="text-5xl animate-pop" aria-hidden>
        {outcome === 'worse' ? '🫂' : '🌸'}
      </div>
      <p className="mx-auto max-w-md text-[15px] text-ink">{text}</p>
      {energyAfter != null && (
        <div className="rounded-3xl bg-white/80 p-4">
          <p className="text-sm text-ink">Оновити головну батарейку до {energyAfter}%?</p>
          <p className="mt-1 text-xs text-muted">Рівень енергії не змінюється автоматично — лише якщо ти так вирішиш.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button variant="hot" onClick={() => onUpdateBattery(energyAfter)}>
              Так, оновити
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Ні, дякую
            </Button>
          </div>
        </div>
      )}
      <Button variant="soft" onClick={onClose}>
        Закрити
      </Button>
    </div>
  );
}

export function PlanForm({ onSave, onCancel, initialDay, initialTime, initialNote, submitLabel = 'Запланувати' }: { onSave: (iso: string, note: string) => void; onCancel: () => void; initialDay?: string; initialTime?: string; initialNote?: string; submitLabel?: string }) {
  const nextHour = new Date(Date.now() + 3600_000);
  const [day, setDay] = useState(initialDay ?? todayKey());
  const [time, setTime] = useState(initialTime ?? `${String(nextHour.getHours()).padStart(2, '0')}:00`);
  const [note, setNote] = useState(initialNote ?? '');
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) {
          setError('Вкажи коректні дату й час.');
          return;
        }
        onSave(combineLocal(day, time), note.trim());
      }}
    >
      <h3 className="font-display text-lg font-semibold text-ink">Коли хочеш це зробити?</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Дата" htmlFor="plan-day">
          <input id="plan-day" type="date" className={inputCls} value={day} min={dayKey(new Date(Date.now() - 365 * 86400000))} onChange={(e) => setDay(e.target.value)} required />
        </Field>
        <Field label="Час" htmlFor="plan-time">
          <input id="plan-time" type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
      </div>
      <Field label="Нотатка" htmlFor="plan-note">
        <input id="plan-note" className={inputCls} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Необов’язково: з ким, де, навіщо" />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-semibold text-berry">
          {error}
        </p>
      )}
      <p className="text-xs text-muted">План — це запрошення, а не зобов’язання. Його завжди можна перенести або видалити.</p>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1">
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}
