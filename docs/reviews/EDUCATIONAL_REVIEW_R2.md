# LEESAVONTUUR – Educational Review, ronde 2

| | |
|---|---|
| Rol | Educational Reviewer (Nederlandse leesdidactiek, aanvankelijk lezen, groep 2–3) |
| Toetsingskader | `docs/EDUCATIONAL_DESIGN.md` (ED, leidend), `docs/GAME_DESIGN.md` (GD), `docs/ARCHITECTURE.md` (ARCH) |
| Datum | 2026-10-01 |
| Repo | `C:\Users\Jan\VM Scan\leesavontuur`, git `main` @ `41985f5` |
| Bereik | Verificatie ronde 1 (EDU-001…EDU-030) + hertoets content, audio, feedback, activiteiten, progressie, ouderdashboard, opnamelijst |
| Methode | Codelezing + `npm test` (190 groen) + `npm run validate` (0 fouten, 943 waarschuwingen) + `npm run typecheck` (schoon) + ad-hoc probes in `C:\Users\Jan\VM Scan\edu-tmp` (buiten de repo) |
| Wijzigingen | **Geen broncode gewijzigd, geen commits.** Alleen dit bestand. |

---

## Samenvatting

De ronde-1-respons is omvangrijk en grotendeels raak: de twee Blockers (EDU-001 audio-detectie, EDU-002 `poep`) en vrijwel alle Majors zijn aantoonbaar opgelost. De audio-fallback wordt nu echt bereikt, de phonologie-bank is schoon en wordt door de validator bewaakt, de eerste sessie begint met echte auditieve fase-1-oefening in plaats van gescoorde enige-keuze-items, de poort opent pas na `isMastered` (≥ 12 items, ≥ 2 sessies, ≥ 4 op rij), foutspecifieke feedback is geïmplementeerd, lengte-verraad bij afleiders is gedicht, en de doelclassificatie (`DE.CVVC/CCVC/CVCC/CCVCC`, `AN/SY.CLUSTER`) klopt.

**Maar de strengere poort (EDU-025) heeft een nieuwe, harde Blocker geïntroduceerd: na de introductie van de allereerste letter wordt de letter nooit meer gescoord, waardoor de poort naar de tweede letter nooit opent. De normale (niet-vrije) voortgang loopt daarmee vast op één letter.** Daarnaast is er een nieuwe Major in de audio-/opnamelaag: dynamische instructiezinnen (`{sound}`, `{word}`) worden niet per variabele opgenomen; alle klankjager-, rijm-, lettergreep- en klank→letter-prompts delen één generieke clip met een letterlijke placeholder in de opnamelijst.

Netto: **de MVP is didactisch nog niet acceptabel** (Blocker), maar de weg ernaartoe is kort: één plannerfix + een correcte opnamelijst/opnames. Zie de sign-off onderaan.

---

## Nieuwe bevindingen

### EDU-R2-001 – **Blocker** – Na introductie van de eerste letter komt er nooit meer LK-praktijk; progressie loopt vast op één letter

Bestand: `src/core/SessionPlanner.ts:127`, `:183`, `:210-238`, `:354-377`; `src/core/Progression.ts:81-87`; `src/core/Mastery.ts:223-231`

Bevinding: In de sessie waarin de poort opent wordt de eerste letter (`m`) geïntroduceerd. Omdat `learned` op dat moment leeg is, is `hasDistractorGrapheme(learned, next.id)` (`SessionPlanner.ts:210`) onwaar en bevat sectie 3 **alleen het ongescoorde introductie-item**; er worden geen `LK.m.*`-items gegenereerd. In de volgende sessies is `canIntroduceNewGrapheme` onwaar (want `LK.m.SOUND` is niet gemeesterd) en de herhaling/zwakke-grafeem-fallback in stap 7 (`:355-376`) slaat de letter over omdat er geen tweede vrijgegeven grafeem als afleider bestaat (`hasDistractorGrapheme(learned, id)` is onwaar). Gevolg: `LK.m.SOUND` krijgt **nul** meetellende items, `isMastered` wordt nooit waar, en de tweede letter (`a`) komt nooit vrij. Alleen wanneer de letterlijst kunstmatig op `['m','a']` staat, verschijnt er wél `LK`-praktijk.

