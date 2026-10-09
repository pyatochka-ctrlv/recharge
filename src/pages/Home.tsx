import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarHeart, Dices, Heart, Minus, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { useStore } from '../store/store';
import { useUI } from '../components/ui/feedback';
import { Battery } from '../components/Battery';
import { Button, Card, CardTitle, Chip, cx, EmptyState, EnergySlider, Field, inputCls, LevelPicker, MoodPicker, PageHeader, Sparkle } from '../components/ui';
import { ActivityIllustration } from '../components/ActivityCard';
import { FATIGUE_LABELS, MOODS, WANT_LABELS } from '../data/labels';
import { PINK_NOTES, REFLECTION_QUESTIONS, NOTE_KIND_LABELS } from '../data/notes';
import { dayKey, dayPart, fmt, hashString, relativeTime, timeOf, todayKey } from '../lib/date';
import { recommend, surprise, MINUTE_OPTIONS, defaultCoachContext, type CoachContext, type Minutes } from '../lib/recommend';
import { completedLogs, logOutcome } from '../lib/stats';
import { sustainedLowMood } from '../lib/insights';
import { navigate } from '../lib/router';
import type { Level5, Mood, Want } from '../types';

function greeting(name: string, energy: number | null) {
  const n = name ? `, ${name}` : '';
  const part = dayPart();
  const title = { morning: `Доброго ранку${n}! ☀️`, day: `Hey, gorgeous${n}! 💗`, evening: `Добрий вечір${n} 🌙`, night: `Тиха ніч${n} ✨` }[part];
  let sub = 'Як твоя батарейка сьогодні?';
  if (energy != null && energy < 35) sub = 'Твій ресурс важливіший за твій to-do list.';
  else if (energy != null && energy >= 75) sub = 'Схоже, сьогодні є трохи іскри. Насолоджуйся у своєму темпі ✨';
  else if (part === 'night') sub = 'Пізня година. Можна просто відпочити — записи почекають.';
  return { title, sub };
}

function supportPhrase(level: number) {
  if (level < 20) return 'Низький заряд — це сигнал, а не провал. Можна обрати щось дуже маленьке або просто відпочити.';
  if (level < 40) return 'Трохи на мінімумі. Будь до себе м’якою сьогодні.';
  if (level < 70) return 'Рівний заряд. Можна берегти його або додати щось приємне.';
  return 'Яскраво! Насолоджуйся — і не забувай про паузи.';
}

