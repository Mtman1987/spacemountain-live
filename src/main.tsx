import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { installCompanionInstallerUiPatch } from './companion-installer-ui';
import { installRocketEasterEgg } from './rocket-easter-egg';
import './index.css';
import './sidebar-collapse.css';

if (new URLSearchParams(window.location.search).get('desktopOverlay') === '1') {
  document.documentElement.dataset.companionOverlay = 'true';
}

window.addEventListener('spmt:workspace-refresh', () => {
  window.location.reload();
});

installCompanionInstallerUiPatch();
installRocketEasterEgg();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
