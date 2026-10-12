/**
 * Centrale feedbackteksten (GD §5). ID -> tekst (audio-opname).
 * Geen "FOUT", geen straf (ED §9.1).
 */
export const FEEDBACK: Readonly<Record<string, string>> = {
  // 5.1 Correct
  'fb.correct.1': 'Super!',
  'fb.correct.2': 'Goed gedaan!',
  'fb.correct.3': 'Ja, dat klopt.',
  'fb.correct.4': 'Mooi gelezen!',
  'fb.correct.5': 'Knap geplakt!',
  'fb.correct.6': 'Je luisterde goed.',
  'fb.correct.7': 'Goed gehakt!',
  'fb.correct.8': 'Hoera, dat is hem!',
  'fb.correct.9': 'Ja! Dat heb je goed ontdekt!',
  'fb.correct.10': 'Kijk eens, het is gelukt!',
  'fb.correct.11': 'Goed zo! Op naar de volgende!',
  'fb.correct.12': 'Wat heb je goed geoefend!',
  // 5.2 Eerste poging fout
  'fb.try1.1': 'Bijna. Probeer nog een keer.',
  'fb.try1.2': 'Luister nog eens goed.',
  'fb.try1.3': 'Het begin klopt! Kijk nog eens naar het eind.',
  'fb.try1.4': 'We lezen van links naar rechts. Begin hier.',
  // 5.3 Tweede poging fout (hint)
  'fb.hint.1': 'Luister goed. Plak de klanken aan elkaar.',
  'fb.hint.2': 'Luister nog eens naar deze klank.',
  'fb.hint.4': 'Luister naar de klank. Welk woord begint daarmee?',
  'fb.hint.5': 'Luister nog eens. Tel de klanken rustig mee.',
  'fb.hint.syllable': 'Zeg het woord rustig. Klap met elk stukje mee.',
  'fb.model.syllable': 'We doen het samen. Zeg het woord en klap mee. Kijk, dit is het aantal klappen.',
  'fb.hint.rhyme': 'Luister naar het einde van de woorden. Welke klinken daar hetzelfde?',
  'fb.model.rhyme': 'Hoor je het? Deze woorden klinken aan het einde hetzelfde. Ze rijmen!',
  'fb.hint.last': 'Luister naar de laatste klank. Welk woord eindigt daarmee?',
  'fb.model.last': 'Luister naar het einde van het woord. Straks mag je het nog een keer.',
  'fb.hint.reading': 'Lees het stukje nog eens. Wat staat er in het verhaal?',
  'fb.model.reading': 'We lezen samen. Kijk, dit antwoord past bij het verhaal.',
  // 5.4 Derde poging fout (modeling)
  'fb.model.1': 'We doen het samen. Luister maar. Straks mag je het nog een keer.',
  'fb.model.2': 'We doen het samen. Luister naar de klanken. Jij mag het straks nog eens.',
  'fb.model.3': 'Luister naar het begin van het woord. Straks mag je het nog een keer.',
  'fb.model.4': 'Samen luisteren we naar de klank. Jij mag het straks nog eens.',
  // 5.5 Overig
  'fb.guess.1': 'Rustig maar. Eerst goed kijken.',
  'fb.nav.stop.1': 'We stoppen. Knap gedaan vandaag!',
  'fb.nav.done.1': 'We zijn klaar! Je hebt goed geoefend.',
  'fb.audio.repeat.1': 'Ik zeg het nog een keer.',
  'fb.reward.1': 'Een klankvonkje voor jou!',
  'fb.letterarrive.1': 'Ooo, luister! Er is een nieuwe klank.',
  'fb.help.parent.1': 'Vraag maar aan een grote mens.',
  // 5.6 Foutspecifieke feedback (ED §9.3, EDU-006). Variabelen via {sound}/{letter}/{word}/{sounds}.
  'fb.specific.first_sound': 'Bijna! Luister naar het begin: {sound}…',
  'fb.specific.last_sound': 'Bijna! Luister naar het laatste stukje: {sound}…',
  'fb.specific.middle_sound': 'Luister naar het midden: {sound}… Welke klinker hoor je?',
  'fb.specific.middle_consonant': 'Luister naar het midden: {sound}…',
  // EDU-R3-001: letterklank-foutfeedback met eigen, altijd gevulde {sound} en
  // een taalkundig kloppende formulering (de doelletter is vaak een medeklinker).
  'fb.specific.letter_sound': 'Deze letter zegt {sound}. Probeer het nog eens.',
  'fb.specific.order': 'We lezen van links naar rechts: {word}. Probeer het nog eens.',
  'fb.specific.letter_confusion': 'Luister nog eens naar deze klank: {sound}.',
  'fb.specific.blend_retry': 'Luister nog eens: {sounds}. Kun jij ze samenplakken?',
  'fb.specific.count': 'Je telde {count}. Tel nog eens mee: hoeveel klanken hoor je?',
};

/**
 * Foutspecifieke feedback-IDs (ED §9.3, EDU-006) die de generatoren per
 * gekozen afleider zetten (`try1ByOption`). F2 gebruikt exact deze namen.
 */
export const SPECIFIC_FEEDBACK_KEYS: readonly string[] = [
  'fb.specific.first_sound',
  'fb.specific.last_sound',
  'fb.specific.middle_sound',
  'fb.specific.middle_consonant',
  'fb.specific.letter_sound',
  'fb.specific.order',
  'fb.specific.letter_confusion',
  'fb.specific.blend_retry',
  'fb.specific.count',
];

/**
 * Alle feedback-IDs die in GAME_DESIGN §5.1–§5.5 genoemd worden **en** door de
 * runtime gebruikt kunnen worden. De validator eist dat elk van deze keys
 * bestaat (ARCHITECTURE §5.1 regel 10).
 *
 * Reviewfix (set B): de ongebruikte varianten `fb.try1.5`,
 * `fb.try1.6`, `fb.try1.7` en `fb.hint.3` zijn verwijderd; de generatoren/het
 * antwoordmodel kiezen deze nooit (de foutspecifieke `fb.specific.*`-ladder
 * vult dit gat taalkundig correct).
 */
export const REQUIRED_FEEDBACK_KEYS: readonly string[] = [
  // 5.1 Correct
  'fb.correct.1',
  'fb.correct.2',
  'fb.correct.3',
  'fb.correct.4',
  'fb.correct.5',
  'fb.correct.6',
  'fb.correct.7',
  'fb.correct.8',
  'fb.correct.9',
  'fb.correct.10',
  'fb.correct.11',
  'fb.correct.12',
  // 5.2 Eerste poging fout
  'fb.try1.1',
  'fb.try1.2',
  'fb.try1.3',
  'fb.try1.4',
  // 5.3 Tweede poging fout (hint)
  'fb.hint.1',
  'fb.hint.2',
  'fb.hint.4',
  'fb.hint.5',
  // 5.4 Derde poging fout (modeling)
  'fb.model.1',
  'fb.model.2',
  'fb.model.3',
  'fb.model.4',
  // 5.5 Overig
  'fb.guess.1',
  'fb.nav.stop.1',
  'fb.nav.done.1',
  'fb.audio.repeat.1',
  'fb.reward.1',
  'fb.letterarrive.1',
  'fb.help.parent.1',
  // 5.6 Foutspecifieke feedback (EDU-006)
  ...SPECIFIC_FEEDBACK_KEYS,
];

