# QA / Usability Review — LEESAVONTUUR (Ronde 3, eindverificatie)

| | |
|---|---|
| Rol | QA / Usability Tester (onafhankelijk) |
| Datum | 2026-10-02 |
| Repo | `C:\Users\Jan\VM Scan\leesavontuur` (git `main`, commit `d4b9b8d`) |
| Scope | `src/`, `scripts/`, `docs/`, build-config |
| Wijzigingen | Alleen dit rapport. Geen broncode, geen commits. Tijdelijke probes buiten de repo in `C:\Users\Jan\VM Scan\qa-tmp` (bestaande probes hergebruikt, uitgebreid met `sim-r3.test.ts`, `ui-regression-r3.test.ts`). |
| Ronde 1 | `docs/reviews/QA_REPORT.md` (commit `b41c542`) |
| Ronde 2 | `docs/reviews/QA_REPORT_R2.md` (commit `41985f5`) |

---

## 1. Samenvatting

De R2-Blocker **QA-R2-001 (progressiedeadlock van de eerste letter)** is op commit `d4b9b8d` **opgelost**: een vers profiel met uitsluitend perfecte antwoorden speelt de volledige MVP-letters `m,a,s,t,k,r` vrij in **19 sessies** (m=2, a=5, s=9, t=13, k=16, r=19), en alle woord-/leessecties (hakken, plakken, woorden lezen, Klimboom) verschijnen met ≥2 opties. De fase-2-poort opent nu in sessie 1 (was sessie 5–6), dus **QA-R2-002** is eveneens opgelost. De frustratie-wind-down **QA-R2-003** beperkt resterende secties maar **slaat de leesstappen (4/5/6) niet meer over**; adaptieve vereenvoudiging is nu zichtbaar.

De volledige gate is groen: **typecheck, 243 tests (32 bestanden), validate, build, check:dist en `npm audit`** slagen. De R1-Blockers QA-001/QA-002/QA-003 zijn respectievelijk opgelost, grotendeels opgelost en opgelost. Nieuwe regressieprobes voor `modelFirst`/`simplified`/`windDown`/audio-only opties, resume en de ouderzone zijn geslaagd.

Er resteren echter **2 nieuwe Majors** en enkele Minors:

- **QA-R3-001 (Major):** de fase-2-poort (`FN.FIRST_SOUND ≥ 0.8`) is voor een leerling met ~50% fout op de eerste poging **onbereikbaar**. De EWMA-mastery plafonneert op ~0,78; 30 sessies simulatie levert 0 letters, 0 woorden. De poort is een harde drempel zonder alternatieve route naar letters.
- **QA-R3-002 (Major):** tussen S10–S13 (alleen `m,a,s`; `wordPool = 2`) bevatten **stap 5 (Woorden lezen) en stap 6 (Klimboom) uitsluitend 1-optie-items** (`scored:false`). De planner opent die secties bij `wordPool ≥ 2`, maar er bestaat geen woord met dezelfde grafeemlengte als afleider → één knop. Pas vanaf `wordPool = 6` (S14) is decoderen met ≥2 opties mogelijk.

**Ernstverdeling ronde 3:** 0 Blocker, 2 Major, 3 Minor, 3 Nit (op de gelukkige pad-route).

**Eindoordeel: Akkoord met voorwaarden** (zie §7).

---

## 2. Draaiboek resultaten (opdracht 1)

| Commando | Resultaat |
|---|---|
| `npm run typecheck` | ✅ `tsc --noEmit`, 0 fouten (strict). |
| `npm test` | ✅ 32 testbestanden, **243 tests** geslaagd (~17 s). |
| `npm run validate` | ✅ `Content validatie OK (1811 waarschuwing(en), geen fouten)`. Alle 1811 zijn `AUDIO_ASSET_MISSING`; **0× `NOT_KID_FRIENDLY`** (R2 had nog 3). |
| `npm run build` | ✅ `tsc --noEmit && vite build`; 61 modules; `dist/assets/index-*.css` 20,65 kB, JS 137,71 kB (+28 fonts). |
| `npm run check:dist` | ✅ `CSP-meta aanwezig, geen externe URL's, OFL-licenties meegeleverd`. |
| `npm audit` | ✅ `found 0 vulnerabilities`. |

`git status --short` en `git diff --stat` zijn leeg na de run (geen bronwijzigingen; alleen dit rapport toegevoegd). `dist/` is gitignored.

