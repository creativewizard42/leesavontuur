# QA / Usability Review — LEESAVONTUUR (Ronde 2)

| | |
|---|---|
| Rol | QA / Usability Tester (onafhankelijk) |
| Datum | 2026-10-02 |
| Repo | `C:\Users\Jan\VM Scan\leesavontuur` (git `main`, commit `41985f5`) |
| Scope | `src/`, `scripts/`, `docs/`, build-config |
| Wijzigingen | Alleen dit rapport. Geen broncode, geen commits. Tijdelijke tests buiten de repo in `C:\Users\Jan\VM Scan\qa-tmp`. |
| Ronde 1 | `docs/reviews/QA_REPORT.md` (commit `b41c542`) |

---

## 1. Samenvatting

Ronde 1 leverde **2 Blockers, 11 Majors, 9 Minors, 3 Nits**. De F3-inhaalslag heeft vrijwel al deze punten technisch opgelost: de engine is herbouwd met een **adaptieve, hervatbare `SessionQueue`** (`src/core/SessionPlanner.ts`), audio rapporteert nu correct (`error → unavailable → TTS/visuele fallback`, `src/audio/AudioService.ts`), `saveProfile` gooit nooit meer (`src/core/SaveSystem.ts`), sessie-afronding is idempotent (`completeSession`, `lastCompletedSessionId`), focus wordt gezet (`focusFirstInteractive`), de pauzedialoog heeft een focus-trap, instellingen bestaan, en de CSP wordt alleen in de build geïnjecteerd.

De testsuite groeide van **99 → 190 tests** (13 → 23 bestanden), strict typecheck, `validate` en `build`/`check:dist` zijn groen, `npm audit` is schoon.

**Maar**: de F3-fix heeft de oude progressiedeadlock (QA-003) vervangen door een **harde, nog vroegere deadlock**. Simulatie met een vers profiel en *uitsluitend perfecte antwoorden* over **60 sessies** levert op:

- S1–S5: alleen klankwarming-up + klankoefening (foneembewustzijn), **geen enkele letter**.
- S6: letter `m` wordt **ongescoord** geïntroduceerd.
- S7–S60: `LK.m.SOUND` krijgt **0 gescoorde items, 0 pogingen, mastery 0,00** — nooit meer.
- De tweede letter `a` komt **nooit** vrij (`canIntroduceNewGrapheme` = false), dus ook **geen enkel woord** (`wordPool` blijft 0), dus hakken/plakken/woordlezen/Klimboom komen **nooit** aan bod. MVP `m→a→s→t→k→r` is onbereikbaar (niet "te traag", maar onmogelijk).

Dit is een **Blocker**: de speelbare verticale slice strandt na sessie 6 definitief voor elk vers kind.

**Ernstverdeling ronde 2:** 1 Blocker, 2 Major, 3 Minor, 3 Nit.

---

## 2. Draaiboek resultaten (opdracht 1)

| Commando | Resultaat |
|---|---|
| `npm run typecheck` | ✅ `tsc --noEmit`, 0 fouten (strict). |
| `npm test` | ✅ 23 testbestanden, **190 tests** geslaagd (~17 s). |
| `npm run validate` | ✅ `Content validatie OK (943 waarschuwingen, geen fouten)`. 940× `AUDIO_ASSET_MISSING`, **3× `NOT_KID_FRIENDLY`** (`mak`, `smak`, `mars`). |
| `npm run build` | ✅ `tsc --noEmit && vite build`; 58 modules; `dist/assets/index-*.css` 19,4 kB, JS 109,4 kB (+18 fonts). |
| `npm run check:dist` | ✅ `CSP-meta aanwezig, geen externe URL's, OFL-licenties meegeleverd`. |
| `npm audit` | ✅ `found 0 vulnerabilities`. |

`dist/` is gitignored; `git status` toonde vóór het schrijven van dit rapport alleen de parallelle `*_R2.md`-bestanden.

---

## 3. Verificatie ronde-1-issues (opdracht 2)

