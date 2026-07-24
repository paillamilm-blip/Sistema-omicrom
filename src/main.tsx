import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerPWA } from './lib/pwaUpdate';
import './index.css';
import './styles/responsive.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No se encontró el elemento #root');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ── PWA: registra el SW en producción con AUTO-ACTUALIZACIÓN + aviso de versión nueva. ──
if (import.meta.env.PROD) registerPWA();
