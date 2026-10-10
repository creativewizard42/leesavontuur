# LEESAVONTUUR – bouwen, deployen en testen

## Begeleide bèta en GitHub Pages

De huidige versie is `0.2.0-beta.1`. `npm run release:beta` voert tests,
contentvalidatie, audiocatalogus, build en distributiecontrole uit en maakt een
tar.gz-pakket met SHA-256 en bronmetadata in `releases/`. De volledige audiopoort
blijft apart vereist voor `npm run release:stable`.

De workflow `.github/workflows/release.yml` controleert daarnaast Chromium,
offlinegebruik onder `/` en `/spel/`, en updates met meerdere vensters. Een push
naar `main` publiceert na succesvolle controles naar GitHub Pages, mits de
repository bij Settings → Pages als bron **GitHub Actions** heeft ingesteld.
Een `v*-beta.*`-tag publiceert het gecontroleerde pakket als GitHub-prerelease.
De workflow past geen eigen domein of bestaande hosting aan.

Bij een 404 tijdens Pages-deployment: controleer eerst of Pages voor deze
repository beschikbaar is (een privérepository kan een betaald abonnement
vereisen) en of Source daadwerkelijk op GitHub Actions staat. De workflow gebruikt
`actions/configure-pages` vóór deployment om de Pages-configuratie te controleren.
Die stap schakelt Pages niet automatisch in: het standaard `GITHUB_TOKEN` heeft
niet de aanvullende rechten die automatische inschakeling vereist. De repository
openbaar maken of het abonnement veranderen gebeurt niet via deze workflow.

GitHub Pages verwerkt `_headers` niet. De meta-CSP werkt wel; aanvullende
HTTP-hardeningheaders vereisen andere hosting. Zie `docs/RELEASE_NOTES.md`.

Aanvullende updatecontrole na een build:

```sh
python3 scripts/browser-update-smoke.py
```

## Vereisten

- **Node.js `^22.12.0 || ^24.0.0 || >=26.0.0`** (strengste eis van Vite 8 en
  Vitest 5; getest met Node 22). Node 20 wordt niet meer ondersteund omdat de
  testsuite (Vitest 5) dat niet doet.
- Een moderne browser met ondersteuning voor ES-modules, Pointer Events en
  (optioneel) de Web Speech API voor de tijdelijke TTS-fallback.
- Geen backend, database of netwerkverbinding nodig.

## Installeren en draaien

```bash
npm install
npm run dev        # ontwikkelserver (Vite) op http://localhost:5173
```

## Productiebuild

```bash
npm run build      # tsc --noEmit && vite build  →  dist/
npm run preview    # serveert dist/ lokaal, met dezelfde hardening-headers
```

De build is volledig **statisch** (`dist/`): HTML, JS, CSS, lettertypen, SVG's en
(audio-)assets. Er is geen server-side code en geen runtime-afhankelijkheid.

## Deployen

1. Draai `npm run build`.
2. Kopieer de inhoud van `dist/` naar de webroot van uw host.
3. Zet de **hardening-headers** op de server. De productiebuild bevat een strikte
   **meta-CSP**, maar `frame-ancestors` werkt daarin niet en moet als
   **HTTP-response-header** worden gezet. Kant-en-klare voorbeelden staan in
   `deploy/` (Netlify, nginx, Apache); `public/_headers` gaat automatisch mee met
   de Netlify-build.

```bash
npm run check:dist # verifieert CSP-meta, geen externe URL's, OFL-licenties
```

Zie `docs/SECURITY_HEADERS.md` voor de exacte headers en toelichting.

## Offline gebruik

De app is offline-first: na installatie of na het laden van de statische bestanden
werkt de geïnstalleerde PWA zonder netwerk. Laat de webapp eerst volledig laden
en heropen haar zodat de service worker de app beheert. Voor lokaal gebruik
serveert u `dist/` via een lokale webserver (`npm run preview`). Direct openen
via `file://` wordt niet ondersteund.

Op iPhone: open de HTTPS-webapp in Safari en kies **Deel → Zet op beginscherm**.
De app ondersteunt veilige schermranden en offline audiobereiken. Echte iPhone-
acceptatietests blijven vereist. Een App Store-build is niet geleverd.

De build heeft relatieve paden en kan ook onder een subpad worden gehost.
`sw.js` en `manifest.webmanifest` moeten met correcte MIME-types worden geserveerd.
Een service-workerupdate wacht tot de actieve versie niet meer gebruikt wordt.

## Testen en checks

```bash
npm test           # Vitest (unit + jsdom): spellogica, content, UI, integratie
npm run typecheck  # TypeScript zonder output
npm run validate   # content-validator (fouten = exit non-zero; waarschuwingen ok)
npm run recordings # (her)genereert docs/RECORDINGS.md uit de audiomanifest
npm run check:dist # controle op de productiebuild
npm audit          # kwetsbaarheden in afhankelijkheden
```

Alle bovenstaande checks horen **groen** te zijn vóór een release. Ontbrekende
audio-opnames leveren in `npm run validate` waarschuwingen op (de TTS-fallback is
actief) en zijn geen fouten.

## Nieuwe controles

```bash
npm run audio:catalog   # actualiseert opname-script en ouderzone-audiodekking
npm run audio:release   # faalt zolang audio ontbreekt, synthetisch of niet gereviewd is
python scripts/browser-smoke.py  # na build; Python Playwright + /usr/bin/chromium
```

De browser-smoke serveert zelf de productiebuild op een vrije lokale poort en
controleert root/subpad, mobiel/desktop, leesbevestiging, pauze, hervatten,
offline-herstart, Range-audio en werkelijk afspelen. Dit emuleert geen echte iOS-
Safari-engine. Browserdownloads zijn hiervoor niet nodig in de huidige omgeving.
