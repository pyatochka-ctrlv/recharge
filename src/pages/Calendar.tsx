import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Pencil, Trash2, Play, Clock3, Plus, SkipForward, Search } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { useStore } from '../store/store';
import { useUI } from '../components/ui/feedback';
import { ActivityIllustration } from '../components/ActivityCard';
import { PlanForm } from '../components/ActivitySheet';
import { Button, Card, cx, EmptyState, EnergySlider, Field, IconButton, inputCls, LevelPicker, Modal, MoodPicker, PageHeader, Segmented } from '../components/ui';
import { FATIGUE_LABELS, TENSION_LABELS, moodEmoji } from '../data/labels';
import { addDays, combineLocal, dayKey, fmt, fromDayKey, timeOf, todayKey, weekDays, weekStart, WEEKDAY_SHORT } from '../lib/date';
import { avg, completedLogs } from '../lib/stats';
import { matchesQuery } from '../lib/filters';
import { ENERGY_STEPS, energyColor } from '../lib/colors';
import type { ActivityLog, DailyCheckIn, Level5, Mood, PlannedActivity } from '../types';

type View = 'month' | 'week' | 'day';


interface DayInfo {
  checkIns: DailyCheckIn[];
  logs: ActivityLog[];
  planned: PlannedActivity[];
  energy: number | null;
  mood: number | null;
}

function useDayIndex() {
  const { data } = useStore();
  return useMemo(() => {
    const map = new Map<string, DayInfo>();
    const get = (k: string) => {
      let d = map.get(k);
      if (!d) {
        d = { checkIns: [], logs: [], planned: [], energy: null, mood: null };
        map.set(k, d);
      }
      return d;
    };
    data.checkIns.forEach((c) => get(dayKey(c.timestamp)).checkIns.push(c));
    completedLogs(data.logs).forEach((l) => get(dayKey(l.startedAt)).logs.push(l));
    data.planned.forEach((p) => get(dayKey(p.scheduledAt)).planned.push(p));
    map.forEach((d) => {
      const e = avg(d.checkIns.map((c) => c.energy));
      const m = avg(d.checkIns.map((c) => c.mood).filter((x): x is Mood => x != null));
      d.energy = e == null ? null : Math.round(e);
      d.mood = m;
      d.planned.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    });
    return map;
  }, [data.checkIns, data.logs, data.planned]);
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayKey());
  const index = useDayIndex();

  const shift = (dir: number) => {
    const next = view === 'month' ? addMonths(cursor, dir) : addDays(cursor, view === 'week' ? 7 * dir : dir);
    setCursor(next);
    if (view === 'day') setSelected(dayKey(next));
  };
  const goToday = () => {
    setCursor(new Date());
    setSelected(todayKey());
  };
  const selectDay = (k: string) => {
    setSelected(k);
    setCursor(fromDayKey(k));
  };

  const title = view === 'month' ? fmt(cursor, 'LLLL yyyy') : view === 'week' ? `${fmt(weekStart(cursor), 'd MMM')} – ${fmt(addDays(weekStart(cursor), 6), 'd MMM yyyy')}` : fmt(cursor, 'EEEE, d MMMM');

  return (
    <div>
      <PageHeader eyebrow="Calendar" title="Календар відновлення" subtitle="Історія та плани. Порожні дні — просто порожні дні: тут немає «пропусків» і штрафів." />

      <Card className="mb-5 !p-3 sm:!p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton label="Назад" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </IconButton>
            <IconButton label="Вперед" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </IconButton>
            <h2 className="ml-2 font-display text-base font-semibold capitalize text-ink sm:text-lg" aria-live="polite">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={goToday}>
              Сьогодні
            </Button>
            <Segmented
              label="Режим календаря"
              value={view}
              onChange={(v) => {
                setView(v);
                if (v === 'day') setCursor(fromDayKey(selected));
              }}
              options={[
                { value: 'month', label: 'Місяць' },
                { value: 'week', label: 'Тиждень' },
                { value: 'day', label: 'День' },
              ]}
              size="sm"
            />
          </div>
        </div>
      </Card>

      {view === 'month' && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <MonthGrid cursor={cursor} index={index} selected={selected} onSelect={selectDay} />
          <DayDetail day={selected} info={index.get(selected)} />
        </div>
      )}
      {view === 'week' && (
        <div className="space-y-5">
          <WeekView cursor={cursor} index={index} selected={selected} onSelect={selectDay} />
          <DayDetail day={selected} info={index.get(selected)} />
        </div>
      )}
      {view === 'day' && <DayDetail day={selected} info={index.get(selected)} full />}

      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <Card className="mt-5 !p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
        <span className="font-semibold text-ink">Легенда:</span>
        <span className="flex items-center gap-1.5">
          Енергія (середня за день):
          {ENERGY_STEPS.map((c, i) => (
            <span key={c} className="inline-block h-3 w-5 rounded-full" style={{ background: c }} title={`${i * 20}–${i * 20 + 19}%`} />
          ))}
          <span>0 → 100%</span>
        </span>
        <span>😣 → 🥰 настрій</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[#3b0d2c]" /> завершене заняття
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full border-2 border-hot" /> заплановане
        </span>
      </div>
    </Card>
  );
}