Status: **Opgelost** / **Deels** / **Open**, met bewijs.

| ID | Ernst R1 | Status | Bewijs |
|---|---|---|---|
| QA-001 | Blocker | **Opgelost** | `AudioService.playElement` lost nu `false` op bij `error`/reject/timeout (`src/audio/AudioService.ts:287-311`); `runClip` valt dan door naar TTS (`:324-334`); `grapheme-sound/name/example` staan in `DEFAULT_TTS_KINDS` (`:104-113`); `onFallback` aangesloten (`src/ui/App.ts:70-76`, `:118-121`). Echte opnames ontbreken nog (940 warnings) maar het spel crasht niet en de fallback vuurt. |
| QA-002 | Blocker | **Deels** | `ActivityView` toont `[data-audio-fallback]` met icoon + gesegmenteerde letters (`src/ui/components/ActivityView.ts:132-152`); jsdom-sim (e) bevestigt de fallback. Maar de fallback-tekst is geschreven NL (`ui.audio.unavailable*`) en bij audio-only opties (klankjager/plakken/klimboom/rijmpoort) blijven de keuzeknoppen ongelabelde speakers, dus zonder stem nog steeds lastig voor een niet-lezer. |
| QA-003 | Blocker | **Opgelost** | `SessionPlanner` garandeert `MIN_SCORED_PRACTICE = 4` gescoorde items (`src/core/SessionPlanner.ts:77-78`, `:382-404`); test `SessionPlannerFixes.test.ts:23-32`; eigen sim toont 6 gescoorde items voor het vastgelopen profiel. (Wel vervangen door QA-R2-001.) |
| QA-004 | Major | **Opgelost** | `saveProfile` vangt schrijffouten, retourneert `{ok:false, reason}` en gooit nooit (`src/core/SaveSystem.ts:252-276`); `resetProfile` idem (`:284-293`); dashboard toont `data-notice="save-failed"` (`src/parent/ParentDashboard.ts:88-92`). Test `SaveSystemFixes.test.ts`. |
| QA-005 | Major | **Opgelost** | `SessionScreen.finish()` guard (`src/ui/screens/SessionScreen.ts:100-105`); `completeSession` idempotent op `lastCompletedSessionId` (`src/core/GameState.ts:141-155`); test `GameStateFixes.test.ts:48-58`; eigen dubbelklik-sim → `onFinished` 1×. |
| QA-006 | Major | **Opgelost** | 1-optie/modelling-items zijn `scored:false` (`src/learning/util.ts:387-395`); planner scoort pas met ≥2 opties (`SessionPlanner.ts:209-238`); `recordItemAnswer` negeert ongescoorde items (`GameState.ts:162-165`); test `GameStateFixes.test.ts:75-95`; eigen sim (a): min. opties van gescoorde items ≥2. |
| QA-007 | Major | **Opgelost** | `SessionQueue.toJSON/fromJSON` + `saveSessionState`/`loadSessionState` met 12 u TTL (`SessionPlanner.ts:680-774`); `App.startSession` hervat (`App.ts:161-176`); tests `SessionQueueFixes.test.ts:139-161`, `app.test.ts:102-131`; eigen sim (d) hervat hetzelfde item na "herladen". |
| QA-008 | Major | **Opgelost** | `shouldStopForFrustration` aangesloten in `reportOutcome` (`SessionPlanner.ts:579-585`); test `SessionQueueFixes.test.ts:120-137`. |
| QA-009 | Major | **Opgelost** | Gemodelleerd item wordt ge-requeued (`SessionPlanner.ts:572-577`, `:612-617`); test `SessionQueueFixes.test.ts:101-118`. |
| QA-010 | Major | **Deels** | Mechanismen `shouldSimplify`/`nextDifficulty`/`applyOptionReduction`/`applyExtraAudio` zijn aangesloten (`SessionPlanner.ts:587-597`, `:626-659`). Maar op difficulty A (lage mastery) hebben items al 2 opties, dus `applyOptionReduction` is een no-op; en bij een volledig falend kind kapt de frustratiestop de sessie af vóór de woord-secties (zie QA-R2-003). Vereenvoudiging is alleen op de eerste foneem-skills aantoonbaar (sim b: `PH.RHYME` 3 items vereenvoudigd). |
| QA-011 | Major | **Opgelost** | `mount()` roept `focusFirstInteractive` (`App.ts:104-111`); helper in `src/ui/dom.ts:76-93`; test `app.test.ts:95-100`. |
| QA-012 | Major | **Deels** | Intro-knoppen kregen iconen (`src/ui/components/LetterIntro.ts:31-52`), beloningsscherm kreeg icoon + `fb.nav.done.1` audio + vaste hoeken (`src/ui/screens/RewardScreen.ts:44-74`). Maar de intro-knoppen blijven tekstlabels ("Letternaam"/"Klank"/"Voorbeeldwoord") die een niet-lezer niet kan onderscheiden. |
| QA-013 | Minor | **Opgelost** | `.la-feedback.is-hidden { opacity: 0 }` i.p.v. `visibility:hidden` (`src/styles.css:548-551`). |
| QA-014 | Minor | **Opgelost** | Focus-trap + `inert` op topbar/stage/footer + Escape (`SessionScreen.ts:210-283`). |
| QA-015 | Minor | **Opgelost** | `role="radiogroup"` + `role="radio"` + `aria-checked` (`src/ui/components/OptionGrid.ts:53-75`, `:142-150`). |
| QA-016 | Minor | **Opgelost** | Timer-set + `destroy()` ruimt op (`ActivityView.ts:87`, `:105-111`, `:476-480`). |
| QA-017 | Minor | **Opgelost** | Expliciete `destroy` via `App.mount`/`currentDestroy` (`App.ts:104-111`, `:127-131`); geen body-MutationObserver meer. |
| QA-018 | Minor | **Opgelost** | Instellingen-UI in dashboard (`ParentDashboard.ts:217-239`); `reducedMotion`/`highContrast` toegepast (`App.ts:89-102`); `autoRepeatPrompt` aangesloten op `SessionScreen` (`SessionScreen.ts:107-114`). |
| QA-019 | Minor | **Opgelost** | CSP alleen bij build via `transformIndexHtml` (`vite.config.ts:26-37`); `index.html` bevat geen meta-CSP; `check:dist` bevestigt aanwezigheid in `dist`. |
| QA-020 | Minor | **Open** | `sessionStep` wordt alleen op 1 gezet; `advanceStep` is nog steeds dode code (`GameState.ts:23`, `:167-169`). `introduceGrapheme` schrijft de unlock nog vóór de introductie-items gedaan zijn (zie QA-R2-007). |
| QA-021 | Minor | **Deels** | `.la-gate-input` nu `min-height: var(--la-tik)` = 64 px (`src/styles.css:839-847`, `--la-tik: 64px` op `:71`). De checkbox blijft 32×32 px (`src/styles.css:849-853`). |
| QA-022 | Minor | **Opgelost** | `RewardScreen` speelt `fb.nav.done.1` (`RewardScreen.ts:38`, `:74`) en heeft vaste HUIS/OOR-hoeken (`:20-42`). |
| QA-023 | Minor | **Deels** | `completeSession` kent nog onvoorwaardelijk een vonkje toe (`GameState.ts:141-145`), maar het plan garandeert ≥4 gescoorde oefenitems (`SessionPlanner.ts:382-404`), dus in de praktijk altijd ná leeswerk. |
| QA-024 | Nit | **Deels** | Hold-interval wordt opgeruimd via `root.isConnected` (`ParentGate.ts:83-94`). De foutmelding wordt nog gezet direct vóór `onFail()` navigeert (`ParentGate.ts:125-134`), dus nog steeds onzichtbaar. |
| QA-025 | Nit | **Opgelost** | `Math.min(totalItems, …)` (`SessionScreen.ts:91-94`). |
| QA-026 | Nit | **Open** | Dashboard toont nog enkel `sessionCount` + mediane reactietijd, geen week-/tijdsduur of trend (`ParentDashboard.ts:163-173`). |

