# LEESAVONTUUR

LEESAVONTUUR is een Nederlandstalig, offline leesspel voor kinderen van 5–6 jaar
(eind groep 2 / begin groep 3). Het spel begeleidt het kind van **klank** naar
**letter**, van **hakken** naar **plakken** en uiteindelijk naar **begrijpend
lezen**. Alles werkt op het apparaat zelf: geen account, geen backend, geen
netwerk, geen tracking.

## Didactische kern

De leerroute volgt vijf vaste stappen, in deze volgorde:

1. **KIJK** – het kind hoort en ziet een klank/letter in een rustige, voorspelbare
   omgeving.
2. **KOPPEL LETTER AAN KLANK** – letter ↔ klank koppelen (Letter-klank), met
   auditieve discriminatie.
3. **HAK** – een gesproken woord verdelen in klanken (Hakken; het gesegmenteerde
   antwoord wordt nooit getoond).
4. **PLAK** – klanken samenvoegen tot een woord (Plakken).
5. **BEGRIJP** – het geschreven woord lezen en de betekenis koppelen (Woord lezen,
   De Klimboom); een beloningsplaatje verschijnt pas **ná** het correct lezen.

Uitgangspunten: veel succeservaring, geen straf, fouten leiden tot een zachte
escalatie (retry → hint → voordoen), en de moeilijkheid past zich per kind aan.

## Features (MVP-scope)

- **Sessie van vaste opbouw** (klankwarming-up → klankoefening → nieuwe letter →
  hakken/plakken → woorden lezen → mini-game → herhaling → beloning), met een
  **adaptieve, hervatbare sessiequeue**.
- **Mini-games:** Klankjager, Letter-klank, Hakken, Plakken, Woord Lezen en
  De Klimboom.
- **Adaptieve bijsturing:** bij fouten minder opties, extra audio, rustig
  voordoen (`modelFirst`), kalmer scherm (`simplified`) en een rustige
  frustratie-**wind-down** met Ploef.
- **Positieve feedback** zonder "fout"- of strafwoorden, met foutspecifieke
  uitleg (`fb.specific.*`).
- **Beloningen:** klankvonkjes, vriendjeskaarten en blaadjes aan De Klankboom.
- **Ouderhol** achter een ouder-gate (5 seconden vasthouden + som), met
  voortgangsoverzicht, instellingen, export en volledige reset.
- **Audio:** echte opnames waar aanwezig, anders een **lokale** TTS-fallback
  (nooit cloud-TTS); ontbrekend geluid geeft een rustige visuele fallback.
- **Toegankelijk:** toetsenbord, focusbeheer, `aria-live`, radiogroep-semantiek,
  tikdoelen ≥ 64 px, hoog contrast en rustige bewegingen.

## Snelle start

Vereisten: **Node ≥ 20** (Windows/macOS/Linux).

```bash
npm install        # afhankelijkheden (alleen dev + twee gebundelde lettertypen)

npm run dev        # ontwikkelserver
npm run build      # typecheck + productiebuild naar dist/
npm run preview    # serveer de productiebuild lokaal (met hardening-headers)

npm test           # volledige Vitest-suite (unit + jsdom integratie)
npm run typecheck  # TypeScript zonder output
npm run validate   # content-validator (grafemen, woorden, audio-referenties)
npm run recordings # (her)genereert docs/RECORDINGS.md
npm run check:dist # controleert de build: CSP, geen externe URL's, licenties
```

## Projectstructuur

```
src/
  core/       spellogica: GameState, Mastery, Progression, Adaptive,
              SessionPlanner (queue), SaveSystem, SpacedRepetition, rng
  learning/   DOM-vrije generatoren: LetterSound, FirstSound, Segmenting,
              Blending, WordReading, Klimboom, Phonology, answer, util
  content/    databank + validator: graphemes, words, sightWords, sentences,
              feedback, instructions, dynamicClips, audioManifest, validator
  games/      dunne koppelingen tussen content/generatoren en de UI
  ui/         schermen (Start/Map/Session/Reward), componenten, audioClips
  parent/     ouder-gate, dashboard, verwarringslog
  audio/      AudioService (opname → lokale TTS → stil)
scripts/      validate.ts, check-dist.ts, recording-list.ts
public/       assets (SVG's), licenses (OFL), _headers (Netlify)
deploy/       kant-en-klare hardening-headers (Netlify/nginx/Apache)
docs/         ontwerp- en reviewdocumentatie
```

