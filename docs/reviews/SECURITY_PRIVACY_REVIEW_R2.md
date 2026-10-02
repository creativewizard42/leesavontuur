# Security & Privacy Review — LEESAVONTUUR (Ronde 2)

- **Rol:** Security / Privacy Reviewer (kindveiligheid, AVG/GDPR, Age-Appropriate Design)
- **Object:** `leesavontuur` (TypeScript + Vite, statische offline webapp, doelgroep 5–6 jaar)
- **Commit:** `main @41985f5` ("Merge fix/ui (F3: UI-integratie + security fixes)")
- **Scope-instructie:** uitsluitend analyse; **geen broncode gewijzigd, geen commits**. Alleen dit document toegevoegd.
- **Datum:** 2026-10-01
- **Methode:** statische code-inspectie (`src/`, `index.html`, `public/`, `vite.config.ts`, `package.json`), verse productiebuild (`npm run build`), inspectie van `dist/` (HTML/CSP/JS/CSS/sourcemaps/licenties), greps op netwerk-/spraak-/injectie-/opslagsinks, `npm audit`, en de volledige testsuite (`npm test`, 190 tests).
- **Build bij review:** Vite v8.x, vitest v5.0.3, `dist/assets/index-DGUyIYv4.js` (109,4 kB / 32,6 kB gzip), `dist/assets/index-Ccf15t9f.css` (19,4 kB).
- **Ronde 1:** `docs/reviews/SECURITY_PRIVACY_REVIEW.md`.

## Samenvatting

De applicatie is na ronde 1 aantoonbaar gehard. De meeste Medium/Low-bevindingen zijn **opgelost**, `npm audit` is **schoon (0 vulnerabilities)**, de CSP staat nu **alleen in de productiebuild** en is strenger (`style-src 'self'` zónder `unsafe-inline`), de reset wist **alle** opslagsleutels, `saveProfile` gooit niet meer, prototype-mutatie is afgeschermd, en de OFL-licenties zitten in `dist/`.

De **nieuwe code** (sessie-hervatten via `leesavontuur.session.v1`, `SessionQueue.fromJSON`) introduceert geen netwerk-, spraak- of injectieproblemen, maar is **niet schema-gevalideerd** bij het inlezen. Dat is alleen bereikbaar via lokale `localStorage`-manipulatie en levert laag-ernstige robuustheidsrisico's op, geen escalatie.

Resterende punten:

- **Medium (deels open, SEC-002):** anti-clickjacking is **niet in de repo afgedwongen**. `frame-ancestors` is correct uit de meta-CSP gehaald en gedocumenteerd (`docs/SECURITY_HEADERS.md`), maar er is **geen host-configbestand** (`_headers`/`netlify.toml`/…) opgenomen en `docs/ARCHITECTURE.md:416-417` beweert nog steeds dat `frame-ancestors 'none'` in de meta-CSP actief is. Bescherming hangt dus af van de deployer.
- **Low (SEC-010, deels open):** de ongebruikte `html`-optie (`innerHTML`-sink) staat nog in `src/ui/dom.ts:26-27`.
- **Low (nieuw, SEC-R2-001/002):** `SessionQueue.fromJSON` valideert de vormen van `skillStates`/`recentEvents` en de omvang van `sections` niet.

**Er zijn geen Critical- of High-bevindingen** in de meeleverde applicatie of in de nieuwe code.

### Ernst-tabel (nieuw + rondestatus)

| ID | Ernst | Onderwerp | Bestand:regel | Status ronde 1 |
|----|-------|-----------|---------------|----------------|
| SEC-R2-001 | Low | `fromJSON` valideert `skillStates`/`recentEvents` niet | `src/core/SessionPlanner.ts:708-709` | Nieuw |
| SEC-R2-002 | Low | Geen omvang-/aantalcap bij inlezen resume-JSON | `src/core/SessionPlanner.ts:746-766` | Nieuw |
| SEC-R2-003 | Medium | Anti-clickjacking niet in repo afgedwongen; ARCHITECTURE.md stale | `docs/ARCHITECTURE.md:416-417`, geen hostconfig | SEC-002 (Deels) |
| SEC-R2-004 | Low | `html`-optie (`innerHTML`-sink) nog aanwezig, ongebruikt | `src/ui/dom.ts:26-27` | SEC-010 (Deels) |
| SEC-R2-005 | Info | `img-src`/`media-src data: blob:` ruimer dan nodig | `vite.config.ts:17-18` | — |
| SEC-R2-006 | Info | Resume-sleutel bevat gedragsdata (geen PII), TTL/reset correct | `src/core/SessionPlanner.ts:728-730`, `src/ui/App.ts:235-240` | Nieuw (Info) |

