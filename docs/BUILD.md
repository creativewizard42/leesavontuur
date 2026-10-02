# LEESAVONTUUR – bouwen, deployen en testen

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
werkt alles zonder netwerk. Voor gebruik op school of thuis kan `dist/` ook als
lokale installatie of via `file://` worden geopend; in dat geval zijn
anti-clickjacking-headers niet relevant.

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
