import { useId, useRef } from 'react';
import { Sparkle } from './ui';

interface Props {
  level: number; // 0..100
  onChange?: (v: number) => void;
  size?: 'lg' | 'sm';
  label?: string;
}

/** Відтінки заливки — від лавандового (мало) до гарячого рожевого (багато). Без «червоної тривоги». */
function fillColors(level: number): [string, string] {
  if (level < 20) return ['#E9DFFF', '#C7B5FF'];
  if (level < 45) return ['#FFD6E7', '#FF9ECF'];
  if (level < 75) return ['#FF9ECF', '#FF69B4'];
  return ['#FF69B4', '#FF2D95'];
}

/**
 * Інтерактивна анімована батарейка. Клік або перетягування по корпусу встановлює рівень;
 * з клавіатури — стрілки (±5), PageUp/PageDown (±10), Home/End.
 */
export function Battery({ level, onChange, size = 'lg', label = 'Моя батарейка' }: Props) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const v = Math.max(0, Math.min(100, Math.round(level)));
  const [c1, c2] = fillColors(v);

  // Геометрія: корпус 20..280 по Y (внутрішня зона 30..270)
  const W = 170;
  const innerTop = 34;
  const innerBottom = 266;
  const innerH = innerBottom - innerTop;
  const fillY = innerBottom - (innerH * v) / 100;

  const setFromEvent = (clientY: number) => {
    if (!onChange || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const y = ((clientY - r.top) / r.height) * 290;
    const pct = ((innerBottom - y) / innerH) * 100;
    onChange(Math.max(0, Math.min(100, Math.round(pct))));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!onChange) return;
    const map: Record<string, number> = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 10, PageDown: -10 };
    if (e.key in map) {
      e.preventDefault();
      onChange(Math.max(0, Math.min(100, v + map[e.key])));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(100);
    }
  };

  const interactive = !!onChange;
  const px = size === 'lg' ? 'w-[150px] sm:w-[170px]' : 'w-[64px]';

  return (
    <div className={`relative select-none ${px}`}>
      {size === 'lg' && (
        <>
          <Sparkle className="absolute -left-5 top-6 text-hot animate-twinkle" size={18} />
          <Sparkle className="absolute -right-4 top-24 text-barbie animate-twinkle" size={14} style={{ animationDelay: '0.8s' }} />
          <Sparkle className="absolute -left-2 bottom-10 text-[#C7B5FF] animate-twinkle" size={12} style={{ animationDelay: '1.6s' }} />
        </>
      )}
      <svg
        ref={ref}
        viewBox={`0 0 ${W} 290`}
        className={`h-auto w-full ${interactive ? 'cursor-pointer touch-none' : ''}`}
        role={interactive ? 'slider' : 'img'}
        aria-label={label}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? 100 : undefined}
        aria-valuenow={interactive ? v : undefined}
        aria-valuetext={`${v}%`}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (!interactive) return;
          dragging.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setFromEvent(e.clientY);
        }}
        onPointerMove={(e) => dragging.current && setFromEvent(e.clientY)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <defs>
          <linearGradient id={`body-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#FFE6F1" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`chrome-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F7C6DD" />
            <stop offset="0.35" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#E9A9C9" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id={`fill-${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={c2} />
            <stop offset="1" stopColor={c1} />
          </linearGradient>
          <clipPath id={`clip-${id}`}>
            <rect x="22" y={innerTop} width={W - 44} height={innerH} rx="26" />
          </clipPath>
        </defs>

        {/* кришечка */}
        <rect x={W / 2 - 26} y="2" width="52" height="20" rx="8" fill={`url(#chrome-${id})`} stroke="#E7A6C6" strokeWidth="1.5" />
        {/* корпус */}
        <rect x="10" y="20" width={W - 20} height="262" rx="38" fill={`url(#body-${id})`} stroke="#FF9ECF" strokeWidth="3" />
        <rect x="10" y="20" width={W - 20} height="262" rx="38" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1" transform="translate(2 2) scale(0.985)" />

        {/* рідина з хвилею */}
        <g clipPath={`url(#clip-${id})`}>
          <rect x="0" y={fillY + 6} width={W} height={innerBottom - fillY + 10} fill={`url(#fill-${id})`} style={{ transition: 'y 0.6s cubic-bezier(.2,.8,.2,1), height 0.6s cubic-bezier(.2,.8,.2,1)' }} />
          <g style={{ transform: `translateY(${fillY - 6}px)`, transition: 'transform 0.6s cubic-bezier(.2,.8,.2,1)' }}>
            <g className="battery-wave">
              <path d="M0 8 Q 21 0 42 8 T 84 8 T 126 8 T 168 8 T 210 8 T 252 8 T 294 8 T 336 8 V 20 H 0 Z" fill={c1} opacity="0.95" />
            </g>
            <g className="battery-wave slow" style={{ opacity: 0.5 }}>
              <path d="M0 10 Q 21 3 42 10 T 84 10 T 126 10 T 168 10 T 210 10 T 252 10 T 294 10 T 336 10 V 22 H 0 Z" fill="#fff" opacity="0.35" />
            </g>
          </g>
          {/* бульбашки */}
          {v > 8 && (
            <g fill="#fff" opacity="0.55">
              <circle cx="48" cy={Math.max(fillY + 30, innerBottom - 30)} r="4" className="animate-float" />
              <circle cx="110" cy={Math.max(fillY + 50, innerBottom - 60)} r="3" className="animate-float" style={{ animationDelay: '1.2s' }} />
              <circle cx="80" cy={Math.max(fillY + 20, innerBottom - 90)} r="2.5" className="animate-float" style={{ animationDelay: '2s' }} />
            </g>
          )}
          {/* відблиск */}
          <rect x="32" y={innerTop + 10} width="14" height={innerH - 30} rx="7" fill="#fff" opacity="0.35" />
        </g>

        {/* шкала */}
        {[0, 25, 50, 75, 100].map((t) => {
          const y = innerBottom - (innerH * t) / 100;
          return <line key={t} x1={W - 34} x2={W - 24} y1={y} y2={y} stroke="#8E245D" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />;
        })}

        {/* значення */}
        {size === 'lg' && (
          <text x={W / 2} y="160" textAnchor="middle" className="font-display" fontWeight="800" fontSize={v === 100 ? 28 : 33} fill="#3b0d2c" style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 6, strokeLinejoin: 'round' }}>
            {v}%
          </text>
        )}
      </svg>
    </div>
  );
}
