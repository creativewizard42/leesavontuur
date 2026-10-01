# LEESAVONTUUR – Educational Review

| | |
|---|---|
| Rol | Educational Reviewer (Nederlandse leesdidactiek, aanvankelijk lezen, groep 2–3) |
| Toetsingskader | `docs/EDUCATIONAL_DESIGN.md` (ED, leidend), `docs/GAME_DESIGN.md` (GD), `docs/ARCHITECTURE.md` (ARCH) |
| Datum | 2026-10-01 |
| Bereik | Content (`src/content/**`), learning/games/UI, core (mastery/adaptief/Leitner), audio, feedback, ouderdashboard, originaliteit |
| Methode | Codelezing + `npm test` (99 groen) + `npm run validate` (0 fouten, 781 audio-waarschuwingen) + ad-hoc probes in `C:\Users\Jan\VM Scan\edu-tmp` (buiten de repo) |
| Wijzigingen | **Geen broncode gewijzigd.** Alleen dit bestand. |

**Samenvatting oordeel vooraf:** de datalaag (grafemen, woorden, segmentatie, blokkeerlijst, validator) is grotendeels solide en goed gedocumenteerd. De **didactische uitvoering** van de MVP-verticale-slice is dat echter niet: het audiosysteem is in de praktijk volledig stil (geen opnames én TTS-fallback wordt nooit bereikt), de eerste sessie scoort trivialiteiten, en de voortgang schuift veel te snel door. Hierdoor is de MVP **nu niet didactisch acceptabel**; met de Blocker- en Major-fixes hieronder wordt het dat wel.

---

## A. Content (`src/content/**`)

### Bevindingen

**EDU-016 – Minor – MVP-woordenschat deels niet kleutervriendelijk / meerduidig**
Bestand: `src/content/words.ts:42,52,53` (en ED §6.5).
Bevinding: `smak`, `mars`, `mak` (en in mindere mate `kas`, `as`) zijn voor 5–6-jarigen abstract, zeldzaam of meerduidig. `smak` is geen courant zelfstandig naamwoord, `mars` roept "planeet / snoep / marcheren" op, `mak` ("tam") is een begrip dat kleuters niet kennen. ED §6.5 markeert juist álle 21 MVP-woorden als kindvriendelijk (`Kv = ja`), wat niet klopt.
Onderbouwing: P1 (betekenis/plezier) en ED §6.2 regel 9 (betekenis gecontroleerd). Woorden zonder eenduidige afbeelding (`mak`, `smak`, `mars`) leveren geen betekenisverankering op; ze oefenen alleen techniek op niet-betekenisvolle klankreeksen.
Fix: `smak` en `mars` uit de MVP-woordenlijst halen of expliciet als "alleen techniek, geen betekenisclaim" markeren; `mak` schrappen of vervangen (bijv. binnen de beschikbare grafemen `mas` is geen woord; overweeg `mast`/`stam` te hergebruiken). Herzie de `Kv`-kolom in ED §6.5 conform werkelijkheid.

**EDU-017 – Minor – `soundHint` van korte klinkers en plosieven is de kale letter**
Bestand: `src/content/graphemes.ts:32-36,45,50,56` (a/i/e/o/u = `'a'/'i'/'e'/'o'/'u'`; t/k/p/b/d = `'t'/'k'/'p'/'b'/'d'`).
Bevinding: ED §5.3 schrijft voor de opname-hint expliciet "kort 'a' als in *kam*; niet de letternaam 'aa'" en "kort tikje 't' … zonder 'uh'; niet de letternaam". De implementatie bewaart enkel de letter, waardoor een maker of TTS de letternaam zal uitspreken. Voor de continuanten (`mmm`,`sss`,`rrr`,`vvv`,`zzz`,`lll`,`nnn`,`fff`) is het wel goed.
Onderbouwing: P5 "klank vóór letternaam", ED §9.3 (letternaam-verwarring), §13 regel 1.
Fix: `soundHint` uitbreiden tot ondubbelzinnige hints ("kort a (kam)", "stemloze t zonder uh") of een apart veld `recordingHint`; TTS mag deze nooit als losse klank lezen (zie §D).

**EDU-018 – Minor – `WordPattern`-datamodel mist 'CV' (en 'V')**
Bestand: `src/types.ts:83-94`; feitelijk `bij` levert patroon `CV` (`content-probe`).
Bevinding: `patternForGraphemes` cast willekeurige C/V-reeksen naar `WordPattern`; `'CV'` (bij, `src/content/words.ts:184`) staat niet in de union. De validator vergelijkt afgeleid met opgeslagen, dus hij meldt geen fout, maar het type liegt.
Fix: `'CV'` (en `'V'`) aan de union toevoegen of patroon als `string` modelleren met een validator-regel.

**EDU-019 – Nit – Sight-word-blokvereisten wijken af van ED §7.1 (geen runtime-impact in MVP)**
Bestand: `src/content/sightWords.ts:29-31`.
Bevinding: `SW.de/een/het` hebben `requiresBlock: 1`, terwijl ED §7.1 `SW.de` pas na `DE.CVC ≥ 0.7` (begin fase 7) introduceert. Omdat de MVP sight words volledig uitsluit (GD §10.1 "Geen: sight words"), is dit nu onschadelijk, maar de data is in strijd met ED.
Fix: `requiresBlock` op de echte vereiste zetten of de sight-word-data buiten de MVP-build houden.

