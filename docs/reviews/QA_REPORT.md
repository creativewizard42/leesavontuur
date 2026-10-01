# QA / Usability Review — LEESAVONTUUR

| | |
|---|---|
| Rol | QA / Usability Tester (onafhankelijk) |
| Datum | 2026-10-01 |
| Repo | `C:\Users\Jan\VM Scan\leesavontuur` (git `main`, commit `b41c542`) |
| Scope | `src/ui`, `src/games`, `src/parent`, `src/main.ts`, `src/core`, `src/learning`, `src/audio`, `src/content`, `docs/*` |
| Wijzigingen | Alleen dit rapport. Geen broncode, geen commits. Tijdelijke tests na de run verwijderd (`git status` → alleen `docs/reviews/`). |

---

## 1. Samenvatting

De kern (engine, mastery, Leitner, planner, content-validator) is van goede kwaliteit: **strict typecheck slaagt**, **99/99 tests slagen**, **`npm run validate` OK (0 fouten, 781 audio-waarschuwingen)** en **`npm run build` slaagt** (~88 kB JS / ~18 kB CSS). De DOM-laag is netjes opgebouwd zonder framework, met focusringen, `aria-live`, ≥64 px-tikdoelen en reduced-motion.

Voor de doelgroep (5–6 jaar, nog niet lezend, audio-first) kleven er echter **ernstige blokkers** aan de speelbare verticale slice:

1. **Audio werkt in de praktijk niet, en de TTS-fallback wordt nooit bereikt** (`AudioService.playElement` meldt een mislukte/ontbrekende clip als `played-clip`). Omdat er **geen enkele opname** in de repo zit, is het spel daarmee vrijwel geluidloos. Losse klanken zijn per ontwerp nooit TTS-baar; meerdere activiteiten zijn zónder geluid **onoplosbaar** voor een niet-lezend kind (geen visuele fallback, `onFallback` is nergens aangesloten).
2. **Progressiedeadlock**: een normale leerroute kan een sessie opleveren die **alleen uit de beloning bestaat** (geen enkele oefening), waarna het kind vastloopt. Bevestigd met een plansimulatie.
3. **Dubbele beloning/sessie bij dubbel doorspoelen** van de beloning (dubbelklik of ingedrukt houden van Enter/Space): 2 vonkjes en `sessionCount +2`. Bevestigd met een jsdom-test.
4. **`saveProfile` vangt schrijffouten niet af** (quota/privémodus) → ongevangen exception midden in de spel-loop. Bevestigd.
5. **Eerste sessie van een vers profiel biedt items met exact één antwoordoptie** (geen afleiders) — dat is oefentechnisch zinloos en kan nooit fout gaan. Bevestigd met een jsdom-sessie.

Daarnaast ontbreken enkele expliciet in de design-docs beloofde gedragingen (frustratiestop, herhaling van gemodelleerde items, sessiehervatting op sectieniveau, focusmanagement na schermwissel, instelbare rustige modus/auto-repeat).

**Ernstverdeling:** 2 Blocker, 11 Major, 9 Minor, 3 Nit.

---

## 2. Draaiboek resultaten (opdracht 1)