---

## 3. Verificatie ronde-1/R2 Blocker & Major (opdracht 2)

Status: **Opgelost** / **Deels** / **Open**, met bewijs.

| ID | Ernst | Status | Bewijs |
|---|---|---|---|
| QA-001 | Blocker | **Opgelost** | `AudioService.playElement` lost `false` op bij `error`/reject/timeout (`src/audio/AudioService.ts:260-311`); `runClip` valt dan door naar TTS en daarna `onFallback` + `unavailable` (`:313-334`); `grapheme-sound/name/example` in `DEFAULT_TTS_KINDS` (`:104-113`); `onFallback` aangesloten (`src/ui/App.ts:71-77`). |
| QA-002 | Blocker | **Deels** | Visuele fallback `[data-audio-fallback]` aanwezig (`src/ui/components/ActivityView.ts:192-212`); audio-only opties zijn nu **gelabeld** met oor-icoon + zichtbaar nummer + leesbaar aria-label (`OptionGrid.ts:114-117`, `:67-82`). Rest: de fallback-hint is geschreven NL (niet leesbaar voor de doelgroep) → zie QA-R3-004. |
| QA-003 | Blocker | **Opgelost** | `MIN_SCORED_PRACTICE = 4` (`SessionPlanner.ts:88`, `:451-473`) + zwakke-grafeem-oefening in stap 7 (`:419-448`). Probe `qa-tmp/plan-m.ts` (profiel `unlocked=['m']`): `step7: letterklank*(4)`, `scored LK.m.SOUND items: 4` (R2: 0). |
| QA-004 | Major | **Opgelost** | `saveProfile`/`resetProfile` vangen schrijffouten, retourneren `{ok:false, reason}` (`src/core/SaveSystem.ts`); dashboard toont `data-notice="save-failed"`; tests `SaveSystemFixes.test.ts` groen. |
| QA-005 | Major | **Opgelost** | Idempotente finish (`SessionScreen.finish()` guard) + `completeSession` op `lastCompletedSessionId` (`GameState.ts:148-166`). Oude sim (f) op HEAD: `onFinished` 1× bij 3× klikken. |
| QA-006 | Major | **Deels** | Gescoorde items hebben ≥2 opties en 1-optie-items zijn `scored:false` (`util.ts:418-421`, sim (a) op HEAD groen). **Maar** stap 5/6 genereren nog 1-optie-items bij `wordPool = 2` → QA-R3-002. |
| QA-007 | Major | **Opgelost** | `saveSessionState`/`loadSessionState` met 12 u TTL; oude sim (d) en eigen UI-probe hervatten hetzelfde `data-item-id`. |
| QA-008 | Major | **Opgelost** | `shouldStopForFrustration` aangesloten in `reportOutcome` (`SessionPlanner.ts:843-851`); oude sim (b): frustratiestop kapt sessie af. |
| QA-009 | Major | **Opgelost** | Gemodelleerd item ge-requeued (`SessionPlanner.ts:836-840`, `:885-890`); `SessionQueueFixes.test.ts` groen. |
| QA-010 | Major | **Opgelost** | `shouldSimplify`/`applyOptionReduction`/`applyExtraAudio`/`applyModelSupport` aangesloten (`SessionPlanner.ts:853-870`, `:899-953`). Oude sim (b): `vereenvoudigd=17` (R2: 3, alleen PH.RHYME). |
| QA-011 | Major | **Opgelost** | `focusFirstInteractive` bij `mount` (`App.ts:110-117`); `app.test.ts` focus-test groen. |
| QA-012 | Major | **Deels** | Intro-knoppen hebben iconen, beloningsscherm icoon + `fb.nav.done.1` (R2). Tekstlabels ("Letternaam/Klank/Voorbeeldwoord") blijven voor een niet-lezer niet te onderscheiden; geen pictografische variant. |
| QA-R2-001 | Blocker | **Opgelost** | Perfecte-playthrough-simulatie (60 sessies) én de nieuwe repo-regressietest `src/core/__tests__/ProgressionSimulation.test.ts` slagen. Zie §4 unlock-tabel. |
| QA-R2-002 | Major | **Opgelost** | Stap 2 forceert `FN.FIRST_SOUND` zolang fase 2 dicht is (`SessionPlanner.ts:186-189`); oude sim (c) op HEAD: `FN.FIRST=1.00` al in S2, `m` vrij in S2 (R2: S6). |
| QA-R2-003 | Major | **Opgelost** | `applyWindDown` beperkt elke resterende sectie tot 2 items i.p.v. over te slaan (`SessionPlanner.ts:963-974`). Eigen probe (alle letters, alles gemodelleerd): doorlopen stappen `[1,2,4,5,6,7]`, windDown op stap 2/4/5/6/7 (2 per sectie) → leesstappen bereikt. |