**Positief (content):**
- Segmentatie "langste match eerst" is correct: `kaas→k|aa|s`, `muur→m|uu|r`, `eet→ee|t` (`segmentWord`, `src/content/validator.ts:49-77`); alle 21 MVP-woorden segmenteren correct en de fonemen zijn één-per-grafeem.
- Blokkeerlijst + vangvarianten (`src/content/blocklist.ts:39-49`) dekken exact ED §6.4; de statische woordenlijst bevat geen geblokkeerde woorden.
- Voorbeeldwoorden per grafeem respecteren de introductievolgorde (enige uitzondering `m → maan` is correct als `AUDITORY_ONLY_EXAMPLES`, `src/content/graphemes.ts:87`).
- Afbeeldingen zijn betekenisvol en bevatten geen leesbare tekst; `mak/smak/mars/start` hebben terecht geen plaatje (GD §11.1). Alleen 'kas' (broeikas) blijft een betekenisrisico.

---

## B. Validator (`src/content/validator.ts`)

**EDU-020 – Major – Validator dekt de gegenereerde auditieve content (PH) niet; daarom glipt `poep` erdoor**
Bestand: `src/content/validator.ts:120-476` (valideert uitsluitend `ContentBundle`: grafemen/woorden/zinnen/feedback/audio/beeld); `src/learning/Phonology.ts:24-46` (hardgecodeerde rijm-/lettergreepwoorden buiten de bundel).
Bevinding: De vraag "dekt de validator echt *geen woord met niet-geleerde letters*, ook als afleider in generators?" moet als volgt worden beantwoord:
1. **Voor decodeertaken (DE/AN/SY/LK/Klimboom): ja, in de praktijk.** Alle generatoren filteren kandidaten via `isWordAllowed` respectievelijk `pickGraphemeDistractors(learned,…)`. De property-test (`src/learning/__tests__/generators.test.ts:137-213`) en mijn eigen sweep over 300 seeds × 4 moeilijkheidsniveaus vonden geen niet-geleerde grafeem in opties.
2. **Maar de validator zelf keurt geen generatoruitvoer.** Er is geen runtime/CI-check die gegenereerde items tegen de blokkeerlijst en geleerde set houdt; de garantie hangt volledig aan elke generator die de helper correct aanroept.
3. **En de auditieve PH-module valt volledig buiten elke controle.** `Phonology.ts` bevat eigen woordlijsten die de validator nooit ziet. Gemeten over 400 seeds: **`poep` wordt 980× uitgesproken** als rijmoptie/doel (`['soep','poep','groep']`).
Onderbouwing: ED §6.4 ("nooit tonen, ook niet als afleider of gegenereerd item"), §6.2 regel 9.
Fix: (a) `poep` en alle overige geblokkeerde vormen uit `RHYME_GROUPS` verwijderen; (b) een test/CI-stap toevoegen die álle generatoren (inclusief Phonology) over een groot aantal seeds laat lopen en elke label-/audio-tekst tegen `isBlockedWord` én (waar van toepassing) de geleerde set toetst. Zie ook EDU-013.

**EDU-013 – Major – Rijmgroepen bevatten niet-rijm en niet-bestaande woorden**
Bestand: `src/learning/Phonology.ts:39-46` (rijm), `:24-36` (lettergrepen).
Bevinding:
- `['maan','kan','pan']`: *maan* heeft /aː/, *kan/pan* /ɑ/ — in het Standaardnederlands rijmen die **niet**; een kind dat correct luistert krijgt straf voor goed gehoor.
- `['vis','mis','lis']` (*lis* = lint, zeer ongewoon), `['raam','kaam','aam']` (*aam* = wijnmaat; *kaam* = schimmelvlies), `['tas','kas','bas']` (*bas* abstract) en `['soep','poep','groep']` (bevat blokkeerwoord).
- `SYLLABLE_WORDS` bevat `appelap` (`:35`), geen bestaand woord; een kind kan het aantal lettergrepen niet bepalen.
Onderbouwing: ED §2.1 (rijm/lettergrepen), P2, §6.2 regel 9.
Fix: rijm- en lettergreepbank herzien met frequente, kindbekende, exact rijmende woorden (`kat/mat/rat`, `vis/mis`, `tas/kas`, `maan/raan/aan` — let op geldige woorden) en `appelap` verwijderen.

**EDU-021 – Minor – `secondarySkillId` wordt nergens gezet**
Bestand: `src/types.ts:280`, `src/learning/Segmenting.ts:67-81` (FN.COUNT en AN.CVC kennen elkaar niet), `src/core/GameState.ts:102`.
Bevinding: ED §4.1 koppelt "Klanken tellen" aan **FN.COUNT én AN.CVC**. Het model ondersteunt dual scoring, maar geen enkele generator vult `secondarySkillId`.
Fix: bij `Segmenting.generate` voor FN.COUNT `secondarySkillId:'AN.CVC'` (en vice versa waar passend) zetten; test toevoegen.