Onderbouwing: `edu-tmp/r2-progress-probe.ts` (nieuw):
```
sections intro-sessie: 1:Klankwarming-up(3) | 2:Klankoefening(3) | 3:Nieuwe letter/klank(1) | 8:Beloning(1)
LK-items in intro-sessie: 1  (alleen de ongescoorde intro)
unlocked na introductie: m
sessie 2..6: LK-totaal=0  LK.m=0  gate=false  next=a   (identiek voor elke sessie)
controle unlocked=[m,a]: LK-items: LK.m.SOUND:m, LK.a.SOUND:a
```
Dit raakt ED §3 ("nieuw grafeem pas na beheersing") en P4/P5: de beheersing kan per constructie niet worden bereikt. In vrije modus (`App.ts:275` `freeProfile` geeft alle grafemen vrij) treedt het probleem niet op, maar het is juist de begeleide leerroute die vastloopt.

Fix: doorbreek de kip-ei-situatie, bijvoorbeeld (a) introduceer de eerste twee letters als paar (`next.order <= 2`) en genereer de introductie-sessie met beide; of (b) sta in de introductie-/herhalingssessie voor de eerste letter een `LK`-taak toe tegen een auditief aangeboden afleider uit de volledige inventaris (gemarkeerd, ED §6.2 regel 8), of (c) introduceer een vaste startset (m,a,s,t) ongescoord en start de gescoorde LK-oefening meteen met ≥ 2 letters. Voeg een regressietest toe die vanuit een vers profiel de volledige route simuleert en eist dat de tweede letter binnen een redelijk aantal sessies vrijkomt.

### EDU-R2-002 – **Major** – Dynamische instructies worden niet per variabele opgenomen; opnamelijst bevat één generieke clip met een letterlijke placeholder

Bestand: `src/learning/util.ts:47-49` (`instructionClip`), `src/content/instructions.ts:15-24,40-41`, `src/content/audioManifest.ts:72-74`, `src/learning/FirstSound.ts:115`, `src/learning/Phonology.ts:49,99`, `src/learning/LetterSound.ts:78`, `docs/RECORDINGS.md:354,355,362,363`

Bevinding: `instructionClip(key, text)` gebruikt altijd `src = audio/feedback/<key>.mp3`, ongeacht de ingevulde variabelen. De manifest maakt per `INSTRUCTIONS`-key één clip. Daardoor delen álle klankjager-items (`instr.fn.first_sound`, `instr.fn.last_sound`), álle rijm-/klapopdrachten (`instr.ph.rhyme`, `instr.ph.syllable`) en álle klank→letter-opdrachten (`instr.lk.sound_to_grapheme`) hetzelfde audiobestand, terwijl de ingesproken tekst per item hoort te verschillen (`{sound}`/`{word}`). Alleen de TTS-fallback vult de variabelen runtime in; een echte opname kan dat niet. De opnamelijst instrueert de inspreker dan ook letterlijk om "Welk woord begint met {sound}?" op te nemen.

Onderbouwing: `edu-tmp/r2-audio-key-probe.ts` (nieuw):
```
PH.RHYME:      prompt="Wat rijmt op raam?"        key=instr.ph.rhyme  manifest=Wat rijmt op {word}?
PH.SYLLABLE:   prompt="Hoeveel klappen hoor je in soep?" key=instr.ph.syllable manifest=Hoeveel klappen hoor je in {word}?
LK sound→letter: prompt="Welke letter hoort bij mmm?" key=instr.lk.sound_to_grapheme manifest=Welke letter hoort bij {sound}?
```
Dit is een gedeeltelijke terugkeer van EDU-009: de sleutels zijn genormaliseerd en `instr.klim.<woord>` wordt wél per doelwoord gegenereerd, maar de klank-/woord-variabele prompts niet. Met echte opnames hoort het kind dus een verkeerde/generieke vraag.

