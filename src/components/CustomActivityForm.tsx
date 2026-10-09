import { useState } from 'react';
import type { Activity, ActivityFormat, CategoryId, ContextTag, CostLevel, DurationRange, EffortLevel } from '../types';
import { CATEGORIES } from '../data/categories';
import { CONTEXTS, CONTEXT_LABELS, COSTS, COST_LABELS, DURATIONS, DURATION_LABELS, EFFORTS, EFFORT_LABELS, FORMATS, FORMAT_LABELS } from '../data/labels';
import { Button, Chip, cx, Field, inputCls } from './ui';

export type CustomDraft = Omit<Activity, 'id' | 'isCustom' | 'createdAt'>;

const blank = (): CustomDraft => ({
  title: '',
  description: '',
  category: 'emotional',
  durationRange: '5-15',
  effortLevel: 'low',
  costLevel: 'free',
  formats: ['solo', 'home'],
  materials: [],
  contextTags: [],
  accessibilityTags: [],
  steps: [],
});

export function CustomActivityForm({ initial, onSave, onCancel }: { initial?: Partial<CustomDraft>; onSave: (a: CustomDraft) => void; onCancel: () => void }) {
  const [d, setD] = useState<CustomDraft>({ ...blank(), ...initial });
  const [materials, setMaterials] = useState((initial?.materials ?? []).join(', '));
  const [steps, setSteps] = useState((initial?.steps ?? []).join('\n'));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const title = d.title.trim();
    if (title.length < 2) errs.title = 'Назва має містити хоча б 2 символи.';
    if (title.length > 120) errs.title = 'Назва задовга (до 120 символів).';
    if (d.description.length > 600) errs.description = 'Опис задовгий (до 600 символів).';
    if (!d.formats.length) errs.formats = 'Обери хоча б один формат.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({
      ...d,
      title,
      description: d.description.trim() || 'Моє власне заняття для відновлення.',
      materials: materials.split(',').map((m) => m.trim()).filter(Boolean).slice(0, 20),
      steps: steps.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Назва *" htmlFor="ca-title">
        <input id="ca-title" className={cx(inputCls, errors.title && 'border-hot')} value={d.title} maxLength={120} onChange={(e) => setD({ ...d, title: e.target.value })} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'ca-title-err' : undefined} placeholder="Наприклад: Танці з котом на кухні" />
        {errors.title && (
          <p id="ca-title-err" role="alert" className="text-sm font-semibold text-berry">
            {errors.title}
          </p>
        )}
      </Field>
      <Field label="Короткий опис" htmlFor="ca-desc">
        <textarea id="ca-desc" className={cx(inputCls, 'min-h-[70px]')} maxLength={600} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
        {errors.description && <p className="text-sm font-semibold text-berry">{errors.description}</p>}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Категорія" htmlFor="ca-cat">
          <select id="ca-cat" className={inputCls} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as CategoryId })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Тривалість" htmlFor="ca-dur">
          <select id="ca-dur" className={inputCls} value={d.durationRange} onChange={(e) => setD({ ...d, durationRange: e.target.value as DurationRange })}>
            {DURATIONS.map((x) => (
              <option key={x} value={x}>
                {DURATION_LABELS[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Зусилля" htmlFor="ca-eff">
          <select id="ca-eff" className={inputCls} value={d.effortLevel} onChange={(e) => setD({ ...d, effortLevel: e.target.value as EffortLevel })}>
            {EFFORTS.map((x) => (
              <option key={x} value={x}>
                {EFFORT_LABELS[x]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Витрати" htmlFor="ca-cost">
          <select id="ca-cost" className={inputCls} value={d.costLevel} onChange={(e) => setD({ ...d, costLevel: e.target.value as CostLevel })}>
            {COSTS.map((x) => (
              <option key={x} value={x}>
                {COST_LABELS[x]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Формат *">
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Chip key={f} selected={d.formats.includes(f)} onClick={() => setD({ ...d, formats: toggle<ActivityFormat>(d.formats, f) })}>
              {FORMAT_LABELS[f]}
            </Chip>
          ))}
        </div>
        {errors.formats && <p className="text-sm font-semibold text-berry">{errors.formats}</p>}
      </Field>
      <Field label="Коли може підійти">
        <div className="flex flex-wrap gap-2">
          {CONTEXTS.map((t) => (
            <Chip key={t} selected={d.contextTags.includes(t)} onClick={() => setD({ ...d, contextTags: toggle<ContextTag>(d.contextTags, t) })}>
              {CONTEXT_LABELS[t]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Матеріали" htmlFor="ca-mat" hint="Через кому. Порожньо — нічого не потрібно.">
        <input id="ca-mat" className={inputCls} value={materials} onChange={(e) => setMaterials(e.target.value)} />
      </Field>
      <Field label="Кроки" htmlFor="ca-steps" hint="Кожен крок з нового рядка.">
        <textarea id="ca-steps" className={cx(inputCls, 'min-h-[90px]')} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </Field>
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