---

## C. Activiteiten (`src/learning`, `src/games`, `src/ui`)

**EDU-003 – Major – Hakken verraadt het antwoord en meet geen auditieve analyse**
Bestand: `src/learning/Segmenting.ts:39-61` (correct = `segmented.join('-')`, dus `k-a-m`), `src/ui/components/ActivityView.ts:99-109` (toont het woord als losse, geordende letterblokken), `src/games/Hakken.ts`.
Bevinding: Het doelwoord staat volledig geordend in beeld (`k` `a` `m`), en de antwoordopties zijn letterreeksen waarvan er exact één overeenkomt (`k-a-m`). Het kind hoeft niets te hakken; het kan visueel matchen. GD §4c beschrijft een sequentiële tik-taak ("tik de letters één voor één; elke letter springt los en laat zijn klank horen"), die niet is geïmplementeerd. Bovendien heeft de AN.CVC-prompt **geen audio** (`hasAudio=false`), dus de instructie "Hoor je de klanken?" wordt niet uitgesproken.
Onderbouwing: P6 (auditieve analyse), ED §11 regel 3/4, GD §4c.
Fix: implementeer de tik-in-volgorde-interactie (kind tikt letters links→rechts; elke tik speelt de klank; klankrij loopt vol), of toon bij een keuzevariant **niet** het volledige woord en gebruik niet-uitgeschreven klankopties. Verwijder de letterreeks-opties.

**EDU-004 – Major – Klankjager speelt de kandidaten niet af; op touch selecteert de eerste tik mogelijk meteen**
Bestand: `src/ui/components/ActivityView.ts:131-143` (preview enkel op `hover`/`focus` via `OptionGrid`, `src/ui/components/OptionGrid.ts:74-80`), `AudioService.playSequence` bestaat maar wordt nergens in de UI gebruikt (grep).
Bevinding: GD §4a vereist dat de 2–3 kandidaten ná de vraag **één voor één** worden uitgesproken met een pauze. In de implementatie zijn de knoppen identiek en zonder label; het kind moet ze individueel aanraken om ze te horen. Op een tablet vuurt `pointerenter` vóór/ tijdens `click`, waardoor de eerste aanraking zowel voorbeeld als keuze kan zijn — vergelijken is dan onmogelijk.
Onderbouwing: ED §11 regel 5 (identieke knoppen) en GD §4a; FN.FIRST_SOUND/LAST_SOUND zijn puur auditief.
Fix: speel de kandidaten automatisch na de prompt via `playSequence`, of geef elke knop een neutrale "oor"-knop waarmee eerst beluisterd kan worden zonder te kiezen; ontkoppel preview van selectie op touch.

**EDU-005 – Minor – Letter-klank (klank→letter) spreekt de opdracht niet uit**
Bestand: `src/learning/LetterSound.ts:76-80`.
Bevinding: Bij richting `sound-to-grapheme` is `prompt.audio` de losse klankclip; de vraag "Welke letter hoort bij sss?" wordt niet afgespeeld (`showText:false`). Het kind hoort alleen de klank en ziet letters zonder uitleg. GD §4b noemt deze zin expliciet.
Fix: `prompt.audio = instructionClip('instr.lk.sound_to_grapheme', 'Welke letter hoort bij ' + targetSound + '?')` (of een sequentie klank→instructie).

**EDU-006 – Major – Foutspecifieke feedback (ED §9.3 / GD §5.2) is niet geïmplementeerd**
Bestand: `src/learning/util.ts:287-299` (`try1ByOption` bestaat), `src/learning/answer.ts:48-54` (leest het nooit-gevulde veld), generatoren zetten één generieke `try1` (bijv. `src/learning/Blending.ts:62`, `src/learning/WordReading.ts:67`).
Bevinding: Alle takens gebruiken één eerste-poging-tekst. Voor Blending/Woordlezen/Klimboom is dat `fb.try1.3` ("Het begin klopt! Kijk nog eens naar het eind."). Kiest een kind bij *kam* de afleider *ram*, dan is die uitspraak **onwaar** en verwarrend. De ED §9.3-typen (eerste/laatste/klinker/kort-lang/omkering/letternaam) bestaan als `fb.*`-teksten maar worden nooit geselecteerd.
Fix: vul `try1ByOption` per afleider (of leid het fouttype af uit de positie waarin de gekozen afleider van het doel verschilt) en koppel `fb.try1.3/6/7`, `fb.try1.5` daaraan.

**EDU-014 – Major – Afleiders verschillen in lengte, waardoor lengte het antwoord verraadt**
Bestand: `src/learning/util.ts:192-214` (`pickWordDistractors` sorteert op woordafstand vóór lengteverschil bij niveau A/B).
Bevinding: Gemeten (`edu-tmp/guessability-probe.ts`): bij niveau A is de afleider voor `kam` consequent `start` (5 letters) en voor `start` consequent `mars/kast` (4 letters). In De Klimboom staat bij bijna elk 3-letterdoel `start` (5 letters) als optie. ED §11 regel 6 eist gelijke woordlengte (behalve bewuste kort/lang-paren); nu kan een kind op lengte uitsluiten zonder te decoderen.
Fix: bij decodeertaken altijd eerst filteren op gelijk aantal grafemen (behalve expliciete kort/lang-paren), daarna minimaliteit kiezen; `lenDiff` als harde voorwaarde i.p.v. tie-break.

