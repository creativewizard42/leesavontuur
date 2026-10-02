# LEESAVONTUUR — Gecombineerde eindverificatie (QA + Educational + Security/Privacy)

| | |
|---|---|
| Rol | Gecombineerde eindverificatie (QA + Educational + Security reviewer) |
| Datum | 2026-10-02 |
| Repo | `C:\Users\Jan\VM Scan\leesavontuur` — git `main` @ **a235148** (geverifieerd op werkboom met schone `git status`) |
| Scope | Sluiten van de ronde-3-bevindingen; volledige gate; docs-consistentie; criteria-tabel MVP |
| Wijzigingen | **Alleen dit bestand.** Geen broncode gewijzigd. Probes staan buiten de repo in `C:\Users\Jan\VM Scan\qa-tmp` en `C:\Users\Jan\VM Scan\edu-tmp`. |
| Commit | **aanwezig als enige wijziging** ("docs: final verification") |

---

## 1. Poort (draaiboek)

| Commando | Resultaat |
|---|---|
| `npm run typecheck` | ✅ `tsc --noEmit`, 0 fouten (strict) |
| `npm test` | ✅ **33 testbestanden, 255 tests** geslaagd (~17,5 s) |
| `npm run validate` | ✅ `Content validatie OK (1852 waarschuwing(en), geen fouten)` — alle 1852 zijn `AUDIO_ASSET_MISSING`; **0× `NOT_KID_FRIENDLY`** |
| `npm run build` | ✅ `dist/assets/index-FRNxGYln.js` 140,14 kB (gzip 41,95) · `index-n8pJBYlI.css` 20,65 kB |
| `npm run check:dist` | ✅ `CSP-meta aanwezig, geen externe URL's, OFL-licenties meegeleverd` |
| `npm audit` | ✅ `found 0 vulnerabilities` |

Extra onafhankelijke uitvoer (probes buiten de repo):
- `qa-tmp/final-qa-probe.ts` (vite-node) + `qa-tmp/final-qa.test.ts` (vitest/jsdom, **9/9 groen**).
- `edu-tmp/final-edu-probe.ts` (vite-node).

---

## 2. Sluiting van de ronde-3-bevindingen

### QA-R3-001 — fase-2-poort onbereikbaar voor 50%-leerling → **GESLOTEN**
- **Fix:** haalbare poort `PHASE_2_MASTERY = 0.7` (`src/core/Progression.ts:70`) en sessie-vangnet `PHASE_2_FALLBACK_SESSIONS = 8` (`:76`), samengebracht in `phaseTwoOpen` (`:89-90`). Voor letters ná de eerste blijft volledig `isMastered` gelden (`canIntroduceNewGrapheme`, `:105-124`).
- **Bewijs (probe):** 3 leerlingen, 15 sessies (seed 77):
  - perfect → `{m:2, a:5, s:8, t:12, k:15}`;
  - 50%-hersteld (goed op 1e, anders gemodelleerd) → `{m:9}`;
  - 50%-gemodelleerd → `{m:9}`.
  - `allPrevMastered = true` voor alle drie: er komt **geen** volgende letter zonder dat de vorige `isMastered` (≥12 items, ≥2 sessies, ≥4 op rij) is.
- **Vangnet ≤ 15 sessies:** eerste letter `m` in **sessie 9** (vangnet 8 + sessieteller), ruim binnen 15.
- **Repotests:** `Progression.test.ts` (vangnet op 8, poort bij 0.75), `ProgressionSimulation.test.ts` (m sessie 9; daarna alleen met beheersing).

### QA-R3-002 — 1-optie woord-/Klimboom-items bij `wordPool = 2` → **GESLOTEN**
- **Fix:** leessecties (stap 5/6) openen alleen bij `wordChoiceReady = choicePool.length >= 2` (`src/core/SessionPlanner.ts:173`, `:383`, `:404`); zolang dat niet kan wordt gecompenseerd met extra hakwerk (`:343`, `PRACTICE_ITEMS + 2`).
- **Bewijs (probe `m,a,s`, S10):** plan `steps=[1,2,4,7,8]` — **geen** stap 5/6; de enige 1-optie-items zijn `klankjager`/`beloning` en die zijn **ongescoord** (`isScoredActivityItem === false`).
- **S10–S13 herhaald met `m,a,s` (perfecte leerling, seed 2026):**

  | Sessie | steps | minScoredOpts | badScored | noChoiceWord | unlocked |
  |---|---|---|---|---|---|
  | S10 | 1,2,4,7,8 | 2 | [] | [] | m,a,s |
  | S11 | 1,2,4,7,8 | 2 | [] | [] | m,a,s |
  | S12 | 1,2,3,4,7,8 | 2 | [] | [] | m,a,s,t |
  | S13 | 1,2,4,5,6,7,8 | 2 | [] | [] | m,a,s,t |

  Geen enkel gescoord item met < 2 opties in S1–S16; stap 5/6 verschijnen pas zodra er ≥ 2 even lange woorden bestaan (S13).
