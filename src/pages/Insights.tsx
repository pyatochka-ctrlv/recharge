import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb, TrendingUp } from 'lucide-react';
import { useStore } from '../store/store';
import { useUI } from '../components/ui/feedback';
import { Card, CardTitle, cx, EmptyState, PageHeader, Segmented } from '../components/ui';
import { ActivityIllustration } from '../components/ActivityCard';
import { moodEmoji } from '../data/labels';
import { fmt } from '../lib/date';
import { beforeAfterByCategory, categoryCounts, checkInsInPeriod, durationDistribution, dynamicsSeries, effortDistribution, heatmap, logsInPeriod, outcomeLists, PERIOD_LABELS, periodDescription, personalInsights, timePatterns, topActivities, type Period } from '../lib/insights';
import { recoveryMap } from '../lib/achievements';
import { ENERGY_STEPS, energyColor } from '../lib/colors';

const INK = '#3b0d2c';
const MUTED = '#7d4f6b';
const PINK = '#E0157A';
const LAV = '#8B7FD1';
const axis = { fontSize: 11, fill: MUTED };
const grid = <CartesianGrid vertical={false} stroke="#8E245D" strokeOpacity={0.08} />;

function ChartTooltip({ active, payload, label, unit = '', name }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; unit?: string; name: string }) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const n = payload[0].payload.n as number | undefined;
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-8px_rgba(142,36,93,.45)]">
      <p className="font-semibold text-ink">{label}</p>
      <p className="text-ink">
        {name}: <b>{payload[0].value}{unit}</b>
      </p>
      {n != null && <p className="text-muted">записів: {n}</p>}
    </div>
  );
}

function SampleNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted">{children}</p>;
}