**EDU-015 – Min/– Nit – Klimboom/Plaatsing: positie en audio-verraad**
Bestand: `src/learning/util.ts:228-236` (correcte positie vermijdt de laatste twee posities — dat is conform "nooit 3× op rij"), `src/learning/Klimboom.ts:52-57` (geschreven opties).
Bevinding: De klimboom-opties zijn geschreven woorden; alleen lengte (EDU-014) geeft een cue, positie is voldoende gerandomiseerd. Geen extra actie buiten EDU-014.
Fix: na de lengtefix is dit opgelost.

**EDU-024 – Minor – "Herhalen" bij Hakken geeft het gehakte antwoord**
Bestand: `src/ui/components/ActivityView.ts:189-201,270-273`, `src/learning/Segmenting.ts:52-61`.
Bevinding: Omdat de AN.CVC-prompt geen audio heeft, speelt `repeat()` de gerekte klankreeks van het woord af (`playStretched`). Dat is een hint/model, geen herhaling van de opdracht. Bij een kind dat de opdracht niet hoorde, is dit feitelijk het antwoord voorzeggen zonder de hint-escalatie te volgen (P11/ED §9.2).
Fix: geef de hak-taak een echte instructie-audio en laat `repeat()` die herhalen; laat de gerekte reeks alleen via de hint-trap (poging 2) komen.

**Positief (activiteiten):**
- Woord lezen: plaatje verschijnt aantoonbaar **pas na** correct (`ActivityView.buildReveal` wordt enkel in `markCorrectOption` aangeroepen; test `activity.test.ts:63-74`); opties zijn audio-only zonder beeld vóór het antwoord.
- Plakken route 1 is didactisch juist opgezet (gerekte klanken → geschreven woord, minimale paren bij C/D).
- Klimboom verraadt niets via plaatjes; alleen decoderen koppelt gesproken aan geschreven woord.
- Escalatieladder (1e fout → retry, 2e → hint, 3e → modeling) werkt (`answer.ts:28-55`, `ActivityView.ts:216-268`).
- Positie van het juiste antwoord respecteert "nooit 3× dezelfde positie" (`util.ts:228-236`).

---

## D. Audio-situatie (opnames ontbreken; losse klanken zijn stil)

