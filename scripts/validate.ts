/**
 * Build-gate: valideert alle content (ARCHITECTURE §5, §11).
 * `npm run validate` faalt (exit 1) bij contentfouten.
 */
import { validateContent } from '../src/content/validator';

const result = validateContent();

const errors = result.issues.filter((i) => i.severity === 'error');
const warnings = result.issues.filter((i) => i.severity === 'warning');

for (const issue of errors) {
  const where = issue.location ? ` (${issue.location})` : '';
  console.error(`ERROR [${issue.rule}] ${issue.message}${where}`);
}
for (const issue of warnings) {
  const where = issue.location ? ` (${issue.location})` : '';
  console.warn(`WARN  [${issue.rule}] ${issue.message}${where}`);
}

if (errors.length > 0) {
  console.error(`\nContent validatie mislukt: ${errors.length} fout(en), ${warnings.length} waarschuwing(en).`);
  process.exit(1);
}

console.log(`Content validatie OK (${warnings.length} waarschuwing(en)).`);