function MonthGrid({ cursor, index, selected, onSelect }: { cursor: Date; index: Map<string, DayInfo>; selected: string; onSelect: (k: string) => void }) {
  const first = weekStart(startOfMonth(cursor));
  const last = endOfMonth(cursor);
  const days: Date[] = [];
  for (let d = first; d <= last || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  const month = cursor.getMonth();
  const today = todayKey();

  return (
    <Card className="!p-3 sm:!p-5">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-muted sm:gap-2">
        {WEEKDAY_SHORT.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label="Дні місяця">
        {days.map((d) => {
          const k = dayKey(d);
          const info = index.get(k);
          const inMonth = d.getMonth() === month;
          const isSel = k === selected;
          const done = info?.logs.length ?? 0;
          const planned = info?.planned.filter((p) => p.status === 'planned').length ?? 0;
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${fmt(d, 'd MMMM')}${info?.energy != null ? `, енергія ${info.energy}%` : ''}${done ? `, занять: ${done}` : ''}${planned ? `, заплановано: ${planned}` : ''}`}
              onClick={() => onSelect(k)}
              className={cx(
                'relative flex aspect-square min-h-[44px] flex-col items-center justify-start rounded-2xl p-1 text-sm transition sm:aspect-[1/0.95] sm:p-2',
                inMonth ? 'bg-white/70' : 'bg-white/30 text-muted/60',
                isSel ? 'ring-2 ring-hot ring-offset-2 ring-offset-transparent' : 'hover:bg-white',
              )}
            >
              <span className={cx('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:h-7 sm:w-7 sm:text-sm', k === today ? 'bg-gradient-to-br from-barbie to-hot text-white' : 'text-ink')}>{d.getDate()}</span>
              {info?.energy != null && <span className="mt-1 h-1.5 w-3/4 rounded-full sm:h-2" style={{ background: energyColor(info.energy) }} aria-hidden />}
              {info?.mood != null && (
                <span className="mt-0.5 hidden text-base leading-none sm:block" aria-hidden>
                  {moodEmoji(info.mood)}
                </span>
              )}
              <span className="mt-auto flex gap-0.5" aria-hidden>
                {Array.from({ length: Math.min(done, 3) }).map((_, i) => (
                  <span key={`d${i}`} className="h-1.5 w-1.5 rounded-full bg-[#3b0d2c]" />
                ))}
                {Array.from({ length: Math.min(planned, 2) }).map((_, i) => (
                  <span key={`p${i}`} className="h-1.5 w-1.5 rounded-full border border-hot" />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({ cursor, index, selected, onSelect }: { cursor: Date; index: Map<string, DayInfo>; selected: string; onSelect: (k: string) => void }) {
  const { activityById } = useStore();
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-7 md:px-0">
      {weekDays(cursor).map((d) => {
        const k = dayKey(d);
        const info = index.get(k);
        const isSel = k === selected;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            aria-pressed={isSel}
            className={cx('glass flex min-h-[200px] w-40 shrink-0 snap-start flex-col rounded-[22px] p-3 text-left md:w-auto', isSel && 'ring-2 ring-hot')}
          >
            <p className="text-xs font-bold uppercase text-muted">{fmt(d, 'EEEEEE')}</p>
            <p className={cx('font-display text-2xl font-bold', k === todayKey() ? 'text-hot' : 'text-ink')}>{d.getDate()}</p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              {info?.energy != null ? (
                <>
                  <span className="h-2 w-8 rounded-full" style={{ background: energyColor(info.energy) }} />
                  <span className="font-semibold text-ink">{info.energy}%</span>
                  <span>{moodEmoji(info.mood)}</span>
                </>
              ) : (
                <span className="text-xs text-muted">без записів</span>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {info?.logs.slice(0, 3).map((l) => (
                <li key={l.id} className="truncate text-ink">
                  ✓ {activityById(l.activityId)?.title ?? 'Заняття'}
                </li>
              ))}
              {info?.planned
                .filter((p) => p.status === 'planned')
                .slice(0, 3)
                .map((p) => (
                  <li key={p.id} className="truncate text-accent-ink">
                    ◦ {timeOf(p.scheduledAt)} {activityById(p.activityId)?.title ?? 'Заняття'}
                  </li>
                ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

type TimelineItem = { kind: 'checkin'; at: string; item: DailyCheckIn } | { kind: 'log'; at: string; item: ActivityLog } | { kind: 'plan'; at: string; item: PlannedActivity };

function DayDetail({ day, info, full }: { day: string; info?: DayInfo; full?: boolean }) {
  const { data, actions, state } = useStore();
  const ui = useUI();
  const [editing, setEditing] = useState<DailyCheckIn | 'new' | null>(null);
  const [picking, setPicking] = useState(false);
  const [rescheduling, setRescheduling] = useState<PlannedActivity | null>(null);
  const [note, setNote] = useState(data.dayNotes[day] ?? '');
  const [noteDay, setNoteDay] = useState(day);
  if (noteDay !== day) {
    setNoteDay(day);
    setNote(data.dayNotes[day] ?? '');
  }

  const items: TimelineItem[] = [
    ...(info?.checkIns ?? []).map((c) => ({ kind: 'checkin' as const, at: c.timestamp, item: c })),
    ...(info?.logs ?? []).map((l) => ({ kind: 'log' as const, at: l.startedAt, item: l })),
    ...(info?.planned ?? []).filter((p) => p.status !== 'done' || !p.logId).map((p) => ({ kind: 'plan' as const, at: p.scheduledAt, item: p })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const chartData = (info?.checkIns ?? []).map((c) => ({ time: timeOf(c.timestamp), energy: c.energy }));
  const date = fromDayKey(day);
  const isFuture = day > todayKey();

  return (
    <Card className={cx(!full && 'xl:sticky xl:top-6 xl:self-start')}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{fmt(date, 'EEEE')}</p>
          <h2 className="font-display text-xl font-bold text-ink">{fmt(date, 'd MMMM yyyy')}</h2>
          {info?.energy != null && (
            <p className="mt-1 text-sm text-muted">
              Середня енергія {info.energy}%{info.mood != null ? ` · настрій ${moodEmoji(info.mood)}` : ''} · занять: {info.logs.length}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isFuture && (
            <Button size="sm" variant="soft" onClick={() => setEditing('new')}>
              <Plus size={15} /> Check-in
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => setPicking(true)}>
            <CalendarPlus size={15} /> Запланувати
          </Button>
        </div>
      </div>

      {chartData.length >= 2 && (
        <figure className="mb-4 rounded-2xl bg-white/70 p-3">
          <figcaption className="mb-1 text-xs font-semibold text-muted">Енергія протягом дня</figcaption>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="dayE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FF2D95" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#FF2D95" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#8E245D" strokeOpacity={0.08} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#7d4f6b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: '#7d4f6b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Енергія']} contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px -8px rgba(142,36,93,.4)' }} />
                <Area type="monotone" dataKey="energy" stroke="#FF2D95" strokeWidth={2} fill="url(#dayE)" dot={{ r: 4, fill: '#fff', stroke: '#FF2D95', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </figure>
      )}

      {items.length === 0 ? (
        <EmptyState emoji={isFuture ? '🗓️' : '🌙'} title={isFuture ? 'Поки нічого не заплановано' : 'Цього дня записів немає'} text={isFuture ? 'Можна запланувати маленьку приємність — або залишити день вільним.' : 'І це абсолютно нормально. Відпочинок не потребує звітів.'} />
      ) : (
        <ol className="relative space-y-2 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-0.5 before:bg-soft">
          {items.map((it) => (
            <li key={`${it.kind}-${it.item.id}`} className="relative flex gap-3">
              <span className={cx('z-10 mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm', it.kind === 'checkin' ? 'bg-lav' : it.kind === 'log' ? 'bg-gradient-to-br from-barbie to-hot text-white' : 'border-2 border-dashed border-hot bg-white')} aria-hidden>
                {it.kind === 'checkin' ? '🔋' : it.kind === 'log' ? '✓' : '◦'}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl bg-white/75 p-3">
                {it.kind === 'checkin' && (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {timeOf(it.at)} · Check-in {it.item.energy}% {it.item.mood ? moodEmoji(it.item.mood) : ''}
                        {it.item.source === 'after-activity' && <span className="ml-1 text-xs font-normal text-muted">(після заняття)</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {[it.item.tension && `напруга ${it.item.tension}/5`, it.item.fatigue && `втома ${it.item.fatigue}/5`, it.item.socialPreference && `спілкування ${['—', 'трохи', 'дуже'][it.item.socialPreference.social]}, наодинці ${['—', 'трохи', 'дуже'][it.item.socialPreference.alone]}`].filter(Boolean).join(' · ')}
                      </p>
                      {it.item.note && <p className={cx('mt-1 text-sm text-ink', state.prefs.blurNotes && 'blur-private')} tabIndex={state.prefs.blurNotes ? 0 : undefined}>“{it.item.note}”</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton label="Редагувати check-in" className="h-8 w-8" onClick={() => setEditing(it.item)}>
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton
                        label="Видалити check-in"
                        className="h-8 w-8"
                        onClick={() => {
                          if (window.confirm('Видалити цей check-in?')) {
                            actions.deleteCheckIn(it.item.id);
                            ui.toast('Запис видалено', '🗑️');
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                )}
                {it.kind === 'log' && <LogRow log={it.item} />}
                {it.kind === 'plan' && (
                  <PlanRow
                    plan={it.item}
                    onReschedule={() => setRescheduling(it.item)}
                    onStart={() => ui.openActivity(it.item.activityId, { plannedId: it.item.id, startNow: true })}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {state.prefs.storeNotes && (
        <div className="mt-4">
          <label htmlFor={`note-${day}`} className="mb-2 block text-sm font-semibold text-ink">
            📝 Нотатка дня
          </label>
          <textarea
            id={`note-${day}`}
            className={cx(inputCls, 'min-h-[70px]')}
            value={note}
            maxLength={2000}
            placeholder="Що хочеться запам’ятати про цей день?"
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              if (note !== (data.dayNotes[day] ?? '')) {
                actions.setDayNote(day, note);
                ui.toast('Нотатку збережено', '📝');
              }
            }}
          />
        </div>
      )}

      <Modal open={editing != null} onClose={() => setEditing(null)} title={editing === 'new' ? `Check-in за ${fmt(date, 'd MMMM')}` : 'Редагувати check-in'}>
        {editing != null && (
          <CheckInEditor
            day={day}
            initial={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSave={(v) => {
              if (editing === 'new') actions.addCheckIn({ ...v, source: 'check-in' });
              else actions.updateCheckIn(editing.id, v);
              setEditing(null);
              ui.toast('Збережено', '💗');
            }}
          />
        )}
      </Modal>

      <Modal open={picking} onClose={() => setPicking(false)} title={`Запланувати на ${fmt(date, 'd MMMM')}`} wide>
        {picking && (
          <ActivityPicker
            day={day}
            onDone={() => {
              setPicking(false);
              ui.toast('Додано в календар', '📅');
            }}
          />
        )}
      </Modal>

      <Modal open={rescheduling != null} onClose={() => setRescheduling(null)} title="Перенести">
        {rescheduling && (
          <PlanForm
            initialDay={dayKey(rescheduling.scheduledAt)}
            initialTime={timeOf(rescheduling.scheduledAt)}
            initialNote={rescheduling.note}
            submitLabel="Зберегти"
            onCancel={() => setRescheduling(null)}
            onSave={(iso, n) => {
              actions.updatePlanned(rescheduling.id, { scheduledAt: iso, note: n, status: 'planned' });
              setRescheduling(null);
              ui.toast('Перенесено', '🗓️');
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function LogRow({ log }: { log: ActivityLog }) {
  const { activityById, actions, state } = useStore();
  const ui = useUI();
  const a = activityById(log.activityId);
  const delta = (b: number | null, x: number | null, suffix = '') => (b == null || x == null ? null : `${b}${suffix} → ${x}${suffix}`);
  return (
    <div className="flex items-start justify-between gap-2">
      <button type="button" className="min-w-0 text-left" onClick={() => a && ui.openActivity(a.id)}>
        <p className="text-sm font-semibold text-ink">
          {timeOf(log.startedAt)} · {a?.title ?? 'Видалене заняття'}
        </p>
        <p className="text-xs text-muted">
          {log.ratingSkipped
            ? 'без оцінювання'
            : [delta(log.energyBefore, log.energyAfter, '%') && `енергія ${delta(log.energyBefore, log.energyAfter, '%')}`, log.moodBefore && log.moodAfter && `настрій ${moodEmoji(log.moodBefore)}→${moodEmoji(log.moodAfter)}`, delta(log.tensionBefore, log.tensionAfter) && `напруга ${delta(log.tensionBefore, log.tensionAfter)}`, log.personalRating && '💗'.repeat(log.personalRating)]
                .filter(Boolean)
                .join(' · ') || 'без оцінок'}
        </p>
        {log.liked && <p className={cx('mt-1 text-sm text-ink', state.prefs.blurNotes && 'blur-private')}>Сподобалося: {log.liked}</p>}
      </button>
      <IconButton
        label="Видалити запис заняття"
        className="h-8 w-8"
        onClick={() => {
          if (window.confirm('Видалити запис цього заняття з історії?')) {
            actions.deleteLog(log.id);
            ui.toast('Запис видалено', '🗑️');
          }
        }}
      >
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}

function PlanRow({ plan, onReschedule, onStart }: { plan: PlannedActivity; onReschedule: () => void; onStart: () => void }) {
  const { activityById, actions } = useStore();
  const ui = useUI();
  const a = activityById(plan.activityId);
  return (
    <div>
      <div className="flex items-start gap-3">
        {a && <ActivityIllustration activity={a} size="sm" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {timeOf(plan.scheduledAt)} · {a?.title ?? 'Видалене заняття'}
          </p>
          <p className="text-xs text-muted">
            {plan.status === 'planned' ? 'Заплановано' : plan.status === 'done' ? 'Виконано ✓' : 'Не цього разу — і це ок'}
            {plan.note && ` · ${plan.note}`}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {plan.status === 'planned' && a && (
          <Button size="sm" variant="hot" onClick={onStart}>
            <Play size={14} /> Почати
          </Button>
        )}
        <Button size="sm" variant="soft" onClick={onReschedule}>
          <Clock3 size={14} /> Перенести
        </Button>
        {plan.status === 'planned' && (
          <Button size="sm" variant="ghost" onClick={() => actions.updatePlanned(plan.id, { status: 'skipped' })}>
            <SkipForward size={14} /> Не цього разу
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            actions.deletePlanned(plan.id);
            ui.toast('Видалено з календаря', '🗑️');
          }}
        >
          <Trash2 size={14} /> Видалити
        </Button>
      </div>
    </div>
  );
}

function CheckInEditor({ day, initial, onSave, onCancel }: { day: string; initial?: DailyCheckIn; onSave: (v: Omit<DailyCheckIn, 'id'>) => void; onCancel: () => void }) {
  const { state } = useStore();
  const [energy, setEnergy] = useState(initial?.energy ?? 50);
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [tension, setTension] = useState<Level5 | null>(initial?.tension ?? null);
  const [fatigue, setFatigue] = useState<Level5 | null>(initial?.fatigue ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [time, setTime] = useState(initial ? timeOf(initial.timestamp) : day === todayKey() ? timeOf(new Date().toISOString()) : '12:00');
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const ts = combineLocal(initial ? dayKey(initial.timestamp) : day, time);
        if (new Date(ts).getTime() > Date.now() + 60_000) {
          setError('Check-in не може бути в майбутньому.');
          return;
        }
        onSave({ timestamp: ts, energy, mood, tension, fatigue, note, socialPreference: initial?.socialPreference ?? null, source: initial?.source ?? 'check-in' });
      }}
    >
      <Field label="Час" htmlFor="ci-time">
        <input id="ci-time" type="time" required className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <EnergySlider value={energy} onChange={setEnergy} />
      <Field label="Настрій">
        <MoodPicker value={mood} onChange={setMood} size="sm" />
      </Field>
      <Field label="Напруга">
        <LevelPicker label="Напруга" labels={TENSION_LABELS} value={tension} onChange={setTension} />
      </Field>
      <Field label="Втома">
        <LevelPicker label="Втома" labels={FATIGUE_LABELS} value={fatigue} onChange={setFatigue} />
      </Field>
      {state.prefs.storeNotes && (
        <Field label="Нотатка" htmlFor="ci-note-edit">
          <textarea id="ci-note-edit" className={inputCls} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-berry">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="flex-1">
          Зберегти
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}

function ActivityPicker({ day, onDone }: { day: string; onDone: () => void }) {
  const { activities, data, actions } = useStore();
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const list = useMemo(() => {
    const visible = activities.filter((a) => !data.activityMeta[a.id]?.hidden && !data.activityMeta[a.id]?.notMine && matchesQuery(a, q));
    // Обране та «на потім» — вгорі
    const score = (id: string) => (data.activityMeta[id]?.favorite ? 2 : 0) + (data.activityMeta[id]?.savedForLater ? 1 : 0);
    return visible.sort((a, b) => score(b.id) - score(a.id)).slice(0, 40);
  }, [activities, data.activityMeta, q]);

  if (chosen) {
    return (
      <PlanForm
        initialDay={day}
        onCancel={() => setChosen(null)}
        onSave={(iso, note) => {
          actions.addPlanned({ activityId: chosen, scheduledAt: iso, note });
          onDone();
        }}
      />
    );
  }
  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input className={cx(inputCls, 'pl-10')} placeholder="Знайти заняття…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Пошук заняття" autoFocus />
      </div>
      <ul className="mt-3 max-h-[50dvh] space-y-1.5 overflow-y-auto">
        {list.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => setChosen(a.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-2.5 text-left transition hover:bg-chip">
              <ActivityIllustration activity={a} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {data.activityMeta[a.id]?.favorite && '💗 '}
                  {a.title}
                </span>
                <span className="block truncate text-xs text-muted">{a.description}</span>
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="p-4 text-center text-sm text-muted">Нічого не знайшлося</li>}
      </ul>
    </div>
  );
}
