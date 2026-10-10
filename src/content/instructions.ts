/**
 * Instructie- en audio-promptteksten per activiteit (GD §4, §11.2, EDU-009).
 *
 * Alle Nederlandse teksten die het spel uitspreekt staan hier centraal, zodat
 * er geen losse teksten in de UI-/game-code hoeven te staan. `{...}` zijn
 * placeholders die de Builder invult (bv. `{woord}`, `{sound}`).
 *
 * `REQUIRED_INSTRUCTION_KEYS` is de set sleutels die de code gebruikt; de
 * validator eist dat elk daarvan in deze map **en** in de audiolijst staat.
 * Dynamische sleutels (per doelwoord) worden via `INSTRUCTION_KEY_PATTERNS`
 * afgeleid van een generieke template.
 */
export const INSTRUCTIONS: Readonly<Record<string, string>> = {
  'instr.reading.start': 'Lees rustig. Ben je klaar? Tik op het vinkje.',
  'instr.reading.listen': 'Luister naar het verhaal. Lees daarna zelf nog een keer.',
  // Fonemisch bewustzijn / Klankjager (GD §4a)
  'instr.fn.first_sound': 'Welk woord begint met {sound}?',
  'instr.fn.last_sound': 'Welk woord eindigt op {sound}?',
  'instr.klankjager.first': 'Welk woord begint met {klank}?',
  'instr.klankjager.last': 'Welk woord eindigt op {klank}?',
  'instr.klankjager.candidates': '{woorden}',
  // Letter-klank (GD §4b)
  'instr.lk.grapheme_to_sound': 'Welke klank zegt deze letter?',
  'instr.lk.sound_to_grapheme': 'Welke letter hoort bij {sound}?',
  'instr.lk.intro': 'Dit is de letter {letter}. Hij zegt {sound}.',
  'instr.letterklank.r1': 'Welke klank zegt deze letter?',
  'instr.letterklank.r2': 'Welke letter hoort bij {klank}?',
  // Hakken (GD §4c)
  // EDU-R3-004: `instr.hakken.start` hoort bij de (nog) niet geplande
  // tap-responsmodus; bewaard voor de toekomst, niet in REQUIRED_INSTRUCTION_KEYS.
  'instr.hakken.start': 'Tik de letters één voor één. Hoor je de klanken?',
  'instr.hakken.count': 'Hoeveel klanken hoor je?',
  // Plakken (GD §4d)
  'instr.plakken.r1': 'Plak de klanken aan elkaar. Welk woord hoor je?',
  // EDU-R3-004: sleepvariant `r2` is nog niet in gebruik; niet verplicht.
  'instr.plakken.r2': 'Sleep de klanken in de goede volgorde.',
  // Woord lezen (GD §4e)
  'instr.de.read': 'Lees dit woord. Luister naar de knoppen en kies wat er staat.',
  'instr.woordlezen.start': 'Lees dit woord. Luister naar de knoppen en kies wat er staat.',
  'instr.woordlezen.reveal': '{woord}. Dit is {beeld}.',
  'instr.woordlezen.comprehension': 'Wat hoort bij dit woord?',
  // De Klimboom (GD §4f) – generieke template voor `instr.klim.<woord>`.
  'instr.klim': 'Klim naar {word}.',
  'instr.klimboom': 'Klim naar {woord}.',
  // Fonologisch bewustzijn: rijmen en klappen (GD §4a)
  'instr.ph.syllable': 'Hoeveel klappen hoor je in {word}?',
  'instr.ph.rhyme': 'Wat rijmt op {word}?',
  // Algemeen (GD §4, §11.2)
  'instr.repeat': 'Ik zeg het nog een keer.',
  'instr.guess': 'Rustig maar. Eerst goed kijken.',
  'instr.audio.options': 'Luister maar.',
  // Aanvullingen door de UI-builder (start/map/introductie).
  'instr.start': 'We gaan lezen! Tik op de groene knop.',
  'instr.map': 'Kies een plek in het Klankwoud.',
  'instr.new_letter': 'Ooo, luister! Er is een nieuwe klank.',
};

/**
 * Sleutels die de code daadwerkelijk gebruikt of vereist (EDU-009). De
 * validator eist dat elk van deze bestaat in `INSTRUCTIONS` én in de
 * audiomanifest.
 */
export const REQUIRED_INSTRUCTION_KEYS: readonly string[] = [
  'instr.start',
  'instr.map',
  'instr.repeat',
  'instr.fn.first_sound',
  'instr.fn.last_sound',
  'instr.lk.grapheme_to_sound',
  'instr.lk.sound_to_grapheme',
  'instr.lk.intro',
  'instr.ph.syllable',
  'instr.ph.rhyme',
  'instr.de.read',
  'instr.klim',
  'instr.hakken.count',
  'instr.plakken.r1',
];

/**
 * Dynamische instructiesleutels: een prefix die op een concrete sleutel wordt
 * toegepast met een generieke template (bv. `instr.klim.kam` → `instr.klim`).
 */
export interface InstructionKeyPattern {
  prefix: string;
  template: string;
}

export const INSTRUCTION_KEY_PATTERNS: readonly InstructionKeyPattern[] = [
  { prefix: 'instr.klim.', template: 'instr.klim' },
];

/**
 * Lost een (mogelijk dynamische) instructiesleutel op naar zijn template-sleutel
 * en variabelen. Bv. `instr.klim.kam` → template `instr.klim`, vars `{word:'kam'}`.
 */
export function resolveInstructionKey(
  key: string,
): { template: string; vars: Record<string, string> } | undefined {
  for (const pattern of INSTRUCTION_KEY_PATTERNS) {
    if (key.startsWith(pattern.prefix) && key.length > pattern.prefix.length) {
      const value = key.slice(pattern.prefix.length);
      return { template: pattern.template, vars: { word: value, woord: value } };
    }
  }
  return undefined;
}

const PLACEHOLDER_PATTERN = /\{(\w+)\}/;

/** True als een template `{placeholder}`s bevat die runtime ingevuld moeten worden. */
export function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text);
}

/** Alle placeholder-namen in een template (in voorkomende orde, zonder duplicaten). */
export function placeholdersOf(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\{(\w+)\}/g)) {
    const name = match[1];
    if (name !== undefined && !out.includes(name)) out.push(name);
  }
  return out;
}
