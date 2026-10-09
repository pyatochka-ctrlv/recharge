import type { Activity } from '../../types';
import { adventure } from './adventure';
import { basics } from './basics';
import { beauty } from './beauty';
import { creativity } from './creativity';
import { digital } from './digital';
import { emotional } from './emotional';
import { home } from './home';
import { inspiration } from './inspiration';
import { mind } from './mind';
import { movement } from './movement';
import { nature } from './nature';
import { sensory } from './sensory';
import { social } from './social';

/**
 * Вбудована бібліотека. Розширюється додаванням рядків у файли категорій
 * (або нових файлів) — структура розрахована на 500–1000 записів:
 * фільтрація лінійна й мемоізована, список рендериться порціями.
 */
export const BUILT_IN_ACTIVITIES: Activity[] = [
  ...creativity,
  ...sensory,
  ...nature,
  ...movement,
  ...mind,
  ...social,
  ...home,
  ...digital,
  ...inspiration,
  ...basics,
  ...beauty,
  ...adventure,
  ...emotional,
];

export const BUILT_IN_MAP: Record<string, Activity> = Object.fromEntries(BUILT_IN_ACTIVITIES.map((a) => [a.id, a]));
