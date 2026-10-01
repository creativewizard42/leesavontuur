/**
 * LEESAVONTUUR – app-boot.
 * TODO(Builder): laad profiel (SaveSystem), toon startscherm/wereldkaart en
 * start de sessie-loop. Houd dit bestand dun; logica hoort in core/learning.
 */
import './styles.css';

function mount(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;
  app.textContent = 'LEESAVONTUUR';
}

if (typeof document !== 'undefined') {
  mount();
}