**Samengevat:** Blocker QA-001 → Opgelost, QA-003 → Opgelost (nieuwe Blocker in de plaats), QA-002 → Deels. Majors QA-004/005/006/007/008/009/011 → Opgelost, QA-010 → Deels, QA-012 → Deels. Minors: 12 opgelost, 3 deels, 1 open. Nits: 3 open/deels.

---

## 4. Nieuwe bevindingen (opdracht 4)

### QA-R2-001 — Progressiedeadlock: eerste letter is nooit oefen-/masterbaar → tweede letter komt nooit
- **Ernst:** **Blocker**
- **Bestand:regel:**
  - `src/core/SessionPlanner.ts:183-242` (stap 3: gescoorde letter-items alleen `if (hasDistractorGrapheme(learned, next.id))`, r. 210),
  - `src/core/SessionPlanner.ts:354-377` (stap 7: zwakke-grafeem-oefening vereist óók een afleider, r. 355 en 364),
  - `src/core/SessionPlanner.ts:245,283,303` (woord-secties vereisen `wordPool.length >= 2`),
  - `src/core/Progression.ts:72-88` (volgende letter vereist **gemeesterd** vorige letter),
  - `src/core/Mastery.ts:223-231` (`isMastered`: `LK.m.SOUND` moet ≥12 pogingen en mastery ≥0,8 en ≥2 sessies halen).
