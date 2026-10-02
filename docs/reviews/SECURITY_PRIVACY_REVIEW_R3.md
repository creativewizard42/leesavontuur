# Security & Privacy Review — LEESAVONTUUR (Ronde 3, eindverificatie)

- **Rol:** Security / Privacy Reviewer (kindveiligheid, AVG/GDPR, Age-Appropriate Design)
- **Object:** `leesavontuur` (TypeScript + Vite, statische offline webapp, doelgroep 5–6 jaar)
- **Commit:** `main @d4b9b8d` ("docs: einddocumentatie (README, BUILD, PRIVACY, SECURITY, CHANGELOG)")
- **Scope-instructie:** uitsluitend analyse; **geen broncode gewijzigd, geen commits**. Alleen dit document toegevoegd.
- **Datum:** 2026-10-02
- **Methode:** statische code-inspectie (`src/`, `index.html`, `public/`, `deploy/`, `vite.config.ts`, `package.json`, docs), verse productiebuild (`npm run build` → `dist/assets/index-BpaCcTOI.js` 137,71 kB / 41,32 kB gzip; `dist/assets/index--LgQ10wS.css` 20,65 kB), greps op netwerk-/spraak-/injectie-/opslag-sinks in `src/` én `dist/`, live `vite preview` (HTTP-headers), `npm audit`, `npm run check:dist`, en de volledige testsuite.
- **Ronde 1:** `docs/reviews/SECURITY_PRIVACY_REVIEW.md` · **Ronde 2:** `docs/reviews/SECURITY_PRIVACY_REVIEW_R2.md`.

## Samenvatting

De in ronde 2 openstaande punten zijn **aantoonbaar opgelost**:

- **SEC-R2-001/002** — `SessionQueue.fromJSON` valideert nu strikt (types, caps, gevaarlijke keys) en `loadSessionState` begrenst de ruwe sleutelomvang vóór parsen.
- **SEC-R2-003** — hostconfig is in de repo opgenomen (`public/_headers`, `deploy/netlify/_headers`, `deploy/nginx/…`, `deploy/apache/.htaccess`), `vite preview` stuurt de volledige hardening-headers (live geverifieerd), en `docs/ARCHITECTURE.md:416-423` is gecorrigeerd (claimt geen meta-`frame-ancestors` meer).
- **SEC-R2-004** — de ongebruikte `html`-optie is uit `src/ui/dom.ts` verwijderd; `innerHTML` komt nog op één plek voor (de statische `svgFromString`-helper) en een test bewaakt dit.
- **SEC-R2-005** — `img-src 'self'` en `media-src 'self'` (geen `data:`/`blob:`) in de meta-CSP én in alle header-configs.
- **SEC-R2-006** — resume-sleutel bevat gedragsdata zonder PII; TTL/reset correct. Residu is alleen een **documentatie-onjuistheid** (zie SEC-R3-002).

`npm audit` = **0 vulnerabilities**; `npm test` = **32 files / 243 tests geslaagd**; `npm run check:dist` = OK.

**Er zijn geen Critical-, High- of Medium-bevindingen.** De nieuwe punten zijn Low/Info (documentatie-juistheid, defense-in-depth-detail, hardening-suggesties).

### Nieuwe bevindingen (R3)

| ID | Ernst | Onderwerp | Locatie |
|----|-------|-----------|---------|
| SEC-R3-001 | Low | Meta-CSP staat in `dist/index.html` ná de module-script/stylesheet → dekt die initiële loads niet (header is leidend) | `vite.config.ts:40-51`, `dist/index.html:14-16` |
| SEC-R3-002 | Low | `docs/PRIVACY.md` zegt dat de tussenstand na 12 u "automatisch verwijderd" wordt; de code verwijdert de sleutel niet, negeert hem alleen | `docs/PRIVACY.md:16-18`, `SessionPlanner.ts:1097-1104` |
| SEC-R3-003 | Info | `docs/PRIVACY.md` contactadres nog placeholder `[contact invullen]` (R2-voorwaarde 4) | `docs/PRIVACY.md:48` |
| SEC-R3-004 | Info | Vite modulepreload-polyfill bevat een same-origin `fetch()` in de bundle (geen extern netwerk; `connect-src 'self'`) | `dist/assets/index-*.js` |
| SEC-R3-005 | Info | `instructionClips` leidt clip-`src`/`key` deels af uit hervat-JSON; `isLocalAudioSrc` beperkt tot relatieve paden → alleen same-origin asset-loads | `dynamicClips.ts:217-248`, `AudioService.ts:121-126` |

