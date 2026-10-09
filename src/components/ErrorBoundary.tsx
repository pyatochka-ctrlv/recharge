import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Остання лінія захисту: замість білого екрана — дружнє повідомлення й можливість зберегти дані. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Recharge Club: неочікувана помилка інтерфейсу', error);
  }

  exportRaw = () => {
    try {
      const raw = localStorage.getItem('recharge-club:state') ?? '{}';
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recharge-club-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="glass max-w-md rounded-[32px] p-8 text-center">
          <div className="text-5xl" aria-hidden>
            🫧
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-ink">Ой, щось пішло не так</h1>
          <p className="mt-2 text-sm text-muted">Твої дані залишаються на пристрої. Можна перезавантажити сторінку або спершу зберегти резервну копію.</p>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" className="btn-primary h-11 rounded-full px-5 font-semibold" onClick={() => window.location.reload()}>
              Перезавантажити
            </button>
            <button type="button" className="h-11 rounded-full bg-chip px-5 font-semibold text-accent-ink" onClick={this.exportRaw}>
              Завантажити резервну копію даних
            </button>
          </div>
        </div>
      </div>
    );
  }
}