- **Beschrijving:** Zodra alleen `m` is vrijgegeven (S6), is `learned = {m}`. Er bestaat geen woord met alleen `m`, dus `wordPool = 0`. Stap 3 introduceert de vólgende letter alleen als `m` beheerst is. Stap 7 wil `m` oefenen, maar `hasDistractorGrapheme({m}, 'm')` is false (er is geen tweede grafeem), dus er wordt géén gescoord `LK.m.SOUND`-item gegenereerd. De enige overgebleven gescoorde items zijn foneem-oefeningen (`PH.*`, `FN.*`). `LK.m.SOUND` blijft dus voor altijd `attempts 0 / mastery 0` → `canIntroduceNewGrapheme` blijft false → `wordPool` blijft 0. Het kind doet tot in lengte van dagen alleen foneembewustzijn zonder ooit een letter te oefenen of een woord te lezen.
- **Reproductie (bewezen):**
  - Engine-simulatie met vers profiel, **uitsluitend perfecte antwoorden**, 60 sessies (`qa-tmp/sim.test.ts`, `now`/RNG seeded): S1–S5 `steps=[1,2,8]` geen letters; S6 `steps=[1,2,3,8] unlocked=[m]`; S7–S60 `steps=[1,2,8] mScored=0 m.attempts=0 m.mastery=0.00 wordSecs=0`. `Unlock sessions = {"m":6}`; `a` nooit.
  - Planner-only (`qa-tmp/plan-m.ts`, profiel `unlocked=['m']`, FN.FIRST_SOUND 1.0): `step1 klapbrug*(3), step2 klankjager*(3), step8 beloning`; `scored LK.m.SOUND items: 0`; `phase2 open: true, canIntroduce(a): false`.
- **Fix:**
  1. Genereer voor de **allereerste** letter een gescoorde oefening op de letter zélf, óók zonder tweede grafeem: bv. `sound-to-grapheme` met de doelletter + 1–2 contrasterende letters uit de volledige inventaris die als **nog-niet-geleerd maar auditief bekend** mogen dienen (of een expliciete "welke letter hoor je?" met de reeds geïntroduceerde letters). De blokkade in stap 3 moet niet afhangen van `learned`, maar van beschikbare afleidende *letters*.
  2. Zelfde fix in stap 7 (`hasDistractorGrapheme(learned, id)` mag niet de enige route zijn voor de eerste letter).
  3. Alternatief/simpler: laat `canIntroduceNewGrapheme` de allereerste opvolgende letter toestaan zodra het vorige grafeem **geïntroduceerd én geoefend** is (bv. `attempts ≥ 4`), zodat `m` en `a` samen vrijkomen en er wél woorden (`mam`, `as`, …) ontstaan.
  4. Voeg een regressietest toe die een **echte** playthrough simuleert en eist dat na X sessies `unlockedGraphemes` `a` bevat en `wordPool ≥ 2`.