export function HomePage() {
  const { state, data, actions } = useStore();
  const ui = useUI();
  const latest = data.checkIns[data.checkIns.length - 1];
  const previous = data.checkIns[data.checkIns.length - 2];

  const [draft, setDraft] = useState<number>(latest?.energy ?? 50);
  const [mood, setMood] = useState<Mood | null>(null);
  const [tension, setTension] = useState<Level5 | null>(null);
  const [fatigue, setFatigue] = useState<Level5 | null>(null);
  const [social, setSocial] = useState<Want | null>(null);
  const [alone, setAlone] = useState<Want | null>(null);
  const [note, setNote] = useState('');
  const dirty = !latest || draft !== latest.energy;

  const { title, sub } = greeting(state.prefs.name, latest?.energy ?? null);
  const delta = latest && previous ? latest.energy - previous.energy : null;

  const saveCheckIn = (energyOnly: boolean) => {
    actions.addCheckIn({
      energy: draft,
      mood: energyOnly ? null : mood,
      tension: energyOnly ? null : tension,
      fatigue: energyOnly ? null : fatigue,
      socialPreference: energyOnly || (social == null && alone == null) ? null : { social: social ?? 0, alone: alone ?? 0 },
      note: energyOnly ? '' : note,
      source: 'check-in',
    });
    if (!energyOnly) {
      setMood(null);
      setTension(null);
      setFatigue(null);
      setSocial(null);
      setAlone(null);
      setNote('');
    }
    ui.toast(energyOnly ? `Батарейка: ${draft}% — записано` : 'Check-in збережено. Дякую, що прислухаєшся до себе', '💗');
  };

  const showCare = sustainedLowMood(data.checkIns) && !(data.dismissed['care'] && Date.now() - new Date(data.dismissed['care']).getTime() < 7 * 86400000);

  return (
    <div>
      <PageHeader eyebrow={fmt(new Date(), 'EEEE, d MMMM')} title={<span className="chrome-text-onpage">{title}</span>} subtitle={sub} />

      {showCare && (
        <Card className="mb-5 border-2 border-lav" aria-label="Турбота">
          <div className="flex gap-4">
            <div className="text-3xl" aria-hidden>
              🫂
            </div>
            <div className="flex-1">
              <p className="font-semibold text-ink">Схоже, останнім часом тобі часто буває непросто.</p>
              <p className="mt-1 text-sm text-muted">
                Це не висновок і не діагноз — лише те, що ти відзначала в записах. Якщо хочеш, можна поговорити про свій стан із фахівцем (психологом, лікарем) або людиною, якій довіряєш. Якщо тобі дуже важко чи небезпечно — в Україні можна звернутися на лінію Lifeline Ukraine 7333 або за номером 112.
              </p>
              <Button size="sm" variant="ghost" className="mt-2 -ml-3" onClick={() => actions.dismiss('care')}>
                Дякую, сховати на тиждень
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        {/* Батарейка */}
        <Card className="relative overflow-hidden">
          <Sparkle className="absolute right-6 top-6 text-soft" size={30} />
          <CardTitle icon={<Zap size={18} />} sub="Суб’єктивна самооцінка — не вимірювання організму">
            Моя батарейка
          </CardTitle>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <Battery level={draft} onChange={setDraft} label="Рівень енергії: натисни або перетягни" />
            <div className="w-full min-w-0 flex-1 space-y-4">
              <div>
                <p className="hidden font-display text-5xl font-extrabold tracking-tight text-ink sm:block">
                  {draft}
                  <span className="text-2xl text-muted">%</span>
                </p>
                {latest ? (
                  <p className="mt-1 text-sm text-muted">
                    Останнє оновлення: {relativeTime(latest.timestamp)}
                    {dirty && <span className="ml-1 font-semibold text-accent-ink">· не збережено</span>}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">Ще немає записів. Перший — коли захочеш.</p>
                )}
                {delta != null && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-chip px-3 py-1 text-xs font-semibold text-accent-ink">
                    {delta > 0 ? <ArrowUpRight size={14} /> : delta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                    {delta > 0 ? `+${delta}` : delta} від попереднього запису
                  </p>
                )}
              </div>
              <p className="rounded-2xl bg-white/70 p-3 text-sm text-ink">{supportPhrase(draft)}</p>
              <EnergySlider value={draft} onChange={setDraft} />
              <Button variant="primary" className="w-full" onClick={() => saveCheckIn(true)} disabled={!dirty && !!latest}>
                Зберегти рівень енергії
              </Button>
            </div>
          </div>
        </Card>

        {/* Швидкий check-in */}
        <Card>
          <CardTitle icon={<Heart size={18} />} sub="Усе необов’язкове — відзнач лише те, що хочеться">
            Швидкий check-in
          </CardTitle>
          <div className="space-y-5">
            <Field label="Настрій">
              <MoodPicker value={mood} onChange={setMood} />
              <p className="text-xs text-muted">{mood ? MOODS[mood - 1].label : 'від дуже неприємного до дуже хорошого'}</p>
            </Field>
            <Field label="Напруга">
              <LevelPicker label="Напруга" labels={['', 'Низька', 'Спокійно', 'Помірна', 'Напружено', 'Висока']} value={tension} onChange={setTension} />
            </Field>
            <Field label="Втома">
              <LevelPicker label="Втома" labels={FATIGUE_LABELS} value={fatigue} onChange={setFatigue} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="🫶 Бажання спілкуватися">
                <div className="flex gap-1.5">
                  {([0, 1, 2] as Want[]).map((w) => (
                    <Chip key={w} selected={social === w} onClick={() => setSocial(social === w ? null : w)} className="px-3">
                      {WANT_LABELS[w]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="🌙 Бажання побути наодинці">
                <div className="flex gap-1.5">
                  {([0, 1, 2] as Want[]).map((w) => (
                    <Chip key={w} selected={alone === w} onClick={() => setAlone(alone === w ? null : w)} className="px-3">
                      {WANT_LABELS[w]}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
            {state.prefs.storeNotes && (
              <Field label="Нотатка" htmlFor="ci-note">
                <textarea id="ci-note" className={cx(inputCls, 'min-h-[64px]')} maxLength={1000} placeholder="Необов’язково: що зараз відбувається?" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            )}
            <Button variant="hot" size="lg" className="w-full" onClick={() => saveCheckIn(false)}>
              Зберегти check-in · {draft}%
            </Button>
          </div>
        </Card>
      </div>

      <QuickRecovery />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <DaySummary />
        <TodayPlan />
        <PinkNoteOfDay />
      </div>
      <p className="mt-6 text-center text-xs text-onpage-muted">Recharge Club — інструмент самоспостереження, а не медична чи психологічна допомога.</p>
    </div>
  );
}

function useCoachContextFromLatest(): CoachContext {
  const { data } = useStore();
  const latest = data.checkIns[data.checkIns.length - 1];
  const fresh = latest && Date.now() - new Date(latest.timestamp).getTime() < 12 * 3600_000 ? latest : undefined;
  return {
    ...defaultCoachContext(),
    energy: fresh?.energy ?? null,
    mood: fresh?.mood ?? null,
    tension: fresh?.tension ?? null,
    social: fresh?.socialPreference ? (fresh.socialPreference.social > fresh.socialPreference.alone ? 'people' : fresh.socialPreference.alone > fresh.socialPreference.social ? 'alone' : 'any') : 'any',
  };
}

function QuickRecovery() {
  const { data, state, activities } = useStore();
  const ui = useUI();
  const base = useCoachContextFromLatest();
  const [seed, setSeed] = useState(0);
  const [minutes, setMinutes] = useState<Minutes>(15);
  const input = { activities, logs: data.logs, meta: data.activityMeta, prefs: state.prefs };

  const cards = useMemo(() => {
    const s = hashString(todayKey()) + seed * 7919;
    const used = new Set<string>();
    const defs = [
      { key: 'quick', title: 'Маю 5 хвилин', emoji: '⏱️', ctx: { ...base, scenario: 'quick' as const, minutes: 5 as Minutes } },
      { key: 'better', title: 'Хочу відчути себе краще', emoji: '🌷', ctx: { ...base, scenario: 'feel-better' as const, minutes: 30 as Minutes } },
      { key: 'pleasure', title: 'Хочу чогось приємного', emoji: '🍓', ctx: { ...base, scenario: 'pleasure' as const, minutes: 30 as Minutes } },
    ];
    return defs.map((d) => {
      const rec = recommend(d.ctx, input, { count: 1, exclude: used, seed: s + d.key.length })[0];
      if (rec) used.add(rec.activity.id);
      return { ...d, rec };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, data.logs, data.activityMeta, state.prefs, activities, base.energy, base.mood, base.tension, base.social]);

  return (
    <Card className="mt-5">
      <CardTitle
        icon={<Sparkles size={18} />}
        sub="Можеш спробувати одне з цього — або просто відпочити"
        action={
          <Button size="sm" variant="ghost" onClick={() => setSeed((s) => s + 1)}>
            <RefreshCw size={15} /> Інші ідеї
          </Button>
        }
      >
        Швидке відновлення
      </CardTitle>
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="flex flex-col rounded-3xl bg-white/75 p-4">
            <p className="text-sm font-bold text-accent-ink">
              {c.emoji} {c.title}
            </p>
            {c.rec ? (
              <button type="button" onClick={() => ui.openActivity(c.rec!.activity.id)} className="mt-3 flex flex-1 items-start gap-3 rounded-2xl text-left transition hover:bg-chip/60">
                <ActivityIllustration activity={c.rec.activity} size="sm" />
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-ink">{c.rec.activity.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{c.rec.reasons[0] ?? c.rec.activity.description}</span>
                </span>
              </button>
            ) : (
              <p className="mt-3 text-sm text-muted">Немає варіантів з урахуванням твоїх налаштувань. Можна просто відпочити 💗</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-3xl bg-gradient-to-r from-soft via-white to-lav p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Скільки є часу?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MINUTE_OPTIONS.map((m) => (
              <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)} className="px-3 py-1.5">
                {m === 60 ? '60+ хв' : `${m} хв`}
              </Chip>
            ))}
          </div>
        </div>
        <Button
          variant="hot"
          size="lg"
          onClick={() => {
            const r = surprise({ ...base, minutes, scenario: 'auto' }, input);
            if (r) ui.openActivity(r.activity.id);
            else ui.toast('Не знайшлося варіантів — спробуй більше часу або зміни налаштування', '🫧');
          }}
        >
          <Dices size={18} /> Surprise Me!
        </Button>
      </div>
    </Card>
  );
}

function DaySummary() {
  const { data, activityById, actions, state } = useStore();
  const today = todayKey();
  const logs = completedLogs(data.logs).filter((l) => dayKey(l.startedAt) === today);
  const checkIns = data.checkIns.filter((c) => dayKey(c.timestamp) === today);
  const best = [...logs]
    .filter((l) => !l.ratingSkipped)
    .sort((a, b) => (b.personalRating ?? 0) - (a.personalRating ?? 0) || ((b.moodAfter ?? 0) - (b.moodBefore ?? 0)) - ((a.moodAfter ?? 0) - (a.moodBefore ?? 0)))[0];
  const bestAct = best ? activityById(best.activityId) : undefined;
  const change = checkIns.length >= 2 ? checkIns[checkIns.length - 1].energy - checkIns[0].energy : null;
  const question = REFLECTION_QUESTIONS[hashString(today) % REFLECTION_QUESTIONS.length];
  const [answer, setAnswer] = useState(data.dayNotes[today] ?? '');

  return (
    <Card>
      <CardTitle icon={<CalendarHeart size={18} />} sub="Не оцінка дня — лише кілька спостережень">
        Підсумок дня
      </CardTitle>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Записані заняття</dt>
          <dd className="font-semibold text-ink">{logs.length || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Найприємніше</dt>
          <dd className="text-right font-semibold text-ink">{bestAct ? `${bestAct.title}${best?.personalRating ? ` · ${'💗'.repeat(best.personalRating)}` : ''}` : '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Зміна самооцінки енергії</dt>
          <dd className="font-semibold text-ink">{change == null ? (checkIns.length === 1 ? `${checkIns[0].energy}% (один запис)` : '—') : `${checkIns[0].energy}% → ${checkIns[checkIns.length - 1].energy}%`}</dd>
        </div>
        {logs.some((l) => logOutcome(l) === 'worsened') && <p className="rounded-2xl bg-lav/50 p-3 text-xs text-ink">Деякі заняття сьогодні не допомогли — це нормальний результат і корисне знання.</p>}
      </dl>
      <div className="mt-4 rounded-2xl bg-white/70 p-3">
        <label htmlFor="reflect" className="text-sm font-semibold text-ink">
          🪞 {question}
        </label>
        {state.prefs.storeNotes ? (
          <textarea
            id="reflect"
            className={cx(inputCls, 'mt-2 min-h-[60px] bg-white')}
            placeholder="Можна відповісти тут — це збережеться в нотатку дня"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={() => answer !== (data.dayNotes[today] ?? '') && actions.setDayNote(today, answer)}
          />
        ) : (
          <p className="mt-1 text-xs text-muted">Можна просто подумати про це.</p>
        )}
      </div>
    </Card>
  );
}

function TodayPlan() {
  const { data, activityById } = useStore();
  const ui = useUI();
  const today = todayKey();
  const items = data.planned.filter((p) => dayKey(p.scheduledAt) === today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return (
    <Card>
      <CardTitle
        icon={<CalendarHeart size={18} />}
        sub="Запрошення, а не зобов’язання"
        action={
          <Button size="sm" variant="ghost" onClick={() => navigate('calendar')}>
            Календар
          </Button>
        }
      >
        Заплановано на сьогодні
      </CardTitle>
      {items.length === 0 ? (
        <EmptyState emoji="📅" title="Нічого не заплановано" text="І це теж нормально. Можна додати приємність прямо з бібліотеки." action={<Button size="sm" variant="soft" onClick={() => navigate('activities')}>До бібліотеки</Button>} />
      ) : (
        <ul className="space-y-2">
          {items.map((p) => {
            const a = activityById(p.activityId);
            if (!a) return null;
            return (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
                <ActivityIllustration activity={a} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                  <p className="text-xs text-muted">
                    {timeOf(p.scheduledAt)} · {p.status === 'done' ? 'виконано ✓' : p.status === 'skipped' ? 'пропущено — і це ок' : 'заплановано'}
                  </p>
                </div>
                {p.status === 'planned' && (
                  <Button size="sm" variant="hot" onClick={() => ui.openActivity(a.id, { plannedId: p.id, startNow: true })}>
                    Почати
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PinkNoteOfDay() {
  const [offset, setOffset] = useState(0);
  const note = PINK_NOTES[(hashString(todayKey()) + offset) % PINK_NOTES.length];
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-barbie via-hot to-[#c2187a] p-6 text-white shadow-[0_24px_50px_-24px_rgba(255,45,149,0.9)]">
      <Sparkle className="absolute right-5 top-5 text-white/70 animate-twinkle" size={22} />
      <Sparkle className="absolute bottom-6 right-16 text-white/50 animate-twinkle" size={12} style={{ animationDelay: '1s' }} />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">Pink Note · {NOTE_KIND_LABELS[note.kind]}</p>
      <p className="mt-4 font-display text-xl font-semibold leading-snug [text-shadow:0_1px_2px_rgba(110,10,60,0.35)]">{note.text}</p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setOffset((o) => o + 1)} className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/30">
          Ще одна нотатка
        </button>
        <button type="button" onClick={() => navigate('coach')} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-berry transition hover:bg-blush">
          Усі Pink Notes
        </button>
      </div>
    </section>
  );
}