**Minors/Nits (R2):**

| ID | Status | Bewijs |
|---|---|---|
| QA-R2-004 | **Opgelost** | `mak`/`smak`/`mars` verwijderd uit `src/content/words.ts:34-55`; `validate` nu 0× `NOT_KID_FRIENDLY`. |
| QA-R2-005 | **Deels** | Audio-only opties nu oor+nummer+aria (`OptionGrid.ts:114-117`); fallbacktekst nog steeds NL-tekst (QA-R3-004). |
| QA-R2-006 | **Deels** | Checkbox in dashboard nu **48 px** (`src/styles.css` `.la-setting-row input[type="checkbox"] { width:48px; height:48px }`); nog onder UX-doel 64 px. |
| QA-R2-007 | **Open** | `sessionStep`/`advanceStep` nog dood (`GameState.ts:23`, `:190-192`); `introduceGrapheme` schrijft unlock vóór de introductie-items (`:195-203`). |
| QA-R2-008 | **Opgelost** | `ParentGate` navigeert stil terug zonder onzichtbare foutmelding (`ParentGate.ts:123-133`); hold-interval opgeruimd via `root.isConnected` (`:81-93`). |
| QA-R2-009 | **Opgelost** | Regressietest `ProgressionSimulation.test.ts` toegevoegd (perfecte run ≤30 sessies + 50%-fout). |
| QA-026 (R1) | **Open** | Dashboard toont `sessionCount` + mediane reactietijd; geen week-/tijdsduur of trend (`ParentDashboard.ts:181-191`). |

---

## 4. QA-R2-001 progressie-verificatie (opdracht 2, kern)

Probe `qa-tmp/sim-r3.test.ts` (1) — vers profiel, seeded RNG(2026), engine `planSession → createSessionQueue → GameState`, **uitsluitend perfecte antwoorden**, tot alle MVP-letters vrij zijn.

### 4.1 Unlock-sessie per letter

| Letter | Unlock-sessie | Cumulatieve `wordPool` |
|---|---|---|
| m | **2** | 0 |
| a | **5** | 1 (`mam`) |
| s | **9** | 2 (`mam`,`as`) |
| t | **13** | 6 |
| k | **16** | 11 |
| r | **19** | 18 |

Alle letters binnen 30 sessies; de MVP-route is haalbaar (was in R2 onmogelijk). `m` wordt vanaf S2 gescoord geoefend (`LK.m.SOUND`), wat de deadlock doorbreekt.

### 4.2 Woordsecties met ≥2 opties

| Sectie (stap) | Eerste sessie met ≥2 opties | Bewijs |
|---|---|---|
| Hakken (4, `AN.*`) | **6** | S6 `wordOpts={"hakken":2}` |
| Plakken (4, `SY.*`) | **14** | S14 `{"plakken":2}` |
| Woorden lezen (5, `DE.*`) | **14** | S14 `{"woordlezen":2}` |
| Klimboom (6) | **14** | S14 `{"klimboom":2}` |

Opties lopen daarna op tot 3–4 (S17/S18), consistent met adaptieve moeilijkheid. **Kanttekening:** S10–S13 bevatten stap 5/6 uitsluitend 1-optie-items (ongescoord) → QA-R3-002.

### 4.3 50%-fout-leerling

`qa-tmp/sim-r3.test.ts` (2), seeded RNG(77), 30 sessies; elk tweede gescoorde item fout op poging 1 en hersteld op poging 2 (score 0,5 — een realistische "fout, dan zelf hersteld"-leerling), i.p.v. 3× modeling.

- Resultaat: **0 letters, 0 woorden, 30× stappen `[1,2]`**.
- `FN.FIRST_SOUND` plafonneert op **0,778** (< drempel 0,8), oplopend tot ≥120 pogingen.
- Vrijgave blijft altijd een prefix van de MVP-volgorde (geen crash, geen corruptie).
- Oorzaak: de poort `PHASE_ENTRY[2] = FN.FIRST_SOUND ≥ 0.8` (`Progression.ts:101`) tegenover de scoretabel (1,0 / 0,5 / …) (`Mastery.ts:136-145`): bij 50% eerste-poging-correct convergeert de EWMA naar ~0,75–0,78 en bereikt 0,8 nooit. **QA-R3-001.**

