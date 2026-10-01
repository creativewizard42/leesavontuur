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
  'fb.correct.8': 'Fijn dat je het nog eens probeerde.',
  // 5.2 Eerste poging fout
  'fb.try1.1': 'Bijna. Probeer nog een keer.',
  'fb.try1.2': 'Luister nog eens goed.',
  'fb.try1.3': 'Het begin klopt! Kijk nog eens naar het eind.',
  'fb.try1.4': 'We lezen van links naar rechts. Begin hier.',
  'fb.try1.5': 'Dat is de naam van de letter. Welke klank maakt hij?',
  'fb.try1.6': 'Luister naar het midden. Hoor je a of o?',
  'fb.try1.7': 'Kijk: staat er één a of twee? Eén a klinkt kort.',
  // 5.3 Tweede poging fout (hint)
  'fb.hint.1': 'Luister: k… a… m. Plak maar aan elkaar.',
  'fb.hint.2': 'Deze letter zegt sss.',
  'fb.hint.3': 'Kijk naar de eerste letter. Welke klank zegt die?',
  'fb.hint.4': 'De klank is mmm. Welk woord begint daarmee?',
  'fb.hint.5': 'Luister: k… a… m. Tik ze in deze volgorde.',
  // 5.4 Derde poging fout (modeling)
  'fb.model.1': 'We doen het samen. k-a-m … kam! Dit woord is kam. Straks komt hij nog een keer.',
  'fb.model.2': 'Samen: dit is tak. t-a-k. Jij mag hem straks nog eens.',
  'fb.model.3': 'Samen: mmm-mat. Mat begint met mmm. Straks mag je het nog een keer.',
  'fb.model.4': 'Samen: de s zegt sss. Jij mag het straks nog eens.',
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
  'fb.specific.order': 'We lezen van links naar rechts: {word}. Probeer het nog eens.',
  'fb.specific.letter_confusion': 'Dat is de letter {letter}. Luister naar de klank: {sound}.',
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
  'fb.specific.order',
  'fb.specific.letter_confusion',
  'fb.specific.blend_retry',
  'fb.specific.count',
];

/**
 * Alle feedback-IDs die in GAME_DESIGN §5.1–§5.5 genoemd worden. De validator
 * eist dat elk van deze keys bestaat (ARCHITECTURE §5.1 regel 10).
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
  // 5.2 Eerste poging fout
  'fb.try1.1',
  'fb.try1.2',
  'fb.try1.3',
  'fb.try1.4',
  'fb.try1.5',
  'fb.try1.6',
  'fb.try1.7',
  // 5.3 Tweede poging fout (hint)
  'fb.hint.1',
  'fb.hint.2',
  'fb.hint.3',
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

