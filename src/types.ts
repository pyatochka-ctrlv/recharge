// Типізовані моделі даних Recharge Club.
// Усі сутності мають поле-«хвіст» для майбутніх розширень через optional-поля,
// а сховище версіонується (див. store/persistence.ts).

export type CategoryId =
  | 'creativity'
  | 'sensory'
  | 'nature'
  | 'movement'
  | 'mind'
  | 'social'
  | 'home'
  | 'digital'
  | 'inspiration'
  | 'basics'
  | 'beauty'
  | 'adventure'
  | 'emotional';

export type DurationRange = '1-5' | '5-15' | '15-30' | '30+';
export type EffortLevel = 'minimal' | 'low' | 'medium' | 'high';
export type CostLevel = 'free' | 'minimal' | 'budget';
export type ActivityFormat = 'solo' | 'together' | 'home' | 'outdoor' | 'online';

/** Рекомендований контекст: для якого стану заняття може підійти. */
export type ContextTag =
  | 'fatigue' // втома
  | 'boredom' // нудьга
  | 'tension' // напруга
  | 'creative' // бажання творчості
  | 'social' // потреба у спілкуванні
  | 'solitude' // бажання побути наодинці
  | 'low-mood' // неприємний настрій
  | 'overwhelm' // перевантаження
  | 'restless' // неспокій, хочеться руху
  | 'stuck' // складно почати
  | 'cozy' // бажання затишку
  | 'pleasure' // хочеться чогось приємного
  | 'focus'; // розсіяність, хочеться зібратися

export type AccessibilityTag =
  | 'seated' // можна сидячи
  | 'lying' // можна лежачи
  | 'no-screen' // без екрана
  | 'quiet' // тихо
  | 'no-talking' // не потрібно говорити
  | 'gentle' // м’яке фізичне навантаження
  | 'anywhere'; // можна майже будь-де

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  durationRange: DurationRange;
  effortLevel: EffortLevel;
  costLevel: CostLevel;
  formats: ActivityFormat[];
  materials: string[];
  contextTags: ContextTag[];
  accessibilityTags: AccessibilityTag[];
  steps: string[];
  isCustom: boolean;
  createdAt?: string;
}

/** Особисте ставлення користувачки до заняття. */
export interface ActivityMeta {
  favorite?: boolean;
  notMine?: boolean;
  hidden?: boolean;
  savedForLater?: boolean;
  personalNote?: string;
  viewedAt?: string;
}

export type Mood = 1 | 2 | 3 | 4 | 5;
export type Level5 = 1 | 2 | 3 | 4 | 5;
export type Want = 0 | 1 | 2; // не хочу / трохи / дуже

export interface SocialPreference {
  social: Want; // бажання спілкуватися
  alone: Want; // бажання побути наодинці
}

export interface ActivityLog {
  id: string;
  activityId: string;
  startedAt: string; // ISO
  completedAt: string | null; // ISO
  energyBefore: number | null;
  energyAfter: number | null;
  moodBefore: Mood | null;
  moodAfter: Mood | null;
  tensionBefore: Level5 | null;
  tensionAfter: Level5 | null;
  personalRating: Level5 | null; // наскільки приємно було
  wantRepeat: 'yes' | 'maybe' | 'no' | null;
  liked: string; // що сподобалося найбільше
  notes: string;
  ratingSkipped: boolean;
}

export interface DailyCheckIn {
  id: string;
  timestamp: string; // ISO
  energy: number; // 0..100 — суб’єктивна самооцінка
  mood: Mood | null;
  tension: Level5 | null;
  fatigue: Level5 | null;
  socialPreference: SocialPreference | null;
  note: string;
  source?: 'check-in' | 'after-activity';
}

export type PlannedStatus = 'planned' | 'done' | 'skipped';

export interface PlannedActivity {
  id: string;
  activityId: string;
  scheduledAt: string; // ISO
  status: PlannedStatus;
  note: string;
  logId?: string;
}

export type Theme = 'soft' | 'barbie';
export type DetailLevel = 'short' | 'detailed';

export interface UserPreferences {
  name: string;
  favoriteCategories: CategoryId[];
  excludedCategories: CategoryId[];
  preferredDurations: DurationRange[];
  preferredEffort: EffortLevel[];
  preferredFormats: ActivityFormat[];
  theme: Theme;
  detailLevel: DetailLevel;
  remindersEnabled: boolean;
  reminderTime: string; // HH:mm
  storeNotes: boolean;
  blurNotes: boolean;
  reduceMotion: boolean;
}

export interface PersonalInsight {
  id: string;
  period: string; // людиночитний опис періоду
  insightType: 'category-mood' | 'category-energy' | 'duration-energy' | 'time-of-day' | 'favorite-format' | 'not-enough-data' | 'activity-pattern';
  description: string;
  sampleSize: number;
  generatedAt: string;
}

/** Набір даних одного профілю (реального або демонстраційного). */
export interface DataSet {
  checkIns: DailyCheckIn[];
  logs: ActivityLog[];
  planned: PlannedActivity[];
  customActivities: Activity[];
  activityMeta: Record<string, ActivityMeta>;
  dayNotes: Record<string, string>; // ключ — YYYY-MM-DD (локальна дата)
  dismissed: Record<string, string>; // службові «приховати повідомлення»
}

export interface AppState {
  version: number;
  onboarded: boolean;
  mode: 'real' | 'demo';
  prefs: UserPreferences;
  real: DataSet;
  demo: DataSet | null;
}