### 4.4 Drie weken niets doen (klok vooruit)

`qa-tmp/sim-r3.test.ts` (3): 5 perfecte sessies (`m`,`a` vrij), daarna profiel opgeslagen en 21 dagen later geladen.

- Profiel persisteert identiek (`unlockedGraphemes` gelijk).
- Sessie 6 na de pauze: stappen **`[1,2,4,7,8]`** — dus hakken (4) én herhaling (7); geen "alleen warming-up".
- Het plan is **identiek met en zonder pauze** (`plan zonder pauze=[1,2,4,7,8] plan na pauze=[1,2,4,7,8]`): voortgang/herhaling is sessie-/mastery-gebaseerd (Leitner-intervallen + zwakke-grafeem-herhaling in stap 7), **niet wandklok-gebaseerd**. Er is dus geen tijdgebaseerde "roest/terugval" en ook geen expliciete vakantie-herhaling; de leerling hervat waar de sessie-indeling dat aangeeft.
- Een onderbroken sessie (`saveSessionState`) van vóór de pauze is na 21 dagen **verlopen** (TTL 12 u) en hervat niet; binnen 1 uur is hervatten wél geldig. Dit is conform GD §3.2.

---

## 5. Regressieonderzoek UI / resume / ouderzone (opdracht 3)

Probe `qa-tmp/ui-regression-r3.test.ts` (jsdom, echte modules) + oude sim (d)/(e).

| Gebied | Resultaat | Bewijs |
|---|---|---|
| `modelFirst` | ✅ | `[data-model-first="true"]`, `[data-model-row="true"]`; opties starten `disabled`, komen vrij na het model. |
| `simplified` | ✅ | `.la-activity--simplified` aanwezig. |
| `windDown` | ✅ | `.la-activity--winddown` + `[data-winddown="true"]` met Ploef-anker. |
| audio-only opties | ✅ | ≥2 knoppen met oor-icoon, zichtbaar nummer en aria-label zonder `ui.`-key-lek. |
| Resume | ✅ | Stoppen → kaart → "herladen" → `startSession()` hervat hetzelfde `data-item-id`. |
| Ouderzone | ✅ | `[data-screen="parent-gate"]` met hold-knop; `[data-screen="parent-dashboard"]` met 4 instellingen; `reducedMotion` zet `body.la-reduced-motion` en persisteert in de save. |

**Kleine regressie (Minor):** bij hervatten wordt de `SessionQueue` zonder context opgebouwd (`SessionPlanner.fromJSON` → `{ sessionNumber }`, `SessionPlanner.ts:1012-1049`; `App.ts:174-187`). Daardoor missen `profile`, `rng` en `learned` in de hervatte queue: `buildSuccessItem` valt terug op een generieke fase-1-oefening en `seedSkillState` start zonder de profiel-mastery. Geen crash, maar adaptief gedrag na hervatten wijkt af → **QA-R3-003**.

---

## 6. Nieuwe bevindingen (opdracht 4)

### QA-R3-001 — Fase-2-poort onbereikbaar voor leerling met ~50% fout → nooit letters/woorden
- **Ernst:** **Major** (hoge prioriteit; raakt criteria 2–5 voor een brede groep)
- **Bestand:regel:**
  - `src/core/Progression.ts:101` (`PHASE_ENTRY[2] = masteryOf(FN.FIRST_SOUND) >= 0.8`),
  - `src/core/SessionPlanner.ts:186-189` (fase 1 forceert uitsluitend `FN.FIRST_SOUND`),
  - `src/core/Mastery.ts:136-145` (scoretabel: eerste-poging-correct 1,0, tweede poging 0,5) en `:93-95` (`alphaFor`).