- **Impact op acceptatiecriteria:** criteria 2 (letters/klanken oefenen), 3 (hakken), 4 (plakken), 5 (decoderen) zijn hierdoor in de praktijk **FAIL**.

### QA-R2-002 — Vers kind krijgt pas na ~5 sessies de eerste letter (fase-2-poort)
- **Ernst:** Major (nauw verbonden met QA-R2-001)
- **Bestand:** `src/core/Progression.ts:100-101` (`PHASE_ENTRY[2] = FN.FIRST_SOUND ≥ 0.8`), `src/core/SessionPlanner.ts:150-180` (stap 2 kiest willekeurig `FIRST_SOUND`/`LAST_SOUND`).
- **Beschrijving:** Zolang `FN.FIRST_SOUND < 0.8` wordt er geen letter geïntroduceerd. In de simulatie met perfecte antwoorden duurde het **5 sessies** voordat `FN.FIRST_SOUND` 0,8 bereikte, omdat de klankoefening per sessie willekeurig FIRST of LAST kiest en er maar 3 `FN.*`-items per sessie zijn. Een kind ziet dus ~5 sessies alleen klankopdrachten.
- **Reproductie:** progressielog S1–S5 (`FN.FIRST_SOUND` stijgt pas in S5 naar 1,00).
- **Fix:** forceer in stap 2 de skill die de fase-poort opent (eerst `FN.FIRST_SOUND` tot 0,8, dan pas variëren), of verhoog het aantal `FN.*`-items in vroege sessies.

### QA-R2-003 — Adaptieve vereenvoudiging bereikt de leer-items niet; frustratiestop kapt de sessie af
- **Ernst:** Major
- **Bestand:** `src/core/SessionPlanner.ts:579-585` (`frustrationCount >= 2 → windDown`), `:661-673` (`normalize` slaat alle niet-beloningssecties over bij `windDown`), `:626-642` (`applyOptionReduction` slaat items met ≤2 opties over).
- **Beschrijving:** Twee effecten:
  1. Bij **lage mastery** is `difficultyForSkill` = `A` en dus `optionCountFor('A') = 2`; `applyOptionReduction` doet dan niets (`options.length <= 2 → continue`). Het beloofde "minder keuzes bij fouten" is binnen een realistische zwakke sessie een no-op.
  2. Bij **veel fouten** (3× modeling per item) slaat de frustratiestop al na ~2 itemsets aan, zet `windDown = true` en laat `normalize()` alle resterende secties (m.n. stap 4–6: hakken/plakken/woordlezen/Klimboom) vervallen. Daardoor worden de woord-items nooit bereikt en dus nooit adaptief bijgestuurd.
- **Reproductie (bewezen):** sim (b) met alle antwoorden fout: `scored in plan=N` maar `answered < N` (sessie afgekapt); enige waargenomen vereenvoudiging was op `PH.RHYME` (3 items), niet op `DE.CVC`/`AN.CVC`/`SY.CVC`.
- **Fix:** (a) Sta vereenvoudiging naar 1 optie-variant toe of wissel bij lage mastery naar een **andere taakvorm** (luisteren/aanwijzen) i.p.v. alleen opties schrappen; (b) demp `windDown` zodat minstens één oefening op het doel-doel nog wordt afgerond, of markeer expliciet dat de sessie "rustig stopt" i.p.v. naar de beloning te springen.