- **Repotest:** `ProgressionSimulation.test.ts` ("nooit een gescoord item met minder dan 2 opties") en `SessionPlannerFixes.test.ts` (m,a,s → geen stap 5/6, wel gescoord hakwerk).

### QA-R3-003 — hervatten verloor queue-context → **GESLOTEN**
- **Fix:** `SessionQueue.fromJSON(data, context)` en `loadSessionState(..., context)` geven `profile`/`rng`/`learned` door (`src/core/SessionPlanner.ts:1061`, `:1179`); `App.startSession` bouwt die context (`src/ui/App.ts:175-187`).
- **Bewijs (probe + test):** na 3× modeling kiest het succes-item een **beheerst grafeem** (`kind === 'letterklank'`) i.p.v. de generieke fase-1-fallback. Repotest `SessionQueueFixes.test.ts` ("hervat met profielcontext").

### QA-R3-004 — audio-fallback bleef leesbare NL-tekst → **GESLOTEN**
- **Fix:** `showAudioFallback` toont icoon + oplichtende letters; de uitleg staat **sr-only** (`src/ui/components/ActivityView.ts:205-206`), oude `.la-audio-fallback__text/__hint` zijn verwijderd.
- **Bewijs (jsdom-probe):** `[data-audio-fallback="true"]` aanwezig met SVG-icoon, **2× `p.la-sr-only`**, en géén `.la-audio-fallback__text`/`__hint`.

### EDU-R3-001 — kapotte/onware letter-klank-feedback (`{sound}`, "welke klinker") → **GESLOTEN**
- **Fix:** `specificForLetterSound` levert `fb.specific.letter_sound` met altijd gevulde `{sound}` (`src/learning/answer.ts:175`); `specificForWordChoice` kiest `middle_sound` alleen bij een klinker/tweeklank, anders `middle_consonant` (`:135`). Nieuwe teksten in `src/content/feedback.ts:46,49`, varianten in `src/content/dynamicClips.ts:120-128,289`.
- **Bewijs (probe, alle activiteiten, fout op poging 1/2/3):** **0 placeholders** en **0 key-lekken** in zichtbare feedback; `letterklank(m)` → key `fb.specific.letter_sound`, tekst `"Deze letter zegt mmm. Probeer het nog eens."`, `klinker=false`. Repotest `feedbackText.test.ts` (0× `{`/`}`/`fb.`).

### EDU-R3-002 — feedbackzinnen werden niet uitgesproken → **GESLOTEN**
- **Fix:** `setFeedback` speelt via `feedbackSequence` (`src/ui/components/ActivityView.ts:433,456`); `onFeedback` is aangesloten in `SessionScreen.ts`; content-API `feedbackClips` (`src/content/dynamicClips.ts:289`) vult de concrete variant.
- **Bewijs:** probe → voor elke gesamplede feedback-key levert `feedbackClips` een niet-lege, placeholder-vrije clip (**0 problemen**); jsdom-probe → bij een fout antwoord bevat `audio.played` een `fb.*`-clip. Repotest `activity.test.ts` (feedbackaudio bij correct én fout).

### EDU-R3-003 — b/d kregen "stemloze plof" → **GESLOTEN**
- **Fix:** `VOICED_PLOSIVES = {b,d}` in `scripts/recording-list.ts`; regeneratie in `docs/RECORDINGS.md`.
- **Bewijs (probe op `docs/RECORDINGS.md`):**
  - `lk.b.sound` → `stemhebbend=true`, `stemloos=false` (regel 752);
  - `lk.d.sound` → `stemhebbend=true`, `stemloos=false` (regel 755);
  - `lk.t.sound` → `stemloos=true` (regel 781).