**EDU-001 – Blocker – Audiosysteem is in de praktijk volledig stil; TTS-fallback wordt nooit bereikt**
Bestand: `src/audio/AudioService.ts:133-191` (met name `playElement` retourneert `true` op regel 172, ook na een laadfout).
Bevinding: `playElement` wacht op `ended`/`error`, maar retourneert daarna **altijd `true`**. Daardoor meldt `playClip` `'played-clip'`, wordt `speak()` nooit aangeroepen en wordt `onFallback` nooit gemeld — terwijl alle `audio/**`-bestanden ontbreken. Reproduceerbaar (probe met een `<audio>` waarvan `play()` reject en met een element dat `error` afvuurt):
```
[play() rejects] result=played-clip ttsSpoke=0 fallback=[]
[error event]  result=played-clip ttsSpoke=0 fallback=[]
```
Gevolg: geen enkele opname, geen TTS, geen visuele fallbackmelding. Omdat FN/LK/SY en de hints van AN/DE grotendeels **auditief** zijn, is het leerdoel niet haalbaar: de MVP is in de browser een stille oefening.
Onderbouwing: ED §13 regel 1 (losse klanken betrouwbaar), GD §11.2, P5/P6/P7.
Fix: `playElement` als succes beschouwen zodra `loadeddata`/`canplay`/`playing` vuurt (of `play()` resolve't), en bij `error`/reject **`false`** retourneren; daarna pas `speak()`/`onFallback`. Voeg een regressietest toe met een falende mediasource.

**EDU-009 – Major – Opnamelijst en instructie-key's lopen uiteen; de manifest mist de gebruikte clips**
Bestand: `src/content/instructions.ts:8-36`, `src/content/audioManifest.ts:27-71`, gebruikers: `src/learning/FirstSound.ts:79` (`instr.fn.first_sound`/`instr.fn.last_sound`), `src/learning/LetterSound.ts:72` (`instr.lk.grapheme_to_sound`), `src/learning/Phonology.ts:76,126` (`instr.ph.syllable`/`instr.ph.rhyme`), `src/learning/WordReading.ts:55` (`instr.de.read`), `src/learning/Klimboom.ts:64` (`instr.klim.<woord>`).
Bevinding: `INSTRUCTIONS` bevat `instr.klankjager.first/last`, `instr.letterklank.r1/r2`, `instr.hakken.start`, `instr.plakken.r1`, `instr.woordlezen.start`, `instr.klimboom` — die worden **nergens** gebruikt. Omgekeerd gebruikt de code keys die niet in `INSTRUCTIONS`/`audioManifest` staan, dus deze audio wordt nooit in de opnamelijst opgenomen en heeft geen vast pad. De "opnamelijst voor echte opnames" is daarmee incompleet en leverbaar noch testbaar.
Fix: normaliseer de sleutels (één naamgeving), laat generatoren `instruction('instr.…', vars)` gebruiken en genereer de manifest daaruit; voeg een validatorregel toe: elke door code gebruikte `instr.*`-key moet in `INSTRUCTIONS` bestaan.

**EDU-010 – Major – Aanbevolen MVP-oplossing voor audio**

De combinatie "geen opnames + onbetrouwbare TTS voor losse klanken + auditieve activiteiten" moet expliciet worden opgelost. Concreet voorstel (in volgorde van voorkeur):

1. **Repareer de fallback-resolutie eerst** (EDU-001). Zonder die fix is elke andere maatregel dood.
2. **Twee modi in `AudioService`/app:**
   - `audioMode: 'clips'` (productie): alleen echte opnames; losse klanken **nooit** via TTS (conform ED §13.1).
   - `audioMode: 'tts-tijdelijk'` (ontwikkeling/fallback): TTS via een **lokale nl-NL stem** voor **hele woorden, feedback en instructiezinnen** (betrouwbaar genoeg), met een zichtbare markering in de ouderzone ("Tijdelijk computerstem – echte opnames volgen").
3. **Losse klanken (fonemen) nooit via TTS.** Voor continuanten mag een gemarkeerde TTS-hint `"mmmm"`, `"ssss"`, `"rrrr"`, `"vvvv"`, `"zzzz"`, `"llll"`, `"nnnn"`, `"ffff"` nog net bruikbaar zijn; voor **plosieven** (`t,k,p,b,d`) en **korte klinkers** (`a,e,o,i,u`) is kale-letter-TTS didactisch fout (letternaam/sjwa). Tot er opnames zijn:
   - toon **"audio vereist"-modus**: schakel taken die losse klanken vereisen (LK.SOUND, SY/AN met losse klanken) tijdelijk uit en oefen alleen hele woorden/zinnen; of
   - modelleer de klank in een **opname** of, als noodgreep, in een **lettergreep** — maar nooit als definitieve aanpak, want "klank in lettergreep" introduceert co-articulatie en sjwa.
4. **Geen TTS voor gerekte/gehakte reeksen** (`blend.*`); die blijven opnames, anders hoort het kind een verkeerde segmentatie.
5. **Opnamelijst MVP (aan te leveren aan de native spreker, Standaardnederlands):**
   - Per grafeem (m,a,s,t,k,r): `lk.<g>.sound` (klank, geen letternaam), `lk.<g>.name` (letternaam, alleen ouderzone/liedje), `lk.<g>.example` (auditief voorbeeld).
   - 21 MVP-woorden (`de.<woord>.mp3`) + 21 gerekte/gehakte reeksen (`blend.<woord>.mp3`, bv. `k…a…m`).
   - Alle feedback-ID's uit GD §5 (`fb.correct.*`, `fb.try1.*`, `fb.hint.*`, `fb.model.*`, `fb.guess.1`, `fb.nav.*`, `fb.reward.1`, `fb.letterarrive.1`, `fb.help.parent.1`).
   - **Alle daadwerkelijk gebruikte instructiezinnen** (na normalisatie, EDU-009), inclusief de klankjager-vraag, de kandidatenreeks, de klimopdrachten per doelwoord en "Ik zeg het nog een keer.".
   - Eigen namen (Rik, Lies, Joep, Fem) en de 3 korte teksten (buiten MVP).
   Elke clip: 44,1 kHz mono, genormaliseerd, gelijk volume bij goed/fout (ED §9.1).

**EDU-022 – Minor – Placeholder-blendtekst heeft geen scheidingsteken voor opnames**
Bestand: `src/content/audioManifest.ts:20-25` (`join('-')`, "k-a-mmm"), `src/learning/util.ts:65-71` (`join(' … ')`).
Bevinding: Twee verschillende conventies (`bl.` in de manifest, `blend.` in `buildClipIndex`; `k-a-mmm` vs `k … a … m`). Voor de opname/QA moet er één canonieke tekst zijn.
Fix: één functie voor blendtekst, met expliciete pauzes en dezelfde key-conventie.

---

## E. Feedback (`src/content/feedback.ts`, `src/learning/answer.ts`, UI)

**EDU-012 – Minor – Feedbackteksten zijn positief/kort, maar de "overig"-teksten dekken niet alle fouten**
Bestand: `src/content/feedback.ts:16-28`; `src/learning/answer.ts:42-47`.
Bevinding: Geen "FOUT"/rood/zoemer (getest in `activity.test.ts`), correcte bevestiging en hint/modeling zijn aanwezig. Maar `fb.try1.6` ("Hoor je a of o?") en `fb.try1.7` (één of twee a) zijn gericht op `o`/`aa` die in de MVP **niet** aan bod komen; `fb.try1.5` (letternaam) wordt nooit getriggerd (EDU-006). De gebruikte generieke teksten kunnen de feitelijke fout beschrijven als iets anders dan werkelijk gebeurde.
Onderbouwing: ED §9.1–§9.3.
Fix: koppel de foutspecifieke teksten aan de daadwerkelijke afleider (EDU-006) en markeer niet-MVP-teksten als zodanig.

---

## F. Adaptief / mastery / Leitner (`src/core`)

**EDU-025 – Major – Mastery bereikt 1.0 na één correct item; de poort opent na één item**
Bestand: `src/core/Mastery.ts:93-95` (`alphaFor(0)=max(0.2, 1/1)=1`), `:177-184`, `src/core/Progression.ts:67-81`.
Bevinding: Met de letterlijke EWMA uit ED §10.2 wordt de eerste correcte eerste-poging meteen 1.0 (alpha = 1). Gemeten: na **één** correct item op `LK.m.SOUND` is `mastery = 1.0`. `canIntroduceNewGrapheme` toetst alleen `mastery ≥ 0.8`, dus de volgende letter mag al na één item worden geïntroduceerd. In de praktijk is de poort in sessie 1 geopend na de eerste van vier triviale items.
Fix: laat de poort niet op `mastery` alleen beslissen, maar op `isMastered(state, 12)` (mastery ≥ 0.8 **en** attempts ≥ 12 **en** consecutive_correct ≥ 4 **en** sessions_seen ≥ 2), en/of wijzig de EWMA-warmup start (bijv. `alphaFor(0)=0.2`) zodat de eerste items niet volledig doorwegen. Dit is de kern van "te snel doorschuiven".

**EDU-004 (vervolg) – Major – Eerste sessie: alleen items met één keuze, en die worden gescoord**
Bestand: `src/core/SessionPlanner.ts:113-147`, `src/core/SaveSystem.ts:66-79` (leeg profiel), `src/core/SessionPlanner.ts:95,150,185,203` (alles vereist `wordPool.length ≥ 2`).
Bevinding (gemeten, verse installatie): sessie 1 bestaat uit **stap 3 (4 items met elk 1 optie)** + **stap 8 (beloning)**. Stap 1 (warming-up) is uitgeschakeld omdat PH nog niet gemeesterd is; stap 2 en 4–6 vereisen ≥ 2 woorden en er is nog geen enkel woord. De vier "kies de letter/klank"-items hebben één knop en worden als correct-eerste-poging weggeschreven, wat rechtstreeks tot mastery 1.0 leidt.
Onderbouwing: ED §10.5 regel 1 (start op niveau A met 2 afleiders), P11, §10.3.
**Antwoord op de deelvraag "is één keuze didactisch verantwoord?": nee.** Een gedwongen enige keuze meet niets en vervuilt mastery, adaptive niveau, de Klankboom en het ouderdashboard. Beter:
1. Maak de allereerste kennismaking **ongescoord** (klank-ei/model: kind tikt Ploef, hoort de klank, geen mastery-event); of
2. Start met een **fase-1 auditieve taak** (FN.FIRST_SOUND met auditieve woorden zoals `maan`, `as` — toegestaan via ED §6.2 regel 8 / §5.3), zónder de eis dat er al decodeerbare woorden zijn. Pas daarna (ED §3: FN.FIRST_SOUND ≥ 0.8) de letter introduceren.
Los daarnaast de `≥ 2`-drempel op: met 1 woord (`mam`) zou stap 4/5 al kunnen draaien.

**EDU-007 – Major – Adaptieve regels uit ED §10.3 zijn niet aangesloten (dode code)**
Bestand: `src/core/Adaptive.ts:78-109` (`audioSupportFor`, `nextDifficulty`, `shouldSimplify`, `shouldStopForFrustration` — alleen in tests gebruikt), `src/core/GameState.ts:109-116` (telt `consecutiveModeled` maar gebruikt het nooit), `src/core/SessionPlanner.ts:41-48` (`difficultyForSkill` als enige, statische regel).
Bevinding: Frustratiestop (3× gemodelleerd), vereenvoudigen (< 0.5 na ≥ 6 items / 2× s ≤ 0.25), automatische extra audio bij lage mastery en `nextDifficulty` op accuracy/consecutiveCorrect zijn geïmplementeerd maar **niet bedraad**. In spel gedraagt het systeem zich dus niet adaptief conform ED §10.3; het niveau kan ook van A direct naar C springen (`difficultyForSkill`).
Onderbouwing: ED §10.3, GD §7.
Fix: pas de adaptieve functies toe bij/in de sessieplanning (bijv. volgende sessie op basis van `shouldStopForFrustration`/`nextDifficulty`) en gebruik `consecutiveModeled` daadwerkelijk; voeg integratietests toe.

**EDU-011 – Major – MVP-woorden met clusters worden als DE.CVC/AN.CVC gescoord; fase-5/6-doelen bestaan niet in de praktijk**
Bestand: `src/core/SessionPlanner.ts:156-164` (altijd `AN.CVC`), `:187-196` (`pattern==='VC' ? 'DE.VC' : 'DE.CVC'`), `src/games/Hakken.ts:8`, `src/games/WoordLezen.ts:9`, `src/content/words.ts:199-224`.
Bevinding: `kast` (CVCC), `stam/kras` (CCVC), `start` (CCVCC), `arm/ark` (VCC) worden geoefend en gescoord als `DE.CVC`/`AN.CVC`. `DE.CVVC`, `DE.CVCC`, `DE.CCVC`, `DE.CCVCC`, `AN.CLUSTER` en `SY.CLUSTER` worden nooit gegenereerd, terwijl ED §2.5/§3 fase 5–6 die doelen expliciet vereisen en de MVP-woordenlijst ze bevat. Gevolg: mastery per doel is onjuist (clusters opgeteld bij CVC) en opvolging/rapportage klopt niet.
Fix: leid `skillId` af uit het patroon (inclusief CVVC/CCVC/CVCC/CCVCC) en genereer clusters onder `AN.CLUSTER`/`SY.CLUSTER`; of beperk de MVP-woordenlijst tot de patronen die werkelijk gescoord worden. Kies één van beide en documenteer het.

**EDU-026 – Minor – Leitner/boxen en `sessionsSeen` zijn correct, maar de sessiemix is niet 60/25/15**
Bestand: `src/core/SpacedRepetition.ts:8-95` (intervallen en promotie/degradatie conform ED §10.4), `src/core/SessionPlanner.ts:33-39` (vaste aantallen i.p.v. mix).
Bevinding: `LEITNER_INTERVALS`, `promote`/`degrade` en de box-3-uitzondering volgen ED §10.4 correct. De planner hanteert echter vaste item-aantallen per sectie; de voorgestelde mix (~60% huidig doel, 25% herhaling, 15% voorbereidend) is niet gegarandeerd. Herhaling is bovendien beperkt tot `WordReading` of `LetterSound` (`:217-255`), dus due sight/sentence-items zouden verkeerd gemapt worden (buiten MVP niet actief).
Fix: mix expliciet toewijzen; maptabel per skilltype in de herhalingsstap.

**EDU-027 – Nit – Beloningen één vonkje per sessie i.p.v. per afgeronde leesstap**
Bestand: `src/ui/App.ts:153-158`; GD §6.1 ("één vonkje per afgeronde leesstap 3,4,5,6").
Fix: vonkje toekennen bij afronding van de betreffende secties.

**Positief (core):**
- `syncRewards` is deterministisch en niet-gokachtig (GD §6.1).
- `placeOptions`/`chooseCorrectIndex` vermijden 3× dezelfde positie.
- `updateSkillState` negeert gok-events en niet-terminale fouten correct (ED §10.2).
- `SaveSystem` normaliseert/migreert veilig; geen PII (zie ook de security-review).

---

## G. Ouderdashboard (`src/parent/ParentDashboard.ts`)

**EDU-023 – Minor – Reactietijd toont seconden onder het label "ms"**
Bestand: `src/parent/ParentDashboard.ts:143-146` (`seconds = (avg/1000).toFixed(1)`), `src/content/uiTexts.ts:86` (`'… {ms} ms'`).
Bevinding: Bij een gemiddelde van 3400 ms toont het dashboard "3,4 ms". Onjuiste eenheid is eenvoudig verkeerd te lezen voor ouders.
Fix: label aanpassen naar `{s} s` (of `{ms}` vullen met de ms-waarde). Voeg een test toe op de gerenderde tekst.

**EDU-028 – Minor – "Extra oefening"-kaart mengt categorieën; doorverwijzing bij aanhoudende moeite ontbreekt**
Bestand: `src/parent/ParentDashboard.ts:150-189`; `src/content/uiTexts.ts:53-57`.
Bevinding: Onder de kop "Klanken die extra oefening vragen" staan ook plakken, woorden, hintgebruik en verwarringen; `ui.parent.report.ongoing` (de zachte doorverwijzing uit ED §12.2, laatste bullet) wordt nooit getoond; `ui.parent.report.topic.longshort` en `ui.parent.wordsRead` ("{n} woorden gelezen" = aantal itemrecords, niet aantal woorden) zijn niet precies.
Positief: geen diagnose-/stoornistermen, geen percentielen/AVI/DMT, geen vergelijking met andere kinderen, geen rood (statuskleuren groen/amber/grijs, `styles.css:38-40,694-696`).
Fix: kaart splitsen per onderwerp, `ongoing` tonen bij aanhoudend zwakke doelen (ED §12.2), en de woorden-teller toelichten of hernoemen.

**EDU-029 – Minor – Status "Beheerst" na één item**
Bestand: `src/parent/ParentDashboard.ts:28-32`, in combinatie met EDU-025.
Bevinding: `statusFor` toont "Beheerst" zodra `mastery ≥ 0.8`, wat door de EWMA-warmup al na één correct item gebeurt. Voor ouders is dat een misleidende claim.
Fix: status baseren op de volledige beheersingsdefinitie (`isMastered`, ED §10.3), niet op mastery alleen.

---

## H. Originaliteit

**EDU-030 – Nit – Geen aanwijzingen voor overlap met commerciële methodes**
Bevinding: Wereld (Klankwoud/Ploef/klank-ei), gebiedsnamen en lettervolgorde (m→a→s→t→k→r) zijn eigen ontwerp en wijken af van VLL ("maan, roos, vis") en Lijn 3. De eigennamen Rik, Lies, Joep, Fem zijn generieke voornamen; ik heb geen methode-personage met deze combinatie kunnen vaststellen. `kernwoorden` van een methode (maan/roos/vis, kim/sim) komen niet als anker voor.
Aandachtspunt: ED §8.1 legt de eindcontrole bij de opdrachtgever; laat een tweede taalkundige/leerkracht (ED §13 regel 7) dit formeel bevestigen vóór release.

---

## I. Prioritering en eindoordeel

### Blockers (MVP niet acceptabel zonder deze)
| ID | Kern |
|---|---|
| EDU-001 | Audiosysteem is volledig stil; TTS-fallback wordt nooit bereikt (`AudioService.playElement` meldt succes bij laadfout). |
| EDU-002 | Blokkeerwoord **poep** wordt in de warming-up uitgesproken (Phonology); validator controleert PH-generators niet. |

### Major (didactisch onacceptabel; samen met Blockers oplossen)
| ID | Kern |
|---|---|
| EDU-003 | Hakken verraadt het antwoord; geen auditieve analyse. |
| EDU-004 | Eerste sessie: enige-keuze-items worden gescoord → mastery 1.0 na één tik; eerste letter vrijwel direct "beheerst". |
| EDU-025 | Poort opent na één correct item; `isMastered` (12 items/2 sessies) niet gebruikt → nieuwe letter elke sessie. |
| EDU-007 | Adaptieve regels ED §10.3 (frustratiestop, vereenvoudigen, extra audio) zijn dode code. |
| EDU-005 | Klankjager speelt kandidaten niet af; touch kan voorbeeld en keuze laten samenvallen. |
| EDU-009 | Instructie-key's/manifest divergeren; opnamelijst incompleet. |
| EDU-010 | Fase 1 (PH) onbereikbaar; sessie begint bij letters i.p.v. klanken. |
| EDU-011 | Cluster-/langeklinkerwoorden worden als DE.CVC/AN.CVC gescoord; fase-5/6-doelen ontbreken. |
| EDU-006 | Foutspecifieke feedback niet geïmplementeerd; generieke tekst kan onwaar zijn. |
| EDU-013 | Rijmgroepen bevatten niet-rijm en niet-bestaande woorden (`appelap`). |
| EDU-014 | Afleiders verschillen in lengte → lengte verraadt het antwoord (ED §11 regel 6). |
| EDU-020 | Validator dekt gegenereerde auditieve content (PH) en afleiders niet af. |
| EDU-026 | Sessiemix 60/25/15 niet gerealiseerd (Minor in de lijst hierboven, maar raakt adaptiviteit). |

### Minors/Nits
EDU-005 (instructie klank→letter), EDU-012, EDU-015, EDU-016, EDU-017, EDU-018, EDU-019, EDU-021, EDU-022, EDU-023, EDU-024, EDU-027, EDU-028, EDU-029, EDU-030.

### Eindoordeel
**De MVP is didactisch nog niet acceptabel.** De fundamenten (klankzuivere, correct gesegmenteerde grafemen en woorden, blokkeerlijst, Leitner-intervallen, feedback zonder straf, plaatje-pas-na-lezen) zijn goed. Maar de combinatie van (1) een stille audio-laag waardoor vrijwel alle auditieve leerhandelingen wegvallen, (2) gescoorde enige-keuze-introducties en een poort die na één item opent, en (3) een hak-taak die het antwoord toont, betekent dat de kern van aanvankelijk lezen (P4–P7) nu niet wordt geoefend of gemeten. Na het oplossen van de twee Blockers en de Majors — in het bijzonder EDU-001, EDU-002, EDU-004/EDU-025, EDU-003, EDU-007, EDU-013/EDU-020 en EDU-014 — is de MVP didactisch wél verantwoord en sluit hij aan op ED §2–§11. Voeg daarnaast de opnamelijst uit §D en de foutspecifieke feedback (EDU-006) toe vóór een echte release, en laat de woordlijsten door een tweede taalkundige/leerkracht reviewen (ED §13 regel 7).

### Verificatie (reproduceerbaar)
- `npm test` → 99/99 groen; `npm run validate` → 0 fouten, 781 audio-waarschuwingen.
- `edu-tmp/audio-probe.ts` → TTS wordt niet bereikt bij ontbrekende bestanden.
- `edu-tmp/phon-probe.ts` → 400 seeds: `poep` 980×; `appelap`/`lis`/`kaam`/`aam` in de pool.
- `edu-tmp/plan-probe.ts` → verse sessie 1 = 4 items met 1 optie + beloning; mastery 1.000 na 4 items.
- `edu-tmp/gen-probe.ts` → geen niet-geleerde grafeem in decodeeropties; wel latente dubbele-juist bij twee gelijke beginwoorden.
- `edu-tmp/guessability-probe.ts` → niveau A-afleiders met afwijkende lengte (`kam` ↔ `start`).