export default function InsightsPage() {
  const { data, activityById, activities, isDemo } = useStore();
  const ui = useUI();
  const [period, setPeriod] = useState<Period>('month');
  const [metric, setMetric] = useState<'energy' | 'mood' | 'tension'>('energy');
  const [baMetric, setBaMetric] = useState<'moodDelta' | 'energyDelta' | 'tensionDelta'>('moodDelta');
  const [heatBy, setHeatBy] = useState<'energy' | 'mood'>('energy');

  const now = useMemo(() => new Date(), []);
  const logs = useMemo(() => logsInPeriod(data.logs, period, now), [data.logs, period, now]);
  const checkIns = useMemo(() => checkInsInPeriod(data.checkIns, period, now), [data.checkIns, period, now]);
  const series = useMemo(() => dynamicsSeries(data.checkIns, period, now), [data.checkIns, period, now]);
  const ba = useMemo(() => beforeAfterByCategory(logs, activityById), [logs, activityById]);
  const cats = useMemo(() => categoryCounts(logs, activityById), [logs, activityById]);
  const durs = useMemo(() => durationDistribution(logs, activityById), [logs, activityById]);
  const effs = useMemo(() => effortDistribution(logs, activityById), [logs, activityById]);
  const heat = useMemo(() => heatmap(data.checkIns, data.logs, 12, now), [data.checkIns, data.logs, now]);
  const top = useMemo(() => topActivities(logs, activityById), [logs, activityById]);
  const outcomes = useMemo(() => outcomeLists(logs, activityById), [logs, activityById]);
  const tp = useMemo(() => timePatterns(checkIns), [checkIns]);
  const insights = useMemo(() => personalInsights(data.checkIns, data.logs, activityById, period, now), [data.checkIns, data.logs, activityById, period, now]);
  const map = useMemo(() => recoveryMap(data, activities), [data, activities]);

  const periodText = periodDescription(period, now, data.logs[0]?.startedAt ?? data.checkIns[0]?.timestamp);
  const pointsWithData = series.filter((p) => p[metric] != null);
  const avgEnergy = checkIns.length ? Math.round(checkIns.reduce((s, c) => s + c.energy, 0) / checkIns.length) : null;
  const metricMeta = { energy: { name: 'Енергія', unit: '%', domain: [0, 100] as [number, number] }, mood: { name: 'Настрій', unit: ' / 5', domain: [1, 5] as [number, number] }, tension: { name: 'Напруга', unit: ' / 5', domain: [1, 5] as [number, number] } }[metric];
  const baRows = ba.rows.filter((r) => r[baMetric] != null && r.n >= 2);
  const improves = (v: number) => (baMetric === 'tensionDelta' ? v < 0 : v > 0);

  const empty = data.checkIns.length === 0 && data.logs.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow="My Insights"
        title="Мої закономірності"
        subtitle="Усі графіки рахуються з твоїх збережених записів. Це спостереження, а не причинно-наслідкові висновки."
        action={
          <Segmented
            label="Період"
            value={period}
            onChange={setPeriod}
            options={(Object.keys(PERIOD_LABELS) as Period[]).map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
            size="sm"
          />
        }
      />
      {isDemo && <p className="-mt-3 mb-5 inline-block rounded-full bg-[#3b0d2c]/80 px-3 py-1 text-xs font-semibold text-white">Показано ДЕМО-статистику — вигадані дані для ознайомлення</p>}

      {empty ? (
        <Card>
          <EmptyState emoji="📊" title="Тут з’являться твої закономірності" text="Зроби кілька check-in та спробуй кілька занять — аналітика почне будуватися сама. Жодних вигаданих графіків." />
        </Card>
      ) : (
        <>
          {/* Ключові числа */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Check-in', value: checkIns.length, hint: periodText },
              { label: 'Записаних занять', value: logs.length, hint: periodText },
              { label: 'Середня енергія', value: avgEnergy == null ? '—' : `${avgEnergy}%`, hint: `з ${checkIns.length} записів` },
              { label: 'Різних занять', value: new Set(logs.map((l) => l.activityId)).size, hint: 'досліджено' },
            ].map((k) => (
              <div key={k.label} className="glass rounded-[24px] p-4">
                <p className="text-xs font-semibold text-muted">{k.label}</p>
                <p className="mt-1 font-display text-3xl font-bold text-ink">{k.value}</p>
                <p className="mt-1 truncate text-[11px] text-muted">{k.hint}</p>
              </div>
            ))}
          </div>

          {/* Персональні висновки */}
          <Card className="mt-5">
            <CardTitle icon={<Lightbulb size={18} />} sub="Висновки з’являються лише тоді, коли спостережень достатньо">
              Персональні спостереження
            </CardTitle>
            <ul className="grid gap-3 md:grid-cols-2">
              {insights.map((i) => (
                <li key={i.id} className={cx('rounded-3xl p-4', i.insightType === 'not-enough-data' ? 'bg-lav/50' : 'bg-white/75')}>
                  <p className="text-sm leading-relaxed text-ink">{i.description}</p>
                  <p className="mt-2 text-xs text-muted">
                    Спостережень: {i.sampleSize} · період: {i.period}
                    {isDemo && ' · демо'}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Динаміка */}
            <Card className="lg:col-span-2">
              <CardTitle
                icon={<TrendingUp size={18} />}
                sub={period === 'day' ? 'Кожен check-in сьогодні' : 'Середнє за день; дні без записів пропущено'}
                action={
                  <Segmented
                    label="Показник"
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'energy', label: 'Енергія' },
                      { value: 'mood', label: 'Настрій' },
                      { value: 'tension', label: 'Напруга' },
                    ]}
                    size="sm"
                  />
                }
              >
                Динаміка: {metricMeta.name.toLowerCase()}
              </CardTitle>
              {pointsWithData.length < 2 ? (
                <EmptyState emoji="📈" title="Поки замало точок для графіка" text="Потрібно хоча б два записи з цим показником у вибраному періоді." />
              ) : (
                <>
                  <div className="h-64" role="img" aria-label={`Графік: ${metricMeta.name}, ${periodText}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                        {grid}
                        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                        <YAxis domain={metricMeta.domain} tick={axis} axisLine={false} tickLine={false} allowDecimals={metric === 'energy' ? false : true} />
                        <Tooltip content={<ChartTooltip name={metricMeta.name} unit={metricMeta.unit} />} cursor={{ stroke: PINK, strokeOpacity: 0.3 }} />
                        <Line type="monotone" dataKey={metric} stroke={metric === 'tension' ? LAV : PINK} strokeWidth={2} connectNulls dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs font-semibold text-accent-ink">Показати таблицею</summary>
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-muted">
                            <th className="py-1">Дата/час</th>
                            <th>{metricMeta.name}</th>
                            <th>Записів</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pointsWithData.map((p) => (
                            <tr key={p.key} className="border-t border-line">
                              <td className="py-1">{p.label}</td>
                              <td>
                                {p[metric]}
                                {metricMeta.unit}
                              </td>
                              <td>{p.n}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                  <SampleNote>
                    Точок з даними: {pointsWithData.length} · {periodText}. Лінія з’єднує дні із записами.
                  </SampleNote>
                </>
              )}
            </Card>

            {/* До і після */}
            <Card className="lg:col-span-2">
              <CardTitle
                sub="Середня зміна за твоїми оцінками до/після (категорії з ≥2 оціненими записами)"
                action={
                  <Segmented
                    label="Показник до/після"
                    value={baMetric}
                    onChange={setBaMetric}
                    options={[
                      { value: 'moodDelta', label: 'Настрій' },
                      { value: 'energyDelta', label: 'Енергія' },
                      { value: 'tensionDelta', label: 'Напруга' },
                    ]}
                    size="sm"
                  />
                }
              >
                Стан до і після занять
              </CardTitle>
              {ba.overall.n === 0 ? (
                <EmptyState emoji="🔁" title="Ще немає оцінок до і після" text="Коли оцінюватимеш стан перед і після занять, тут з’явиться порівняння." />
              ) : (
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div className="space-y-2">
                    {[
                      { l: 'Енергія', b: ba.overall.energyBefore == null ? null : Math.round(ba.overall.energyBefore), a: ba.overall.energyAfter == null ? null : Math.round(ba.overall.energyAfter), u: '%' },
                      { l: 'Настрій', b: ba.overall.moodBefore, a: ba.overall.moodAfter, u: '' },
                      { l: 'Напруга', b: ba.overall.tensionBefore, a: ba.overall.tensionAfter, u: '' },
                    ].map((r) => (
                      <div key={r.l} className="rounded-2xl bg-white/75 p-3">
                        <p className="text-xs text-muted">{r.l} (середнє)</p>
                        <p className="font-display text-lg font-bold text-ink">
                          {r.b ?? '—'}
                          {r.u} <span className="text-muted">→</span> {r.a ?? '—'}
                          {r.u}
                        </p>
                      </div>
                    ))}
                    <SampleNote>На основі {ba.overall.n} оцінених записів</SampleNote>
                  </div>
                  {baRows.length === 0 ? (
                    <p className="self-center text-sm text-muted">Для порівняння категорій потрібно хоча б 2 оцінені записи в категорії.</p>
                  ) : (
                    <div>
                      <div style={{ height: Math.max(160, baRows.length * 34) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={baRows} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                            <CartesianGrid horizontal={false} stroke="#8E245D" strokeOpacity={0.08} />
                            <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="label" tick={{ ...axis, fill: INK }} width={110} axisLine={false} tickLine={false} />
                            <ReferenceLine x={0} stroke={MUTED} strokeOpacity={0.5} />
                            <Tooltip content={<ChartTooltip name="Середня зміна" />} cursor={{ fill: '#FFE6F1', opacity: 0.5 }} />
                            <Bar dataKey={baMetric} radius={4} barSize={18}>
                              {baRows.map((r) => (
                                <Cell key={r.category} fill={improves(r[baMetric] as number) ? PINK : LAV} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PINK }} /> у середньому краще після
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: LAV }} /> без покращення
                        </span>
                        {baMetric === 'tensionDelta' && <span>Для напруги «мінус» означає, що стало спокійніше.</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Категорії */}
            <Card>
              <CardTitle sub={`Записані заняття · ${periodText}`}>Найпопулярніші категорії</CardTitle>
              {cats.length === 0 ? (
                <EmptyState emoji="🎀" title="Ще немає записаних занять" />
              ) : (
                <div style={{ height: Math.max(140, cats.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 24, left: 4, bottom: 0 }}>
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis type="category" dataKey="label" tick={{ ...axis, fill: INK }} width={110} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip name="Занять" />} cursor={{ fill: '#FFE6F1', opacity: 0.5 }} />
                      <Bar dataKey="count" fill={PINK} radius={4} barSize={16} label={{ position: 'right', fontSize: 11, fill: INK }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Тривалість і зусилля */}
            <Card>
              <CardTitle sub={`Розподіл записаних занять · ${logs.length} записів`}>Тривалість і зусилля</CardTitle>
              {logs.length === 0 ? (
                <EmptyState emoji="⏱️" title="Ще немає даних" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { title: 'Тривалість', data: durs },
                      { title: 'Зусилля', data: effs },
                    ] as { title: string; data: { key: string; label: string; count: number }[] }[]
                  ).map((g) => (
                    <figure key={g.title}>
                      <figcaption className="mb-1 text-xs font-semibold text-muted">{g.title}</figcaption>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={g.data} margin={{ top: 16, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval={0} />
                            <YAxis hide allowDecimals={false} />
                            <Tooltip content={<ChartTooltip name="Занять" />} cursor={{ fill: '#FFE6F1', opacity: 0.5 }} />
                            <Bar dataKey="count" fill={PINK} radius={4} barSize={22} label={{ position: 'top', fontSize: 11, fill: INK }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </figure>
                  ))}
                </div>
              )}
            </Card>

            {/* Теплова карта */}
            <Card className="lg:col-span-2">
              <CardTitle
                sub="Останні 12 тижнів · середнє за день"
                action={
                  <Segmented
                    label="Показник теплової карти"
                    value={heatBy}
                    onChange={setHeatBy}
                    options={[
                      { value: 'energy', label: 'Енергія' },
                      { value: 'mood', label: 'Настрій' },
                    ]}
                    size="sm"
                  />
                }
              >
                Теплова карта самопочуття
              </CardTitle>
              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max gap-1.5">
                  <div className="flex flex-col gap-1.5 pr-1 pt-0 text-[10px] text-muted">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d) => (
                      <span key={d} className="flex h-5 items-center sm:h-6">
                        {d}
                      </span>
                    ))}
                  </div>
                  {heat.map((col, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      {col.map((c) => {
                        const v = heatBy === 'energy' ? c.energy : c.mood != null ? Math.round(((c.mood - 1) / 4) * 100) : null;
                        return (
                          <span
                            key={c.key}
                            className={cx('block h-5 w-5 rounded-md sm:h-6 sm:w-6', c.inFuture ? 'opacity-0' : v == null && 'border border-dashed border-line bg-white/40')}
                            style={v != null ? { background: energyColor(v) } : undefined}
                            title={`${fmt(c.date, 'd MMMM')}: ${heatBy === 'energy' ? (c.energy != null ? `енергія ${c.energy}%` : 'немає записів') : c.mood != null ? `настрій ${moodEmoji(c.mood)} ${c.mood}/5` : 'немає записів'}${c.logs ? `, занять: ${c.logs}` : ''}`}
                            aria-hidden={c.inFuture}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span>{heatBy === 'energy' ? 'менше' : '😣'}</span>
                {ENERGY_STEPS.map((c) => (
                  <span key={c} className="h-3 w-5 rounded" style={{ background: c }} />
                ))}
                <span>{heatBy === 'energy' ? 'більше' : '🥰'}</span>
                <span className="ml-3">пунктир — немає записів (і це нормально)</span>
              </div>
            </Card>

            {/* Найчастіші */}
            <Card>
              <CardTitle sub={periodText}>Найчастіше обрані заняття</CardTitle>
              {top.length === 0 ? (
                <EmptyState emoji="🌸" title="Ще немає записаних занять" />
              ) : (
                <ol className="space-y-2">
                  {top.map(({ activity, stat }, i) => (
                    <li key={activity.id}>
                      <button type="button" onClick={() => ui.openActivity(activity.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-2.5 text-left transition hover:bg-chip">
                        <span className="w-5 text-center font-display text-sm font-bold text-muted">{i + 1}</span>
                        <ActivityIllustration activity={activity} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{activity.title}</span>
                        <span className="text-sm font-bold text-accent-ink">{stat.count}×</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            {/* Що допомагало / не дало ефекту */}
            <Card>
              <CardTitle sub="За твоїми оцінками до/після; лише заняття з ≥2 оціненими записами">Що відгукується, а що ні</CardTitle>
              {outcomes.helpful.length + outcomes.notHelpful.length === 0 ? (
                <EmptyState emoji="🔍" title="Поки замало оцінок" text="Оцінюй стан до і після — і тут з’являться заняття, після яких тобі частіше краще." />
              ) : (
                <div className="space-y-4">
                  {outcomes.helpful.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent-ink">Частіше повідомляла про покращення</p>
                      <ul className="space-y-1.5">
                        {outcomes.helpful.map((r) => (
                          <li key={r.activity.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
                            <span className="truncate text-ink">{r.activity.title}</span>
                            <span className="shrink-0 text-xs font-semibold text-muted">
                              {r.stat.improved} з {r.stat.rated}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {outcomes.notHelpful.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#5b4fa8]">Не дали бажаного ефекту</p>
                      <ul className="space-y-1.5">
                        {outcomes.notHelpful.map((r) => (
                          <li key={r.activity.id} className="flex items-center justify-between gap-2 rounded-xl bg-lav/40 px-3 py-2 text-sm">
                            <span className="truncate text-ink">{r.activity.title}</span>
                            <span className="shrink-0 text-xs font-semibold text-muted">
                              покращення {r.stat.improved} з {r.stat.rated}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <SampleNote>Це не «погані» заняття — просто, можливо, не твої зараз.</SampleNote>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Часові закономірності */}
            <Card className="lg:col-span-2">
              <CardTitle sub={`На основі ${tp.n} check-in · ${periodText}`}>Часові закономірності</CardTitle>
              {!tp.enough ? (
                <EmptyState emoji="🕰️" title="Поки недостатньо даних" text="Потрібно щонайменше 14 check-in у різний час доби. Без поспіху — закономірності з’являться самі." />
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <figure>
                    <figcaption className="mb-1 text-xs font-semibold text-muted">Середня енергія за частиною доби</figcaption>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tp.byPart.filter((p) => p.n > 0)} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
                          {grid}
                          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip name="Енергія" unit="%" />} cursor={{ fill: '#FFE6F1', opacity: 0.5 }} />
                          <Bar dataKey="energy" fill={PINK} radius={4} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </figure>
                  <figure>
                    <figcaption className="mb-1 text-xs font-semibold text-muted">Середня енергія за днем тижня</figcaption>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tp.byWeekday} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
                          {grid}
                          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip name="Енергія" unit="%" />} cursor={{ fill: '#FFE6F1', opacity: 0.5 }} />
                          <Bar dataKey="energy" fill={PINK} radius={4} barSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </figure>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Карта відновлення */}
      <Card className="mt-5">
        <CardTitle sub="Скільки занять кожної категорії ти вже спробувала. Це карта досліджень, а не план.">Моя карта відновлення</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {map.map((m) => (
            <div key={m.category.id} className="rounded-2xl bg-white/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">
                  {m.category.emoji} {m.category.short}
                </span>
                <span className="text-xs text-muted">
                  {m.tried} / {m.total}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuemin={0} aria-valuemax={m.total} aria-valuenow={m.tried} aria-label={`${m.category.short}: відкрито ${m.tried} з ${m.total}`}>
                <div className="h-full rounded-full" style={{ width: `${(m.tried / Math.max(1, m.total)) * 100}%`, background: `linear-gradient(90deg, ${m.category.from}, ${m.category.to})` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
