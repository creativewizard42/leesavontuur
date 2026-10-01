/**
 * Instructie- en audio-promptteksten per activiteit (GD §4, §11.2).
 *
 * Alle Nederlandse teksten die het spel uitspreekt staan hier centraal, zodat
 * er geen losse teksten in de UI-/game-code hoeven te staan. `{...}` zijn
 * placeholders die de Builder invult (bv. `{doelwoord}`, `{klank}`).
 */
export const INSTRUCTIONS: Readonly<Record<string, string>> = {
  // Klankjager (4a)
  'instr.klankjager.first': 'Welk woord begint met {klank}?',
  'instr.klankjager.last': 'Welk woord eindigt op {klank}?',
  'instr.klankjager.candidates': '{woorden}',
  // Letter-klank (4b)
  'instr.letterklank.r1': 'Welke klank zegt deze letter?',
  'instr.letterklank.r2': 'Welke letter hoort bij {klank}?',
  // Hakken (4c)
  'instr.hakken.start': 'Tik de letters één voor één. Hoor je de klanken?',
  'instr.hakken.count': 'Hoeveel klanken hoor je?',
  // Plakken (4d)
  'instr.plakken.r1': 'Plak de klanken aan elkaar. Welk woord hoor je?',
  'instr.plakken.r2': 'Sleep de klanken in de goede volgorde.',
  // Woord lezen (4e)
  'instr.woordlezen.start': 'Lees dit woord. Tik eerst de letters, plak ze daarna aan elkaar.',
  'instr.woordlezen.reveal': '{woord}. Dit is {beeld}.',
  'instr.woordlezen.comprehension': 'Wat hoort bij dit woord?',
  // De Klimboom (4f)
  'instr.klimboom': 'Klim naar {woord}.',
  // Algemeen (GD §4, §11.2)
  'instr.repeat': 'Ik zeg het nog een keer.',
  'instr.guess': 'Rustig maar. Eerst goed kijken.',
  'instr.audio.options': 'Luister maar.',
  // Aanvulling door de UI-builder (start/map/introductie).
  'instr.start': 'We gaan lezen! Tik op de groene knop.',
  'instr.map': 'Kies een plek in het Klankwoud.',
  'instr.new_letter': 'Ooo, luister! Er is een nieuwe klank.',
};
