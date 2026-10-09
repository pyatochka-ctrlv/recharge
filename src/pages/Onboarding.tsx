import { useState } from 'react';
import { useStore } from '../store/store';
import { Battery } from '../components/Battery';
import { Button, inputCls, Sparkle } from '../components/ui';
import { Logo } from '../components/Layout';

export function Onboarding() {
  const { actions } = useStore();
  const [name, setName] = useState('');
  const [level, setLevel] = useState(64);

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] shadow-[0_40px_80px_-40px_rgba(142,36,93,0.6)] lg:grid-cols-[1.05fr_1fr]">
        <div className="relative flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-barbie via-hot to-[#c2187a] px-6 py-10 text-white">
          <Sparkle className="absolute left-8 top-10 text-white/80 animate-twinkle" size={22} />
          <Sparkle className="absolute bottom-16 right-10 text-white/70 animate-twinkle" size={16} style={{ animationDelay: '1s' }} />
          <Sparkle className="absolute right-24 top-20 text-white/60 animate-twinkle" size={12} style={{ animationDelay: '1.8s' }} />
          <div className="animate-float">
            <Battery level={level} onChange={setLevel} label="Спробуй батарейку: перетягни або натисни" />
          </div>
          <p className="max-w-xs text-center text-sm text-white/90">Спробуй: натисни на батарейку або потягни — так ти позначатимеш свій суб’єктивний рівень енергії.</p>
        </div>

        <div className="bg-[#fff8fb] px-6 py-10 sm:px-10">
          <Logo />
          <h1 className="mt-8 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Your energy.
            <br />
            Your rules.
            <br />
            <span className="chrome-text shimmer">Your pink era.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Recharge Club допомагає помічати свій ресурс, знаходити заняття, після яких тобі краще, і будувати власну бібліотеку відновлення. Без тиску, без streaks, без «треба».
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              actions.completeOnboarding(name, false);
            }}
          >
            <div>
              <label htmlFor="ob-name" className="mb-2 block text-sm font-semibold text-ink">
                Як до тебе звертатися?
              </label>
              <input id="ob-name" className={inputCls} placeholder="Ім’я або псевдонім (необов’язково)" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" variant="primary" size="lg" className="flex-1">
                Почати з чистого профілю
              </Button>
              <Button variant="outline" size="lg" onClick={() => actions.completeOnboarding(name, true)}>
                Подивитися з демо-даними
              </Button>
            </div>
          </form>

          <ul className="mt-7 space-y-2 text-xs text-muted">
            <li>🔒 Усі записи зберігаються лише в цьому браузері. Нічого не передається третім сторонам.</li>
            <li>🧪 Демо-дані вигадані й позначені окремо — їх можна очистити будь-коли.</li>
            <li>💗 Це інструмент самоспостереження, а не медичний чи психотерапевтичний сервіс.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