Fix: genereer per variabele een eigen clip (bv. `instr.fn.first_sound.m`, `instr.ph.rhyme.raam`, `instr.lk.sound_to_grapheme.m`), of bouw de prompt in de app op uit losse opnames (instructie-patroon + `lk.<g>.sound`-clip / `de.<woord>`-clip). Laat de validator eisen dat elke door code gebruikte, variabele instructie-key ook werkelijk per variabele in de manifest bestaat.

### EDU-R2-003 – Minor – Uitspraakaanwijzing in `RECORDINGS.md` is fout voor niet-continuanten; "te spreken tekst" is de TTS-hint

Bestand: `scripts/recording-list.ts:37-38`, `docs/RECORDINGS.md:306,312,324,338` (losse klanken `a-`, `d-`, `k-`, `t-` e.d.)

Bevinding: `pronunciationHint` zegt voor **elke** `grapheme-sound` "Houd continuanten aan (<tekst>)". Voor plosieven (`t,k,p,b,d`) en korte klinkers (`a,e,i,o,u`) is dat onjuist: dat zijn geen continuanten. Tegelijk is de "Te spreken tekst" de TTS-benadering (`a-`, `k-`, `t-`) en niet een opname-aanwijzing; de kolom is daarmee dubbelzinnig voor de inspreker.

Onderbouwing: `docs/RECORDINGS.md:324` → `lk.k.sound` = "k-", aanwijzing "KLANK … Houd continuanten aan (k-). Grafeem "k" (plosive)". De aanwijzing spreekt zichzelf tegen (plosive vs. continuant).

Fix: baseer de aanwijzing op `grapheme.type` (continuant: "houd aan"; plosief: "korte, stemloze plof, geen uh"; korte klinker: "korte klank als in …", nooit de letternaam) en vul "Te spreken tekst" met een echte opnamenotatie i.p.v. `ttsHint`.

### EDU-R2-004 – Minor – Foutspecifieke plak-feedback levert een kapotte zin op (`{sounds}` leeg)

Bestand: `src/learning/answer.ts:148-151`, `src/content/feedback.ts:48`

Bevinding: Voor `kind === 'plakken'` wordt altijd `fb.specific.blend_retry` gekozen met `vars: { word, sounds: '' }`. De tekst wordt daardoor "Luister nog eens: . Kun jij ze samenplakken?" — grammaticaal kapot en zonder de bedoelde klankreeks.

Onderbouwing: `fb.specific.blend_retry` = "Luister nog eens: {sounds}. Kun jij ze samenplakken?" met `sounds=''`.

Fix: vul `sounds` met de gerekte reeks van het doelwoord (uit `metadata.sequence`) of gebruik een tekstvariant zonder `{sounds}`.

### EDU-R2-005 – Minor – Verkeerde foutspecifieke feedback bij hakken (telmismatch krijgt leesrichting-uitleg)

Bestand: `src/learning/Segmenting.ts:76-81`, `src/learning/answer.ts:148-162`, `src/content/feedback.ts:19`

Bevinding: De hak-taak in de planner is een **auditieve tel-/kiesopdracht** (`AN.CVC`, opties = aantal klanken). Bij een fout antwoord valt de checker terug op `feedback.try1 = 'fb.try1.4'` ("We lezen van links naar rechts. Begin hier."). Dat is bij een tel-fout onwaar en verwarrend (ED §9.3: feedback moet kloppen).

Fix: geef `Segmenting` een eigen foutspecifieke tekst ("Luister nog eens naar elke klank; hoeveel hoor je er?") en zet `try1` daarop; koppel desnoods een `kind: 'hakken'`-tak in `specificFeedback`.

### EDU-R2-006 – Minor – Instructiezinnen van hakken/plakken worden niet uitgesproken; vereiste keys ongebruikt; `instr.lk.intro` ontbreekt

Bestand: `src/core/SessionPlanner.ts:188-207` (`instr.lk.intro`), `src/learning/Segmenting.ts:66`, `src/learning/Blending.ts:50`, `src/content/instructions.ts:26-33,57-71`, `src/content/validator.ts:563-586`

