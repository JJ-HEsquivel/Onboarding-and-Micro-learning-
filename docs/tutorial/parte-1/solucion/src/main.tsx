import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Los estilos globales se importan ANTES que App: así los estilos de cada
// pantalla se cargan después y pueden ajustar a los globales.
import './shared/styles/global.css';
import './shared/styles/components.css';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
