# Security & Privacy Review — LEESAVONTUUR

- **Rol:** Security / Privacy Reviewer (kindveiligheid, AVG/GDPR, Age-Appropriate Design)
- **Object:** `leesavontuur` (TypeScript + Vite, statische offline webapp, doelgroep 5–6 jaar)
- **Scope-instructie:** uitsluitend analyse; **geen broncode gewijzigd**. Alleen dit document toegevoegd.
- **Datum:** 2026-10-01
- **Methode:** statische code-inspectie (`src/`, `index.html`, `public/`, `package.json`, `vite.config.ts`), productiebuild (`npm run build` → `dist/`), live inspectie van de Vite dev-server (geserveerde HTML + `@vite/client`), `npm audit`, en grep op netwerk-/opslag-/injectie-/privacy-sinks.
- **Build bij review:** Vite v5.4.21, 54 modules, `dist/assets/index-B-8VpqSd.js` (88 kB), `dist/assets/index-DqYvwqeb.css` (18 kB). Build slaagt (tsc + vite).

## Samenvatting

LEESAVONTUUR is opvallend schoon: **geen enkel netwerkverzoek in de applicatiecode** (geen `fetch`/XHR/WebSocket/`sendBeacon`/analytics/CDN), **geen persistente persoonsgegevens**, **geen cloud-TTS** (alleen `localService === true` stemmen), **geen externe links, advertenties, chat of in-app aankopen**, en **geen dark patterns**. Fonts zijn lokaal gebundeld via `@fontsource` (OFL). De CSP staat streng (`default-src 'self'`, `script-src 'self'` zonder `unsafe-inline`/`unsafe-eval`, `object-src 'none'`).

De reële punten zijn beperkt en vooral privacy-hygiëne en hardening:

- **Medium:** de "Begin helemaal opnieuw"-reset wist de **verwarringslog niet** (`leesavontuur.confusions.v1` blijft staan) — gevoelige gedragsdata overleeft een volledige reset en er is geen import/export of wis-mogelijkheid voor ouders.
- **Medium:** `frame-ancestors 'none'` staat in een `<meta http-equiv="Content-Security-Policy">` en **wordt daar door browsers genegeerd** (net als `sandbox`/`report-uri`); anti-clickjacking is dus niet effectief.
- **Medium (dev-tooling, niet meegeleverd):** `npm audit` meldt 1 critical + 1 high + 3 moderate, alle in `vite`/`vitest`/`vite-node`/`esbuild`/`@vitest/mocker` (devDependencies). Niets daarvan komt in `dist/`.
- **Low:** Vite dev injecteert `/@vite/client` met een `ws://` HMR-socket; de meta-CSP (`connect-src 'self'`) blokkeert die in sommige browsers (Firefox/historisch), terwijl de CSP óók in dev actief is.
- **Low:** `saveProfile` schrijft naar `localStorage` zonder `try/catch` (QuotaExceededError/privacy-modus kan een UI-handler laten crashen).
- **Low:** `__proto__`-keys kunnen via `normalizeSkills`/`normalizeItems` het prototype van het lokale `out`-object muteren (geen globale prototype-pollution via `JSON.parse`+spread).
- **Low/Info:** `innerHTML`-sinks bestaan (`dom.ts`), maar worden niet met data uit opslag gevuld; de ouder-gate toont het som-antwoord in een `data-sum`-attribuut.

**Er zijn geen Critical- of High-bevindingen in de meeleverde applicatie.** De enige `critical`/`high` scores uit `npm audit` betreffen dev-tooling en zijn niet onderdeel van `dist/`.

### Ernst-tabel