- **Beschrijving:** De instap voor letters is een harde drempel `FN.FIRST_SOUND ≥ 0.8`. Een kind dat de helft van de items pas bij de tweede poging goed heeft, heeft een gemiddelde score van 0,75; de EWMA convergeert naar ~0,75–0,78 en bereikt 0,8 nooit. Bij kansniveau op 2-optie-items (~50%) is de poort structureel onbereikbaar. Er is geen alternatieve route naar letters (geen "parallelle kennismaking", geen sessie-/tijd-gebaseerde ontsluiting), dus het kind blijft onbeperkt in fase 1 hangen.
- **Reproductie (bewust):** `qa-tmp/sim-r3.test.ts` (2), seeded RNG(77), 30 sessies: stappen altijd `[1,2]`, `unlocked={}`, `FN.FIRST` plafonneert op 0,778 bij ≥120 pogingen.
- **Fix-richting:** (a) laat de poort naast mastery ook op **pogingen/accuracy** of op een **maximum aantal fase-1-sessies** doorschakelen (bijv. na N sessies letters introduceren, desnoods met extra ondersteuning); of (b) verlaag de fase-2-drempel naar ~0,7; of (c) maak de eerste-letterkennismaking los van een perfecte FN-mastery (parallelle route), zodat ook zwakkere leerlingen gedecodeerd materiaal blijven zien.

### QA-R3-002 — Woordsecties tonen 1-optie-items bij `wordPool = 2` (S10–S13)
- **Ernst:** **Major**
- **Bestand:regel:**
  - `src/core/SessionPlanner.ts:348` (stap 5 opent bij `wordPool.length >= 2`) en `:368` (stap 6 idem),
  - `src/learning/util.ts:236-237` (`pickWordDistractors` filtert alleen op **gelijke grafeemlengte**; leeg → 0 afleiders),
  - `src/learning/WordReading.ts:73` en `src/learning/Klimboom.ts:84` (`scored: placed.length >= 2` → 1 optie = ongescoord).
- **Beschrijving:** Met `wordPool = 2` (alleen `mam` CVC en `as` VC) bestaat er geenzelfde-lengte afleider, dus elke `woordlezen`/`klimboom`-opgave heeft één knop en is ongescoord. Het kind krijgt in stap 5/6 vier opeenvolgende sessies een "keuze" zonder keuze; decoderen wordt daar niet geoefend. Pas vanaf `wordPool = 6` (S14) zijn er ≥2 opties en gescoorde items.
- **Reproductie (bewezen):** `qa-tmp/sim-r3.test.ts` (1): S10–S13 `lowWord=[{woordlezen,DE.CVC,opts:1,scored:false} ×3, {woordlezen,DE.VC,opts:1,scored:false} ×3, {klimboom,opts:1,scored:false} ×2]`; vanaf S14 leeg.
- **Fix-richting:** open stap 5/6 op `choicePool.length ≥ 2` (i.p.v. `wordPool ≥ 2`) of genereer afleiders met een **andere** lengte/ander patroon als er geen even lange peers zijn; of toon 1-optie-items niet als keuze maar als (ongescoorde) blootstellings-/modelstap.

### QA-R3-003 — Hervatten verliest queue-context (adaptief gedrag wijkt af)
- **Ernst:** **Minor**
- **Bestand:regel:** `src/core/SessionPlanner.ts:1012-1049` (`SessionQueue.fromJSON` bouwt de queue met `{ sessionNumber }` zonder `profile`/`rng`/`learned`); `src/ui/App.ts:174-187`.
- **Beschrijving:** Na hervatten start `seedSkillState` vanaf een lege `SkillState` en gebruikt `buildSuccessItem` de generieke fase-1-fallback i.p.v. de gemeesterde grafeem van het kind. Geen crash; het succes-/frustratie-item en de adaptieve bijsturing na hervatten zijn minder gericht.
- **Fix-richting:** geef bij `loadSessionState`/`fromJSON` de actuele `profile`/`rng`/`learned` door, of herbouw de context in `App.startSession` vóór de eerste `reportOutcome`.

### QA-R3-004 — Audio-fallback blijft tekstueel (restant QA-002 / QA-R2-005)
- **Ernst:** **Minor**
- **Bestand:regel:** `src/ui/components/ActivityView.ts:199-200` (`ui.audio.unavailable` / `.hint` als lopende NL-tekst).
- **Beschrijving:** De meeste winst is geboekt (audio-only opties hebben nu oor + nummer + aria-label), maar de fallback-uitleg is nog geschreven tekst die de doelgroep (5–6 jr, niet-lezend) niet kan lezen. Een pictografische fallback ontbreekt.
- **Fix-richting:** icoon-/pictogramgebaseerde fallback met minimale tekst.

