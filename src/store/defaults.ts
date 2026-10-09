import type { AppState, DataSet, UserPreferences } from '../types';

export const SCHEMA_VERSION = 1;

export const defaultPrefs = (): UserPreferences => ({
  name: '',
  favoriteCategories: [],
  excludedCategories: [],
  preferredDurations: [],
  preferredEffort: [],
  preferredFormats: [],
  theme: 'soft',
  detailLevel: 'detailed',
  remindersEnabled: false,
  reminderTime: '20:00',
  storeNotes: true,
  blurNotes: false,
  reduceMotion: false,
});

export const emptyData = (): DataSet => ({
  checkIns: [],
  logs: [],
  planned: [],
  customActivities: [],
  activityMeta: {},
  dayNotes: {},
  dismissed: {},
});

export const defaultState = (): AppState => ({
  version: SCHEMA_VERSION,
  onboarded: false,
  mode: 'real',
  prefs: defaultPrefs(),
  real: emptyData(),
  demo: null,
});