Bevinding: Hakken speelt als prompt alleen het hele woord (`wordClip`) af, plakken alleen de gerekte reeks; de vraag ("Hoeveel klanken hoor je?", "Plak de klanken aan elkaar") wordt niet gesproken, terwijl `instr.hakken.start/count` en `instr.plakken.r1` als *vereiste* keys in de validatorlijst staan. Verder gebruikt de planner `instr.lk.intro` dat in `INSTRUCTIONS` en de manifest niet voorkomt en niet in `REQUIRED_INSTRUCTION_KEYS` staat; de validator ziet dit dus niet.

Fix: speel een echte instructieclip vóór de stimulus (of sequentie instructie→stimulus), en maak de validator-key-check sluitend (elke in code gebruikte `instr.*` moet bestaan en in de manifest staan), of verwijder dode keys.

### EDU-R2-007 – Minor – De "gemarkeerde TTS-benadering" (`approximate`) wordt nergens in de UI getoond

Bestand: `src/audio/AudioService.ts:20-30,324-326`, `src/ui/components/ActivityView.ts:50,114-120`, `src/content/uiTexts.ts:100-103`

Bevinding: `PlayResult.approximate` is `true` voor TTS van losse klanken/gerekte reeksen (EDU-010 eist een zichtbare markering "Tijdelijk computerstem"), maar de UI gebruikt alleen `result === 'unavailable'`. Er is geen kindvriendelijke of oudermarkering dat losse klanken tijdelijk via TTS klinken; de ouderzone meldt alleen "geen stem gevonden".

Fix: toon bij `approximate` een rustige, niet-diagnostische markering (ouderzone/instelling) en geef de voorwaarde "echte opnames" expliciet weer.

---

## Status van ronde 1

Legenda: **O** = opgelost, **D** = deels, **X** = open.

