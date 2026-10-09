import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Activity, ActivityLog, ActivityMeta, AppState, DailyCheckIn, DataSet, PlannedActivity, UserPreferences } from '../types';
import { loadState, sanitizeActivity, sanitizeState, saveState } from './persistence';
import { defaultState } from './defaults';
import { BUILT_IN_ACTIVITIES, BUILT_IN_MAP } from '../data/activities';
import { generateDemoData } from '../data/demo';
import { clamp, toEnergy, toLevel5, toMood, toText, toWant, uid } from '../lib/validate';

export type CheckInInput = Omit<DailyCheckIn, 'id' | 'timestamp'> & { timestamp?: string };

interface Store {
  state: AppState;
  data: DataSet;
  isDemo: boolean;
  activities: Activity[];
  activityById: (id: string) => Activity | undefined;
  storageError: string | null;
  actions: {
    completeOnboarding: (name: string, withDemo: boolean) => void;
    setPrefs: (patch: Partial<UserPreferences>) => void;
    addCheckIn: (input: CheckInInput) => DailyCheckIn;
    updateCheckIn: (id: string, patch: Partial<DailyCheckIn>) => void;
    deleteCheckIn: (id: string) => void;
    addLog: (log: Omit<ActivityLog, 'id'>) => ActivityLog;
    updateLog: (id: string, patch: Partial<ActivityLog>) => void;
    deleteLog: (id: string) => void;
    addPlanned: (p: Omit<PlannedActivity, 'id' | 'status'> & { status?: PlannedActivity['status'] }) => PlannedActivity;
    updatePlanned: (id: string, patch: Partial<PlannedActivity>) => void;
    deletePlanned: (id: string) => void;
    setMeta: (activityId: string, patch: Partial<ActivityMeta>) => void;
    addCustomActivity: (a: Omit<Activity, 'id' | 'isCustom' | 'createdAt'>) => Activity;
    updateCustomActivity: (id: string, patch: Partial<Activity>) => void;
    deleteCustomActivity: (id: string) => void;
    setDayNote: (day: string, text: string) => void;
    dismiss: (key: string) => void;
    loadDemo: () => void;
    leaveDemo: (keepDemo: boolean) => void;
    importState: (json: unknown) => void;
    resetAll: () => void;
  };
}

const StoreContext = createContext<Store | null>(null);