| ID | Ernst | Onderwerp | Bestand:regel |
|----|-------|-----------|---------------|
| SEC-001 | Info (PASS) | Geen netwerk/telemetrie; fonts lokaal | `index.html:6-9`, `src/main.ts:5-9` |
| SEC-002 | Medium | `frame-ancestors` in meta genegeerd → geen anti-clickjacking | `index.html:6-9` |
| SEC-003 | Low | CSP actief in dev; HMR-websocket mogelijk geblokkeerd | `index.html:8`, `vite.config.ts:1-9` |
| SEC-004 | Low | `style-src 'unsafe-inline'` verzwakt CSP | `index.html:8` |
| SEC-005 | Medium | Reset wist verwarringslog niet (gedragsdata blijft) | `src/core/SaveSystem.ts:242-247`, `src/ui/App.ts:178-182`, `src/parent/confusions.ts:70-75` |
| SEC-006 | Low | `saveProfile` schrijft zonder foutafhandeling | `src/core/SaveSystem.ts:231-234`, `src/ui/App.ts:64-66` |
| SEC-007 | Low | `__proto__`-keys muteren lokaal object-prototype | `src/core/SaveSystem.ts:122-148` |
| SEC-008 | Info | Opslaginhoud: geen PII; verwarringslog is gevoelige gedragsdata | `src/core/SaveSystem.ts:24`, `src/types.ts:226-246`, `src/parent/confusions.ts:7` |
| SEC-009 | Info (PASS) | Export bevat geen PII; geen import/FileReader aanwezig | `src/core/SaveSystem.ts:237-239`, `src/parent/ParentDashboard.ts:196-212` |
| SEC-010 | Low | `innerHTML`-sinks aanwezig (niet met storage-data gevuld) | `src/ui/dom.ts:19-34,54-61` |
| SEC-011 | Info (PASS) | Kindveiligheid: gate, geen externe links/ads/dark patterns | `src/parent/ParentGate.ts:20-136`, greps |
| SEC-012 | Low | Som-antwoord in `data-sum`; gate-robustheid | `src/parent/ParentGate.ts:47,120-136` |
| SEC-013 | Medium (dev-only) | `npm audit`: 1 critical, 1 high, 3 moderate | `package.json:19-31` |
| SEC-014 | Low | OFL-licentiebestanden niet in `dist/` | `dist/` vs `node_modules/@fontsource/*/LICENSE` |
| SEC-015 | Info (PASS) | Opslaggroei begrensd; geen onbegrensde logs | `src/parent/confusions.ts:43,64` |
| SEC-016 | Info (PASS) | `referrer no-referrer`; geen source maps in build | `index.html:10`, `dist/` |
| SEC-017 | Info (Future) | Aanbevelingen voor toekomstige cloud-sync | — |

---

## Gedetailleerde bevindingen