| ID | R1 | Status R2 | Bewijs / restpunt |
|---|---|---|---|
| EDU-001 | Blocker | **O** | `AudioService.ts:260-311`; `playElement` resolvet `false` bij `error`/reject/timeout → `runClip` valt door naar `speak()`. Probe: `play() rejects → ttsSpoke=1`. (Randgeval: als `play()` resolveert vóór een late `error`, wordt het als succes gezien; primaire faalmodus is gedekt.) |
| EDU-002 | Blocker | **O** | `content/phonology.ts` (geen `poep`), validator `:335-372`, `assertItemsAllowed` `:127-160`; probe: 0 geblokkeerde woorden in PH. |
| EDU-003 | Major | **O** | `Segmenting.ts:51-89` toont alleen aantallen; geen gesegmenteerde optie meer. (De GD §4c "tik-in-volgorde" is als `responseMode:'count'` uitgevoerd; didactisch verantwoord als "klanken tellen", ED §4.1.) |
| EDU-004 | Major | **O** | `SessionPlanner.ts:183-242,382-404`; intro ongescoord, min. 4 gescoorde items; plan-probe vers profiel = 6 items met 2–3 opties. |
| EDU-005 | Major | **O** | `ActivityView.ts:259,267-296` + `OptionGrid.ts:94-113`: kandidaten eerst afspelen, aparte oor-knop. |
| EDU-006 | Major | **O** | `answer.ts:62-200` + `feedback.ts:42-49`; restpunt = EDU-R2-004. |
| EDU-007 | Major | **O** | `SessionPlanner.ts:559-597` bedraadt `shouldSimplify/nextDifficulty/audioSupportFor/shouldStopForFrustration`; re-queue van gemodelleerde items. |
| EDU-009 | Major | **D** | Sleutels genormaliseerd, `instr.klim.<woord>` per woord toegevoegd, validator bewaakt vereiste keys. Restpunt: dynamische `{sound}`/`{word}`-prompts niet per variabele (EDU-R2-002); dode keys + ontbrekende `instr.lk.intro` (EDU-R2-006). |
| EDU-010 | Major | **O** | Fase 1 auditief aanwezig (stap 1/2), TTS als gemarkeerde benadering. Restpunt: markering niet in UI (EDU-R2-007). |
| EDU-011 | Major | **O** | `content/skills.ts:60-98` + `learning/skills.ts`; tests dekken `DE.VC/CVC/CVVC/CCVC/CVCC/CCVCC` en `AN/SY.CLUSTER`. |
| EDU-012 | Minor | **D** | `fb.specific.*` wordt geselecteerd; `try1.6/7` blijven onbereikbaar en bij hakken klopt de tekst niet (EDU-R2-005). |
| EDU-013 | Major | **O** | Rijmgroepen exact rijmend, bestaande woorden; `appelap/lis/kaam/aam` weg; tests + validator `PHONOLOGY_RHYME_MISMATCH`. |
| EDU-014 | Major | **O** | `util.ts:197-219` harde gelijk-lengte-filter; guessability-probe: alle opties even lang. |
| EDU-015 | Minor | **O** | Volgt uit EDU-014; positie voldoende gerandomiseerd. |
| EDU-016 | Minor | **D** | `words.ts:44,54,55` markeert `mak/smak/mars` als `kidFriendly:false`, maar die vlag filtert generatoren **niet** (`allowedWordObjects` negeert het); ED §6.5-`Kv`-kolom nog niet herzien. |
| EDU-017 | Minor | **D** | `graphemes.ts:34-59` voegt `ttsHint` toe; `soundHint` blijft de kale letter. TTS van korte klinkers/plosieven blijft risicovol (`a-`, `k-` ≈ letternaam); opname-aanwijzing fout (EDU-R2-003). |
| EDU-018 | Minor | **O** | `types.ts:91-104`: `WordPattern` bevat nu `'V','CV','VCC','VVC',…`. |
| EDU-019 | Nit | **O** | `sightWords.ts:31-36`: `SW.de/een/het` → `requiresBlock: 7`, conform ED §7.1. |
| EDU-020 | Major | **O** | Phonologie verhuisd naar `content/`; validator + `assertItemsAllowed`; `generator-sweep.test.ts` 300 seeds × 3 sets (incl. PH). |
| EDU-021 | Minor | **O** | `Segmenting.ts:39-43,92-93`: `secondarySkillFor` koppelt FN.COUNT ↔ AN.CVC. |
| EDU-022 | Minor | **O** | `audioManifest.ts:21-26` + `learning/util.ts:64-71`: één canonieke `blend.<woord>` / `k … a … mmm`. |
| EDU-023 | Minor | **O** | `ParentDashboard.ts:169-171` + `uiTexts.ts:92`: `{s} s`. |
| EDU-024 | Minor | **D** | `ActivityView.ts:424-431`: `repeat()` speelt nu de prompt (heel woord), niet de gerekte reeks; maar er is geen echte hak-instructie-audio (EDU-R2-006). |
| EDU-025 | Major | **O** *met regressie* | `Progression.ts:81-87` + `Mastery.ts:223-231`: poort pas bij `isMastered` (12 items/2 sessies/4 op rij); probe bevestigt gesloten poort na 4 items. **Regressie = EDU-R2-001.** |
| EDU-026 | Minor | **X** | `SessionPlanner.ts:69-78`: vaste aantallen, geen 60/25/15-mix (ED §10.3). |
| EDU-027 | Nit | **X** | `GameState.ts:141-155`: één vonkje per sessie i.p.v. per afgeronde leesstap 3–6 (GD §6.1). |
| EDU-028 | Minor | **D** | `ParentDashboard.ts:176-215`: de kaart "Klanken die extra oefening vragen" mengt nog klank/plakken/hint/verwarringen; `ui.parent.report.ongoing` wordt nergens gebruikt; `wordsRead` (`:146-147`) telt itemrecords. |
| EDU-029 | Minor | **O** | `ParentDashboard.ts:44-46` via `Progression.skillStatus`/`isMastered`. |
| EDU-030 | Nit | **X** | Originaliteit onveranderd; externe tweede review blijft voorwaarde (ED §13 regel 7). |

**Tussenstand:** 20 opgelost, 8 deels, 3 open. Ronde-1 Blockers en Majors zijn op één na gedicht; de resterende Majors zijn EDU-009/EDU-012 (deels) plus de nieuwe EDU-R2-002.

