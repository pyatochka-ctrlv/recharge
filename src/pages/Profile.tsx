import { useMemo, useRef, useState } from 'react';
import { Bell, Download, Lock, Palette, Trash2, Upload, Award, FlaskConical, HeartHandshake } from 'lucide-react';
import { useStore } from '../store/store';
import { useUI } from '../components/ui/feedback';
import { Button, Card, CardTitle, Chip, cx, Field, inputCls, Modal, PageHeader, Segmented, Toggle } from '../components/ui';
import { CATEGORIES } from '../data/categories';
import { DURATION_LABELS, DURATIONS, EFFORT_LABELS, EFFORTS, FORMAT_LABELS, FORMATS } from '../data/labels';
import { computeBadges } from '../lib/achievements';
import { notificationsSupported, requestNotificationPermission } from '../lib/reminders';
import { downloadFile, toCsv } from '../lib/export';
import type { Theme } from '../types';
import { todayKey } from '../lib/date';

export function ProfilePage() {
  const { state, data, actions, activities, isDemo, activityById } = useStore();
  const ui = useUI();
  const p = state.prefs;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const badges = useMemo(() => computeBadges(data, activities), [data, activities]);
  const [perm, setPerm] = useState<string>(notificationsSupported() ? Notification.permission : 'unsupported');

  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const exportJson = () => {
    const payload = { app: 'Recharge Club', exportedAt: new Date().toISOString(), ...state };
    downloadFile(`recharge-club-${todayKey()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    ui.toast('Експортовано JSON', '📦');
  };

  const exportCsv = () => {
    const d = state.real;
    const rows = [
      ...d.checkIns.map((c) => ({ type: 'check-in', time: c.timestamp, activity: '', energy: c.energy, energyAfter: '', mood: c.mood ?? '', moodAfter: '', tension: c.tension ?? '', tensionAfter: '', fatigue: c.fatigue ?? '', note: c.note })),
      ...d.logs.map((l) => ({ type: 'activity', time: l.startedAt, activity: activityById(l.activityId)?.title ?? l.activityId, energy: l.energyBefore ?? '', energyAfter: l.energyAfter ?? '', mood: l.moodBefore ?? '', moodAfter: l.moodAfter ?? '', tension: l.tensionBefore ?? '', tensionAfter: l.tensionAfter ?? '', fatigue: '', note: [l.liked, l.notes].filter(Boolean).join(' / ') })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    downloadFile(`recharge-club-history-${todayKey()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
    ui.toast('Експортовано CSV (лише реальні дані)', '📄');
  };

  const importJson = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('too big');
      const json = JSON.parse(await file.text());
      if (!json || typeof json !== 'object' || !('real' in json)) throw new Error('format');
      if (!window.confirm('Імпорт замінить поточні дані на цьому пристрої. Продовжити?')) return;
      actions.importState(json);
      ui.toast('Дані імпортовано', '✅');
    } catch {
      ui.toast('Не вдалося імпортувати: файл не схожий на експорт Recharge Club', '⚠️');
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Profile" title={p.name ? `Профіль · ${p.name}` : 'Профіль'} subtitle="Налаштування, вподобання й керування даними. Все зберігається лише на цьому пристрої." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<Palette size={18} />}>Я і мій стиль</CardTitle>
          <div className="space-y-5">
            <Field label="Ім’я або псевдонім" htmlFor="name">
              <input id="name" className={inputCls} maxLength={40} value={p.name} onChange={(e) => actions.setPrefs({ name: e.target.value })} placeholder="Як до тебе звертатися?" />
            </Field>
            <Field label="Тема">
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Тема">
                {(
                  [
                    ['soft', 'Soft Pink', 'Ніжна, світла', 'linear-gradient(135deg,#FFF0F5,#FFD6E7 50%,#E9DFFF)'],
                    ['barbie', 'Barbie Pink', 'Насичена, яскрава', 'linear-gradient(135deg,#FF69B4,#FF2D95 60%,#C2187A)'],
                  ] as [Theme, string, string, string][]
                ).map(([v, title, sub, bg]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={p.theme === v}
                    onClick={() => actions.setPrefs({ theme: v })}
                    className={cx('overflow-hidden rounded-3xl border-2 bg-white text-left transition', p.theme === v ? 'border-hot shadow-lg' : 'border-transparent')}
                  >
                    <span className="block h-16" style={{ background: bg }} />
                    <span className="block p-3">
                      <span className="block text-sm font-bold text-ink">{title}</span>
                      <span className="block text-xs text-muted">{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Field>
            <Toggle label="Менше анімацій" description="Вимикає рух батарейки, конфеті та переходи" checked={p.reduceMotion} onChange={(v) => actions.setPrefs({ reduceMotion: v })} />
          </div>
        </Card>

        <Card>
          <CardTitle icon={<HeartHandshake size={18} />} sub="Pink Coach враховує це під час рекомендацій">
            Вподобання
          </CardTitle>
          <div className="space-y-5">
            <Field label="Улюблені категорії">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} selected={p.favoriteCategories.includes(c.id)} onClick={() => actions.setPrefs({ favoriteCategories: toggle(p.favoriteCategories, c.id), excludedCategories: p.excludedCategories.filter((x) => x !== c.id) })}>
                    {c.emoji} {c.short}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Небажані категорії" hint="Їх не буде в рекомендаціях (у бібліотеці вони залишаються).">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} selected={p.excludedCategories.includes(c.id)} onClick={() => actions.setPrefs({ excludedCategories: toggle(p.excludedCategories, c.id), favoriteCategories: p.favoriteCategories.filter((x) => x !== c.id) })}>
                    {c.emoji} {c.short}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Типові доступні проміжки часу">
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <Chip key={d} selected={p.preferredDurations.includes(d)} onClick={() => actions.setPrefs({ preferredDurations: toggle(p.preferredDurations, d) })}>
                    {DURATION_LABELS[d]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Комфортний рівень зусиль">
              <div className="flex flex-wrap gap-1.5">
                {EFFORTS.map((e) => (
                  <Chip key={e} selected={p.preferredEffort.includes(e)} onClick={() => actions.setPrefs({ preferredEffort: toggle(p.preferredEffort, e) })}>
                    {EFFORT_LABELS[e]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Улюблені формати">
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <Chip key={f} selected={p.preferredFormats.includes(f)} onClick={() => actions.setPrefs({ preferredFormats: toggle(p.preferredFormats, f) })}>
                    {FORMAT_LABELS[f]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Деталізація рекомендацій">
              <Segmented
                label="Деталізація рекомендацій"
                value={p.detailLevel}
                onChange={(v) => actions.setPrefs({ detailLevel: v })}
                options={[
                  { value: 'short', label: 'Коротко' },
                  { value: 'detailed', label: 'З поясненнями' },
                ]}
                size="sm"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Bell size={18} />} sub="Добровільно, раз на день, легко вимкнути">
            Нагадування
          </CardTitle>
          <Toggle
            label="М’яке щоденне нагадування"
            description="«Як твоя батарейка? Можна відповісти — а можна й ні»"
            checked={p.remindersEnabled}
            onChange={async (v) => {
              actions.setPrefs({ remindersEnabled: v });
              if (v && notificationsSupported() && Notification.permission === 'default') {
                const r = await requestNotificationPermission();
                setPerm(r);
              }
            }}
          />
          {p.remindersEnabled && (
            <div className="mt-3 space-y-3">
              <Field label="Час" htmlFor="rem-time">
                <input id="rem-time" type="time" className={cx(inputCls, 'max-w-[160px]')} value={p.reminderTime} onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && actions.setPrefs({ reminderTime: e.target.value })} />
              </Field>
              <p className="rounded-2xl bg-white/70 p-3 text-xs text-muted">
                {perm === 'granted'
                  ? 'Системні сповіщення дозволено.'
                  : perm === 'denied'
                    ? 'Системні сповіщення заблоковано в браузері — нагадування з’являтиметься всередині застосунку.'
                    : perm === 'unsupported'
                      ? 'Браузер не підтримує сповіщення — нагадування з’являтиметься всередині застосунку.'
                      : 'Можна дозволити системні сповіщення, інакше нагадування буде всередині застосунку.'}{' '}
                Обмеження вебверсії: нагадування спрацьовує, лише коли вкладка Recharge Club відкрита.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle icon={<Lock size={18} />} sub="Ніщо не передається третім сторонам">
            Приватність
          </CardTitle>
          <Toggle label="Зберігати текстові нотатки" description="Якщо вимкнути, поля для нотаток зникнуть, а нові записи зберігатимуться без тексту" checked={p.storeNotes} onChange={(v) => actions.setPrefs({ storeNotes: v })} />
          <Toggle label="Розмивати нотатки в календарі" description="Текст видно лише при наведенні або фокусі — зручно, коли хтось поруч" checked={p.blurNotes} onChange={(v) => actions.setPrefs({ blurNotes: v })} />
          <p className="mt-3 rounded-2xl bg-white/70 p-3 text-xs text-muted">Дані зберігаються в localStorage цього браузера. Без реєстрації, без серверів, без аналітики. Якщо очистити дані сайту в браузері — записи зникнуть, тож роби експорт для резервної копії.</p>
        </Card>

        <Card>
          <CardTitle icon={<Download size={18} />}>Мої дані</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={exportJson}>
              <Download size={16} /> Експорт JSON
            </Button>
            <Button variant="soft" onClick={exportCsv}>
              <Download size={16} /> Історія CSV
            </Button>
            <Button variant="soft" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Імпорт JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = '';
              }}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            Реальні записи: {state.real.checkIns.length} check-in, {state.real.logs.length} занять, {state.real.planned.length} планів, {state.real.customActivities.length} власних занять.
          </p>
          <div className="mt-4 border-t border-line pt-4">
            <Button variant="outline" className="!text-berry" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Видалити всі дані
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle icon={<FlaskConical size={18} />} sub="Демо-дані зберігаються окремо від реальних">
            Демо-режим
          </CardTitle>
          {isDemo ? (
            <div className="space-y-3">
              <p className="text-sm text-ink">Зараз увімкнено демо-режим. Усе, що ти змінюєш, стосується лише демо-набору.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="hot" onClick={() => actions.leaveDemo(false)}>
                  Очистити демо й перейти до своїх даних
                </Button>
                <Button variant="ghost" onClick={() => actions.leaveDemo(true)}>
                  Перейти до своїх даних (демо зберегти)
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink">Хочеш подивитися, як виглядатимуть календар і аналітика з даними? Увімкни демо — твої реальні записи не зміняться.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="soft" onClick={() => actions.loadDemo()}>
                  {state.demo ? 'Повернутися до демо' : 'Увімкнути демо'}
                </Button>
                {state.demo && (
                  <Button variant="ghost" onClick={() => { actions.leaveDemo(false); ui.toast('Демо-дані очищено', '🧹'); }}>
                    Видалити демо-дані
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle icon={<Award size={18} />} sub="Відзначаємо дослідження себе — не регулярність, не показники. Жодних streaks.">
          Мої відкриття
        </CardTitle>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {badges.map((b) => (
            <li key={b.id} className={cx('flex flex-col items-center rounded-3xl p-4 text-center transition', b.earned ? 'bg-gradient-to-br from-white to-soft shadow-[0_10px_24px_-14px_rgba(255,45,149,0.8)]' : 'bg-white/40')}>
              <span className={cx('text-3xl', !b.earned && 'opacity-40 grayscale')} aria-hidden>
                {b.emoji}
              </span>
              <span className="mt-2 text-sm font-bold text-ink">{b.title}</span>
              <span className="mt-1 text-[11px] leading-snug text-muted">{b.description}</span>
              {!b.earned && b.progress && (
                <span className="mt-2 text-[11px] font-semibold text-accent-ink">
                  {b.progress.value} / {b.progress.total}
                </span>
              )}
              <span className="sr-only">{b.earned ? 'відкрито' : 'ще не відкрито'}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-5">
        <CardTitle>Про Recharge Club</CardTitle>
        <div className="space-y-2 text-sm text-ink">
          <p>Рівень енергії тут — твоя суб’єктивна самооцінка, а не вимірювання організму. Застосунок не ставить діагнозів і не замінює професійну допомогу.</p>
          <p>Заняття з бібліотеки — необов’язкові ідеї для самопідтримки. Однакове заняття не підходить усім, і це нормально.</p>
          <p className="text-muted">Якщо тобі дуже важко або є думки про самоушкодження — звернися до фахівця, людини, якій довіряєш, або на лінію психологічної підтримки (в Україні: Lifeline Ukraine — 7333; екстрені служби — 112).</p>
        </div>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Видалити всі дані?">
        <p className="text-sm text-ink">Буде видалено всі записи, плани, власні заняття, налаштування та демо-дані з цього пристрою. Дію неможливо скасувати. Порада: спершу зроби експорт.</p>
        <Field label="Щоб підтвердити, введи слово ВИДАЛИТИ" htmlFor="del-confirm">
          <input id="del-confirm" className={cx(inputCls, 'mt-2')} value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
        </Field>
        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            disabled={deleteText.trim().toUpperCase() !== 'ВИДАЛИТИ'}
            onClick={() => {
              actions.resetAll();
              setConfirmDelete(false);
            }}
          >
            <Trash2 size={16} /> Видалити назавжди
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Скасувати
          </Button>
        </div>
      </Modal>
    </div>
  );
}