### SEC-001 — Geen netwerk of telemetrie (PASS)
- **Ernst:** Info
- **Locatie:** `index.html:6-9` (CSP), `src/main.ts:5-9` (fonts), `package.json:28-31`
- **Beschrijving:** Grep over `src/`, `index.html`, `public/`, `scripts/` op `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `https?://`, `analytics|telemetry|sentry|gtag`, `new Worker`, `serviceWorker`, `Notification`, `import(` leverde **geen** treffers in applicatiecode. De enige `http(s)://`-strings zijn de SVG-namespace (`http://www.w3.org/2000/svg`) en OFL-links in licentiebestanden. Er zijn geen `.map`-bestanden in `dist/`. Runtime-dependencies bestaan uitsluitend uit twee fontpakketten.
- **Risico:** Geen. Dit is de kernprivacy-eigenschap van de app.
- **Fix:** Handhaven als regressietest (bijv. een CI-grep die netwerk-API's in `src/` verbiedt).

### SEC-002 — `frame-ancestors` in `<meta>` wordt genegeerd (clickjacking)
- **Ernst:** Medium
- **Locatie:** `index.html:6-9`
- **Beschrijving:** De CSP wordt via `<meta http-equiv="Content-Security-Policy">` geleverd. Browsers **negeren** in een meta-CSP de directives `frame-ancestors`, `sandbox` en `report-uri` (specificatie: alleen via HTTP-header). `docs/ARCHITECTURE.md:416-417` presenteert `frame-ancestors 'none'` als actieve bescherming; dat is in de praktijk niet zo.
- **Risico:** De app kan in een iframe worden geladen (clickjacking). Impact is beperkt (lokale, offline educatie-app, geen accounts/betalingen), maar de ouder-gate en de reset-/exportknoppen zitten hierachter. De controle wordt onterecht als "geregeld" beschouwd.
- **Fix:** Zet de CSP als **HTTP-header** op de hostingserver (met `frame-ancestors 'none'`, en aanvullend `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`). Laat de meta-CSP als defense-in-depth staan, maar documenteer dat `frame-ancestors` daarin niet werkt. Bij levering via `file://` of lokale installatie is clickjacking niet relevant; bij webhosting wél.

### SEC-003 — CSP in dev-modus en de HMR-websocket
- **Ernst:** Low
- **Locatie:** `index.html:8`, `vite.config.ts:1-9`
- **Beschrijving:** De meta-CSP staat in `index.html` en is dus **ook tijdens `vite dev` actief** (geverifieerd: de geserveerde dev-HTML bevat dezelfde CSP). Vite dev injecteert `<script type="module" src="/@vite/client"></script>` (same-origin, toegestaan onder `script-src 'self'`; **geen inline script toegevoegd**). `@vite/client` opent echter een socket: `new WebSocket("ws://<host>:<port>/?token=...")` (geverifieerd in de geserveerde client). `connect-src 'self'` matcht in CSP3 (Chrome) wél `ws://` same-origin, maar niet in alle browsers/oudere engines (Firefox blokkeerde dit historisch), waardoor HMR en de foutoverlay kunnen uitvallen.
- **Risico:** Ontwikkelaarservaring, geen productierisico. Er is geen CSP-plugin; de productie-CSP is identiek aan de dev-CSP.
- **Fix (advies, geen codewijziging door mij):**
  1. Injecteer de CSP **alleen in de build** via een kleine Vite-plugin (`transformIndexHtml`, `apply: 'build'`) of via hosting-headers, zodat dev vrij is.
  2. Of voeg in dev expliciet `connect-src 'self' ws: wss:` toe (dev-only), en houd de productie-CSP strikt op `'self'`.
  3. Documenteer in `ARCHITECTURE.md` dat de dev-caveat geldt en dat de build-CSP de bindende is.

### SEC-004 — `style-src 'unsafe-inline'`
- **Ernst:** Low
- **Locatie:** `index.html:8`
- **Beschrijving:** `style-src 'self' 'unsafe-inline'` is nodig omdat de UI `style`-attributen zet via `el(tag, { style: ... })` (bijv. `src/parent/ParentGate.ts:47`, `ParentDashboard.ts:44-48`) en omdat Vite dev CSS via `<style>` injecteert. `script-src` is wél streng (`'self'`, geen `unsafe-inline`/`unsafe-eval`), dus het XSS-risico blijft klein.
- **Risico:** Een eventuele HTML-injectie kan styling manipuleren (defacement), maar geen scripts uitvoeren.
- **Fix:** Splits naar `style-src 'self'` + `style-src-attr 'unsafe-inline'` (attributen) en laat `<style>`-blokken geblokkeerd; of accepteer bewust en documenteer. In de build is CSS extern, dus strikter kan zonder de UI te breken zodra inline style-attributen worden vermeden.

### SEC-005 — Reset wist de verwarringslog niet (Medium)
- **Ernst:** Medium
- **Locatie:** `src/core/SaveSystem.ts:242-247` (`resetProfile`), `src/ui/App.ts:178-182` (`onReset`), `src/parent/confusions.ts:70-75` (`clearConfusions`, ongebruikt), `src/parent/ParentDashboard.ts:176`
- **Beschrijving:** `resetProfile()` verwijdert uitsluitend `leesavontuur.save.v1` (`SAVE_KEY`) en schrijft een vers profiel. De tweede opslagsleutel `leesavontuur.confusions.v1` (`CONFUSION_KEY`, `confusions.ts:7`) wordt **nergens** gewist: `clearConfusions` bestaat maar heeft geen enkele aanroep (grep). De knop "Begin helemaal opnieuw" (`ui.parent.reset*`) wekt de indruk dat álle gegevens verdwijnen.
- **Risico (AVG/privacy):** De verwarringslog bevat per kind welke klanken/woorden het verwisselde (`target`, `chosen`, `kind`, `count`) — dat is gevoelige, herleidbare **gedrags-/leerdata** (mogelijk indicatief voor leesproblemen). Zonder identifier is het formeel geen directe PII, maar het is wel gevoelig en het blijft na een "volledige reset" op het apparaat staan. Ook is er geen export/verwijder-pad voor deze data, wat transparantie- en verwijderingsverwachtingen (AVG art. 5/17, AADC) ondermijnt.
- **Fix:** Roep in `resetProfile` (of in `App.onReset`) `clearConfusions(storage)` aan, zodat reset daadwerkelijk alle app-opslag wist. Overweeg de verwarringslog optioneel mee te nemen in een aparte export en een expliciete "verwijder oefengegevens"-optie in de ouderzone. Voeg een test toe die na reset controleert dat beide sleutels leeg zijn.

### SEC-006 — `saveProfile` schrijft zonder foutafhandeling
- **Ernst:** Low
- **Locatie:** `src/core/SaveSystem.ts:231-234`, aanroep `src/ui/App.ts:64-66`
- **Beschrijving:** `loadProfile` vangt leesfouten netjes af (`SaveSystem.ts:220-229`), maar `saveProfile` → `storage.write` → `localStorage.setItem` heeft **geen** `try/catch`. In Safari-privacymodus of bij `QuotaExceededError` gooit dit. Aangezien `save()` synchroon in event-handlers wordt aangeroepen, kan de betreffende interactie afbreken. `recordConfusion` doet dit wél goed (`confusions.ts:63-67`).
- **Risico:** Crash-/haperingsrisico op apparaten met beperkte of geblokkeerde opslag; het spel crasht dan niet hard, maar de UI-flow kan vastlopen.
- **Fix:** Wikkel `storage.write` in `saveProfile` in `try/catch` (stil falen of een niet-blokkerende waarschuwing), consistent met `loadProfile`/`recordConfusion`.

### SEC-007 — Prototype-mutatie via `__proto__`-keys uit JSON
- **Ernst:** Low
- **Locatie:** `src/core/SaveSystem.ts:122-148` (`normalizeSkills`, `normalizeItems`), `151-170` (`normalizeProfile`), `204-213` (`migrateStep`)
- **Beschrijving:** `JSON.parse` van `{"__proto__":{...}}` maakt van `__proto__` een **eigen** data-property (geen globale vervuiling), en object-spread `{...raw}` kopieert die veilig als eigen property. Echter: `out[skillId] = ...` en `out[itemKey] = ...` op een gewoon `{}`-object, met `skillId`/`itemKey` = `"__proto__"`, activeert de prototype-setter en **wijzigt het prototype van het lokale `out`-object**. Dit is geen globale prototype-pollution en niet via het netwerk bereikbaar (alleen door lokale `localStorage`-manipulatie), maar het is een onverwachte toestand.
- **Risico:** Zeer beperkt: alleen zelf-gemanipuleerde of corrupte opslag; geen escalatie naar `Object.prototype`, geen XSS. Wel een robuustheids-/correctheidsrisico.
- **Fix:** Gebruik `Object.create(null)` voor de genormaliseerde records, of sla keys `__proto__`, `constructor`, `prototype` over in de lussen. (De rest van de normalisatie is overigens goed gehard: types worden gecoerced, getallen geklemd, grafeem-IDs tegen de geldige set gefilterd.)

### SEC-008 — Opslaginhoud: geen PII, maar gevoelige gedragsdata
- **Ernst:** Info
- **Locatie:** `src/core/SaveSystem.ts:24`, `src/types.ts:226-246`, `src/parent/confusions.ts:7`
- **Beschrijving:** Er zijn twee sleutels:
  - `leesavontuur.save.v1`: `{ schemaVersion, profileId, avatarIcon, createdAt, unlockedGraphemes, skills, items, rewards, settings, sessionCount }`. **Geen naam, e-mail, geboortedatum of locatie** (bevestigd in `types.ts:226-246`). `profileId` is een willekeurige 32-bits waarde, `createdAt` een lokaal ISO-tijdstip, `avatarIcon` een van vier whitelisted iconen.
  - `leesavontuur.confusions.v1`: verwisselingen (`target`, `chosen`, `kind`, `count`), max 50 entries, strings ≤ 24 tekens (`confusions.ts:18-24,43,64`).
- **Risico:** Geen directe PII; `createdAt` + gedragsprofiel is op een gedeeld apparaat in theorie herleidbaar. Dit is inherent aan local-first leren en proportioneel, mits de data lokaal blijft en te wissen is (zie SEC-005).
- **Fix:** Handhaven; documenteer de exacte opslagsleutels en -velden in de privacyverklaring (zie onder).

### SEC-009 — Export bevat geen PII; geen importfunctionaliteit (PASS)
- **Ernst:** Info
- **Locatie:** `src/core/SaveSystem.ts:237-239` (`exportProfile`), `src/parent/ParentDashboard.ts:196-212`
- **Beschrijving:** Export normaliseert eerst (`normalizeProfile`), dus bevat alleen het schone profiel — geen PII. Download via `Blob` + `URL.createObjectURL` + `a[download]`; URL wordt direct gerevoked. Er is **geen** importpad: grep op `FileReader`, `type="file"`, `showOpenFilePicker`, `readAsText`, `drag`/`drop` in `src/` en `scripts/` leverde niets op. Er kan dus geen profielbestand worden geïmporteerd en dus ook geen kwaadaardige JSON via de UI binnenkomen.
- **Risico:** Geen. Het ontbreken van import sluit een aanvalsvector uit.
- **Fix:** Als import ooit wordt toegevoegd: behandel het bestand als onbetrouwbaar (grootte limiet, `migrate()`/`normalizeProfile()` als enige parser, geen `eval`, geen object-merge met onbekende prototypes).

### SEC-010 — `innerHTML`-sinks aanwezig, maar niet gevoed met opslagdata
- **Ernst:** Low
- **Locatie:** `src/ui/dom.ts:26-27` (`html`-attribuut → `innerHTML`), `src/ui/dom.ts:54-61` (`svgFromString` → `innerHTML`), `src/ui/icons.ts:7-11,66-82,110-113`
- **Beschrijving:** Er zijn twee `innerHTML`-sinks. De `html`-optie van `applyAttrs` wordt **nergens** gebruikt (grep op `html:` in `src/` = 0 treffers). `svgFromString` ontvangt uitsluitend statische, in-code SVG-strings; dynamische interpolatie betreft alleen `viewBox` (vaste waarden) en `extraClass` (vaste klassen). `iconAvatar(id)` valt bij een onbekende `id` veilig terug op `eekhoorn` (`icons.ts:110-113`), dus `avatarIcon` uit (gemanipuleerde) opslag kan geen markup injecteren. Alle gebruikers-/opslagtekst gaat via `textContent`/`createTextNode` (`dom.ts:24-25,36-41`).
- **Risico:** Momenteel geen uitvoerbare XSS. Wel een latent risico als `html:` of dynamische SVG-interpolatie in de toekomst met data wordt gevuld.
- **Fix:** Verwijder de ongebruikte `html`-optie, of documenteer/verbied het gebruik ervan met niet-constante input. Overweeg een lintregel die `innerHTML` buiten `dom.ts` verbiedt.

### SEC-011 — Kindveiligheid: gate, geen externe links/ads/chat/dark patterns (PASS)
- **Ernst:** Info
- **Locatie:** `src/parent/ParentGate.ts:20-136`, `src/ui/App.ts:162-185`, `src/ui/screens/StartScreen.ts:28-34`, `src/ui/screens/MapScreen.ts:22-39`, `src/ui/screens/SessionScreen.ts:16-229`
- **Beschrijving:**
  - **Externe links:** geen `target=_blank`, geen `window.open`, geen `<a href>` naar externe hosts (enige `<a>` is de blob-download in de ouderzone). Grep bevestigt dit.
  - **Chat/sociaal/advertenties/in-app aankopen:** niet aanwezig; geen termen als chat, koop, prijs, abonnement, reclame in de UI.
  - **Dark patterns:** geen streaks, countdown-druk, dagelijkse lockouts, FOMO, pushnotificaties of gokachtige beloningen. `streak` komt alleen voor in adaptieve interne logica/tests (`Adaptive`, `Mastery`), niet als getoonde druk. Beloning = +1 klankvonkje na een **afgeronde** sessie (`App.ts:153-158`) en blaadjes bij beheersing — deterministisch, niet random.
  - **Ouder-gate:** 5 seconden vasthouden (`ParentGate.ts:106-118`) gevolgd door een geschreven rekensom (`ParentGate.ts:120-136`). Export en reset zitten uitsluitend in het dashboard dat alleen via `onPass` bereikbaar is (`App.ts:162-185`). Een verkeerd antwoord roept `onFail` aan en gaat stil terug naar de kaart.
- **Risico:** Geen. Dit voldoet aan de kern van Age-Appropriate Design (geen verslavende of commerciële mechanismen).
- **Fix:** Handhaven. Voeg eventueel een geautomatiseerde test toe die bevestigt dat dashboard/export/reset niet bereikbaar zijn zonder gate-pass.

### SEC-012 — Som-antwoord in `data-sum`; gate-robustheid
- **Ernst:** Low
- **Locatie:** `src/parent/ParentGate.ts:47`, `120-136`
- **Beschrijving:** Het juiste som-antwoord staat als `data-sum="${a}+${b}"` in de DOM (`ParentGate.ts:47`), naast de zichtbare som. De gate accepteert het antwoord alleen als integer gelijk aan `a+b`. Vasthouden kan ook met toetsenbord (Spatie/Enter, `ParentGate.ts:110-118`) — dat is bedoeld voor toegankelijkheid. Voor een kind van 5–6 jaar is "5 seconden een toets vasthouden + een som van twee getallen 5–9 en 4–9 (9–18) oplossen" een redelijke barrière; het `data-sum`-attribuut is alleen zichtbaar via devtools/inspectie en voor die leeftijd niet te misbruiken.
- **Risico:** Zeer beperkt. Het attribuut is een kleine "verklikker" en de gate is niet cryptografisch sterk (dat kan ook niet in client-only).
- **Fix:** Verwijder `data-sum` (niet nodig voor functionaliteit) of accepteer bewust. Overweeg de som iets te variëren in moeilijkheid (bijv. ook een aftreksom of grotere getallen) voor oudere broers/zussen. Randomiseer/ververs de som bij een fout antwoord.

### SEC-013 — Dependencies en `npm audit` (dev-tooling)
- **Ernst:** Medium (alleen ontwikkelmachine; **niets in `dist/`**)
- **Locatie:** `package.json:19-31`
- **Beschrijving:** `npm audit` (2026-10-01): **1 critical, 1 high, 3 moderate, 0 low/info**:
  - `vitest` — critical (GHSA-5xrq-8626-4rwp, CVSS 9.8; Vitest UI arbitrary file read/execute) + moderate (`@vitest/mocker` path traversal). Fix: vitest 5.x (major).
  - `vite` — high (GHSA-fx2h-pf6j-xcff, `server.fs.deny` bypass op Windows) + moderate advisories. Fix: vite 8.x (major).
  - `esbuild` — moderate (dev-server request-proxy, GHSA-67mh-4wv8-2f99). Fix via vite-upgrade.
  - `vite-node` — moderate (via vite).
  Runtime-dependencies: **2 directe** (`@fontsource/andika`, `@fontsource/atkinson-hyperlegible`), `metadata.prod = 3`. Geen runtime-advisories; deze tools en hun code komen niet in de productie-bundle.
- **Risico:** Een aanvaller op hetzelfde netwerk of een malicieuze website kan tijdens `vite dev`/`vitest --ui` bestanden van de ontwikkelmachine lezen. Geen impact op eindgebruikers van de gebouwde app.
- **Fix:** Upgrade `vite`/`vitest`/`vite-node` naar de gepatchte majors en draai `npm audit` in CI. Draai dev-servers niet op `--host 0.0.0.0` en gebruik `vitest run` (niet de UI-server) in CI.

### SEC-014 — OFL-licentiebestanden niet meegeleverd in `dist/`
- **Ernst:** Low
- **Locatie:** `dist/` (geen licentiebestanden) vs `node_modules/@fontsource/andika/LICENSE`, `node_modules/@fontsource/atkinson-hyperlegible/LICENSE`
- **Beschrijving:** Beide fonts zijn **SIL Open Font License 1.1** (Andika: SIL International; Atkinson Hyperlegible: Braille Institute). De `LICENSE`-bestanden zitten in `node_modules`, maar Vite kopieert ze niet naar `dist/`. De OFL vereist dat de copyright- en licentietekst behouden blijft bij redistributie van de fontsoftware.
- **Risico:** Licentie-compliance-risico (geen beveiligingsrisico). Veelvoorkomende tekortkoming bij font-bundeling.
- **Fix:** Neem een `THIRD_PARTY_NOTICES.md` of de OFL-teksten op in `dist/` (bijv. via een plugin/`public/`-bestand), of verwijs in de app/documentatie naar de licenties. Vermeld beide copyrightregels.

### SEC-015 — Opslaggroei is begrensd (PASS)
- **Ernst:** Info
- **Locatie:** `src/parent/confusions.ts:43,64`
- **Beschrijving:** `loadConfusions` kapt af op 50 entries; `recordConfusion` schrijft ook maximaal 50 entries weg. De save is begrensd door de contentomvang (klein). Er is dus geen onbegrensde groei van confusion-logs of save-data.
- **Risico:** Geen. `count` per entry is onbegrensd maar numeriek klein; verwaarloosbaar.
- **Fix:** Geen. Overweeg bij toekomstige uitbreiding (geschiedenis/audio-caching) IndexedDB, zoals `ARCHITECTURE.md:366-368` al voorziet.

### SEC-016 — `referrer no-referrer`, geen source maps (PASS)
- **Ernst:** Info
- **Locatie:** `index.html:10`, `dist/`
- **Beschrijving:** `<meta name="referrer" content="no-referrer">` voorkomt referrer-lekkage. De productiebuild bevat geen `.map`-bestanden (geen bronlekkage). `dist/` bevat alleen statische JS/CSS, fonts en SVG's — geen audio, geen netwerkcode.
- **Risico:** Geen.
- **Fix:** Geen.

### SEC-017 — Toekomstige cloud-sync: aanbevelingen
- **Ernst:** Info (alleen relevant bij een toekomstige wijziging van de offline-first architectuur)
- **Locatie:** n.v.t. (`ARCHITECTURE.md` §7 voorziet nog geen sync)
- **Beschrijving/aanbevelingen:** Als cloud-sync/accounts ooit worden toegevoegd:
  1. **Dataminimalisatie:** synchroniseer alleen wat nodig is; vermijd namen/geboortedata; gebruik pseudonieme `profileId`. Overweeg **end-to-end encryptie** zodat de server geen leerprofiel kan lezen.
  2. **Ouderlijke toestemming & grondslag:** voor kinderen < 16 jaar (NL) is ouderlijke toestemming nodig (AVG art. 8); leg de toestemming vast en houd deze aantoonbaar. Verwerk minimaal.
  3. **Transparantie:** aparte, kindvriendelijke en ouder-gerichte privacyverklaring; geen tracking/analytics; geen advertenties of profilering.
  4. **Beveiliging:** TLS verplicht, versleuteling at rest, strikte toegangscontrole, geen PII in logs, rate limiting, datalek-procedure.
  5. **DPIA:** verplicht bij systematische verwerking van gegevens van kwetsbare kinderen op grote schaal (AVG art. 35 / AADC). Doe een DPIA vóór implementatie, betrek een FG/privacyjurist, en leg bewaartermijnen en verwijderrechten vast (recht op inzage/verwijdering, export en accountverwijdering).
  6. **Vendor/regio:** EU-hosting, verwerkersovereenkomsten, subprocessors minimaliseren.
  7. **Fallback:** blijf volledig offline bruikbaar; sync als opt-in, nooit als voorwaarde om te spelen.

---

## Analyse: CSP, build en dev

| Aspect | Status | Detail |
|--------|--------|--------|
| `default-src 'self'` | Goed | Geen externe bronnen nodig. |
| `script-src 'self'` | Goed | Geen `unsafe-inline`/`unsafe-eval`. In de build is JS een extern bestand (`dist/assets/index-*.js`). In dev voegt Vite alleen `/@vite/client` (same-origin) toe, geen inline script. |
| `style-src 'self' 'unsafe-inline'` | Verzwakt | Nodig voor `style`-attributen; zie SEC-004. |
| `img-src` / `media-src` | Ruim | `'self' data: blob:` — data/blob zijn niet strikt nodig voor de huidige assets; beperken tot `'self'` kan (lage prioriteit). Geen `data:`- of `blob:`-afbeeldingen aangetroffen buiten de export-download. |
| `font-src 'self'` | Goed | Fonts lokaal gebundeld. |
| `connect-src 'self'` | Goed (prod) / beperkend (dev) | Blokkeert alle externe verbindingen; zie SEC-003 voor HMR. |
| `object-src 'none'` | Goed | Geen plugins/embeds. |
| `base-uri 'none'` | Goed | Ondersteund in meta. |
| `form-action 'none'` | Goed | Ondersteund in meta; geen formulieren. |
| `frame-ancestors 'none'` | **Ineffectief in meta** | Zie SEC-002; alleen via HTTP-header. |
| `sandbox`/`report-uri` | Niet aanwezig | Eveneens alleen via header; optioneel naar gelang hosting. |
| Werkt CSP in build-output? | Ja | `dist/index.html` behoudt de meta-CSP; CSS/JS extern; geen inline script. |
| Werkt CSP in dev? | Grotendeels | HMR-`ws://` kan in sommige browsers geblokkeerd worden; advies: CSP alleen in build injecteren of dev-only versoepelen. |

---

## Concept: Privacyverklaring (kort, voor ouders, Nederlands)

> **LEESAVONTUUR — privacy in het kort**
>
> **Wat is dit?** LEESAVONTUUR is een leesspel voor kinderen van 5–6 jaar. Het werkt volledig **op dit apparaat (offline)**. Er is geen account en geen internetverbinding nodig.
>
> **Welke gegevens bewaart het spel?**
> - Een **dierenvriendje** als profiel (bijvoorbeeld eekhoorn, uil, vos of konijn). Er wordt **geen naam, geen leeftijd, geen geboortedatum en geen woonplaats** gevraagd of bewaard.
> - Hoe ver uw kind is: welke klanken en woorden al geleerd zijn, een paar cijfers over oefenen (aantal sessies, reactietijd) en beloningsblaadjes.
> - Welke klanken of woorden wel eens verwisseld worden, zodat het spel extra kan oefenen.
>
> Deze gegevens staan **alleen op dit apparaat** (in de browseropslag) onder de sleutels `leesavontuur.save.v1` en `leesavontuur.confusions.v1`. Ze worden **niet verstuurd**, niet geüpload en niet gedeeld. Er zijn **geen advertenties, geen tracking en geen analytics**.
>
> **Geluid.** Het spel gebruikt alleen gesproken audio die **op dit apparaat** beschikbaar is. Er worden **geen teksten naar internet gestuurd** voor spraak. Is er geen geschikte stem, dan blijft het spel gewoon werken (met beeld en stilte).
>
> **Bewaren en bewaren.** De gegevens blijven staan zolang u het spel op dit apparaat gebruikt, zodat uw kind verder kan waar het gebleven is.
>
> **Uw kind laten stoppen of gegevens wissen.** Achter het **ouderhol** (5 seconden vasthouden + een som) kunt u:
> - de gegevens **bewaren** als bestand (een JSON-bestand op dit apparaat), en
> - **alles wissen** met "Begin helemaal opnieuw". *Let op: op dit moment wist deze knop het spelprofiel, maar nog niet het log met verwisselingen; vraag de makers dit te repareren (zie SEC-005).*
>
> **Toekomst.** Als er ooit synchronisatie tussen apparaten komt, dan alleen met **duidelijke toestemming van ouders**, met zo weinig gegevens als mogelijk, versleuteld, en na een privacytoets (DPIA). Nu is dat er niet.
>
> **Vragen?** Neem contact op met de makers van LEESAVONTUUR. (Vul hier een contactadres/e-mail in voordat dit gepubliceerd wordt.)

*Deze tekst is een concept en kan later als `docs/PRIVACY.md` worden overgenomen.*

---

## Bijlage: gebruikte verificatiestappen

- `Get-ChildItem -Recurse` + `Select-String` op `src/`, `index.html`, `public/`, `scripts/` voor netwerk-API's, externe URL's, dark-pattern-termijnen, injectie-sinks, file-import-API's en gevoelige browser-API's.
- `npm run build` (tsc + vite) → `dist/` geïnspecteerd op externe URL's, inline scripts, source maps en aanwezigheid van licentiebestanden.
- Live dev-check: `npx vite --port 5199 --strictPort`; geserveerde `index.html` bevat `<script type="module" src="/@vite/client">` en dezelfde meta-CSP; geserveerde `/@vite/client` bevat `new WebSocket("ws://<host>:<port>/?token=…")`.
- `npm audit --json` (Vite v5.4.21): 1 critical, 1 high, 3 moderate — alle in dev-tooling.
- Licentie-inspectie van `node_modules/@fontsource/*/LICENSE` (beide OFL 1.1).

*Einde rapport. Geen broncode gewijzigd; alleen dit document toegevoegd onder `docs/reviews/`.*
