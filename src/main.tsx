import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { StoreProvider } from './store/store';
import { UIProvider } from './components/ui/feedback';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
);