---

## Hertóets per thema (vraag 2–5)

### Content (`src/content/**`)
- **Rijm/lettergrepen:** `content/phonology.ts:25-45` bevat uitsluitend exact rijmende, bestaande, kindbekende woorden (`kat/mat/rat`, `vis/mis`, `tas/kas`, `ring/kring`, …). `maan/kan` is correct geschrapt (/aː/ ≠ /ɑ/). `SYLLABLE_WORDS` (1–3 lettergrepen) is correct. Geen blokkeerwoorden. ✔
- **Echte woorden / geen `appelap`:** validator `PHONOLOGY_WORD_UNKNOWN` + `PHONOLOGY_KNOWN_WORDS`; tests dekken `appelap/lis/kaam/aam/poep`. ✔
- **`SOUND_HINTS` vs letternaam/sjwa:** continuanten (`mmm`,`sss`,`rrr`,…) zijn goed; korte klinkers/plosieven gebruiken `ttsHint` (`a-`,`k-`) maar de canonieke `soundHint` blijft de kale letter en de TTS is een gemarkeerde benadering — didactisch nog niet waterdicht (EDU-017, EDU-R2-003). **D**
- **Foutspecifieke feedback:** geïmplementeerd en waar voor eerste/laatste/klinker/omkering/letterverwarring; plak- en hak-takken hebben restfouten (EDU-R2-004/005). **D**
- **Instructies:** correct, natuurlijk, leeftijdsadequaat, maar dynamische prompts niet per variabele opgenomen (EDU-R2-002) en de hak-/plakinstructie wordt niet gesproken (EDU-R2-006). **D**

### Raden zonder decoderen
- **Hakken:** `responseMode:'count'`, geen geschreven woord, geen plaatje; opties zijn aantallen — niet te raden. Let op de no-audio-fallback (`ActivityView.ts:142-152`) die de woordletters toont; in die gedegradeerde modus is het aantal af te lezen. **O met kanttekening**.
- **Plakken/Woordlezen/Klimboom:** afleiders geforceerd even lang (`util.ts:205`); geen plaatje vóór het antwoord; plaatje pas in `markCorrectOption` (`ActivityView.ts:358-368`). Guessability-probe bevestigt gelijke lengtes. **O**.
- **Klankjager:** kandidaten worden vóór de keuze afgespeeld, aparte oor-knop, geen labels; geen contextverhaal. **O**.
- **Letter-introductie:** `LetterIntro.ts:50-52` toont losse knoppen voor letternaam, klank en voorbeeldwoord; de instructie gebruikt de klank — letternaam en klank zijn onderscheiden. **O**.

### Progressie
- **Nieuwe letter pas na beheersing:** ja, via `isMastered` (oodeel), maar de uitvoering blokkeert de eerste letter (EDU-R2-001). **Blocker**.
- **Tempo:** de poort (≥12 items, ≥2 sessies, ≥4 op rij) is didactisch verantwoord (niet te snel). Een nieuw gemeesterde letter vraagt in stap 3 4 items (2× RECOGNIZE + 2× SOUND) en daarna ≤2 `LK.*.SOUND`-items per sessie via de zwakke-grafeem-/Leitner-herhaling (`:354-377`), dus ruwweg 3–6 sessies per letter: aan de trage kant, maar werkbaar. Zonder de deadlock opgelost, is tempo niet te beoordelen.
- **Fase 1 auditief:** aanwezig (stap 1 rijm/klappen + stap 2 eerste/laatste klank, auditief; `SessionPlanner.ts:141-180`). **O**.
- **Skill-classificatie DE.CVC vs DE.CVVC/CCVC:** correct (`content/skills.ts`; tests: `kaas→CVVC`, `stam→CCVC`, `kast→CVCC`, `start→CCVCC`). **O**.

### Ouderdashboard
- Geen diagnose-/stoornis-/percentieltaal; neutrale kleuren; "Beheerst" alleen via `isMastered`. **O**.
- Reactietijd-eenheid correct (`{s} s`). **O**.
- Restpunten: gemengde "extra oefening"-kaart, ongebruikte `ongoing`-doorverwijzing, onduidelijke `wordsRead`-teller (EDU-028). **D/Open**.

