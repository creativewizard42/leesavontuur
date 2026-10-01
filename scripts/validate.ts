/**
 * Build-gate: valideert alle content (ARCHITECTURE §5, §11).
 * `npm run validate` faalt (exit 1) bij contentfouten.
 *
 * Beeld- en audiobestanden worden hier op schijf gecontroleerd (relatief t.o.v.
 * `public/`). Ontbrekende audio is een **waarschuwing** (nog geen opnames,
 * TTS/silent-fallback); ontbrekend beeld is een **fout**.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../src/content/validator';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const publicDir = join(repoRoot, 'public');

function collectAssets(dir: string): Set<string> {
  const out = new Set<string>();
  const walk = (current: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        out.add(relative(publicDir, full).split(sep).join('/'));
      }
    }
  };
  walk(dir);
  return out;
}

const existingAssets = collectAssets(publicDir);
const result = validateContent(undefined, { existingAssets });

const errors = result.issues.filter((i) => i.severity === 'error');
const warnings = result.issues.filter((i) => i.severity === 'warning');

const byRule = new Map<string, typeof result.issues>();
for (const issue of result.issues) {
  const list = byRule.get(issue.rule) ?? [];
  list.push(issue);
  byRule.set(issue.rule, list);
}

for (const [rule, list] of [...byRule.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const severity = list.some((i) => i.severity === 'error') ? 'ERROR' : 'WARN ';
  console.log(`\n${severity} [${rule}] ${list.length}x`);
  for (const issue of list.slice(0, 10)) {
    const where = issue.location ? ` (${issue.location})` : '';
    console.log(`  - ${issue.message}${where}`);
  }
  if (list.length > 10) console.log(`  … en ${list.length - 10} meer`);
}

if (errors.length > 0) {
  console.error(
    `\nContent validatie MISLUKT: ${errors.length} fout(en), ${warnings.length} waarschuwing(en).`,
  );
  process.exit(1);
}

console.log(
  `\nContent validatie OK (${warnings.length} waarschuwing(en), geen fouten).`,
);
