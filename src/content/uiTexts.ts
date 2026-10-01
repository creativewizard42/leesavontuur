/**
 * UI-teksten. Alleen voor schermen die volwassenen/ouders lezen, of als
 * technische fallback; het kind krijgt uitleg via audio + icoon (GD §8.1).
 *
 * Ouderzone-formuleringen volgen ED §12.2 en bevatten **geen** diagnose-,
 * percentiel- of vergelijkingstaal (ED §12.3). `{...}` = placeholders.
 */
export const UI_TEXTS: Readonly<Record<string, string>> = {
  'ui.app.title': 'LEESAVONTUUR',
  'ui.start': 'Begin',
  'ui.repeat': 'Nog een keer',
  'ui.home': 'Stop',
  'ui.next': 'Verder',
  'ui.world.title': 'Het Klankwoud',
  'ui.settings.audio': 'Geluid',
  'ui.settings.motion': 'Rustige bewegingen',
  'ui.settings.contrast': 'Hoog contrast',
  'ui.settings.autoRepeat': 'Opdracht automatisch herhalen',

  // Ouderzone-toegang (GD §9.1)
  'ui.parent.title': 'Ouderhol',
  'ui.parent.gate.hold': 'Houd deze knop 5 seconden ingedrukt.',
  'ui.parent.gate.sum': 'Los de som op om verder te gaan.',
  'ui.parent.gate.error': 'Probeer het nog eens.',
  'ui.parent.export': 'Bewaar gegevens',
  'ui.parent.reset': 'Begin helemaal opnieuw',
  'ui.parent.reset.confirm': 'Weet je het zeker? Dit kan niet terug.',

  // Ouderzone-dashboard (ED §12.1, GD §9.2)
  'ui.parent.learned.title': 'Geleerde klanken',
  'ui.parent.attention.title': 'Klanken die extra oefening vragen',
  'ui.parent.blend.title': 'Hakken en plakken',
  'ui.parent.words.title': 'Woorden lezen',
  'ui.parent.sight.title': 'Sight words',
  'ui.parent.sentences.title': 'Zinnen en teksten',
  'ui.parent.fluency.title': 'Vlotheid',
  'ui.parent.time.title': 'Oefentijd',
  'ui.parent.help.title': 'Hulpgebruik',
  'ui.parent.examples.title': 'Voorbeeldwoorden die goed gaan',

  // Statuslabels (ED §12.1, UX §8): kleur én tekst, neutraal, geen rood.
  'ui.parent.status.zeker': 'Beheerst',
  'ui.parent.status.oefent': 'In ontwikkeling',
  'ui.parent.status.nog': 'Nog niet begonnen',

  // Rapportageformuleringen (ED §12.2) – zonder diagnoseclaims.
  'ui.parent.report.knows': '{kind} kent nu de klanken {klanken}.',
  'ui.parent.report.canRead': '{kind} kan korte woorden als {woorden} lezen.',
  'ui.parent.report.needs': '{kind} heeft extra oefening nodig bij {onderwerp}.',
  'ui.parent.report.hint.use':
    '{kind} gebruikt bij woorden met drie klanken vaak nog een hint. Dat hoort bij deze fase; het spel biedt deze woorden vaker aan.',
  'ui.parent.report.tip': 'Tip: laat {kind} thuis woorden uit het spel opzoeken in een prentenboek.',
  'ui.parent.report.ongoing':
    'Het lezen van {onderwerp} gaat nog moeizaam, ook na veel oefening. U kunt dit bespreken met de leerkracht.',
  'ui.parent.report.topic.sounds': 'de klank-tekenkoppeling',
  'ui.parent.report.topic.blend': 'het plakken van klanken tot een woord',
  'ui.parent.report.topic.longshort': 'het verschil tussen één en twee klinkerletters',
};