### SEC-R3-001 — meta-CSP niet vóór de initiële loads → **GESLOTEN**
- **Fix:** CSP wordt direct ná `<head>` geïnjecteerd (`vite.config.ts`) en `check-dist.ts` faalt als de CSP ná het eerste `<script>`/`<link rel=stylesheet>` staat.
- **Bewijs:** `dist/index.html:4` is de CSP-meta, en is het **eerste** element in `<head>` (vóór charset/viewport, `<script type=module>` op regel 14 en de stylesheet op regel 15). `check:dist` = OK.

### SEC-R3-002 — verlopen resume-sleutel niet verwijderd → **GESLOTEN**
- **Fix:** `loadSessionState` roept `discard()` aan bij overschrijding van de omvang, verlopen TTL, corrupte JSON of ongeldige queue (`src/core/SessionPlanner.ts:1158-1183`), wat `storage.remove(SESSION_RESUME_KEY)` doet.
- **Bewijs (probe):** sleutel aanwezig na opslaan → na TTL 12 u `afterExpired=removed`; ook corrupte JSON wordt opgeruimd. Repotest `SessionQueueSecurity.test.ts`. `docs/PRIVACY.md` is gelijkgetrokken ("wordt niet meer hervat en wordt bij de volgende start verwijderd").

### SEC-R3-005 — audio-keys uit hervat-JSON niet gewhitelist → **GESLOTEN**
- **Fix:** `KNOWN_AUDIO_KEYS` (manifest + `instructions` + `feedback`; varianten zitten in de manifest, `src/content/audioManifest.ts:76-77`) en `readAudio` weigert onbekende keys (`src/core/SessionPlanner.ts:646,667`).
- **Bewijs (probe/test):** een gemanipuleerde `prompt.audio.key = '../../evil'` verdwijnt na `fromJSON` (`prompt.audio === undefined`); een geldige `lk.m.sound` blijft. Repotest `SessionQueueSecurity.test.ts`.

**Alle gevraagde ronde-3-bevindingen (QA-R3-001…004, EDU-R3-001…003, SEC-R3-001/002/005) zijn GESLOTEN.**

---

## 3. Nieuwe bevindingen (deze verificatieronde)

| ID | Ernst | Onderwerp |
|---|---|---|
| DOC-R3-001 | **Minor** | `docs/EDUCATIONAL_DESIGN.md` §15.2 (regel ~729) noemt nog de oude drempel: "Zolang de fase-2-poort (`FN.FIRST_SOUND ≥ 0.8`) dicht is…". Elders in ED (§3 tabel, §15.7, §15.11) staat correct `≥ 0.7`. Documentatie-inconsistentie, geen code-afwijking. |

**Geen nieuwe Blocker of Major.** De vastgestelde restpunten zijn bekend en voorwaardelijk (zie §5): echte audio-opnames, tweede taalkundige review, contactadres in `PRIVACY.md`, host-hardening-headers.

---

## 4. Aanvullende snelle controles