function sanitizeCheckInInput(input: CheckInInput, storeNotes: boolean): Omit<DailyCheckIn, 'id' | 'timestamp'> {
  return {
    energy: toEnergy(input.energy) ?? 50,
    mood: toMood(input.mood),
    tension: toLevel5(input.tension),
    fatigue: toLevel5(input.fatigue),
    socialPreference: input.socialPreference ? { social: toWant(input.socialPreference.social), alone: toWant(input.socialPreference.alone) } : null,
    note: storeNotes ? toText(input.note, 1000) : '',
    source: input.source ?? 'check-in',
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef<ReturnType<typeof loadState> | null>(null);
  if (!initial.current) initial.current = loadState();
  const [state, setState] = useState<AppState>(initial.current.state);
  const [storageError, setStorageError] = useState<string | null>(initial.current.error);

  // Зберігаємо з невеликою затримкою, щоб не писати в сховище на кожен рух повзунка.
  useEffect(() => {
    const t = setTimeout(() => {
      const err = saveState(state);
      setStorageError((prev) => (err ? err : prev && prev.startsWith('Не вдалося зберегти') ? null : prev));
    }, 150);
    return () => clearTimeout(t);
  }, [state]);

  // Синхронізація між вкладками.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'recharge-club:state' && e.newValue) {
        try {
          setState(sanitizeState(JSON.parse(e.newValue)));
        } catch {
          /* ігноруємо пошкоджені дані з іншої вкладки */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isDemo = state.mode === 'demo' && state.demo != null;
  const data = isDemo ? (state.demo as DataSet) : state.real;

  const updateData = useCallback((fn: (d: DataSet) => DataSet) => {
    setState((s) => {
      if (s.mode === 'demo' && s.demo) return { ...s, demo: fn(s.demo) };
      return { ...s, real: fn(s.real) };
    });
  }, []);

  const storeNotesRef = useRef(state.prefs.storeNotes);
  storeNotesRef.current = state.prefs.storeNotes;

  const actions = useMemo<Store['actions']>(
    () => ({
      completeOnboarding: (name, withDemo) =>
        setState((s) => ({
          ...s,
          onboarded: true,
          prefs: { ...s.prefs, name: toText(name.trim(), 40) },
          mode: withDemo ? 'demo' : 'real',
          demo: withDemo ? generateDemoData() : s.demo,
        })),
      setPrefs: (patch) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...patch } })),
      addCheckIn: (input) => {
        const ci: DailyCheckIn = { id: uid('ci'), timestamp: input.timestamp ?? new Date().toISOString(), ...sanitizeCheckInInput(input, storeNotesRef.current) };
        updateData((d) => ({ ...d, checkIns: [...d.checkIns, ci].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) }));
        return ci;
      },
      updateCheckIn: (id, patch) =>
        updateData((d) => ({
          ...d,
          checkIns: d.checkIns
            .map((c) => (c.id === id ? { ...c, ...patch, energy: clamp(Math.round(patch.energy ?? c.energy), 0, 100) } : c))
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
        })),
      deleteCheckIn: (id) => updateData((d) => ({ ...d, checkIns: d.checkIns.filter((c) => c.id !== id) })),
      addLog: (input) => {
        const log: ActivityLog = {
          ...input,
          id: uid('log'),
          energyBefore: toEnergy(input.energyBefore),
          energyAfter: toEnergy(input.energyAfter),
          notes: storeNotesRef.current ? toText(input.notes, 1000) : '',
          liked: storeNotesRef.current ? toText(input.liked, 500) : '',
        };
        updateData((d) => ({ ...d, logs: [...d.logs, log].sort((a, b) => a.startedAt.localeCompare(b.startedAt)) }));
        return log;
      },
      updateLog: (id, patch) => updateData((d) => ({ ...d, logs: d.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      deleteLog: (id) =>
        updateData((d) => ({
          ...d,
          logs: d.logs.filter((l) => l.id !== id),
          planned: d.planned.map((p) => (p.logId === id ? { ...p, logId: undefined, status: 'planned' } : p)),
        })),
      addPlanned: (p) => {
        const item: PlannedActivity = { id: uid('plan'), status: p.status ?? 'planned', activityId: p.activityId, scheduledAt: p.scheduledAt, note: toText(p.note, 500), logId: p.logId };
        updateData((d) => ({ ...d, planned: [...d.planned, item] }));
        return item;
      },
      updatePlanned: (id, patch) => updateData((d) => ({ ...d, planned: d.planned.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deletePlanned: (id) => updateData((d) => ({ ...d, planned: d.planned.filter((p) => p.id !== id) })),
      setMeta: (activityId, patch) =>
        updateData((d) => {
          const next = { ...d.activityMeta[activityId], ...patch };
          // «Не моє» та «приховане» не можуть бути водночас «обраним»
          if (patch.notMine || patch.hidden) next.favorite = false;
          if (patch.favorite) {
            next.notMine = false;
            next.hidden = false;
          }
          return { ...d, activityMeta: { ...d.activityMeta, [activityId]: next } };
        }),
      addCustomActivity: (a) => {
        const created = sanitizeActivity({ ...a, id: uid('custom'), isCustom: true, createdAt: new Date().toISOString() });
        if (!created) throw new Error('Некоректні дані заняття');
        updateData((d) => ({ ...d, customActivities: [...d.customActivities, created] }));
        return created;
      },
      updateCustomActivity: (id, patch) =>
        updateData((d) => ({
          ...d,
          customActivities: d.customActivities.map((c) => (c.id === id ? sanitizeActivity({ ...c, ...patch, id: c.id }) ?? c : c)),
        })),
      deleteCustomActivity: (id) =>
        updateData((d) => ({
          ...d,
          customActivities: d.customActivities.filter((c) => c.id !== id),
          planned: d.planned.filter((p) => p.activityId !== id || p.status !== 'planned'),
        })),
      setDayNote: (day, text) =>
        updateData((d) => {
          const dayNotes = { ...d.dayNotes };
          const t = toText(text, 2000);
          if (t.trim()) dayNotes[day] = t;
          else delete dayNotes[day];
          return { ...d, dayNotes };
        }),
      dismiss: (key) => updateData((d) => ({ ...d, dismissed: { ...d.dismissed, [key]: new Date().toISOString() } })),
      loadDemo: () => setState((s) => ({ ...s, mode: 'demo', demo: s.demo ?? generateDemoData() })),
      leaveDemo: (keepDemo) => setState((s) => ({ ...s, mode: 'real', demo: keepDemo ? s.demo : null })),
      importState: (json) => setState(() => ({ ...sanitizeState(json), onboarded: true })),
      resetAll: () => {
        try {
          localStorage.removeItem('recharge-club:state');
        } catch {
          /* ignore */
        }
        setState(defaultState());
      },
    }),
    [updateData],
  );

  const activities = useMemo(() => [...BUILT_IN_ACTIVITIES, ...data.customActivities], [data.customActivities]);
  const customMap = useMemo(() => Object.fromEntries(data.customActivities.map((a) => [a.id, a])), [data.customActivities]);
  const activityById = useCallback((id: string) => BUILT_IN_MAP[id] ?? customMap[id], [customMap]);

  const value = useMemo<Store>(
    () => ({ state, data, isDemo, activities, activityById, storageError, actions }),
    [state, data, isDemo, activities, activityById, storageError, actions],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