---

## 1. Verificatie SEC-R2-001..006 en resterende ronde-1 items

### SEC-R2-001 — `fromJSON` valideert `skillStates`/`recentEvents` niet → **Opgelost**
- `SessionQueue.fromJSON` (`src/core/SessionPlanner.ts:1012-1049`) leest `sections` via `readSections` (strikt), en voor `skillStates`/`recentEvents`:
  - `DANGEROUS_KEYS` (`__proto__`, `constructor`, `prototype`) worden overgeslagen (`:1030`, `:1040`).
  - `skillStates`-waarden moeten `isRecord` zijn en gaan door `ensureSkillDetail` (`:1031`); `recentEvents`-waarden moeten arrays zijn en elk event doorstaat `isValidEvent` (`:711-725`, `:1041`).
  - Caps: `MAX_SKILL_STATES = 500`, `MAX_EVENTS_PER_SKILL = 20` (`:600`, `:586`, `:1033`, `:1041`).
- Test: `src/core/__tests__/session-integration.test.ts:190-197` verifieert `null`/`undefined` bij corrupte input zonder crash.

### SEC-R2-002 — Geen omvang-/aantalcap bij inlezen resume-JSON → **Opgelost**
- `loadSessionState` weigert `raw.length > MAX_RESUME_BYTES` (200 KiB) vóór `JSON.parse` (`SessionPlanner.ts:596`, `:1096`).
- Structuurcaps: `MAX_SECTIONS = 32`, `MAX_ITEMS_PER_SECTION = 40`, `MAX_OPTIONS_PER_ITEM = 8`, `MAX_METADATA_KEYS = 40` (`:597-601`), afgedwongen in `readSections`/`readItem`/`sanitizeMetadata` (`:638-709`).
- `cloneItem` gebruikt een JSON-round-trip (`:588-590`); `sanitizeMetadata` bouwt met `Object.create(null)` (`:627`) → geen prototype-mutatie.

### SEC-R2-003 — Anti-clickjacking niet afgedwongen; ARCHITECTURE stale → **Opgelost**
- Hostconfig aanwezig en meegeleverd: `public/_headers` → `dist/_headers` (na build aanwezig), `deploy/netlify/_headers`, `deploy/nginx/leesavontuur-headers.conf`, `deploy/apache/.htaccess`; alle vier bevatten `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `vite preview` live geverifieerd op `http://localhost:4179/` → response bevat exact:
  `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` + `X-Content-Type-Options: nosniff` + `Referrer-Policy: no-referrer` + `Permissions-Policy: camera=(), microphone=(), geolocation=()` (`vite.config.ts:30-38,57-59`).
- `docs/ARCHITECTURE.md:416-423` beschrijft nu correct dat `frame-ancestors` **niet** in de meta-CSP staat en via de HTTP-header loopt.
- **Syntaxis:** Netlify `_headers` (padregel `/*` + 2-spatie inspringing) geldig; nginx `add_header … always;` geldig; Apache `Header always set …` geldig (mod_headers). `scripts/check-dist.ts:50-65` en `src/ui/__tests__/security.test.ts:59-75` bewaken dit.

### SEC-R2-004 — `html`-optie (`innerHTML`-sink) → **Opgelost**
- `src/ui/dom.ts` bevat geen `html`-optie meer; `applyAttrs` kent alleen `class`/`text`/attributen (`:19-32`). Enige `innerHTML` is `svgFromString` (`:53-59`) met uitsluitend statische in-code SVG's.
- Regressietest `src/ui/__tests__/security.test.ts:26-39`: geen `innerHTML` buiten `dom.ts`, exact 1 occurrence in `dom.ts`.

### SEC-R2-005 — `img-src`/`media-src data: blob:` → **Opgelost**
- `vite.config.ts:21-22`: `img-src 'self'`, `media-src 'self'`; `dist/index.html:16` idem; alle header-configs idem. Geen `data:`/`blob:` meer. `check:dist` (`scripts/check-dist.ts:44-46`) faalt bij regressie.

### SEC-R2-006 — Resume-sleutel (gedragsdata, geen PII) → **Gehandhaafd (Info)**
- `SESSION_RESUME_KEY = 'leesavontuur.session.v1'`, `RESUME_TTL_MS = 12 u` (`SessionPlanner.ts:1065-1067`). Reset wist de sleutel via `clearSessionState` (`App.ts:246-253`), test `app.test.ts:133-143`. Geen naam/e-mail/leeftijd/locatie. Residu: zie SEC-R3-002 (documentatie).

