import { useMemo, useState } from 'react';
import { Bookmark, RefreshCw, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/store';
import { useUI } from '../components/ui/feedback';
import { ActivityIllustration } from '../components/ActivityCard';
import { Button, Card, CardTitle, Chip, EnergySlider, Field, LevelPicker, MoodPicker, PageHeader, Segmented, Sparkle, Toggle } from '../components/ui';
import { DURATION_LABELS, EFFORT_SHORT, TENSION_LABELS } from '../data/labels';
import { PINK_NOTES, NOTE_KIND_LABELS, type NoteKind } from '../data/notes';
import { MINUTE_OPTIONS, recommend, resolveScenario, SCENARIO_LABELS, defaultCoachContext, type CoachContext, type Scenario } from '../lib/recommend';
import { personalInsights, weeklySummary } from '../lib/insights';
import { hashString, todayKey } from '../lib/date';

export function CoachPage() {
  const { data, state, activities, actions, isDemo } = useStore();
  const ui = useUI();
  const latest = data.checkIns[data.checkIns.length - 1];
  const [ctx, setCtx] = useState<CoachContext>(() => ({
    ...defaultCoachContext(),
    energy: latest?.energy ?? 50,
    mood: latest?.mood ?? null,
    tension: latest?.tension ?? null,
  }));
  const [seed, setSeed] = useState(1);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const detailed = state.prefs.detailLevel === 'detailed';
  const scenario = resolveScenario(ctx);
  const count = scenario === 'unsure' ? 3 : 4;

  const recs = useMemo(
    () => recommend(ctx, { activities, logs: data.logs, meta: data.activityMeta, prefs: state.prefs }, { count, exclude: dismissed, seed: hashString(todayKey()) + seed * 104729 }),
    [ctx, activities, data.logs, data.activityMeta, state.prefs, count, dismissed, seed],
  );

  const set = (patch: Partial<CoachContext>) => setCtx((c) => ({ ...c, ...patch }));

  return (
    <div>
      <PageHeader eyebrow="Personal Recharge Coach" title="Pink Coach" subtitle="Розкажи, як ти, — і я запропоную кілька ідей. Можеш спробувати одну, попросити інші або просто відпочити." />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardTitle sub="Усе можна змінювати — рекомендації оновлюються одразу">Мій стан зараз</CardTitle>
          <div className="space-y-5">
            <EnergySlider value={ctx.energy ?? 50} onChange={(v) => set({ energy: v })} />
            <Field label="Настрій">
              <MoodPicker size="sm" value={ctx.mood} onChange={(v) => set({ mood: v })} />
            </Field>
            <Field label="Напруга">
              <LevelPicker label="Напруга" labels={TENSION_LABELS} value={ctx.tension} onChange={(v) => set({ tension: v })} />
            </Field>
            <Field label="Скільки є часу?">
              <div className="flex flex-wrap gap-1.5">
                {MINUTE_OPTIONS.map((m) => (
                  <Chip key={m} selected={ctx.minutes === m} onClick={() => set({ minutes: m })} className="px-3 py-1.5">
                    {m === 60 ? '60+ хв' : `${m} хв`}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Люди чи тиша?">
              <Segmented
                label="Люди чи тиша"
                value={ctx.social}
                onChange={(v) => set({ social: v })}
                options={[
                  { value: 'any', label: 'Все одно' },
                  { value: 'people', label: '🫶 Хочу людей' },
                  { value: 'alone', label: '🌙 Хочу сама' },
                ]}
                size="sm"
              />
            </Field>
            <Field label="Де я?">
              <Segmented
                label="Де я"
                value={ctx.place}
                onChange={(v) => set({ place: v })}
                options={[
                  { value: 'any', label: 'Будь-де' },
                  { value: 'home', label: 'Вдома' },
                  { value: 'outside', label: 'Не вдома' },
                ]}
                size="sm"
              />
            </Field>
            <Toggle label="Є матеріали під рукою" description="Вимкни, якщо зараз нічого немає — покажу заняття без матеріалів" checked={ctx.hasMaterials} onChange={(v) => set({ hasMaterials: v })} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <p className="mb-2 text-sm font-semibold text-ink">Що найточніше про тебе зараз?</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip selected={ctx.scenario === 'auto'} onClick={() => set({ scenario: 'auto' })}>
                ✨ Визнач сама
              </Chip>
              {(Object.keys(SCENARIO_LABELS) as Exclude<Scenario, 'auto'>[]).map((s) => (
                <Chip key={s} selected={ctx.scenario === s} onClick={() => set({ scenario: s })}>
                  {SCENARIO_LABELS[s].emoji} {SCENARIO_LABELS[s].label}
                </Chip>
              ))}
            </div>
            <p className="mt-3 rounded-2xl bg-white/70 p-3 text-sm text-ink">
              <span className="font-semibold">{SCENARIO_LABELS[scenario].emoji} {SCENARIO_LABELS[scenario].label}.</span> {SCENARIO_LABELS[scenario].hint}
            </p>
          </Card>

          <section aria-label="Рекомендації" aria-live="polite">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-onpage">Як тобі такі ідеї?</h2>
              <Button size="sm" variant="outline" onClick={() => setSeed((s) => s + 1)}>
                <RefreshCw size={14} /> Інші варіанти
              </Button>
            </div>
            {recs.length === 0 ? (
              <Card>
                <p className="text-sm text-ink">З такими умовами не знайшлося варіантів. Спробуй додати часу, змінити місце або повернути заняття з колекції «Приховані». А можна просто відпочити — це теж вибір 💗</p>
                {dismissed.size > 0 && (
                  <Button size="sm" variant="soft" className="mt-3" onClick={() => setDismissed(new Set())}>
                    Повернути відхилені ({dismissed.size})
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recs.map((r, i) => (
                  <article key={r.activity.id} className="glass flex flex-col rounded-[24px] p-4 animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-start gap-3">
                      <ActivityIllustration activity={r.activity} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted">{i === 0 ? 'Можеш спробувати' : i === 1 ? 'Або, може…' : 'Ще варіант'}</p>
                        <h3 className="font-semibold leading-snug text-ink">{r.activity.title}</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          {DURATION_LABELS[r.activity.durationRange]} · зусилля: {EFFORT_SHORT[r.activity.effortLevel]}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Не зараз: ${r.activity.title}`}
                        title="Не зараз"
                        onClick={() => setDismissed((d) => new Set(d).add(r.activity.id))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-ink"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <p className="mt-3 text-sm text-ink">{r.activity.description}</p>
                    {detailed && r.reasons.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-muted">
                        {r.reasons.map((x) => (
                          <li key={x}>· {x}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                      <Button size="sm" variant="primary" onClick={() => ui.openActivity(r.activity.id, { startNow: true })}>
                        Спробувати
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => ui.openActivity(r.activity.id)}>
                        Детальніше
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          actions.setMeta(r.activity.id, { savedForLater: true });
                          ui.toast('Збережено на потім', '🔖');
                        }}
                      >
                        <Bookmark size={14} /> На потім
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="mt-4 text-center text-sm text-onpage-muted">Жодне не відгукується? Це нормально. Або можна просто відпочити 💗</p>
          </section>
        </div>
      </div>

      <PinkNotes isDemo={isDemo} />
    </div>
  );
}

function PinkNotes({ isDemo }: { isDemo: boolean }) {
  const { data, activityById } = useStore();
  const [kind, setKind] = useState<NoteKind | 'all'>('all');
  const [offset, setOffset] = useState(0);
  const pool = PINK_NOTES.filter((n) => kind === 'all' || n.kind === kind);
  const start = (hashString(todayKey()) + offset * 3) % pool.length;
  const notes = [0, 1, 2].map((i) => pool[(start + i) % pool.length]).filter((n, i, a) => a.indexOf(n) === i);
  const week = weeklySummary(data.checkIns, data.logs, activityById);
  const observations = personalInsights(data.checkIns, data.logs, activityById, 'month').slice(0, 2);

  return (
    <section className="mt-8" aria-labelledby="pink-notes">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pink-notes" className="font-display text-2xl font-bold text-onpage">
            Pink Notes
          </h2>
          <p className="text-sm text-onpage-muted">Підтримка, ідеї, питання для себе й маленькі ритуали. Без «треба».</p>
        </div>
        <Segmented
          label="Тип нотаток"
          value={kind}
          onChange={(v) => {
            setKind(v);
            setOffset(0);
          }}
          options={[{ value: 'all' as const, label: 'Усі' }, ...(Object.keys(NOTE_KIND_LABELS) as NoteKind[]).map((k) => ({ value: k, label: NOTE_KIND_LABELS[k] }))]}
          size="sm"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {notes.map((n, i) => (
          <div key={n.id} className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg" style={{ background: ['linear-gradient(135deg,#FF69B4,#FF2D95)', 'linear-gradient(135deg,#C778E8,#FF69B4)', 'linear-gradient(135deg,#FF2D95,#8E245D)'][i % 3] }}>
            <Sparkle className="absolute right-4 top-4 text-white/60" size={14} />
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">{NOTE_KIND_LABELS[n.kind]}</p>
            <p className="mt-2 font-display font-semibold leading-snug [text-shadow:0_1px_2px_rgba(80,10,50,0.35)]">{n.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <Button size="sm" variant="outline" onClick={() => setOffset((o) => o + 1)}>
          <Sparkles size={14} /> Інші нотатки
        </Button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <CardTitle sub={isDemo ? 'Демо-дані — не твої реальні спостереження' : 'Останні 7 днів'}>Підсумок тижня</CardTitle>
          {week.checkIns + week.logs === 0 ? (
            <p className="text-sm text-muted">Цього тижня записів немає — і це нормально. Трекер не потребує щоденного заповнення.</p>
          ) : (
            <ul className="space-y-2 text-sm text-ink">
              <li>
                📝 {week.checkIns} check-in · 🌸 {week.logs} занять · {week.days} дн. із записами
              </li>
              {week.avgEnergy != null && <li>🔋 Середня самооцінка енергії: {week.avgEnergy}%</li>}
              {week.topCategory && (
                <li>
                  {week.topCategory.emoji} Найчастіше обирала: «{week.topCategory.label}» ({week.topCategory.count})
                </li>
              )}
              {week.tried > 0 && <li>✨ Різних занять: {week.tried}</li>}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle sub="На основі твоїх записів за 30 днів">Персональні спостереження</CardTitle>
          <ul className="space-y-3">
            {observations.map((o) => (
              <li key={o.id} className="text-sm text-ink">
                {o.description}
                <span className="mt-1 block text-xs text-muted">
                  {o.sampleSize} спостережень · {o.period}
                  {isDemo && ' · демо'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
