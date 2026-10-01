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
};
