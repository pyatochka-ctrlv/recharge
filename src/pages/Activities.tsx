import { useDeferredValue, useMemo, useState } from 'react';
import { Plus, Search, SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { useStore } from '../store/store';
import { useUI } from '../components/ui/feedback';
import { ActivityCard, ActivityIllustration } from '../components/ActivityCard';
import { Button, Card, Chip, cx, EmptyState, inputCls, Modal, PageHeader, Toggle } from '../components/ui';
import { CustomActivityForm } from '../components/CustomActivityForm';
import { CATEGORIES } from '../data/categories';
import { ACCESS_LABELS, ACCESS_TAGS, CONTEXT_LABELS, CONTEXTS, COST_LABELS, COSTS, DURATION_LABELS, DURATIONS, EFFORT_LABELS, EFFORTS } from '../data/labels';
import { applyFilters, COLLECTION_LABELS, countActiveFilters, defaultFilters, maxEffortForEnergy, PRESETS, SORT_LABELS, type Collection, type FilterState, type SortKey } from '../lib/filters';
import { activityStats } from '../lib/stats';
import { recommend, defaultCoachContext } from '../lib/recommend';

const PAGE = 24;

export function ActivitiesPage() {
  const { activities, data, actions, state } = useStore();
  const ui = useUI();
  const [f, setF] = useState<FilterState>(defaultFilters);
  const [preset, setPreset] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [adding, setAdding] = useState(false);
  const [unsureSeed, setUnsureSeed] = useState(0);
  const query = useDeferredValue(f.query);

  const stats = useMemo(() => activityStats(data.logs), [data.logs]);
  const results = useMemo(() => applyFilters(activities, { ...f, query }, { meta: data.activityMeta, stats }), [activities, f, query, data.activityMeta, stats]);
  const active = countActiveFilters(f);

  const update = (patch: Partial<FilterState>) => {
    setF((prev) => ({ ...prev, ...patch }));
    setLimit(PAGE);
  };
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const applyPreset = (id: string) => {
    if (preset === id) {
      setPreset(null);
      setF((prev) => ({ ...defaultFilters(), query: prev.query, collection: prev.collection }));
      return;
    }
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    setF((prev) => ({ ...defaultFilters(), query: prev.query, collection: prev.collection, ...p.patch }));
    setLimit(PAGE);
  };

  const unsure = useMemo(() => {
    if (preset !== 'unsure') return [];
    return recommend({ ...defaultCoachContext(), scenario: 'unsure', minutes: 15 }, { activities, logs: data.logs, meta: data.activityMeta, prefs: state.prefs }, { count: 3, seed: 97 + unsureSeed * 131 });
  }, [preset, unsureSeed, activities, data.logs, data.activityMeta, state.prefs]);

  const reset = () => {
    setF((prev) => ({ ...defaultFilters(), collection: prev.collection }));
    setPreset(null);
  };

  const filterPanel = (
    <div className="space-y-5">
      <FilterGroup title="Тривалість">
        {DURATIONS.map((d) => (
          <Chip key={d} selected={f.durations.includes(d)} onClick={() => update({ durations: toggle(f.durations, d) })}>
            {DURATION_LABELS[d]}
          </Chip>
        ))}
      </FilterGroup>
      <div>
        <Toggle label="Фільтр за доступною енергією" description="Показувати лише заняття із зусиллями, що відповідають твоєму заряду" checked={f.energy != null} onChange={(on) => update({ energy: on ? (data.checkIns[data.checkIns.length - 1]?.energy ?? 50) : null })} />
        {f.energy != null && (
          <div className="mt-2">
            <input type="range" min={0} max={100} value={f.energy} onChange={(e) => update({ energy: Number(e.target.value) })} className="range" aria-label="Доступна енергія" aria-valuetext={`${f.energy}%`} />
            <p className="mt-1 text-xs text-muted">
              Енергія {f.energy}% → до рівня «{EFFORT_LABELS[maxEffortForEnergy(f.energy)].toLowerCase()}»
            </p>
          </div>
        )}
      </div>
      <FilterGroup title="Рівень зусиль">
        {EFFORTS.map((e) => (
          <Chip key={e} selected={f.efforts.includes(e)} onClick={() => update({ efforts: toggle(f.efforts, e) })}>
            {EFFORT_LABELS[e]}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Бюджет">
        {COSTS.map((c) => (
          <Chip key={c} selected={f.costs.includes(c)} onClick={() => update({ costs: toggle(f.costs, c) })}>
            {COST_LABELS[c]}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Місце">
        {(
          [
            ['any', 'Будь-де'],
            ['home', 'Вдома'],
            ['outdoor', 'Надворі'],
            ['online', 'Онлайн'],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} selected={f.place === v} onClick={() => update({ place: v })}>
            {l}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Формат">
        {(
          [
            ['any', 'Будь-який'],
            ['solo', 'Наодинці'],
            ['together', 'З іншими'],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} selected={f.social === v} onClick={() => update({ social: v })}>
            {l}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Настрій і стан">
        {CONTEXTS.map((t) => (
          <Chip key={t} selected={f.moods.includes(t)} onClick={() => update({ moods: toggle(f.moods, t) })}>
            {CONTEXT_LABELS[t]}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Доступність">
        {ACCESS_TAGS.map((t) => (
          <Chip key={t} selected={f.access.includes(t)} onClick={() => update({ access: toggle(f.access, t) })}>
            {ACCESS_LABELS[t]}
          </Chip>
        ))}
      </FilterGroup>
      <Toggle label="Без матеріалів" description="Лише заняття, для яких нічого не потрібно" checked={f.noMaterials} onChange={(v) => update({ noMaterials: v })} />
      <div>
        <label htmlFor="sort" className="mb-2 block text-sm font-semibold text-ink">
          Сортування
        </label>
        <select id="sort" className={inputCls} value={f.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Recharge Activities"
        title="Бібліотека відновлення"
        subtitle={`${activities.length} занять для різних станів. Обирай, досліджуй, позначай «не моє» — усе це про тебе.`}
        action={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={18} /> Додати своє
          </Button>
        }
      />

      {/* Пошук */}
      <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-5">
        <Search size={18} className="shrink-0 text-muted" aria-hidden />
        <label htmlFor="search" className="sr-only">
          Пошук занять
        </label>
        <input
          id="search"
          type="search"
          value={f.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Пошук: чай, прогулянка, творчість…"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <Button variant={active ? 'hot' : 'soft'} onClick={() => setShowFilters(true)} aria-label={`Фільтри${active ? `, активних: ${active}` : ''}`} className="lg:hidden">
          <SlidersHorizontal size={17} />
          {active > 0 && <span>{active}</span>}
        </Button>
      </div>

      {/* Пресети */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Швидкі пресети">
        {PRESETS.map((p) => (
          <Chip key={p.id} selected={preset === p.id} onClick={() => applyPreset(p.id)}>
            <span aria-hidden>{p.emoji}</span> {p.label}
          </Chip>
        ))}
      </div>

      {preset === 'unsure' && (
        <Card className="mt-4">
          <p className="font-display font-semibold text-ink">Три зовсім різні ідеї з мінімальним порогом входу</p>
          <p className="mt-1 text-sm text-muted">Можна обрати одну — або відмовитися від усіх. Це теж відповідь.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {unsure.map((r) => (
              <button key={r.activity.id} type="button" onClick={() => ui.openActivity(r.activity.id)} className="flex items-start gap-3 rounded-3xl bg-white/80 p-4 text-left transition hover:bg-chip">
                <ActivityIllustration activity={r.activity} size="sm" />
                <span>
                  <span className="block font-semibold text-ink">{r.activity.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{DURATION_LABELS[r.activity.durationRange]} · {r.activity.description}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="soft" onClick={() => setUnsureSeed((s) => s + 1)}>
              <RefreshCw size={14} /> Інші три
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setPreset(null); ui.toast('Добре. Можна просто відпочити 💗', '🌙'); }}>
              Жодне не хочу
            </Button>
          </div>
        </Card>
      )}

      {/* Колекції */}
      <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0" role="tablist" aria-label="Колекції">
        {(Object.keys(COLLECTION_LABELS) as Collection[]).map((c) => (
          <button
            key={c}
            role="tab"
            type="button"
            aria-selected={f.collection === c}
            onClick={() => update({ collection: c })}
            className={cx('shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition', f.collection === c ? 'bg-surface-strong text-accent-ink shadow' : 'text-onpage-muted hover:text-onpage')}
          >
            {COLLECTION_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Категорії */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0" aria-label="Категорії">
        <Chip selected={f.categories.length === 0} onClick={() => update({ categories: [] })}>
          Усі категорії
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} selected={f.categories.includes(c.id)} onClick={() => update({ categories: toggle(f.categories, c.id) })}>
            <span aria-hidden>{c.emoji}</span> {c.short}
          </Chip>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label="Фільтри">
          <Card className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-semibold text-ink">Фільтри</h2>
              {active > 0 && (
                <Button size="sm" variant="ghost" onClick={reset}>
                  Скинути
                </Button>
              )}
            </div>
            {filterPanel}
          </Card>
        </aside>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
            <p className="text-sm font-semibold text-onpage">
              Знайдено: {results.length}
              {active > 0 && <span className="font-normal text-onpage-muted"> · фільтрів: {active}</span>}
            </p>
            {(active > 0 || preset) && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm font-semibold text-onpage underline-offset-4 hover:underline">
                <X size={14} /> Скинути все
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <Card>
              <EmptyState
                emoji="🔍"
                title={f.collection === 'favorites' ? 'Тут поки порожньо' : 'Нічого не знайшлося'}
                text={f.collection === 'favorites' ? 'Натискай 💗 на заняттях, які подобаються, — вони збиратимуться тут.' : f.collection === 'custom' ? 'Додай власне заняття — те, що допомагає саме тобі.' : 'Спробуй прибрати кілька фільтрів або змінити запит.'}
                action={
                  f.collection === 'custom' ? (
                    <Button variant="primary" onClick={() => setAdding(true)}>
                      <Plus size={16} /> Додати своє
                    </Button>
                  ) : (
                    <Button variant="soft" onClick={reset}>
                      Скинути фільтри
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {results.slice(0, limit).map((a) => (
                  <ActivityCard key={a.id} activity={a} meta={data.activityMeta[a.id]} stat={stats.get(a.id)} onOpen={() => ui.openActivity(a.id)} onToggleFavorite={() => actions.setMeta(a.id, { favorite: !data.activityMeta[a.id]?.favorite })} />
                ))}
              </div>
              {results.length > limit && (
                <div className="mt-5 flex justify-center">
                  <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                    Показати ще ({results.length - limit})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={showFilters} onClose={() => setShowFilters(false)} title="Фільтри">
        {filterPanel}
        <div className="sticky bottom-0 mt-5 flex gap-2 bg-[#fff8fb] pt-3">
          <Button variant="primary" className="flex-1" onClick={() => setShowFilters(false)}>
            Показати {results.length}
          </Button>
          <Button variant="ghost" onClick={reset}>
            Скинути
          </Button>
        </div>
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Нове власне заняття" wide>
        <CustomActivityForm
          onCancel={() => setAdding(false)}
          onSave={(draft) => {
            const a = actions.addCustomActivity(draft);
            setAdding(false);
            ui.toast('Заняття додано в бібліотеку', '🪄');
            update({ collection: 'custom' });
            ui.openActivity(a.id);
          }}
        />
      </Modal>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}