### QA-R2-004 — Drie MVP-doelwoorden gemarkeerd als niet-kindvriendelijk
- **Ernst:** Minor
- **Bestand:** `npm run validate` output (`words:mak`, `words:smak`, `words:mars`); `src/content/words.ts` (`kidFriendly:false`).
- **Beschrijving:** Nieuwe validatorwaarschuwing (ronde 1: 0 × `NOT_KID_FRIENDLY`). Deze woorden zitten in de MVP-woordenbank en kunnen als doelwoord opduiken, terwijl ze als niet-kindvriendelijk gemarkeerd staan.
- **Fix:** verwijder deze woorden uit de MVP-set, of geef ze een kindvriendelijke afbeelding/context, of pas de validatiedrempel aan met onderbouwing.

### QA-R2-005 — Audio-fallback is tekstueel en laat audio-only opties ongelabeld
- **Ernst:** Minor (restant QA-002)
- **Bestand:** `src/ui/components/ActivityView.ts:132-152`, `src/content/uiTexts.ts:69-70`.
- **Beschrijving:** De visuele fallback toont geschreven NL ("Geluid niet beschikbaar / Kijk goed naar de klanken en de plaatjes") — niet leesbaar voor de doelgroep. Voor klankjager/plakken/klimboom/rijmpoort blijven de antwoordknoppen ongelabelde speakers; er is dus nog steeds geen oplossing zonder (lokale) stem.
- **Fix:** beeld/icoon-gebaseerde fallback en gelabelde of pictografische opties; of blokkeer deze taakvormen zolang `isAvailable() === false`.

### QA-R2-006 — Checkbox-tikdoel 32 px op start-/ouderzone
- **Ernst:** Nit
- **Bestand:** `src/styles.css:849-853`.
- **Fix:** minstens 64 px klikvlak (bijv. via padding op het label).

### QA-R2-007 — Dode sessie-state en vroege unlock (restant QA-020)
- **Ernst:** Nit
- **Bestand:** `src/core/GameState.ts:23`, `:167-169`; `introduceGrapheme` (`:172-181`).
- **Fix:** dode code verwijderen, of unlock pas definitief maken na de introductie-items.

### QA-R2-008 — Foutmelding ouder-gate nog onbereikbaar (restant QA-024)
- **Ernst:** Nit
- **Bestand:** `src/parent/ParentGate.ts:125-134`.
- **Fix:** melding tonen vóór `onFail()`, of de regel verwijderen.

### QA-R2-009 — Testgat: geen test voor echte voortgangsprogressie
- **Ernst:** Minor
- **Beschrijving:** De 190 tests dekken engine, queue en UI-flows, maar er is geen test die een **volledige playthrough over meerdere sessies** simuleert en eist dat de tweede letter/woorden vrijkomen. Daardoor bleef QA-R2-001 onopgemerkt.
- **Fix:** zie QA-R2-001 fix-4.

---

## 5. Simulatieresultaten (opdracht 3)

Alle simulaties met de echte modules, memory-storage, seeded RNG en jsdom; scripts in `C:\Users\Jan\VM Scan\qa-tmp` (`sim.test.ts`, `plan-m.ts`).

| Sim | Scenario | Uitkomst |
|---|---|---|
| (a) | Vers profiel, engine-sessie, alle antwoorden goed, tot beloning | ✅ Beloning bereikt, ≥4 gescoorde items, min. opties van gescoorde items ≥2, geen crash. |
| (b) | Veel fout | ⚠️ Vereenvoudiging wél zichtbaar op vroege skills (`PH.RHYME`, 3 items `simplified`), frustratiestop treedt op (sessie wordt afgekapt: `answered < scoredInPlan`). ❌ Woord-items worden nooit bereikt (zie QA-R2-003). |
| (c) | ≥5 sessies (60 gesimuleerd), perfecte antwoorden | ❌ S6 introduceert `m` (ongescoord); daarna **geen** `LK.m.SOUND`-oefening, mastery 0, `a`/`s`/`t`/`k`/`r` komen nooit vrij, `wordPool` blijft 0 → geen hakken/plakken/woordlezen/Klimboom. MVP haalbaar: **nee (onmogelijk, niet slechts >30 sessies)**. Zie QA-R2-001. |
| (d) | Stoppen halverwege + herladen → resume | ✅ Na "huis → naar de kaart" en opnieuw opstarten wordt hetzelfde item hervat (zelfde `data-item-id`). |
| (e) | Audio `unavailable` | ✅ `[data-audio-fallback="true"]` verschijnt in de activiteit (met icoon en gesegmenteerde letters). |
| (f) | Dubbelklikken op beloning | ✅ `onFinished` precies 1×; guard + idempotente `completeSession`. |

