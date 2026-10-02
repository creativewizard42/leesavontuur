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

  // Aanvulling door de UI-builder (noodzakelijk voor aria-labels/knoppen; geen
  // kind-instructietekst die gelezen moet worden). Keys zijn stabiel.
  'ui.option.audio': 'klankknop',
  'ui.option.audio.n': 'klankknop {n}',
  'ui.option.letter.n': 'letter {letter}',
  'ui.option.word.n': 'woord {woord}',
  'ui.option.number.n': 'aantal {n}',
  // Audio-only klankoptie (klankjager/plakken/klimboom): gelabeld voor de
  // ouderzone/aria; het kind kiest op klank (EDU-R2-007, QA-R2-005).
  'ui.option.sound': 'Luister naar klank {n}',
  // Generiek label voor vorm-afleiders (G1 introduceert vorm-afleiders).
  'ui.option.shape': 'vorm',
  'ui.play': 'Speel',
  'ui.avatar.group': 'Kies een dierenvriendje',
  'ui.audio.fallback': 'Luister goed',
  'ui.audio.unavailable': 'Geluid niet beschikbaar',
  'ui.audio.unavailable.hint': 'Kijk goed naar de klanken en de plaatjes.',
  // Ouder-/ontwikkelmarkering: losse klanken/gerekte reeksen klinken nu via TTS
  // (EDU-R2-007). Rustig, niet-diagnostisch (ED §9.1).
  'ui.audio.approximate': 'Klank is een benadering, nog geen echte opname',
  'ui.tap.start': 'Tik voor elke klank die je hoort',
  'ui.tap.done': 'Klaar',
  'ui.tap.count': '{n} klanken getikt',
  'ui.listen': 'Luister naar deze klank',
  'ui.reveal.alt': 'Beloningsplaatje bij het gelezen woord',
  'ui.area.locked': 'nog niet open',
  'ui.area.open': 'open',
  'ui.area.mastered': 'beheerst',
  'ui.area.practicing': 'aan het oefenen',
  'ui.klankboom.title': 'De Klankboom',
  'ui.letter.intro.title': 'Nieuwe klank',
  'ui.letter.name': 'Letternaam',
  'ui.letter.sound': 'Klank',
  'ui.letter.example': 'Voorbeeldwoord',
  'ui.pause.continue': 'Doorgaan',
  'ui.pause.toMap': 'Naar de kaart',
  'ui.pause.title': 'Even stoppen?',
  'ui.parent.back': 'Terug',
  'ui.parent.privacy': 'Alles blijft lokaal op dit apparaat. Er worden geen gegevens verstuurd.',
  'ui.parent.learnedCount': '{n} van {total} klanken beheerst',
  'ui.parent.wordsRead': '{n} woorden gelezen',
  'ui.parent.response': 'Gemiddelde reactietijd (indicatie): {s} s',
  'ui.parent.confusions.title': 'Vaak verwisseld',
  'ui.parent.confusions.none': 'Nog geen verwarringen gezien.',
  'ui.parent.extra.title': 'Heeft extra oefening nodig bij',
  'ui.parent.extra.none': 'Nog geen extra aandachtspunten.',
  'ui.parent.manage.title': 'Gegevens en beheer',
  'ui.parent.settings.title': 'Instellingen',
  'ui.parent.settings.audio': 'Geluid aan',
  'ui.parent.audio.missing':
    'Op dit apparaat is geen Nederlandse stem gevonden. Het spel werkt door met beeld. Installeer een nl-NL stem in de systeeminstellingen voor gesproken uitleg.',
  'ui.parent.save.failed':
    'Let op: de voortgang kon niet op dit apparaat worden opgeslagen (bijvoorbeeld omdat opslag vol of uitgeschakeld is). Het spel blijft werken, maar de voortgang gaat mogelijk verloren.',
  'ui.parent.settings.hint': 'Deze instellingen gelden direct voor het kind.',
  'ui.reward.sparks': '{n} klankvonkjes',
  'ui.nav.progress': 'Opdracht {index} van {total}',
};
