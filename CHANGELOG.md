# Changelog

Alle noemenswaardige wijzigingen van LEESAVONTUUR. Opmaak losjes gebaseerd op
[Keep a Changelog](https://keepachangelog.com/nl/1.1.0/); versie 0.1.0.

## [0.1.0] – 2026-10-02

### MVP – speelbare verticale slice
- Volledige speelbare slice: startscherm, Klankwoud-kaart, sessiescherm,
  beloning en ouderhol.
- Mini-games: Klankjager, Letter-klank, Hakken, Plakken, Woord Lezen en
  De Klimboom; vaste sessie-opbouw met beloning.
- Audio via `AudioService` (opname → lokale TTS → visuele fallback), offline-first.
- Ouderzone met gate, voortgangsoverzicht, export en reset; verwarringslog.

### Reviewronde 1 – fixes
- **F1 (audio/content):** echte audio-detectie + gemarkeerde TTS-fallback, schone
  fonologie-bank, validator- en skill-mapping.
- **F2 (core/learning):** sessieplanner, adaptieve queue en foutspecifieke feedback.
- **F3 (ui/security):** UI-integratie van de nieuwe engine-/audio-API en security
  hardening (CSP, hostconfig, veilige DOM-helpers).

### Reviewronde 2 – fixes
- **Content/audio (G2):** per-variabele instructie-/feedbackclips
  (`instructionClips`, concrete sleutels zonder `{placeholders}`), opname-hints
  voor plosieven/klinkers, en een kindvriendelijk woordfilter.
- **Core/learning (G1):** progressiedeadlock na de eerste letter opgelost,
  adaptieve herstel- en veiligheidsfixes; `SessionQueue.fromJSON` valideert strikt
  en begrenst (SEC-R2-001/002).
- **UI/security (G3):** R2-labels, echte instructieclips, benaderingsindicator,
  audio-only/vorm-opties zonder zichtbare keys, en hostconfig-voorbeelden.
- **Integratie:** woordkeuze sluit `kidFriendly:false` uit; UI rendert de
  G1-metadata (`modelFirst`, `simplified`, `windDown`, `auditoryDistractors`),
  `fb.specific.count` en de concrete `instructionClips`; integratietest speelt een
  volledige sessie in jsdom (vers profiel en m,a,s,t geleerd).
- **Documentatie:** README, `docs/BUILD.md`, `docs/PRIVACY.md`,
  `docs/SECURITY.md` en dit changelog.

### Reviewronde 3 – fixes en ontwerpbeslissingen
- **ED v1.1:** `docs/EDUCATIONAL_DESIGN.md` gelijkgetrokken met de implementatie
  en voorzien van §15 "Ontwerpbeslissingen na review": MVP-woordenlijst → 18
  kindvriendelijke woorden (`mak/smak/mars` verwijderd, `Kv`-kolom en aantallen
  bijgewerkt), auditieve niet-getoonde klank-afleiders bij de eerste letter
  (`LK.<g>.SOUND`, RECOGNIZE pas vanaf ≥ 2 grafemen), poort toetst SOUND, r-in-coda
  herzien (§6.3), CVVC-fase → 6, `alpha=1`-waarschuwing i.c.m. `isMastered`,
  `requiresBlock`-proxy voor sight words, haalbare fase-2-poort
  (`FN.FIRST_SOUND ≥ 0.7`), sessie-vangnet (`PHASE_2_FALLBACK_SESSIONS = 8`),
  vereenvoudigde warming-up (max. 2 opties zolang de poort niet is gehaald),
  woordsecties pas bij ≥ 2 even lange woorden, feedback wordt altijd
  uitgesproken, en het gemeten unlock-tempo (`m:2, a:5, s:8, t:12, k:15, r:18`).
- **EDU-R3-001:** foutspecifieke letter-klank-feedback (`fb.specific.*` bij
  `letterklank`) vult de klank/gekozen klank en gebruikt een taalkundig juiste
  formulering voor medeklinkers (geen "welke klinker", geen onvervulde
  `{sound}`). Nieuwe sleutels: **`fb.specific.letter_sound`** (letter-klank-taak)
  en **`fb.specific.middle_consonant`** (middelste klank is een medeklinker);
  `fb.specific.middle_sound` wordt alleen nog gekozen als de middelste klank een
  klinker/tweeklank is (klinker-only, `answer.ts`).
- **EDU-R3-002:** feedbackzinnen worden daadwerkelijk uitgesproken (audio + tekst/
  icoon), conform GD §5 / §8.1; `onFeedback`/`setFeedback` speelt de concrete
  feedbackclip.
- **EDU-R3-003:** opname-hint voor de stemhebbende plosieven b/d onderscheiden van
  de stemloze ("stem aan, geen 'uh'") in de opnamelijst.
- **EDU-R3-004:** vereiste-maar-onbereikbare instructiesleutels (`instr.hakken.start`,
  `instr.plakken.r2`, e.a.) verwijderd of als toekomstig gemarkeerd, zodat
  `REQUIRED_INSTRUCTION_KEYS` de werkelijk gebruikte sleutels volgt.
- **EDU-R3-005:** dynamische items zetten waar mogelijk de concrete
  instructiesleutel i.p.v. de generieke `prompt.audio`-key (fallback-pad Fix).
- **QA-R3-001 (H1):** haalbare fase-2-poort. De drempel is verlaagd van 0,8 naar
  `PHASE_2_MASTERY = 0.7` (een 50%-leerling plafonneert op ~0,78 en haalde 0,8
  nooit), met daarnaast een **sessie-vangnet**: een leerling die ook 0,7 niet
  haalt, krijgt na `PHASE_2_FALLBACK_SESSIONS = 8` sessies tóch de eerste letter
  met extra auditieve ondersteuning, terwijl de fase-1-oefening in de warming-up
  blijft ("niet eindeloos vasthouden in één fase"). Zolang de poort niet is
  gehaald, biedt de klankoefening **maximaal 2 opties** (`maxDistractors: 1`) +
  één extra item op `FN.FIRST_SOUND`. Voor elke letter ná de eerste geldt weer
  volledig `isMastered`; de 50%-leerling krijgt dus geen nieuwe letter zonder
  beheersing van de vorige. Tests: `Progression.test.ts` (vangnet op sessie 8),
  `SessionPlannerFixes.test.ts` en `ProgressionSimulation.test.ts`
  (m in sessie 9, daarna alleen met beheersing).
- **QA-R3-002:** woordsecties (stap 5/6) openen pas bij ≥ 2 kindvriendelijke
  woorden van gelijke grafeemlengte; nooit 1-optie-keuzes als gescoord item.
- **QA-R3-003:** hervatten herstelt de queue-context (`profile`/`rng`/`learned`)
  zodat adaptief gedrag na resume niet afwijkt.
- **QA-R3-004:** audio-fallback waar mogelijk pictografisch/icoongebaseerd i.p.v.
  lopende leesbare NL-tekst.
- **SEC-R3-001:** meta-CSP wordt vóór Vite's script/link-tags in `index.html`
  gezet (`head-prepend`) voor volledige defense-in-depth (HTTP-header blijft
  leidend).
- **SEC-R3-002:** `docs/PRIVACY.md` retentietekst gecorrigeerd: een tussenstand
  ouder dan 12 uur wordt niet meer hervat en **actief verwijderd** bij de
  volgende start.
- **SEC-R3-005:** audio-keys in `instructionClips` tegen de manifest whitelisten.
- **Open/overige:** contactadres in `docs/PRIVACY.md` blijft placeholder
  `[contact invullen]` en is duidelijk gemarkeerd als **vóór publicatie in te
  vullen**; echte native audio-opnames en de tweede taalkundige/leerkracht-review
  blijven voorwaarden vóór gebruik met kinderen (ED §13).

### Code review fixes

#### Set A (core/UI)

- **Free-play scoort niet en hervat niet:** items in de vrije speelmodus tellen
  niet mee voor mastery/Leitner en worden niet als sessie hervat.
- **Mastery-poorten via `isMastered`:** fase- en letterpoorten toetsen aan
  `isMastered` in plaats van aan losse drempels, zodat poort en mastery gelijk
  lopen.
- **Fase-3-poort op SOUND:** de fase-3-poort toetst de klankherkenning
  (`LK.<g>.SOUND`), niet de letternaam.
- **Resume-src-validatie:** hervatte sessies valideren hun bron/queue strikt.
- **`toJSON` zonder dubbele serialisatie:** de sessie-queue serialiseert niet
  dubbel (geen geneste JSON-strings).

#### Set B (audio/content/learning/games)

- **`isLocalAudioSrc` hardening:** leading/trailing whitespace en
  C0-controletekens worden gestript; lege waarden, `//`-, `\`- en elk
  `scheme:`-pad worden geweigerd, plus een same-origin-check via `new URL`.
- **Node-engines:** `engines.node` naar `^22.12.0 || ^24.0.0 || >=26.0.0`
  (strengste eis van Vite 8 en Vitest 5); README en `docs/BUILD.md` bijgewerkt.
- **`src/games/**` verwijderd:** ongebruikt (geen importers; de UI/planner
  bouwen items via `src/learning`) en met een afwijkende skill-mapping.
  ARCHITECTURE en README beschrijven activiteiten nu als `src/learning`
  (generatoren) + `src/ui` (`ActivityView`/schermen).
- **Canonieke klankreeksen:** nieuwe `formatSoundSequence(ids, mode)` met
  `'speech'` (TTS/opnamelijst/clip-tekst, `" … "`) en `'display'`
  (schermtekst/feedbackvariabelen, `" - "`). `dynamicClips`, `answer`, `util`,
  `audioManifest` en `ui/audioClips` gebruiken de helper; `blend.<woord>` is in
  manifest en runtime-index identiek en de gesproken `blend_retry`-clip en de
  getoonde tekst hebben dezelfde klanken in dezelfde volgorde.
- **Ongebruikte feedbackvarianten verwijderd:** `fb.correct.8`, `fb.try1.5`,
  `fb.try1.6`, `fb.try1.7` en `fb.hint.3` zijn uit `FEEDBACK`,
  `REQUIRED_FEEDBACK_KEYS`, de audiomanifest en de opnamelijst gehaald; de
  foutspecifieke `fb.specific.*`-ladder dekt deze gevallen taalkundig correct.