| Commando | Resultaat |
|---|---|
| `npm run typecheck` | ✅ Slaagt (0 fouten, `tsc --noEmit`, strict). |
| `npm test` | ✅ 13 testbestanden, **99 tests** geslaagd. Duur ~12–33 s. |
| `npm run validate` | ✅ `Content validatie OK (781 waarschuwing(en), geen fouten)`. Alle 781 zijn `AUDIO_ASSET_MISSING` (geen opnames, TTS/tekst-fallback actief). |
| `npm run build` | ✅ `tsc --noEmit` + `vite build`; 54 modules, `dist/index.html` 0,88 kB, CSS 18,2 kB, JS 88,1 kB. Beeld-assets (18 SVG's) worden meegekopieerd; **0 audiobestanden**. |

> `dist/` is gegenereerd maar gitignored; `git status` bleef schoon op `docs/reviews/` na.

---

## 3. Uitgevoerde simulaties (opdracht 4)

Tijdelijk vitest-bestand (daarna verwijderd) met de echte `createApp`, memory-storage, mock-audio en seeded RNG. Resultaten:

| Simulatie | Uitkomst |
|---|---|
| Vers profiel, start → intro → **alle antwoorden goed** → beloning | ✅ Sessie eindigt, geen crash, save bevat `unlockedGraphemes: ['m']`, `klankvonkjes ≥ 1`, `sessionCount ≥ 1`. ⚠️ Alle items hadden **exact 1 optie** (`min(options)=1`). |
| Geoefend profiel (m,a,s,t,k,r, hoge mastery), **veel foute antwoorden** (3× per item → modeling) | ✅ Beloning bereikt, geen crash, feedback zichtbaar, `data-feedback-kind="model"` kwam voor. |
| Adaptiviteit | ✅ Hoog-mastery profiel → moeilijkheid C en **meer opties** dan laag-mastery (A, 2 opties). ⚠️ Adaptatie gebeurt **alleen tussen sessies** op planmoment; de adaptieve functies voor bínnen een sessie zijn niet aangesloten (zie QA-010/QA-011). |
| Plansimulatie: alleen `m` vrijgegeven, mastery 0,75, Leitner-box 2 | ❌ Plan = **alleen stap 8 (Beloning)** — geen enkele oefening. |
| Plansimulatie: alleen `m`, box 1 | ⚠️ Plan = 1 herhaling-item + beloning. |
| Plansimulatie: vers (geen grafemen) | ✅ Stap 3 (4 letterklank-items) + beloning. |
| `saveProfile` met falende `write` | ❌ **Gooit** `QuotaExceededError` door (geen guard). |
| Beloningsknop 2× klikken | ❌ `klankvonkjes = 2`, `sessionCount = 2` (dubbel geteld). |
| Focus na schermwissel | ❌ `document.activeElement === document.body` (focus weg). |

---

## 4. Issues

### QA-001 — Audio-pipeline meldt ontbrekende clips als afgespeeld; TTS-fallback komt nooit aan
- **Ernst:** Blocker
- **Bestand:** `src/audio/AudioService.ts:133-173` (m.n. `finish` op `error` → `resolve` → `return true`), i.h.b. r. 148-152, 161 en 172; i.c.m. `src/ui/audioClips.ts:72-79` en `src/ui/App.ts:59`.
- **Beschrijving:** `playElement()` lost zijn promise op zowel bij `ended` **als** bij `error` (en bij time-out), en retourneert daarna altijd `true`. Bij een 404 op `audio/...mp3` meldt `playClip` dus `'played-clip'`, zet `mode = 'clip'` en **slaat de Web-Speech-fallback over**. Er zit geen `element.error`-check. Omdat de repo 0 opnames bevat, is elk geluid stil en wordt `onFallback` nooit aangeroepen. `onFallback` is bovendien nergens aangesloten (`createAppAudio` geeft geen `onFallback`; `createApp` ook niet).
- **Reproductie:** Open de app in een browser met `Audio` beschikbaar; klik "Begin" of een willekeurige optie. Netwerk toont 404's op `audio/**.mp3`; er klinkt niets; `service.play()` rapporteert `played-clip`. `validate` bevestigt 781 ontbrekende assets.
- **Fix:** In `playElement` `error`-pad onderscheiden (reject/time-out of `element.error` → `return false`); `onFallback` aansluiten in `createApp` (`createAppAudio({ onFallback })`) en minimaal een visuele fallback tonen; echte opnames toevoegen vóór release (ARCHITECTURE §6.4).

### QA-002 — Geen visuele fallback voor auditieve/oefentaken; meerdere activiteiten onoplosbaar zonder geluid
- **Ernst:** Blocker
- **Bestand:** `src/ui/components/ActivityView.ts:78-124` (`renderPromptAudioButton` toont enkel de Ploef-mascotte; geen tekst/fallback), `src/audio/AudioService.ts:60-65` (`DEFAULT_TTS_KINDS` sluit `grapheme-sound`, `grapheme-name`, `grapheme-example`, `blend` uit).
- **Beschrijving:** De "audio-first"-opdrachten tonen geen geschreven aanwijzing en geen visueel alternatief. Zonder opnames/TTS is er geen enkele bron van informatie. Impact per activiteit:
  - **Klankjager / Plakken / Klimboom / Klapbrug / Rijmpoort**: opties zijn audio-only (bolletjes/speakers), prompt verborgen → **onoplosbaar**.
  - **Letter-klank richting klank→letter**: prompt is een losse klank → nooit TTS-baar → **onoplosbaar**.
  - **Letter-klank richting letter→klank**: letter is zichtbaar, maar de klankopties zijn stil → raden.
  - **Letter-intro**: alle drie knoppen (`sound`/`name`/`example`) zijn niet-TTS-baar → **volledig stil**.
  - **Hakken**: het enige type dat volledig visueel werkt (geschreven woord → segmentatie-opties).
- **Reproductie:** Start een sessie op een profiel met meerdere grafemen en probeer "Plakken" of "Klankjager" te beantwoorden met het geluid uit/ontbrekend.
- **Fix:** Visualiseer de opdracht als tekst/icoon naast audio (bv. doelklank/letter/woord), toon een "luister"-hint en schakel een expliciete tekst-/beeldmodus in wanneer `isAvailable() === false` of `onFallback` vuurt.

### QA-003 — Progressiedeadlock: sessie met alleen de beloning (geen oefening)
- **Ernst:** Blocker
- **Bestand:** `src/core/SessionPlanner.ts:95-215` (stappen 2/4/5/6 vereisen `wordPool.length >= 2`), `:113-147` (stap 3 alleen bij open poort), `src/core/Progression.ts:67-87`.
- **Beschrijving:** Als het laatst vrijgegeven grafeem niet ≥0.8 mastery haalt, blokkeert `canIntroduceNewGrapheme` het volgende grafeem. Zolang er daardoor geen woord mogelijk is (`wordPool < 2`) en het enige item niet Leitner-due is, bevat het plan **alleen stap 8 (Beloning)**. Het kind ontvangt dan een klankvonkje zónder leeswerk en kan de geblokkeerde klank nooit meer oefenen → blijvende lus.
- **Reproductie (bewezen):** profiel `unlockedGraphemes:['m']`, `sessionCount:1`, `LK.m.SOUND.mastery:0.75`, item `m` in box 2. `planSession()` → `sections = [8:Beloning]`. Dit is een realistische toestand: 1× modeling + 3× goed in sessie 1 (mastery ≈0,75, box 4).
- **Fix:** Altijd een oefen-/herhaalsectie genereren voor vrijgegeven zwakke `LK.*`-doelen wanneer `wordPool` te klein is (bv. letterklank-oefening op de zwakke grafeem zelf); en de beloning alleen toekennen na minimaal één afgerond leesitem (GD §6.1: "altijd na leeswerk").

### QA-004 — `saveProfile` vangt schrijffouten niet af (quota / privémodus)
- **Ernst:** Major
- **Bestand:** `src/core/SaveSystem.ts:231-234`, aangeroepen vanuit `src/ui/App.ts:64-66` (`save()`).
- **Beschrijving:** `loadProfile` vangt leesfouten netjes af, maar `saveProfile` roept `storage.write` onbeschermd aan. `localStorage.setItem` gooit `QuotaExceededError` (of bij uitgeschakelde opslag). Dit gebeurt midden in de antwoord-handler (`onEvent` → `save()`), waardoor de exception ongevangen door de UI-laag loopt (de state is al gemuteerd, maar niet opgeslagen).
- **Reproductie:** `saveProfile(profile, { write: () => { throw new Error('QuotaExceededError'); } })` → gooit (bevestigd in test).
- **Fix:** `try/catch` rond `storage.write` in `saveProfile` (en `resetProfile`), retourneer een status of log stil; toon eventueel eenmalig een niet-blokkerende melding in de ouderzone.

### QA-005 — Dubbel doorspoelen van de beloning telt vonkjes en sessies dubbel
- **Ernst:** Major
- **Bestand:** `src/ui/screens/SessionScreen.ts:155-159` (`advance()` zonder afrondingsguard), `src/ui/App.ts:153-158` (`onFinished` telt onvoorwaardelijk op).
- **Beschrijving:** Bij het beloningsitem is `nextBtn` niet geblokkeerd; bij dubbelklik of het ingedrukt houden van Enter/Space (key-repeat) op de ruggelingse rest van het scherm vuurt `advance()` → `onFinished()` meermaals. Elke aanroep doet `addSparks(+1)` én `startNewSession()`.
- **Reproductie (bewezen):** beloningsknop tweemaal `.click()` → save `rewards.klankvonkjes = 2`, `sessionCount = 2`.
- **Fix:** Idempotente guard (`let finished = false`) in `SessionScreen`/`App.onFinished`; zet `nextBtn.disabled = true` direct bij afronding en geef `onFinished` maximaal één keer door.

### QA-006 — Eerste sessie van een vers profiel biedt items met één enkele optie
- **Ernst:** Major
- **Bestand:** `src/core/SessionPlanner.ts:113-147` (stap 3 met `learnedGraphemes = learned`, leeg), `src/learning/util.ts:139-161` (`pickGraphemeDistractors` filtert op `learned` → leeg), `src/learning/LetterSound.ts:37-44`.
- **Beschrijving:** Voor een vers profiel is `learned` leeg, dus er zijn geen afleiders: `placeOptions` levert één optie. Het kind "kiest" de enige knop; er is geen discriminatie en een fout antwoord is onmogelijk. Dit ondermijnt de eerste leerervaring en de adaptiviteit.
- **Reproductie (bewezen):** verse sessie in jsdom → `min(options.length) === 1`; plansimulatie toont 4 items in stap 3 met `learned = ∅`.
- **Fix:** Voor de allereerste introductie bewust een blootstellings-/luisterstap ontwerpen (letter + klank, zonder keuze) óf minimaal één contrastgrafeem als afleider toestaan; documenteer dit als bewuste uitzondering.

### QA-007 — Sessiehervatting op sectieniveau is niet geïmplementeerd
- **Ernst:** Major
- **Bestand:** `src/ui/screens/SessionScreen.ts:28-32` (queue per scherm), `src/ui/App.ts:127-161` (`onExit` → `showMap`, geen voortgang), `src/core/SessionPlanner.ts:322-334` (`skipToStep` alleen in tests).
- **Beschrijving:** GD §3.2 / UX §3.10 beloven "onderbroken sessies hervatten bij de sectie". De `SessionQueue` leeft alleen in het scherm; stoppen halverwege bewaart alleen het profiel (mastery per antwoord), niet de sessiepositie. Bij een nieuwe start wordt een **nieuw plan** gemaakt vanaf stap 1.
- **Reproductie:** Start een sessie, klik halverwege huis → "Naar de kaart", start opnieuw: je begint bij een nieuwe sectie-indeling, niet waar je stopte.
- **Fix:** Sessiepositie (plan + sectie/item-index, of een seed) in het profiel/ aparte savekey opslaan en bij start `skipToStep`/queue-herstel toepassen.

### QA-008 — Frustratiestop na 3× modeling niet aangesloten
- **Ernst:** Major
- **Bestand:** `src/core/Adaptive.ts:107-109` (`shouldStopForFrustration`, alleen door tests gebruikt), `src/core/GameState.ts:109-116` (`consecutiveModeled` wordt geteld).
- **Beschrijving:** `consecutiveModeled` wordt bijgehouden, maar nooit geconsumeerd. ED §10.3 / GD §7 schrijven voor: na 3 gemodelleerde items op rij doorschakelen naar een gemeesterd, makkelijk item. Dat gebeurt niet.
- **Reproductie:** Drie items op rij 3× fout → modeling; de sessie gaat gewoon door met moeilijk materiaal.
- **Fix:** `shouldStopForFrustration(state.consecutiveModeled)` aanroepen in de sessie-loop en een succesvol/gemeesterd item invoegen (of de moeilijkheid verlagen).

### QA-009 — Gemodelleerd item komt niet terug in dezelfde sessie
- **Ernst:** Major
- **Bestand:** `src/core/SessionPlanner.ts:217-255` (herhaling wordt vóór de sessie vastgelegd), `src/core/SpacedRepetition.ts:73-80`.
- **Beschrijving:** GD §5.6 / ED §9.2 beloven dat een gemodelleerd item later in dezelfde sessie terugkomt. De queue staat vast bij planvorming; een tijdens de sessie gemodelleerd item wordt niet opnieuw in de queue gezet. `updateItemState` zet `lastSeenSession` op de huidige sessie, dus het is ook niet "due".
- **Reproductie:** Modelleer een item; het komt in die sessie niet terug (plan is immutable).
- **Fix:** Gemodelleerde items na afronding achteraan de `SessionQueue` her-invoegen.

### QA-010 — Adaptieve bijsturing bínnen de sessie ontbreekt
- **Ernst:** Major
- **Bestand:** `src/core/Adaptive.ts:83-104` (`nextDifficulty`, `shouldSimplify`, alleen tests), `src/core/SessionPlanner.ts:42-48` (`difficultyForSkill`, gebruikt o.a. mastery/consecutiveCorrect).
- **Beschrijving:** Moeilijkheid/optieaantal wordt één keer bij planvorming bepaald uit de mastery van de vorige sessie. Binnen een sessie verandert er niets op basis van fouten; `nextDifficulty`/`shouldSimplify` worden niet gebruikt. Dit is de reden dat "minder keuzes bij fouten" tijdens een sessie niet zichtbaar is.
- **Reproductie:** Maak herhaald fouten; het aantal opties blijft gelijk binnen de sessie.
- **Fix:** Adaptieve regels tijdens de sessie toepassen (herplan per sectie of pas `optionCountFor`/distractorstrategie dynamisch aan) en vastleggen wat de bedoeling is.

### QA-011 — Focusmanagement na schermwissel ontbreekt; focus valt weg
- **Ernst:** Major
- **Bestand:** `src/ui/App.ts:74-78` (`mount()` verplaatst geen focus), `src/ui/screens/SessionScreen.ts:111-125` (eerste optie krijgt geen focus), `src/ui/screens/StartScreen.ts`/`MapScreen.ts`/`RewardScreen.ts` (geen initiële focus).
- **Beschrijving:** ARCHITECTURE §8.1 / UX §6.1 eisen logische focus en "focus valt nooit weg". Na schermwissel (start→sessie, sessie→beloning, etc.) wordt niets gefocust; de actieve focus gaat naar `<body>`. Ook na het renderen van een nieuw item moet de gebruiker eerst Tabben.
- **Reproductie (bewezen):** na start→sessie is `document.activeElement === document.body`.
- **Fix:** Per scherm een vaste focus-bestemming (kop of eerste knop), en bij een nieuw item de eerste optie/de "verder"-knop focussen. Overweeg `inert`/focus-trap in de pauze-dialoog.

### QA-012 — Kind-navigatie en intro zijn tekst-only (niet zelfstandig leesbaar)
- **Ernst:** Major
- **Bestand:** `src/ui/components/LetterIntro.ts:30-62` ("Letternaam", "Klank", "Voorbeeldwoord", "Verder"), `src/ui/screens/RewardScreen.ts:33-40` ("Volgende" zonder icoon/audio), `src/ui/screens/SessionScreen.ts:62-70` (verder-knop heeft wél een pijl-icoon, positief).
- **Beschrijving:** GD §8.1 / UX §1: geen instructietekst die het kind moet lezen; alle uitleg via audio+icoon. De intro- en beloningsknoppen zijn tekst-only en de intro is (door QA-002) zelfs volledig stil. Een 5-jarige kan de sessie/intro daardoor niet zelfstandig doorlopen.
- **Reproductie:** Start als niet-lezer: na de introductie is niet duidelijk welk van de drie tekstknoppen wat doet, en "Volgende" op het beloningsscherm is onleesbaar.
- **Fix:** Icoon + audio op elke kindknop, pictogrammen voor "letternaam/klank/voorbeeld", en overweeg auto-doorgaan of een grote "verder"-pijl met audio.

### QA-013 — `aria-live`-regio start verborgen (`visibility:hidden`)
- **Ernst:** Minor
- **Bestand:** `src/styles.css:548-550` (`.la-feedback.is-hidden { visibility: hidden; }`), `src/ui/components/ActivityView.ts:62-67`.
- **Beschrijving:** Een live-regio die op het moment van tekstupdate `visibility:hidden` was, wordt door sommige screenreaders niet aangekondigd. De klasse wordt verwijderd en de tekst in dezelfde tick gezet.
- **Fix:** Regio altijd in de accessibility-tree houden (bv. `clip`/`sr-only`, of opacity 0 i.p.v. visibility) of de tekst ná het zichtbaar maken in een microtask zetten.

### QA-014 — Pauze-dialoog heeft geen focus-trap/Escape-sluiten en geen correcte semantiek
- **Ernst:** Minor
- **Bestand:** `src/ui/screens/SessionScreen.ts:162-195` (`role="dialog" aria-modal="true"`, maar achterliggende knoppen blijven focusbaar; Escape sluit niet als overlay open is).
- **Beschrijving:** Tab kan achter de overlay langs; `aria-modal` wordt niet waargemaakt.
- **Fix:** Focus-trap + `inert` op de achtergrond, Escape sluit de overlay, focus terug naar de oproeper.

### QA-015 — `OptionGrid` gebruikt `role="group"` + `aria-pressed` i.p.v. radiogroep
- **Ernst:** Minor
- **Bestand:** `src/ui/components/OptionGrid.ts:46-63`, `:109-118`.
- **Beschrijving:** UX §6.2 vraagt een `radiogroup`/lijst met `aria-checked`/`aria-pressed`. `aria-pressed` op niet-toggle antwoordknoppen is semantisch misleidend.
- **Fix:** `role="radiogroup"` + `role="radio"`/`aria-checked`, of een gewone `role="group"` zonder `aria-pressed`.

### QA-016 — Hint-timeouts worden niet opgeruimd
- **Ernst:** Minor
- **Bestand:** `src/ui/components/ActivityView.ts:181-202` (`window.setTimeout` per blok), `:302` (`destroy` ruimt alleen de keydown op).
- **Beschrijving:** Bij snel doorgaan/schermwissel kunnen timeouts op losgekoppelde nodes blijven lopen.
- **Fix:** Timer-ID's bijhouden en in `destroy()` clearen.

### QA-017 — Opruimen van listeners gebeurt via een globale MutationObserver
- **Ernst:** Minor
- **Bestand:** `src/ui/screens/SessionScreen.ts:218-225` (observeert `document.body` met `subtree: true`).
- **Beschrijving:** Elke DOM-mutatie in de hele app triggert de callback; de keydown-listener wordt asynchroon (microtask) opgeruimd, dus er is een kort venster met een stale listener. Werking is correct, maar fragiel/perf-gevoelig.
- **Fix:** Expliciete `destroy()` op het scherm, aangeroepen door `App.mount`.

### QA-018 — Rustige modus/hoog contrast/auto-repeat instelbaar noch werkend
- **Ernst:** Minor
- **Bestand:** `src/content/uiTexts.ts:16-18` (instellingsteksten bestaan), `src/ui/screens/StartScreen.ts:78-84` (alleen geluidstoggle), `src/core/SaveSystem.ts:52-59`/`src/types.ts:214`, `src/ui/App.ts:68-72`.
- **Beschrijving:** `reducedMotion`, `highContrast` en `autoRepeatPrompt` bestaan in het model, maar er is geen UI om ze te zetten; `autoRepeatPrompt` wordt **nergens** gelezen. GD §7 ("prompt automatisch herhalen bij lage mastery") is dus niet geïmplementeerd.
- **Fix:** Instellingenscherm (achter oudercheck) toevoegen en auto-repeat-werking implementeren, of de velden/teksten verwijderen tot ze bestaan.

### QA-019 — CSP in `index.html` blokkeert Vite dev HMR
- **Ernst:** Minor
- **Bestand:** `index.html:6-9` (meta-CSP met `connect-src 'self'`).
- **Beschrijving:** De dev-server serveert dezelfde CSP; Vite injecteert `<script type="module" src="/@vite/client">` en verbindt via `ws://localhost:<port>`. `'self'` (http) staat geen `ws:` toe → HMR-websocket wordt geblokkeerd (console-CSP-fout). ARCHITECTURE §8.2 erkent dit al als dev-caveat, maar er is niets geïmplementeerd.
- **Reproductie (bewezen):** `npx vite` → HTML bevat `@vite/client` + de strikte CSP; HMR-verbinding faalt, live-reload werkt niet.
- **Fix:** CSP alleen in de build injecteren (Vite-plugin `transformIndexHtml` met `apply: 'build'`, of via serverheaders), zodat dev HMR ongemoeid blijft; productie-CSP blijft bindend.

### QA-020 — Randgevallen en dode staat/settings
- **Ernst:** Minor
- **Bestand:** `src/core/GameState.ts:20-24,131-133` (`sessionStep`/`advanceStep` ongebruikt), `:109-116` (`consecutiveModeled` ongebruikt, zie QA-008), `src/core/SessionPlanner.ts:74-79` (progressie-`record` alleen voor afleiderposities).
- **Beschrijving:** `sessionStep` wordt alleen op 1 gezet en nooit bijgewerkt; `advanceStep` is dood. Verder wordt een pas geïntroduceerd grafeem al opgeslagen (`introduceGrapheme` → `save`) voordat er ook maar één item mee is gedaan; bij vroegtijdig verlaten staat het vrij zonder oefening.
- **Fix:** Dode code verwijderen of aansluiten; unlock pas definitief maken na het doorlopen van de introductie-items.

### QA-021 — Kleine tikdoelen op ouder-/startscherm
- **Ernst:** Minor
- **Bestand:** `src/styles.css:731-738` (`.la-gate-input`, ~40 px hoog), `:296-299`/`src/ui/screens/StartScreen.ts:78-84` (audiotoggle-label met kleine checkbox).
- **Beschrijving:** GD §8.3/UX §6.3 eisen ≥64 px; de som-invoer en de checkbox zijn kleiner.
- **Fix:** Minimumhoogte 64 px en groter klikvlak voor de checkbox.

### QA-022 — Sessie-einde speelt `fb.nav.done.1` niet en toont geen "gapen"-kaart
- **Ernst:** Minor
- **Bestand:** `src/ui/App.ts:153-158` (`onFinished` → `showReward`), `src/ui/screens/RewardScreen.ts:14-44` (geen audio, geen vaste hoeken).
- **Beschrijving:** GD §3.3 vraagt audio "We zijn klaar! Je hebt goed geoefend." en een kaart met Ploef die gaapt; het beloningsscherm heeft geen audio en mist de vaste HUIS/OOR-hoeken (UX §3.9).
- **Fix:** `fb.nav.done.1` afspelen bij sessie-einde; vaste hoeken op beloningsscherm.

### QA-023 — Beloning kan zonder leeswerk (gegeneraliseerd)
- **Ernst:** Minor
- **Bestand:** `src/ui/App.ts:153-158` (`addSparks(profile,1)` onvoorwaardelijk).
- **Beschrijving:** Een vonkje wordt altijd gegeven bij sessie-einde, ook als het plan (zie QA-003) geen leesitems bevatte. GD §6.1: "altijd na leeswerk, nooit als je alleen maar tikt".
- **Fix:** Voorwaardelijk maken aan afgeronde leesitems.

### QA-024 — `wx`-foutmelding in ouder-gate direct daarna onbereikbaar
- **Ernst:** Nit
- **Bestand:** `src/parent/ParentGate.ts:120-136`, `:63-72` (interval wordt niet opgeruimd als het scherm wordt verwijderd).
- **Beschrijving:** `error.textContent` wordt gezet, maar `onFail()` navigeert direct weg; de tekst is dus nooit zichtbaar. Het hold-interval lekt bij unmount.
- **Fix:** Interval opruimen via een `destroy`, en ofwel de foutmelding tonen ofwel de regel verwijderen.

### QA-025 — `updateProgress` rekent "N+1 van N" op het einde
- **Ernst:** Nit
- **Bestand:** `src/ui/screens/SessionScreen.ts:74-78`.
- **Beschrijving:** Als de queue leeg is, is `remaining() = 0` → `current = total + 1`. De regel is `aria-live="off"` en sr-only, dus onzichtbaar, maar onjuist.
- **Fix:** `Math.min(total, …)`.

### QA-026 — Ouder-dashboard toont geen week-/tijdsduur, alleen totaal
- **Ernst:** Nit
- **Bestand:** `src/parent/ParentDashboard.ts:138-147`.
- **Beschrijving:** GD §9.2 vraagt "oefentijd per week" en "hulpgebruik-trend"; het dashboard toont enkel `sessionCount` en een mediane reactietijd, geen tijd/trend.
- **Fix:** Sessietimestamps/duur opslaan en weekaggregatie tonen (of scope expliciet beperken).

---

## 5. Checklist acceptatiecriteria

| # | Criterium | Status | Toelichting |
|---|---|---|---|
| 1 | Kind start zelfstandig een sessie | ⚠️ Gedeeltelijk | Startknop met icoon + audio-cue werkt; maar audio ontbreekt (QA-001/002), na herladen landt men direct op de kaart, en navigatie/intro zijn tekst-only (QA-012). |
| 2 | Letters/klanken oefenen | ⚠️ Gedeeltelijk | Mechaniek + mastery werken; eerste sessie heeft 1 optie (QA-006); klank→letter is zonder audio onoplosbaar (QA-002). |
| 3 | Hakken | ✅/⚠️ | Enige activiteit die volledig visueel werkt; de rijkere GD-mechaniek (tikken op volgorde, klankrij) is vereenvoudigd tot één keuze. |
| 4 | Plakken | ❌ | Vraagt gerekte klankreeks (audio); zonder opnames/TTS onoplosbaar (QA-002). |
| 5 | Decoderen | ⚠️ Gedeeltelijk | Woordlezen toont het geschreven woord en onthult het plaatje pas ná correct (correct), maar de opties zijn audio-only → zonder geluid onoplosbaar. |
| 6 | Vriendelijke feedback | ✅ | Geen "fout"/rood/kruis; kleur + icoon + tekst, `aria-live="polite"` (let op QA-013). Audio ontbreekt. |
| 7 | Voortgang opgeslagen | ⚠️ Gedeeltelijk | Per antwoord opgeslagen (robuuste load/migratie); quota-schrijffout ongevangen (QA-004); sessiepositie niet bewaard (QA-007). |
| 8 | Adaptief | ⚠️ Gedeeltelijk | Tussen sessies via `difficultyForSkill` (bewezen: hoog→meer opties). Binnen een sessie niets; frustratiestop en vereenvoudiging niet aangesloten (QA-008/010). |
| 9 | Ouder bekijkt voortgang | ✅/⚠️ | Gate (5 s + som) en dashboard met neutrale labels; geen week-/trendweergave (QA-026), kleine tikdoelen (QA-021). |
| 10 | Tests aanwezig | ✅/⚠️ | 99 tests groen, strict typecheck, validator + build-gate. Gaten: geen tests voor quota-write, dubbele beloning, beloning-zonder-oefening, focus en dev-CSP. |

**Aanvullend (uit de opdracht):**
- **Toetsenbordnavigatie:** functioneel aanwezig (Tab, pijltjes in de optiegroep, Enter/Space, cijfers 1–4, H = herhalen, Esc = pauze, Home = kaart). Ontbreekt: initiële focus en focusbehoud na schermwissel (QA-011), focus-trap in de pauze-dialoog (QA-014).
- **Touch targets:** overwegend ≥64 px; uitzonderingen op ouder-/startscherm (QA-021).
- **Reduced motion:** CSS-mediaquery én `body.la-reduced-motion` aanwezig; de instelling is echter niet instelbaar (QA-018).
- **Opslag/edge cases:** corrupte save is robuust afgehandeld; quota niet (QA-004); herladen verliest sessiepositie (QA-007); verse sessie met 1 optie (QA-006).

---

## 6. Prioriteit voor de ontwikkelaars

1. **QA-001 + QA-002** — audio-pipeline repareren (error ≠ played) én een visuele fallback bouwen; zonder dit is de app onbruikbaar voor de doelgroep.
2. **QA-003** — progressiedeadlock doorbreken (altijd oefening op zwakke vrijgegeven klanken; beloning alleen na leeswerk).
3. **QA-005** — idempotente sessie-afronding (dubbele beloning/sessie).
4. **QA-004** — `saveProfile`-foutafhandeling.
5. **QA-006** — zinvolle eerste-sessie-introductie (geen 1-optie-items).
6. **QA-007/008/009/010/011/012** — de expliciet beloofde sessie-/adaptiviteits-/focusgedragingen.

*Einde rapport.*