## Documentatie-index

| Document | Inhoud |
|---|---|
| `docs/EDUCATIONAL_DESIGN.md` | Didactisch ontwerp (ED): leerdoelen, klankvolgorde, regels |
| `docs/GAME_DESIGN.md` | Spelontwerp (GD): sessie-opbouw, mini-games, feedback |
| `docs/UX_DESIGN.md` | UX: schermen, flow, toegankelijkheid, toetsenbord |
| `docs/ARCHITECTURE.md` | Technische architectuur, datamodel, teststrategie |
| `docs/BUILD.md` | Vereisten, build, deploy, offline gebruik, testen |
| `docs/RECORDINGS.md` | Gegenereerde opnamelijst incl. padconventie |
| `docs/PRIVACY.md` | Privacyverklaring (alles lokaal) |
| `docs/SECURITY.md` | Overzicht securitymaatregelen |
| `docs/SECURITY_HEADERS.md` | CSP en hardening-headers bij hosting |
| `deploy/` | Voorbeelden per host (Netlify, nginx, Apache) |
| `docs/reviews/*` | Onafhankelijke QA-, didactische en security/privacy-reviews |

## Content toevoegen

- **Woorden:** voeg een regel toe aan `RAW` in `src/content/words.ts` als
  `[woord, [grafeem-ids], { mvp?, image?, kidFriendly? }]`. Niet-kindvriendelijke
  woorden markeert u met `kidFriendly: false`; die worden door de generatoren en
  de planner automatisch uitgesloten.
- **Grafemen:** `src/content/graphemes.ts` (id, letters, letternaam,
  `soundHint`, type, fase, volgorde).
- **Feedback/instructies:** `src/content/feedback.ts` en
  `src/content/instructions.ts`. Dynamische instructies met `{placeholders}`
  krijgen per variabele een concrete clip via `src/content/dynamicClips.ts`.
- **Valideren:** draai `npm run validate`. De validator controleert o.a.
  segmenteerbaarheid, patronen, alleen geleerde grafemen, blokkeerlijst,
  audio-referenties en verplichte feedback-/instructiesleutels. Ontbrekende
  opnames zijn **waarschuwingen** (TTS-fallback), ontbrekende beelden zijn fouten.

## Audio-opnames toevoegen

Plaats opnames onder `public/audio/...` volgens de vaste padconventie:

| Type | Pad |
|---|---|
| Losse klank | `audio/graphemes/<id>_sound.mp3` |
| Letternaam | `audio/graphemes/<id>_name.mp3` |
| Voorbeeldwoord | `audio/graphemes/<id>_example.mp3` |
| Heel woord | `audio/words/<woord>.mp3` |
| Gerekte/gehakte reeks | `audio/blends/<woord>.mp3` |
| Feedback / instructie | `audio/feedback/<key>.mp3` (bv. `fb.correct.1`, `instr.fn.first_sound.m`) |

Aanwijzingen: 44,1 kHz, mono, genormaliseerd, gelijk volume bij goed en fout (niet
belonend "schreeuwen"). Draai daarna `npm run recordings` om de opnamelijst bij te
werken en `npm run validate` om te controleren of alle vereiste clips bestaan.

## Bekende beperkingen

- **Nog geen echte opnames.** Het spel gebruikt nu een **lokale TTS-benadering**
  (gemarkeerd in de ouderzone). Echte opnames zijn nodig vóór gebruik met
  kinderen; losse klanken en gerekte reeksen horen altijd opnames te zijn.
- **Vakinhoudelijke review nodig.** De woordenlijst en klankvolgorde moeten nog
  door een leerkracht/orthopedagoog worden beoordeeld vóór structureel gebruik.
- **MVP-scope:** het volledige klankaanbod is gebouwd, maar de speelbare MVP
  richt zich op **m, a, s, t, k, r**.
- Geen Cloud-TTS, geen synchronisatie, geen analytics (bewust).

## Licenties

- **Code:** eigen werk van het LEESAVONTUUR-project.
- **Lettertypen:** Andika en Atkinson Hyperlegible, beide onder de **SIL Open Font
  License 1.1**; de licentieteksten staan in `public/licenses/` en worden mee
  gekopieerd naar `dist/licenses/`.
- **Illustraties:** eigen SVG's in `public/assets/`.