- **Vers profiel, jsdom, volledige sessie tot beloning:** ✅ `createApp` → start → sessie doorlopen (intro's, opties, `next`, incl. model/guess-pad met oplopende klok) bereikt `[data-screen="reward"]` **zonder crash**.
- **Docs vs. code:**
  - `README.md:144-159` — sign-offs QA/Educational/Security = "Akkoord met voorwaarden", met de juiste voorwaarden (opnames, tweede review, contactadres, headers).
  - `docs/EDUCATIONAL_DESIGN.md` §15.7 (vangnet 8 + poort 0.7), §15.10 (tempo m:2, a:5, s:8, t:12, k:15, r:18), §15.11 (warming-up max 2 opties), §15.12 (`middle_consonant`/`letter_sound`) kloppen met de code.
  - `docs/PRIVACY.md` — retentietekst nu correct; contactadres nog placeholder `[contact invullen]` (expliciet gemarkeerd).
  - `docs/GAME_DESIGN.md` §5 ("alle feedback is klankbestand") is nog niet volledig waar zolang echte opnames ontbreken; dit valt onder de bekende voorwaarde (TTS-fallback).
- **Rapportdocumenten:** de `docs/reviews/*_R3.md` beschrijven de stand op commit `d4b9b8d` (vóór de fixes) en zijn niet herschreven; de reconciliatie staat in `README.md`/`CHANGELOG.md` op `a235148`.

---

## 5. Acceptatiecriteria MVP

| # | Criterium | Status | Onderbouwing |
|---|---|---|---|
| 1 | Kind start zelfstandig een sessie | **PASS** | Startknop + autofocus + audio; ouder-gate blokkeert kind; jsdom-sessie tot beloning. |
| 2 | Letters/klanken oefenen | **PASS** | Gescoorde `LK.<g>.SOUND` vanaf sessie 2; 50%-leerling krijgt `m` in sessie 9 (vangnet ≤ 15); poort 0.7 haalbaar. |
| 3 | Hakken | **PASS** | Stap 4 met ≥ 2 opties; bij woordarmoede extra hakwerk (compensatie QA-R3-002). |
| 4 | Plakken | **PASS** | Plakken met ≥ 2 opties zodra `choicePool ≥ 1`/woorden beschikbaar; getest. |
| 5 | Eenvoudige woorden decoderen | **PASS** | Stap 5/6 alleen met ≥ 2 even lange woorden; nooit 1-optie-gescoord (S1–S16 gecontroleerd). |
| 6 | Woorden alleen met beschikbare letters | **PASS** | `allowedWordObjects`/`isWordAllowed`; validator 0 fouten; geen ongeleerd grafeem in beeld. |
| 7 | Vriendelijke feedback | **PASS** | Kleur + icoon + tekst, geen rood/"fout"; feedback wordt **uitgesproken**; 0 placeholders. |
| 8 | Voortgang opgeslagen | **PASS** | Per antwoord + sessiepositie; resume-context hersteld; verlopen sleutel actief verwijderd. |
| 9 | Adaptief | **PASS** | Tussen sessies (moeilijkheid/opties) en binnen sessie (simplified/modelFirst/extraAudio/windDown); vereenvoudigde warming-up. |
| 10 | Ouder bekijkt voortgang | **PASS** | Ouder-gate + dashboard met instellingen, verwarringen, export/reset. |
| 11 | Geen onnodige persoonsgegevens | **PASS** | Willekeurig profiel-id, geen naam/PII; alles lokaal; whitelist op hervat-JSON. |
| 12 | Belangrijke functionaliteit getest | **PASS** | 255 tests/33 bestanden, strict typecheck, validate, build, `check:dist`; regressietests per R3-bevinding. |
| 13 | Educational Designer heeft inhoud gecontroleerd | **VOORWAARDE** | Didactische review akkoord m.u.v. echte native opnames en tweede taalkundige/leerkracht-review (ED §13.1/§13.7, EDU-030). |
| 14 | QA getest | **PASS** | QA gate groen; alle QA-R3-bevindingen gedekt door tests + onafhankelijke probes. Restvoorwaarde: echte opnames vervangen TTS. |
| 15 | Security/Privacy review uitgevoerd | **VOORWAARDE** | Code/privacy review positief (geen Critical/High/Medium; `npm audit` schoon). Open: contactadres `PRIVACY.md` + host-hardening-headers toepassen bij webhosting. |

---

## 6. Eindoordeel

**Akkoord met voorwaarden (MVP).**

Alle in deze opdracht genoemde ronde-3-bevindingen zijn met bewijs (code + tests + onafhankelijke probes) **gesloten**. Er zijn **geen nieuwe Blocker of Major**; één nieuwe **Minor documentatie-inconsistentie** (DOC-R3-001, ED §15.2 noemt nog 0.8). De gelukkige route én de 50%-fout-route zijn speelbaar en gedekt door regressietests; de volledige gate (typecheck/test/validate/build/check:dist/audit) is groen.

**Voorwaarden vóór onbegeleid gebruik met kinderen:**
1. Echte audio-opnames door een native spreker vervangen de TTS-fallback (losse klanken, gerekte reeksen en feedback; EDU-R2-007/ED §13.1).
2. Tweede taalkundige/leerkracht-review van woordenlijst, rijm-/lettergreepbank en r-in-coda (EDU-030/ED §13.7).
3. Contactadres invullen in `docs/PRIVACY.md` en hardening-headers via `deploy/` toepassen bij publieke webhosting.
4. Aanbevolen (niet-blokkerend): DOC-R3-001 corrigeren.

---

*Geen broncode gewijzigd. Alleen dit bestand toegevoegd en gecommit.*