---

## 6. Acceptatiecriteria-checklist

| # | Criterium | Status | Toelichting |
|---|---|---|---|
| 1 | Kind start zelfstandig een sessie | **PASS** | Grote startknop met icoon + instructie; geen ouder nodig. |
| 2 | Letters/klanken oefenen | **FAIL** | Klanken (foneembewustzijn) wel; **letters** worden na S6 nooit geoefend (QA-R2-001). |
| 3 | Hakken | **FAIL** | Mechaniek bestaat, maar er komen nooit woorden vrij voor een vers kind (QA-R2-001). |
| 4 | Plakken | **FAIL** | idem. |
| 5 | Decoderen eenvoudige woorden | **FAIL** | idem; `wordPool` blijft 0. |
| 6 | Woorden alleen met beschikbare letters | **PASS** | `allowedWordObjects(learned)` + `isWordAllowed` gate correct (zij het momenteel moot). |
| 7 | Vriendelijke feedback | **PASS** | Kleur + icoon + tekst, geen "fout"/rood; `aria-live="polite"`; `opacity`-fix QA-013. |
| 8 | Voortgang opgeslagen | **PASS** | Per antwoord + sessiepositie hervatbaar (QA-004/007 opgelost). |
| 9 | Adaptief | **DEELS** | Tussen sessies via `difficultyForSkill` werkt; binnen een sessie beperkt/no-op bij lage mastery en afgekapt door frustratiestop (QA-010/QA-R2-003). |
| 10 | Ouder bekijkt voortgang | **PASS** | Gate + dashboard met neutrale labels, instellingen, verwarringen, export/reset. |
| 11 | Geen onnodige persoonsgegevens | **PASS** | Willekeurige `profileId`, geen naam/PII; alles lokaal. |
| 12 | Belangrijke functionaliteit getest | **DEELS** | 190 tests groen, strict typecheck, validator + `check:dist`; maar geen multi-sessie-progressietest (QA-R2-009). |

**Toetsenbord/Touch/Reduced motion:** toetsenbord (Tab/pijltjes/1-4/H/Esc/Home) en focusmanagement nu in orde; touch overwegend ≥64 px (checkbox-uitzondering QA-R2-006); reduced motion/contrast/auto-repeat instelbaar en werkend.

---

## 7. Prioriteit voor de ontwikkelaars

1. **QA-R2-001 (Blocker)** — doorbreek de eerste-letter-deadlock zodat `m` gescoord oefenbaar is en `a` vrijkomt; zonder dit komt een vers kind nooit voorbij foneembewustzijn en zijn hakken/plakken/decoderen onbereikbaar.
2. **QA-R2-002 (Major)** — fase-2-poort sneller open (forceer `FN.FIRST_SOUND`), zodat de eerste letter niet pas na ~5 sessies komt.
3. **QA-R2-003 (Major)** — maak binnen-sessie-vereenvoudiging betekenisvol (ook bij 2 opties) en demp de frustratiewind-down zodat leer-items niet volledig vervallen.
4. **QA-R2-004/005 (Minor)** — contentkwaliteit (kindvriendelijke woorden) en beeld-gebaseerde audio-fallback.
5. **QA-R2-009 (Minor)** — regressietest voor multi-sessie-voortgang toe.

*Einde rapport.*