### Resterende ronde-1 items (steekproef/regressie)
| ID | R1 | R3-status | Bewijs |
|----|----|-----------|--------|
| SEC-001 | Info (PASS) | **Gehandhaafd** | Grep `src/` (excl. tests) op `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `navigator.mediaDevices`, `getUserMedia`, `SpeechRecognition`, `FileReader`, `showOpenFilePicker`, `readAsText`: **0 treffers**. Enige `fetch(` in `dist/` is Vite's modulepreload-polyfill (same-origin). |
| SEC-002 | Medium | **Opgelost** | Zie SEC-R2-003 hierboven. |
| SEC-003 | Low | **Opgelost** | CSP alleen in build (`apply: 'build'`, `vite.config.ts:43`); dev-HTML bevat geen CSP. |
| SEC-004 | Low | **Opgelost** | `style-src 'self'` zonder `unsafe-inline` in meta en headers; `dist/` bevat 0× `unsafe-inline`/`unsafe-eval`/`eval(`. |
| SEC-005 | Medium | **Opgelost** | `App.ts:246-253` wist `SAVE_KEY` (resetProfile), `clearConfusions`, `clearSessionState`; test `app.test.ts:133-143`. |
| SEC-006 | Low | **Opgelost** | `saveSessionState` vangt fouten (`SessionPlanner.ts:1074-1079`); `saveProfile` idem (R2). |
| SEC-007 | Low | **Opgelost** | `DANGEROUS_KEYS` + `Object.create(null)` in `SaveSystem.ts:33,138,151` en `SessionPlanner.ts:602,627`. |
| SEC-008 | Info | **Gehandhaafd** | Sleutels: `leesavontuur.save.v1`, `.confusions.v1`, `.session.v1`; geen PII-velden. |
| SEC-009 | Info (PASS) | **Gehandhaafd** | Export via `normalizeProfile`; geen import/`FileReader`-pad in `src/`. |
| SEC-010 | Low | **Opgelost** | Zie SEC-R2-004. |
| SEC-011 | Info (PASS) | **Gehandhaafd** | Geen externe links/ads/chat; ouder-gate bemiddelt dashboard/export/reset. |
| SEC-012 | Low | **Opgelost** | Geen `data-sum` in `ParentGate` (build bevat alleen `${a} + ${b} =`); `verifySum` vergelijkt `value === a+b`. |
| SEC-013 | Medium (dev-only) | **Opgelost** | `npm audit` → **found 0 vulnerabilities** (vite 8.3.2, vitest 5.0.3, vite-node 6.0.0). |
| SEC-014 | Low | **Opgelost** | `dist/licenses/` bevat Andika- en Atkinson-OFL-teksten + README; `check:dist` bewaakt dit. |
| SEC-015 | Info (PASS) | **Gehandhaafd** | Confusions max 50; save-normalisatie begrensd; resume-JSON nu ook begrensd. |
| SEC-016 | Info (PASS) | **Gehandhaafd** | `referrer no-referrer` in `index.html:12`/`dist/index.html:12`; 0 `.map` in `dist/`. |
| SEC-017 | Info (Future) | **Onveranderd** | Geen cloud-sync aanwezig. |

---

## 2. Netwerk-, CSP-, TTS- en opslagchecks op de huidige build

### 2.1 Netwerk (src/ + dist/)
- `src/` (excl. tests): **geen** netwerk-, media-opname- of spraakherkennings-API's.
- `dist/assets/index-BpaCcTOI.js`: enige `fetch(` is de Vite modulepreload-polyfill (`fetch(e.href,n)` op same-origin module-links). Geen `XMLHttpRequest`/`WebSocket`/`sendBeacon`/`EventSource`.
- Externe URL's in `dist/`: alleen de SVG-namespace `http://www.w3.org/2000/svg`. `check:dist` slaagt ("geen externe URL's").
- `connect-src 'self'` blokkeert externe verbindingen.

### 2.2 CSP (`dist/index.html:16` + preview-header)
- Meta: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`. Geen `unsafe-inline`/`unsafe-eval`; geen `frame-ancestors` in meta (bewust).
- Header (preview/host): identiek + `frame-ancestors 'none'` (live geverifieerd).
- `dist/`: 0× `unsafe-inline`/`unsafe-eval`/`eval(`/`new Function`.
- **Kanttekening SEC-R3-001:** de meta-CSP wordt door de plugin vlak vóór `</head>` ingevoegd, terwijl Vite het module-`<script>` en de `<link rel=stylesheet>` al eerder in `<head>` zet (`dist/index.html:14-16`). Een meta-CSP geldt alleen voor content ná de tag, dus die twee initiële loads vallen formeel buiten de meta. Er zijn geen inline scripts en beide resources zijn same-origin, dus geen actief risico; de HTTP-header dekt alles en is leidend.

### 2.3 TTS — uitsluitend lokale stem
- `isLocalDutchVoice` eist `localService === true` én `lang` beginnend met `nl` (`AudioService.ts:128-130`); `resolveLocalVoice` wacht alleen bij een **lege** stemmenlijst en kiest nooit een default-/cloudstem (`:201-237`); `speak()` doet `if (!speech || !voice) return false` (`:239-254`).
- `isLocalAudioSrc` staat alleen relatieve paden toe (`:121-126`) → geen externe audio-URL's.
- Geen `speechRecognition`/`getUserMedia`/`mediaDevices` in `src/`. **PASS.**

### 2.4 Opslag
- Drie sleutels, alle lokaal; geen PII-velden. Resume-sleutel: strikt gevalideerd + cap (zie SEC-R2-001/002) en TTL 12 u bij hervatten (`SessionPlanner.ts:1100`).
- **Retentie-detail (SEC-R3-002):** bij een verlopen TTL retourneert `loadSessionState` `undefined`, maar **verwijdert de sleutel niet**. De gedragsdata blijft in `localStorage` staan tot een nieuwe sessie hem overschrijft of de ouder reset. Dit is functioneel/privacy-hygiënisch acceptabel maar niet wat `docs/PRIVACY.md` beweert ("automatisch verwijderd").

### 2.5 Nieuwe code: `instructionClips`, audio-only opties, `readingStepsDone`
- **`instructionClips`/`instructionSequence`** (`dynamicClips.ts:217-248`, `audioPrompts.ts:29-42`): teksten worden opgebouwd uit statische content (grafenen/woorden/UI-teksten) en via `textContent`/TTS gebruikt — **geen HTML-sink**. Onbekende keys → lege sequentie. `try/catch` rond de feature-detectie. **Geen PII, geen injectie.**
- **Audio-only opties** (`OptionGrid.ts:57-128`): een optie zonder leesbaar label krijgt icoon + nummer + `aria-label`; `option.label`/`option.image` worden via `textContent` respectievelijk `img src` gezet. Bij hervat-JSON is `image` een string, maar CSP `img-src 'self'` blokkeert externe/`data:`-bronnen; `label` gaat nooit door `innerHTML`. **Geen XSS.**
- **`readingStepsDone`** (`GameState.ts:32,44,154,183-185`): puur in-memory sessiestaat (aantal afgeronde leesstappen voor beloning), wordt **niet** gepersisteerd en bevat geen PII. `new Set(...).size` is begrensd door stappen 3–6. **Geen PII.**
- **SEC-R3-005 (Info):** `instructionClips` bouwt `clip.key`/`clip.src` (`audio/feedback/<key>.mp3`) mede uit `item.prompt.audio.key` en `promptVars(item)` (o.a. `metadata.word`), die bij hervatten uit (gevalideerde maar vrije) JSON komen. `isLocalAudioSrc` beperkt dit tot relatieve same-origin paden; er is dus geen exfiltratie of remote load mogelijk. Overweeg voor de volledigheid audio-keys tegen de manifest te whitelisten.

---

## 3. Juistheid van `docs/PRIVACY.md` en `docs/SECURITY.md` t.o.v. de code

| Claim | Bron | Verdict |
|-------|------|---------|
| Drie opslagsleutels (`save.v1`, `confusions.v1`, `session.v1`), lokaal, geen upload | `PRIVACY.md:20-23` | **Juist** (`SaveSystem.ts:24`, `confusions.ts:7`, `SessionPlanner.ts:1065`) |
| Geen naam/leeftijd/geboortedatum/woonplaats | `PRIVACY.md:9-11` | **Juist** (`types.ts` `Profile`) |
| Tussenstand na **12 uur automatisch verwijderd** | `PRIVACY.md:16-18` | **Onjuist** — TTL 12 u is juist, maar de sleutel wordt niet verwijderd (SEC-R3-002). `SECURITY.md:24` formuleert het wél correct ("wordt daarna niet meer hervat") |
| Alleen lokale stem, geen teksten naar internet; zonder stem beeld+stilte | `PRIVACY.md:25-29` | **Juist** (`AudioService.ts:128-130,201-254`; visuele fallback `ActivityView.showAudioFallback`) |
| Reset wist profiel, verwisselingen én onderbroken sessie | `PRIVACY.md:40-41`, `SECURITY.md:30-31` | **Juist** (`App.ts:246-253`) |
| Export bevat geen namen/persoonsgegevens | `PRIVACY.md:38-39` | **Juist** (`exportProfile` → `normalizeProfile`) |
| Contactadres | `PRIVACY.md:48` | **Open** — nog `[contact invullen]` (SEC-R3-003) |
| CSP/hardening-headers via `deploy/` + `public/_headers`; `vite preview` stuurt dezelfde | `SECURITY.md:13-17` | **Juist** (live geverifieerd) |
| `fromJSON` valideert types, begrenst aantallen en filtert gevaarlijke keys; ongeldig → `null` | `SECURITY.md:26-29` | **Juist** (`SessionPlanner.ts:596-709,1012-1049`) |
| `innerHTML` alleen in de statische SVG-helper; `html`-optie verwijderd | `SECURITY.md:34-35` | **Juist** (`dom.ts:53-59`; test `security.test.ts`) |
| `npm audit` hoort 0 vulnerabilities te melden | `SECURITY.md:36-37` | **Juist** (0) |

**Samenvattend:** `docs/SECURITY.md` is accuraat. `docs/PRIVACY.md` bevat één feitelijke onjuistheid (retentie) en één open placeholder (contact). Geen andere afwijkingen gevonden.

---

## 4. `npm audit` en tooling

- `npm audit` → **found 0 vulnerabilities**.
- Runtime-dependencies: alleen `@fontsource/andika` en `@fontsource/atkinson-hyperlegible` (OFL, lokaal gebundeld, licenties in `dist/licenses/`).
- `npm test` → **32 testfiles, 243 tests, allemaal geslaagd** (inclusief `security.test.ts` en `session-integration.test.ts`).
- `npm run check:dist` → OK (CSP-meta aanwezig, geen externe URL's, OFL-licenties meegeleverd).

---

## 5. Formele Security/Privacy sign-off

**Akkoord met voorwaarden.**

**Onderbouwing:** de meeleverde applicatie heeft geen netwerkverkeer (op de same-origin modulepreload-polyfill na), geen cloud-TTS, geen spraakherkenning/opname, geen PII-opslag of -export, een strikte productie-CSP (`script-src/style-src 'self'`, `object-src 'none'`, `base-uri/form-action 'none'`) en volledige HTTP-hardening-headers inclusief `frame-ancestors 'none'` (in de repo én live via `vite preview`). `npm audit` is schoon; de test- en dist-checks slagen. De vijf open R2-punten zijn verholpen. Er zijn **geen Critical/High/Medium-bevindingen**.

**Voorwaarden voor definitieve afronding (Low/Info, niet-blokkerend voor offline/`file://`-release; voor publieke webhosting is de header reeds geregeld):**

1. **SEC-R3-002 (Low):** corrigeer `docs/PRIVACY.md:16-18` — vervang "automatisch verwijderd" door "wordt na 12 uur niet meer hervat", óf verwijder de verlopen `leesavontuur.session.v1` daadwerkelijk in `loadSessionState` bij TTL-overschrijding.
2. **SEC-R3-003 (Info):** vul het contactadres in `docs/PRIVACY.md:48` in vóór publicatie (open voorwaarde uit R2).
3. **SEC-R3-001 (Low, optioneel):** injecteer de meta-CSP vóór Vite's script/link-tags (bijv. `injectTo: 'head-prepend'`) voor volledige defense-in-depth; de HTTP-header blijft leidend.
4. **SEC-R3-005 (Info, optioneel):** whitelist audio-keys in `instructionClips` tegen de manifest.

Zolang voorwaarden 1–2 niet zijn afgerond blijft de documentatie-status **Low open**, maar er is **geen blokkade voor een offline/lokale of publieke release**: de beveiligingsmaatregelen in de code en de hostingheaders zijn volledig.

---

*Einde rapport. Geen broncode gewijzigd en geen commits gemaakt; alleen dit document toegevoegd onder `docs/reviews/`.*