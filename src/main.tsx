import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (new URLSearchParams(window.location.search).get('desktopOverlay') === '1') {
  document.documentElement.dataset.companionOverlay = 'true';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