### QA-R3-005 (Nit) — Restpunten
- Checkbox ouderzone 48 px i.p.v. ≥64 px (`styles.css`, `.la-setting-row input`) — restant QA-R2-006.
- Dode `sessionStep`/`advanceStep` en vroege unlock (`GameState.ts:23`, `:190-203`) — restant QA-020/QA-R2-007.
- Dashboard zonder week-/tijdsduur/trend (`ParentDashboard.ts:181-191`) — restant QA-026.
- Geen tijdgebaseerde terugval/herhaling na een lange pauze (voortgang is sessie-/mastery-gebaseerd). Bewust/verdedigbaar, maar niet als "vakantie-herhaling" ontworpen.

---

## 7. Acceptatiecriteria-checklist (zelfde lijst als R2)

| # | Criterium | Status | Toelichting |
|---|---|---|---|
| 1 | Kind start zelfstandig een sessie | **PASS** | Startknop + focus + audio; ouder-gate blokkeert kind. |
| 2 | Letters/klanken oefenen | **PASS** | Perfecte leerling: `LK.m.SOUND` gescoord vanaf S2, MVP-letters vrij in 19 sessies. ⚠️ Voor 50%-foutleerling blijft dit **FAIL** (QA-R3-001). |
| 3 | Hakken | **PASS** | Stap 4 hakken met ≥2 opties vanaf S6. |
| 4 | Plakken | **PASS** | Stap 4 plakken met ≥2 opties vanaf S14. |
| 5 | Decoderen eenvoudige woorden | **DEELS** | Woorden lezen + Klimboom met ≥2 opties vanaf S14; S10–S13 alleen 1-optie-ongescoorde items (QA-R3-002). |
| 6 | Woorden alleen met beschikbare letters | **PASS** | `allowedWordObjects` + `isWordAllowed` correct. |
| 7 | Vriendelijke feedback | **PASS** | Kleur + icoon + tekst, geen rood/"fout"; `aria-live="polite"`. |
| 8 | Voortgang opgeslagen | **PASS** | Per antwoord + sessiepositie hervatbaar; writes falen veilig; resume-TTL correct. |
| 9 | Adaptief | **PASS** | Tussen sessies (difficulty/opties) én binnen sessie (simplified/modelFirst/extraAudio, `vereenvoudigd=17`); windDown behoudt leesstappen. |
| 10 | Ouder bekijkt voortgang | **PASS** | Gate + dashboard met neutrale labels, instellingen, verwarringen, export/reset. |
| 11 | Geen onnodige persoonsgegevens | **PASS** | Willekeurige `profileId`, geen naam/PII; alles lokaal. |
| 12 | Belangrijke functionaliteit getest | **PASS** | 243 tests, strict typecheck, validate + `check:dist`; multi-sessie-progressietest toegevoegd. |

**Toetsenbord/Touch/Reduced motion:** toetsenbord/focus in orde; touch overwegend ≥64 px (checkbox 48 px uitzondering); reduced-motion/contrast/auto-repeat instelbaar en werkend.

---

## 8. Formele QA sign-off

> **Akkoord met voorwaarden.**

Toelichting: de R2-Blocker (progressiedeadlock) en de R1-Blockers zijn opgelost; de gelukkige pad-route (vers profiel, redelijke accuratesse) is volledig speelbaar tot `m,a,s,t,k,r`, met hakken/plakken/woordlezen/Klimboom en correcte adaptiviteit, resume en ouderzone. De volledige gate is groen en er zijn geen nieuwe Blockers op het gelukkige pad.

**Voorwaarden vóór productie/release:**
1. **QA-R3-001** oplossen: bied een route naar letters voor leerlingen die de fase-2-drempel niet halen (poort op accuratesse/pogingen/sessieaantal, of parallelle eerste-letterkennismaking).
2. **QA-R3-002** oplossen: open stap 5/6 alleen met ≥2 even-lange woordkandidaten, of genereer zinvolle afleiders; nooit 1-optie-keuzes tonen.
3. Aanbevolen (niet blokkerend): QA-R3-003 (resume-context), QA-R3-004 (pictografische audio-fallback) en de restpunten QA-R3-005.

**Niet akkoord** zou pas aan de orde zijn als QA-R3-001 als harde, onvermijdelijke deadlock voor de doelgroep wordt beoordeeld; met de geschetste poort-aanpassing is het een oplosbare Major.

*Einde rapport.*
