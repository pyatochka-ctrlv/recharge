import { describe, expect, it } from 'vitest';
import { BUILT_IN_ACTIVITIES } from '../data/activities';
import { CATEGORIES } from '../data/categories';
import { ACCESS_TAGS, CONTEXTS, COSTS, DURATIONS, EFFORTS, FORMATS } from '../data/labels';

describe('бібліотека занять', () => {
  it('містить щонайменше 200 занять', () => {
    expect(BUILT_IN_ACTIVITIES.length).toBeGreaterThanOrEqual(200);
  });

  it('має унікальні ID, назви та описи', () => {
    const ids = new Set(BUILT_IN_ACTIVITIES.map((a) => a.id));
    const titles = new Set(BUILT_IN_ACTIVITIES.map((a) => a.title.toLowerCase().trim()));
    const descs = new Set(BUILT_IN_ACTIVITIES.map((a) => a.description.trim()));
    expect(ids.size).toBe(BUILT_IN_ACTIVITIES.length);
    expect(titles.size).toBe(BUILT_IN_ACTIVITIES.length);
    expect(descs.size).toBe(BUILT_IN_ACTIVITIES.length);
  });

  it('кожне заняття має коректні параметри', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const a of BUILT_IN_ACTIVITIES) {
      const ctx = `${a.id} ${a.title}`;
      expect(cats.has(a.category), ctx).toBe(true);
      expect(DURATIONS, ctx).toContain(a.durationRange);
      expect(EFFORTS, ctx).toContain(a.effortLevel);
      expect(COSTS, ctx).toContain(a.costLevel);
      expect(a.formats.length, ctx).toBeGreaterThan(0);
      a.formats.forEach((f) => expect(FORMATS, ctx).toContain(f));
      expect(a.contextTags.length, ctx).toBeGreaterThan(0);
      a.contextTags.forEach((t) => expect(CONTEXTS, ctx).toContain(t));
      a.accessibilityTags.forEach((t) => expect(ACCESS_TAGS, ctx).toContain(t));
      expect(a.steps.length, ctx).toBeGreaterThanOrEqual(2);
      expect(a.description.length, ctx).toBeGreaterThan(20);
    }
  });

  it('усі категорії представлені помітно', () => {
    for (const c of CATEGORIES) {
      expect(BUILT_IN_ACTIVITIES.filter((a) => a.category === c.id).length, c.id).toBeGreaterThanOrEqual(12);
    }
  });
});
