/**
 * LEESAVONTUUR – app-boot.
 * Laadt lokaal gebundelde fonts (geen externe CDN), startstijlen en de app.
 */
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';

import { createApp } from './ui/App';
import { registerOffline } from './platform/offline';

function mount(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  createApp({ root: app });
  void registerOffline();
}

if (typeof document !== 'undefined') {
  mount();
}