---

## 1. Verificatie ronde 1 — per issue

| ID | R1-ernst | Status R2 | Bewijs |
|----|----------|-----------|--------|
| SEC-001 | Info (PASS) | **Opgelost / gehandhaafd** | Grep `src/` op `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `import(`, `new Worker`, `serviceWorker`, `Notification`: **0 treffers** in applicatiecode. Enige `https?://`-treffers zijn de SVG-namespace (`dom.ts:45,56`, `icons.ts:9,107`), `import(...)`-types in `content/types.ts`, en testfixtures (`AudioService.test.ts:112,234`). Productie-JS bevat geen netwerk-API's; `dist/` heeft geen `.map`. |
| SEC-002 | Medium | **Deels** (zie SEC-R2-003) | `frame-ancestors` is uit de meta-CSP verwijderd (staat niet meer in `vite.config.ts:13-24` of `dist/index.html:16`) en `docs/SECURITY_HEADERS.md` beschrijft de HTTP-header + Netlify/nginx/Apache-voorbeelden. **Maar:** er is **geen** `_headers`/`netlify.toml`/`vercel.json` in de repo, en `docs/ARCHITECTURE.md:416-417` claimt nog steeds een actieve `frame-ancestors 'none'` in de meta-CSP. Afdwinging ontbreekt in de repo. |
| SEC-003 | Low | **Opgelost** | CSP wordt via plugin `leesavontuur-production-csp` (`vite.config.ts:26-37`, `apply: 'build'`) uitsluitend in de build geïnjecteerd. `index.html` bevat in dev **geen** CSP meer (alleen `referrer` + commentaar), dus Vite dev-HMR (`ws://`) wordt niet geblokkeerd. `dist/index.html:16` bevat de CSP wél. |
| SEC-004 | Low | **Opgelost** | CSP is `style-src 'self'` **zonder** `'unsafe-inline'` (`vite.config.ts:16`, `dist/index.html:16`). Grep `src/` op `style:`/`style=`: **0 treffers**; UI gebruikt uitsluitend CSSOM (`element.style.width/height/background`) in `ParentDashboard.ts:59-61` en `ParentGate.ts:69,77,92`, wat buiten het bereik van `style-src` valt. `dist/assets/*.css` is extern. |
| SEC-005 | Medium | **Opgelost** | `App.showParentDashboard().onReset` roept nu `clearConfusions(storage)` én `clearSessionState(storage)` aan naast `resetProfile` (`src/ui/App.ts:234-241`). Regressietest aanwezig: `src/ui/__tests__/app.test.ts` "wist na reset alle opslagsleutels (SEC-005)" controleert `SAVE_KEY`/`CONFUSION_KEY`/`SESSION_RESUME_KEY`. |
| SEC-006 | Low | **Opgelost** | `saveProfile` vangt JSON- én schrijffouten af en retourneert `SaveResult` (`src/core/SaveSystem.ts:263-276`; `classifyWriteError` 252-257). Aanroeper `App.save()` verwerkt `ok:false` via `saveFailed` (`App.ts:83-87`) en het dashboard toont een rustige melding. |
| SEC-007 | Low | **Opgelost** | `normalizeSkills`/`normalizeItems` gebruiken `Object.create(null)` (`SaveSystem.ts:138,151`) en slaan `DANGEROUS_KEYS` (`__proto__`, `constructor`, `prototype`) over (`SaveSystem.ts:32-33,142,155`). Geen prototype-mutatie meer. |
| SEC-008 | Info | **Gehandhaafd (Info)** | Opslagsleutels: `leesavontuur.save.v1`, `leesavontuur.confusions.v1`, **nieuw** `leesavontuur.session.v1`. Geen naam/e-mail/geboortedatum/locatie. Zie SEC-R2-006 voor inhoud resume-sleutel. |
| SEC-009 | Info (PASS) | **Opgelost / gehandhaafd** | Export normaliseert via `normalizeProfile` (`SaveSystem.ts:279-281`), geen PII. Grep op `FileReader`, `showOpenFilePicker`, `readAsText`, `type="file"`/`type: 'file'`, `drop` in `src/`: geen importpad (alleen toevallige `dropped`-variabele in een test). Aanvalsvector import blijft gesloten. |
| SEC-010 | Low | **Deels** (zie SEC-R2-004) | `innerHTML`-sinks bestaan nog: `src/ui/dom.ts:27` (`html`-optie) en `dom.ts:57` (`svgFromString`). `svgFromString` krijgt uitsluitend statische in-code SVG's; de `html`-optie is nog steeds **ongebruikt** (grep `html:` levert geen echte call). Latent, geen actieve XSS. |
| SEC-011 | Info (PASS) | **Gehandhaafd** | Geen `target=_blank`/`window.open`/externe `<a>`; enige `<a>` is de blob-download (`ParentDashboard.ts:257`). Geen chat/ads/prijzen; beloning deterministisch. Ouder-gate bemiddelt dashboard/export/reset. |
| SEC-012 | Low | **Opgelost** | `data-sum` is verwijderd; `ParentGate.ts:47` toont enkel de zichtbare som (`${a} + ${b} =`) en `verifySum` controleert `value === a + b` (`ParentGate.ts:125-134`). Geen verklikkend attribuut meer in de DOM. |
| SEC-013 | Medium (dev-only) | **Opgelost** | `package.json` op `vite ^8.3.2`, `vitest ^5.0.3`, `vite-node ^6.0.0`. `npm audit` → **"found 0 vulnerabilities"**. Geen dev-tooling-advisories meer. |
| SEC-014 | Low | **Opgelost** | `public/licenses/` met `andika-LICENSE.txt`, `atkinson-hyperlegible-LICENSE.txt`, `README.md`; deze worden meegekopieerd naar `dist/licenses/` (aanwezig na verse build). |
| SEC-015 | Info (PASS) | **Gehandhaafd** | `loadConfusions`/`recordConfusion` kappen op 50 (`confusions.ts:43,64`). Save-normalisatie begrenst lijsten (`SaveSystem.ts:36-39,104-107`). Resume-JSON heeft géén expliciete cap → zie SEC-R2-002. |
| SEC-016 | Info (PASS) | **Gehandhaafd** | `<meta name="referrer" content="no-referrer">` (`index.html:12`, `dist/index.html:12`). Geen `.map` in `dist/`. |
| SEC-017 | Info (Future) | **Onveranderd** | Aanbevelingen voor toekomstige cloud-sync blijven geldig; nog geen sync aanwezig. |

---

## 2. Nieuwe checks op de nieuwe code

### 2.1 Netwerk (src/ + dist/)
- Grep over `src/` op `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `new Worker`, `serviceWorker`, `Notification`, `import(` → **geen treffers** in applicatiecode.
- `dist/assets/index-*.js` bevat geen `XMLHttpRequest`/`WebSocket`/`sendBeacon`/`EventSource`/`fetch(` en geen externe `https?://`-hosts (alleen SVG-namespace).
- `src/styles.css`, `src/content/*.ts` en `public/` bevatten geen externe URL's (geen `url(http…)`, geen `@import`). Fonts lokaal via `@fontsource` (`main.ts:5-8`).
- **Conclusie: PASS.**

### 2.2 CSP in `dist/index.html`
`dist/index.html:16`:
```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
media-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none';
base-uri 'none'; form-action 'none'
```
- **Geen** `unsafe-inline`, **geen** `unsafe-eval`; `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` aanwezig. Grep op `unsafe-inline|unsafe-eval|eval(` in `dist/` → **0 treffers**.
- `frame-ancestors` ontbreekt bewust (meta-negering; zie SEC-002). `connect-src 'self'` blokkeert externe verbindingen.
- **Conclusie: PASS** (met de SEC-002-kanttekening dat anti-clickjacking via HTTP-header moet).

### 2.3 Dev-modus
- `index.html` bevat in dev **geen CSP**; de plugin heeft `apply: 'build'`. Er is dus geen CSP-blokkade van `/@vite/client` of de HMR-`ws://`-socket. **PASS.**
- Keerzijde (bewust, acceptabel): dev kent geen CSP. Dit is geen productie-exposure.

### 2.4 Injectie: inline style / innerHTML met storage- of contentdata
- Geen `style`-attributen in `src/`. Alle tekst gaat via `textContent`/`createTextNode` (`dom.ts:25,39`).
- `innerHTML` alleen in `dom.ts:27` (ongebruikte `html`-optie) en `dom.ts:57` (statische SVG's). Geen pad waarbij opslag-/contentdata in `innerHTML` belandt; `iconAvatar` valt bij onbekende id terug op een whitelisted icoon. **PASS**, behoudens latent SEC-R2-004.

### 2.5 `speechSynthesis` — uitsluitend lokale stem
- `isLocalDutchVoice` eist `voice.localService === true` **én** `lang` beginnend met `nl` (`AudioService.ts:128-130`).
- `resolveLocalVoice` (`AudioService.ts:201-237`): als `getVoices()` direct een lokale nl-stem heeft → die; als de lijst **gevuld** is maar geen lokale nl-stem bevat → **`undefined` zonder te wachten** (regel 212); alleen bij een **lege** lijst wordt kort op `voiceschanged` gewacht. De `onChange`/timeout roepen `finish(value ?? localVoiceNow())`, en `localVoiceNow()` levert uitsluitend een `localService===true`-stem. `speak()` doet `if (!speech || !voice) return false` en zet `utterance.voice = voice`.
- **Er kan dus nooit een cloud-/defaultstem worden gekozen.** Geen `speechRecognition`/`getUserMedia`/`mediaDevices` in `src/` (grep: 0).
- **Conclusie: PASS.**

### 2.6 Nieuwe localStorage-sleutel `leesavontuur.session.v1`
- **Inhoud:** `SerializedSessionQueue` (`SessionPlanner.ts:441-454`): `version`, `savedAt`, `sessionNumber`, `sections` (afgeleid uit de content: prompts/opties/`correct`), indices/counters, `skillStates`, `recentEvents` (max 20 events per skill). Geen naam/e-mail/leeftijd/locatie → **geen PII**.
- **TTL:** 12 uur (`RESUME_TTL_MS`, `SessionPlanner.ts:730`), gehandhaafd in `loadSessionState` (`SessionPlanner.ts:761`); verlopen/afwijkende `version` → `undefined`.
- **Reset:** `App.onReset` wist de sleutel (`App.ts:237`) + test.
- **Corrupte JSON:** `JSON.parse` in `try/catch` → `undefined` (`SessionPlanner.ts:758-765`).
- **Prototype pollution via `fromJSON`:** `skillStates`/`recentEvents` worden in **`Map`** gezet (`SessionPlanner.ts:708-709`) — `Map` kent geen prototype-setter, dus `__proto__` is ongevaarlijk. `sections` worden via spread + `cloneItem` (JSON round-trip) verwerkt; `JSON.parse` maakt `__proto__` een eigen data-property. **Geen prototype-pollution.** ✅
- **Robuustheid:** géén schema-/typevalidatie van de waarden en géén omvangcap → **SEC-R2-001/002**.

### 2.7 Ouder-gate niet bypassbaar
- Dashboard/export/reset uitsluitend via `onPass` na 5 s vasthouden **én** correcte som (`ParentGate.ts:106-135`). Fout → `onFail` → terug naar kaart (`App.ts:220`). Geen alternatieve route in de UI. `holdMs`/`sum` zijn injecteerbaar (tests), niet via opslag/URL. **PASS.**

### 2.8 Export bevat geen PII
- `exportProfile` = `JSON.stringify(normalizeProfile(profile))` (`SaveSystem.ts:279-281`); `normalizeProfile` bevat geen persoonsvelden. Bestandsnaam `leesavontuur-profiel.json`; blob-URL direct gerevoked (`ParentDashboard.ts:252-262`). **PASS.**

### 2.9 `npm audit` en licenties in `dist/`
- `npm audit`: **0 vulnerabilities**.
- `dist/licenses/` aanwezig met beide OFL-teksten + README. **PASS.**

### 2.10 Tests
- `npm test` → **23 testfiles, 190 tests, allemaal geslaagd** (inclusief de SEC-005-resettest).

---

## 3. Nieuwe bevindingen

### SEC-R2-001 — `SessionQueue.fromJSON` valideert `skillStates`/`recentEvents` niet
- **Ernst:** Low
- **Locatie:** `src/core/SessionPlanner.ts:708-709` (gelezen uit `loadSessionState`, `746-766`)
- **Risico:** Een gemanipuleerde/Corrupte `leesavontuur.session.v1` kan waarden van willekeurig type in `skillStates`/`recentEvents` zetten (bijv. `null`, string, getal). Bij hervatten wordt `recentEvents.get(skillId)` ge-`concat` en aan `shouldSimplify`/adaptieve logica gegeven; `skillStates`-waarden worden via `??` wel deels opgevangen, maar niet-getal-/niet-objectwaarden kunnen tot onverwachte adaptieve uitkomsten of een runtime-fout in `reportOutcome` leiden (die niet in `try/catch` zit). Alleen bereikbaar via **lokale** opslagmanipulatie; geen netwerk-/XSS-escalatie.
- **Fix:** Valideer bij `fromJSON`: neem alleen records met de verwachte velden over (hergebruik `ensureSkillDetail`/`createSkillState`), filter `recentEvents` op array-vorm en begrens op `MAX_EVENTS_PER_SKILL`; sla ongeldige keys/waarden over. Wikkel `reportOutcome` defensief in `try/catch` of laat `loadSessionState` bij twijfel een verse sessie starten.

### SEC-R2-002 — Geen omvang-/aantalcap bij inlezen resume-JSON
- **Ernst:** Low
- **Locatie:** `src/core/SessionPlanner.ts:746-766`, `697-712`
- **Risico:** `loadSessionState` parseert en verwerkt de volledige JSON zonder limiet op het aantal `sections`/`items`/`recentEvents`. Een opgeblazen sleutel (tampered `localStorage`) kan veel geheugen/verwerking vragen bij het starten van een sessie (lokale DoS). Geen remote vector.
- **Fix:** Begrens het aantal secties/items (bijv. `MAX_SECTIONS`, `MAX_ITEMS` zoals in `SaveSystem`) en weiger de sleutel boven een maximale stringlengte; val terug op een verse sessie.

### SEC-R2-003 — Anti-clickjacking niet in de repo afgedwongen; stale docs (residu SEC-002)
- **Ernst:** Medium
- **Locatie:** `docs/ARCHITECTURE.md:416-417` (claimt `frame-ancestors 'none'` in de meta-CSP), ontbrekende hostconfig (`_headers`/`netlify.toml`/`vercel.json`)
- **Risico:** De meta-CSP negeert `frame-ancestors`; de correcte HTTP-header staat alleen als **documentatie** in `docs/SECURITY_HEADERS.md`. Zonder dat de deployer die header daadwerkelijk zet, kan de app in een `<iframe>` worden geladen (clickjacking op ouder-gate/reset/export). `ARCHITECTURE.md` wekt de indruk dat het al geregeld is.
- **Fix:** (1) Neem een concreet hostconfigbestand op (bijv. `public/_headers` of `netlify.toml`) met `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, zodat de repobuild dit meelevert; (2) corrigeer `docs/ARCHITECTURE.md:416-417` zodat het `frame-ancestors` niet langer als meta-actief presenteert; (3) documenteer dat bij `file://`/lokale installatie clickjacking niet relevant is.

### SEC-R2-004 — `html`-optie (`innerHTML`) nog aanwezig, ongebruikt (residu SEC-010)
- **Ernst:** Low
- **Locatie:** `src/ui/dom.ts:26-27`
- **Risico:** Latente XSS-sink. Momenteel geen aanroep, dus geen actief risico; toekomstig gebruik met niet-constante input zou direct een injectievector openen.
- **Fix:** Verwijder de `html`-optie (aanbevolen) of documenteer/verbied gebruik met niet-constante input, en voeg een lintregel toe die `innerHTML` buiten `dom.ts` verbiedt.

### SEC-R2-005 — `img-src`/`media-src data: blob:` ruimer dan nodig
- **Ernst:** Info
- **Locatie:** `vite.config.ts:17-18`
- **Risico:** `data:`/`blob:` zijn niet strikt nodig voor de huidige statische assets (behalve de blob-download, die geen CSP-toepassing op navigatie kent). Verkleint het aanvalsoppervlak verder als het tot `'self'` wordt beperkt.
- **Fix:** Overweeg `img-src 'self'` en `media-src 'self'`; accepteer bewust anders.

### SEC-R2-006 — Resume-sleutel bevat gedragsdata (geen PII), correct begrensd/gewist
- **Ernst:** Info
- **Locatie:** `src/core/SessionPlanner.ts:728-730`, `src/ui/App.ts:235-240`
- **Risico:** `recentEvents` bevat antwoordmomenten/tijden en gekozen opties (gedragsdata). Geen directe PII; TTL 12 u en reset wissen de sleutel correct.
- **Fix:** Vermeld `leesavontuur.session.v1` (met 12-uurs TTL) expliciet in de privacyverklaring en in de opslagsleutel-documentatie.

---

## PRIVACY.md-concept (definitief)

> **LEESAVONTUUR — privacy in het kort**
>
> **Wat is dit?** LEESAVONTUUR is een leesspel voor kinderen van 5–6 jaar. Het werkt volledig **op dit apparaat, zonder internet**. Er is geen account en er is geen verbinding nodig om te spelen.
>
> **Welke gegevens bewaart het spel?**
> - Een **dierenvriendje** als profiel (bijvoorbeeld eekhoorn, uil, vos of konijn). Er wordt **geen naam, geen leeftijd, geen geboortedatum en geen woonplaats** gevraagd of bewaard.
> - Hoe ver uw kind is: welke klanken en woorden al geleerd zijn, een paar cijfers over het oefenen (aantal sessies, reactietijd) en beloningsblaadjes.
> - Welke klanken of woorden wel eens verwisseld worden, zodat het spel daar extra mee kan oefenen.
> - Als een sessie wordt onderbroken: de tussenstand van die sessie, zodat uw kind verder kan waar het gebleven was. Die tussenstand wordt na **12 uur automatisch verwijderd**.
>
> Al deze gegevens staan **alleen op dit apparaat** (in de browseropslag) onder de sleutels `leesavontuur.save.v1`, `leesavontuur.confusions.v1` en `leesavontuur.session.v1`. Ze worden **niet verstuurd, niet geüpload en niet gedeeld**. Er zijn **geen advertenties, geen tracking en geen analytics**.
>
> **Geluid.** Het spel gebruikt alleen gesproken audio die **op dit apparaat** beschikbaar is. Er worden **geen teksten naar internet gestuurd** voor spraak. Alleen een stem die het apparaat zelf aanbiedt (een zogenoemde lokale stem) wordt gebruikt; is er geen geschikte stem, dan blijft het spel gewoon werken — met beeld en zonder geluid.
>
> **Bewaren.** De gegevens blijven staan zolang u het spel op dit apparaat gebruikt, zodat uw kind verder kan waar het gebleven is. Er is geen tijdslimiet aan verbonden; u bepaalt zelf wanneer u wist.
>
> **Uw kind laten stoppen of gegevens wissen.** Achter het **ouderhol** (5 seconden vasthouden + een eenvoudige som) kunt u:
> - de gegevens **bewaren als bestand** (een JSON-bestand op dit apparaat) — dit bestand bevat geen namen of andere persoonlijke gegevens; en
> - **alles wissen** met "Begin helemaal opnieuw". Dit wist het spelprofiel, het log met verwisselingen én een eventueel onderbroken sessie.
>
> **Toekomst.** Als er ooit synchronisatie tussen apparaten komt, dan alleen met **duidelijke toestemming van ouders**, met zo weinig gegevens als mogelijk, versleuteld, en na een privacytoets (DPIA). Nu is dat er niet.
>
> **Vragen?** Neem contact op met de makers van LEESAVONTUUR. *(Vul hier vóór publicatie een contactadres/e-mail in.)*

*Deze tekst is definitief bedoeld voor overname als `docs/PRIVACY.md`. Vul nog een contactadres in en laat de opslagsleutels meelopen met toekomstige schemawijzigingen.*

---

## Security/Privacy sign-off

**Akkoord met voorwaarden.**

Toelichting: geen Critical- of High-bevindingen; de meeleverde applicatie (inclusief de nieuwe resume-functionaliteit) heeft geen netwerkverkeer, geen cloud-TTS, geen PII-export en een strikte productie-CSP. De sign-off is onder de volgende voorwaarden:

1. **SEC-R2-003 (Medium):** lever een hostconfigbestand met `frame-ancestors 'none'` + `X-Content-Type-Options: nosniff` + `Referrer-Policy: no-referrer` + `Permissions-Policy` mee, of bevestig schriftelijk de HTTP-headers op de hostingserver; corrigeer `docs/ARCHITECTURE.md:416-417`.
2. **SEC-R2-001/002 (Low):** valideer en begrens `SessionQueue.fromJSON` (types + omvang) vóór een volgende release.
3. **SEC-R2-004 (Low):** verwijder de ongebruikte `html`-optie of verbied gebruik met niet-constante input.
4. Publiceer de privacyverklaring hierboven met een ingevuld contactadres.

Zolang voorwaarden 1–3 niet zijn afgerond, blijft de status **Medium/Low open** maar is er **geen blokkade voor een offline/lokale release**; voor **publieke webhosting** is voorwaarde 1 verplicht.

*Einde rapport. Geen broncode gewijzigd en geen commits gemaakt; alleen dit document toegevoegd onder `docs/reviews/`.*
