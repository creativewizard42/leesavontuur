/**
 * Veilige UI-tekst-resolver (QA-R2-005).
 *
 * `ui()` (content) geeft de sleutel zélf terug wanneer die niet bestaat. Voor
 * kindgerichte aria-labels/tekst is dat onwenselijk (een kind hoort/leest dan
 * "ui.option.sound"). `uiText` levert dan een lege string, zodat de aanroeper
 * een icoon/nummer of een eigen fallback kan gebruiken zonder de key te tonen.
 *
 * Variabelen worden lokaal ingevuld zodat de UI niet afhankelijk is van een
 * toekomstige `ui(key, vars)`-variant in de content-API (parallelle builders).
 */
import { ui } from '../content';

export function uiText(key: string, vars: Record<string, string | number> = {}): string {
  const raw = ui(key);
  if (raw === key) return '';
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export function hasUiKey(key: string): boolean {
  return ui(key) !== key;
}
