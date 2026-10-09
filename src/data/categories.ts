import type { CategoryId } from '../types';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  short: string;
  emoji: string;
  /** Два кольори для градієнта ілюстрації. */
  from: string;
  to: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'creativity', label: 'Творчість і самовираження', short: 'Творчість', emoji: '🎨', from: '#FF69B4', to: '#B98CFF' },
  { id: 'sensory', label: 'Сенсорне задоволення та затишок', short: 'Затишок', emoji: '🕯️', from: '#FFB3D1', to: '#FF8FB1' },
  { id: 'nature', label: 'Природа та свіже повітря', short: 'Природа', emoji: '🌿', from: '#9BE7C4', to: '#FF9ECF' },
  { id: 'movement', label: 'М’який рух', short: 'Рух', emoji: '💃', from: '#FF2D95', to: '#FF9A62' },
  { id: 'mind', label: 'Психологічне розвантаження', short: 'Розвантаження', emoji: '🫧', from: '#C7B5FF', to: '#FF9ECF' },
  { id: 'social', label: 'Соціальний ресурс', short: 'Люди', emoji: '🫶', from: '#FF7AB6', to: '#FFC36B' },
  { id: 'home', label: 'Маленькі побутові перемоги', short: 'Побут', emoji: '🧺', from: '#FFD6E7', to: '#B9E3FF' },
  { id: 'digital', label: 'Цифровий відпочинок', short: 'Цифровий детокс', emoji: '📵', from: '#B98CFF', to: '#7FD3FF' },
  { id: 'inspiration', label: 'Інтелектуальне натхнення', short: 'Натхнення', emoji: '📚', from: '#FFC36B', to: '#FF69B4' },
  { id: 'basics', label: 'Відпочинок і базові потреби', short: 'Базові потреби', emoji: '🛌', from: '#A9C8FF', to: '#E9DFFF' },
  { id: 'beauty', label: 'Краса, стиль і self-care', short: 'Self-care', emoji: '💅', from: '#FF2D95', to: '#FFB3D1' },
  { id: 'adventure', label: 'Мікропригоди та зміна контексту', short: 'Мікропригоди', emoji: '🗺️', from: '#FF9A62', to: '#FF2D95' },
  { id: 'emotional', label: 'Емоційна підтримка та позитивні моменти', short: 'Теплі моменти', emoji: '💌', from: '#FF8FB1', to: '#C7B5FF' },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryInfo>;

export function categoryInfo(id: CategoryId): CategoryInfo {
  return CATEGORY_MAP[id] ?? CATEGORIES[0];
}