### Audio-fallback en opnamelijst
- **TTS-benadering van losse klanken:** technisch aanwezig en als `approximate` gemarkeerd in de service, maar (a) de markering wordt niet in de UI getoond (EDU-R2-007) en (b) TTS van korte klinkers/plosieven blijft onbetrouwbaar (letter­naam/sjwa). Als **tijdelijke** oplossing alléén aanvaardbaar voor hele woorden/instructies; voor losse klanken onvoldoende (ED §13.1). **D**.
- **`docs/RECORDINGS.md` als opnamelijst:** de structuur (647 clips, pad/sleutel/tekst/aanwijzing per clip, per type) is bruikbaar en de gerekte reeksen zijn correct genoteerd (`k … a … mmm`). Maar de lijst is **niet volledig/correct**: dynamische prompts ontbreken per variabele (EDU-R2-002) en de losse-klank-aanwijzing is fout voor niet-continuanten (EDU-R2-003). **D**.

---

## Educational sign-off

**Oordeel: NIET AKKOORD voor de MVP.**

Het didactisch fundament is in ronde 2 duidelijk verbeterd en de ronde-1 Blockers/Majors zijn grotendeels gedicht, maar de begeleide leerroute is door EDU-R2-001 **onbruikbaar** (na de eerste letter stopt de voortgang), en de opnamelaag is nog niet leverbaar (EDU-R2-002/003). Zonder die twee is het leerdoel (klanktekenkoppeling, hakken, plakken, decoderen) niet haalbaar of niet correct ondersteund.

**Voorwaarden om naar "Akkoord met voorwaarden" te gaan:**
1. **Blocker** EDU-R2-001 opgelost, met een regressietest die de volledige route vanaf een vers profiel doorloopt en aantoont dat de volgende letter vrijkomt.
2. **Major** EDU-R2-002 opgelost: dynamische instructies per variabele opgenomen of in de app samengesteld; de opnamelijst bevat geen letterlijke `{placeholder}`-teksten meer.
3. **Echte audio-opnames vóór gebruik met kinderen**: losse klanken, gerekte reeksen en foutspecifieke feedback zijn opnames van een native Standaardnederlandse spreker (ED §13.1). TTS blijft uitsluitend een gemarkeerde ontwikkel-fallback voor hele woorden/instructies, met zichtbare markering (EDU-R2-007).
4. **Vakinhoudelijke review van de woordenlijsten** (MVP + rijm-/lettergreepbank) door een tweede taalkundige/leerkracht (ED §13 regel 7, EDU-030), inclusief de `Kv`-kolom van ED §6.5 (EDU-016).
5. Minors EDU-R2-003 t/m 007, EDU-026, EDU-028 en EDU-027 opgelost of expliciet als bekende beperking geaccepteerd.

---

## Verificatie (reproduceerbaar)

- `npm test` → **190/190 groen** (23 testfiles).
- `npm run validate` → **0 fouten**, 943 waarschuwingen (940× ontbrekende audio-assets – verwacht zonder opnames; 3× `NOT_KID_FRIENDLY` voor `mak/smak/mars`).
- `npm run typecheck` → schoon.
- `edu-tmp/audio-probe.ts` → bij `play()`-reject wordt TTS bereikt (`ttsSpoke=1`).
- `edu-tmp/phon-probe.ts` → geen geblokkeerde woorden in PH; alleen gecureerde woorden.
- `edu-tmp/plan-probe.ts` → vers profiel: klankwarming-up + klankoefening + beloning; poort dicht na 4 items.
- `edu-tmp/guessability-probe.ts` → alle afleiders even lang als het doel.
- **`edu-tmp/r2-progress-probe.ts`** (nieuw) → **progressie-deadlock na de eerste letter** (EDU-R2-001).
- **`edu-tmp/r2-audio-key-probe.ts`** (nieuw) → dynamische prompts delen één clip met letterlijke `{sound}`/`{word}`-placeholder (EDU-R2-002).
