import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker management: ensure active updates so mobile browsers never get stuck on stale precaches
if ('serviceWorker' in navigator && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().catch(() => {});
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch(() => {
        // Silently handled in sandboxed preview iframe
      });
  });
}
