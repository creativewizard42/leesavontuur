# LEESAVONTUUR – Architecture

| | |
|---|---|
| Versie | 0.1 |
| Rol | Technisch architectuurontwerp voor parallelle bouw |
| Bindende bronnen | `docs/EDUCATIONAL_DESIGN.md` (hierna **ED**) en `docs/GAME_DESIGN.md` (hierna **GD**) |
| Bij conflict | ED wint van GD; GD wint van dit document. Dit document beschrijft **hoe**, niet **wat**. |
| Afbakening | Geen backend, geen analytics, geen netwerk, geen externe assets. Puur client-side, offline-first. |

Dit document is de overdracht van de Software Architect naar twee parallelle builders. Het legt de stack,
de mapstructuur, het datamodel, de exacte adaptieve formules, de content-validator, het audio- en
save-systeem, accessibility/privacy en de teststrategie vast. Deel 10 verdeelt het eigendom van bestanden
**strikt**, zodat beide builders zonder merge-conflicten kunnen werken.

---

## 1. Engine / framework keuze

### 1.1 Besluit

**Web-app in TypeScript + Vite, zonder zware game-engine.** Rendering met **DOM + SVG** en
**CSS-animaties/transitions**; state en spelling in puur TypeScript. Tests met **Vitest** (+ **jsdom**).
**Geen UI-framework in de MVP-kern**; alléén **Preact (optioneel, later)** als de schermen aantoonbaar te
complex worden. Geen backend. Volledig offline-first.

### 1.2 Onderbouwing

De applicatie is een **interactieve oefen-app**, geen actiegame. De leerhandeling is: audio prompt → kind
kiest (tik/toets) → directe feedback. Er zijn geen physics, geen spritesheets, geen realtime loops, geen
bots, geen netwerk-multiplayer. Dat maakt de eisen klein en de winst van een engine negatief.

Eisen die de keuze sturen (uit ED/GD):

| Eis | Bron | Waarom DOM/SVG dit goed dekt |
|---|---|---|
| Toegankelijk toetsenbord, focus, aria, schermlezer | GD §8.4, ED §10 | Semantische HTML (`<button>`, `aria-live`, focus-volgorde) is native; canvas/WebGL niet. |
| Touch + muis + toetsenbord gelijkwaardig | GD §8.4 | Pointer Events + `<button>` |
| Tikdoelen ≥ 64 px, rustige layout, weinig keuzes | GD §8.3 | CSS |
| Niet alleen kleur (kleurenblind/contrast) | dit doc §8 | CSS + iconen + vorm |
| `prefers-reduced-motion` | dit doc §8 | CSS media query |
| Grote eenvoudige eigen SVG's, geen externe art | GD §11.1 | Inline SVG, schaalbaar, testbaar |
| Offline, geen netwerk, geen analytics | ED §11 privacy-eis | Vite build → statische assets; CSP blokkeert extern |
| Volledig unit-testbare spellogica (DOM-vrij) | dit doc §9 | Zuiver TS in `core/`, `learning/`, `content/` |
| Kleine dependency-voetafdruk | dit doc §1.4 | Alleen dev-deps |

### 1.3 Vergelijking met alternatieven

| Optie | Voordelen | Nadelen voor LEESAVONTUUR | Verdict |
|---|---|---|---|
| **DOM/SVG + CSS (gekozen)** | Beste accessibility; native focus/aria; kleine runtime; offline triviaal; tekst is echte tekst (schreefloze leesletters, selecteerbaar, zoombaar); eenvoudig te testen in jsdom; geen asset-pipeline voor animatie. | Minder "gamey" effecten; niet geschikt voor 60 fps particle effects. | **Gekozen.** Leerdoel-gedreven, geen actiegame. |
| **Phaser 3** | Echte game-loop, sprites, scenes, veel game-tutorials. | Canvas-gedreven: accessibility, schermlezer, toetsenbord-focus en tekstkwaliteit kosten extra werk of zijn beperkt; grotere bundle; state raakt verweven met scene-lifecycle; jsdom-tests dekken de canvas-laag niet. | Afgewezen voor MVP. Eventueel later voor sfeer-animatie. |
| **Godot (HTML5 export)** | Compleet, gratis, sterke animatie/tooling. | Exotische web-export, grote download (±30–80 MB), eigen taal/ecosysteem naast TS, accessibility op web zwak, geen npm/Vitest-integratie, offline-gedrag/browser-ondersteuning lastiger. | Sterk afgewezen. |
| **Unity (WebGL)** | Volwassen, rijk. | Zeer grote build, lange laadtijd op school-laptops/tablets, accessibility/tekst slecht, licentie/ecosysteem zwaar, totaal buitenproportioneel voor kiezen-en-tikken. | Sterk afgewezen. |

Kernpunt: **dit spel moet vóór alles leesbaar, voorspelbaar en toegankelijk zijn** (5–6-jarigen, mogelijk
schoolhardware, mogelijk kinderen met extra ondersteuningsbehoefte). DOM wint op precies die assen.

### 1.4 Dependencies (minimaal)

- **Runtime-dependencies: nul.** Alles in vanilla TS/DOM.
- **devDependencies:** `typescript`, `vite`, `vitest`, `jsdom`, `vite-node`, `@testing-library/dom`,
  `@types/node`.
- **Preact: niet in MVP.** Reden om het nog even **niet** te nemen: de schermen zijn klein, statisch van
  structuur en met weinig state-overgangen (audio prompt, gekozen optie, feedback, volgende item). Een
  handgeschreven `render(state) → DOM`-functie per scherm houdt de bundle klein, houdt accessibility
  transparant (je schrijft zelf de `<button>` en `aria-live`) en houdt de tests DOM-vrij voor de logica.
  Preact wordt **heroverwogen** als er meer dan ~8 schermen met gedeelde, stateful UI ontstaan of als
  herhaald diff-werk aantoonbaar foutgevoelig wordt. Reden om dan vóór React/Vue te kiezen: Preact is
  ~4 kB, heeft dezelfde JSX/`h()`-mentaliteit, en kan incrementeel worden geïntroduceerd zonder de
  core/learning/content-modules te raken (die blijven DOM-vrij).

---

## 2. Projectstructuur

```
leesavontuur/
├─ docs/
│  ├─ EDUCATIONAL_DESIGN.md      # bindend (ED)
│  ├─ GAME_DESIGN.md             # bindend (GD)
│  ├─ ARCHITECTURE.md            # dit bestand
│  └─ UX_DESIGN.md               # EGENaar: UX-designer (mag NIET door builders worden aangeraakt)
├─ index.html                    # lang=nl, CSP meta, mountpunt #app
├─ package.json
├─ tsconfig.json
├─ vite.config.ts                # Vite + Vitest-config (environment: jsdom)
├─ .gitignore
├─ scripts/
│  └─ validate.ts                # `npm run validate` → content-validator, exit 1 bij fouten
└─ src/
   ├─ main.ts                    # app-boot: laadt save, kiest startscherm, mount DOM
   ├─ types.ts                   # GEDEELDE datamodel-interfaces (bron van waarheid, zie §3)
   ├─ core/                      # spellogica, DOM-vrij, pure functies
   │  ├─ GameState.ts
   │  ├─ Progression.ts
   │  ├─ Mastery.ts
   │  ├─ SpacedRepetition.ts
   │  ├─ Adaptive.ts
   │  ├─ SaveSystem.ts
   │  └─ SessionPlanner.ts
   ├─ learning/                  # activity generators, DOM-vrij, pure functies
   │  ├─ Phonology.ts            # PH.RHYME, PH.SYLLABLE
   │  ├─ FirstSound.ts           # FN.FIRST_SOUND, FN.LAST_SOUND, FN.MID_SOUND, FN.COUNT
   │  ├─ LetterSound.ts          # LK.<g>.SOUND, LK.<g>.RECOGNIZE, LK.<g>.UPPER
   │  ├─ Segmenting.ts           # AN.VC, AN.CVC, AN.CLUSTER (hakken)
   │  ├─ Blending.ts             # SY.VC, SY.CVC, SY.CLUSTER (plakken)
   │  └─ WordReading.ts          # DE.VC, DE.CVC, DE.CVVC, DE.CCVC, DE.CVCC, DE.CCVCC
   ├─ content/                   # CONTENT BUILDER: data + validator + content-tests
   │  ├─ types.ts                # re-export van ../types + content-specifieke types
   │  ├─ graphemes.ts            # lettervolgorde, klankhints, audio-refs (ED §5)
   │  ├─ words.ts                # woordenbank met graphemes/phonemes/patroon (ED §6)
   │  ├─ sightWords.ts           # SW.* (ED §7)
   │  ├─ sentences.ts            # ZI.*/TX.* (ED §8)
   │  ├─ phases.ts               # 9 fasen, doelen, criteria (ED §3)
   │  ├─ feedback.ts             # fb.* teksten (GD §5)
   │  ├─ uiTexts.ts              # ui.* teksten (knoppen, labels, ouderzone)
   │  ├─ blocklist.ts            # blokkeerlijst + helpers (ED §6.4)
   │  ├─ validator.ts            # validateContent(), isWordAllowed() (zie §5)
   │  ├─ index.ts                # publieke API van de content-module (zie §10.3)
   │  └─ __tests__/
   │     └─ validator.test.ts    # content-contract- en validatortests
   ├─ audio/
   │  └─ AudioService.ts         # opnames + Web Speech fallback + stilte-fallback (§6)
   ├─ ui/                        # schermen en componenten (DOM)
   │  ├─ components/             # Button, AudioRepeatButton, HomeButton, OptionGrid, ...
   │  └─ screens/                # MapScreen, SessionScreen, RewardScreen, SettingsScreen, ...
   ├─ games/                     # activiteit-schermen (gebruiken learning-generators)
   │  ├─ Klankjager.ts           # 4a
   │  ├─ LetterKlank.ts          # 4b
   │  ├─ Hakken.ts               # 4c
   │  ├─ Plakken.ts              # 4d
   │  ├─ WoordLezen.ts           # 4e
   │  └─ DeKlimboom.ts           # 4f (mini-game)
   └─ parent/
      ├─ ParentGate.ts           # 5 s indrukken + rekensom (GD §9.1)
      └─ ParentDashboard.ts      # indicatoren volgens ED §12 / GD §9.2
```

**Zuiverheid (harde regel).** `src/core/**`, `src/learning/**`, `src/content/**` en `src/types.ts` zijn
**DOM-vrij** en **volledig unit-testbaar**: geen `document`, geen `window` (behalve expliciet
geïsoleerde adapters zoals `SaveSystem`/`AudioService`), geen timers die niet injecteerbaar zijn. Alle
toeval (afleiders, positie, itemkeuze) gaat via een **injecteerbare RNG** (`() => number`), zodat tests
deterministisch zijn.

---

## 3. Datamodel

De **canonieke definities staan in `src/types.ts`**. Dat bestand is de bron van waarheid voor beide
builders en is in principe bevroren; wijzigingen lopen via de Architect. `src/content/types.ts` hergebruikt
die types en voegt alleen content-specifieke bundeltypes toe.

Kerninterfaces (samenvatting; exacte velden in `src/types.ts`):

- **`AudioClip`** — `{ key, src, text?, kind }`. `key` = stabiele ID (`lk.m.sound`), `src` = pad
  (`audio/graphemes/m_sound.mp3`), `text` = fallback-tekst voor TTS, `kind` = `'grapheme' | 'word' | 'feedback' | 'instruction' | 'sentence'`.
- **`Grapheme`** — `{ id, letters, name, soundHint, type, introducedInPhase, order, exampleWord?, audio? }`.
  `id` = klein, geen accenten, tweetekenklanken als geheel (`aa`, `ij`). `soundHint` = "mmm" (ED §5.3-kolom).
- **`Word`** — `{ word, graphemes, phonemes, pattern, phase, block, kidFriendly, image?, audio?, isMvp? }`.
  `phonemes` = IPA-strings, `graphemes.join('') === word`.
- **`SightWord`** — `{ id, word, requiresBlock?, introducedAfter?, audio? }`. `id` = `SW.de` etc.
- **`Sentence`** — `{ id, text, words, level, requiresBlocks, requiresSightWords, comprehension?, audio? }`.
- **`SkillId`** — `string`, met vast patroon (`PH.RHYME`, `FN.FIRST_SOUND`, `LK.m.SOUND`, `DE.CVC`, …).
  De geldige set komt uit ED §2 en wordt in `content/phases.ts` geïnventariseerd.
- **`SkillState`** — `{ mastery, attempts, correct, accuracy, avgResponseMs, hintsUsed, consecutiveCorrect, leitnerBox, lastSeenSession, sessionsSeen }` (ED §10.1).
- **`Profile`** (save) — `{ schemaVersion, profileId, avatarIcon, createdAt, unlockedGraphemes, skills, rewards, settings, sessionCount }`. **Geen naam, geen persoonsgegevens.**
- **`ActivityItem`** — één concrete oefenopdracht: `{ id, skillId, kind, prompt, options, targetId, difficulty, isRetry, metadata? }`. Optioneel `secondarySkillId` voor dubbele scoring (bv. Woordbouwer telt voor AN.*, niet voor DE.*, ED §4.1).
- **`AnswerEvent`** — `{ itemId, skillId, secondarySkillId?, itemKey?, sessionNumber, timestamp, selectedOptionId, correct, attempt, usedHint, modeled, responseMs, isGuess, itemScore }`. Dit is het enige event dat de Mastery- en Leitner-modules consumeren.

`itemKey` identificeert het **item-skill**-niveau voor Leitner (bv. grafeem `m`, woord `kam`, sight word `de`), los van het doel (`LK.m.SOUND`). Zo kan ED §10.4 ("Leitner geldt per item-skill") correct worden geïmplementeerd.

---

## 4. Mastery, spaced repetition & adaptiviteit (exact)

Alle formules komen **letterlijk** uit ED §10 en zijn bindend. Implementatie in `core/Mastery.ts`,
`core/SpacedRepetition.ts`, `core/Adaptive.ts`. `core/Progression.ts` bewaakt de poortcondities.

### 4.1 Itemscore `s` (ED §10.2)

| Uitkomst | `s` |
|---|---|
| Correct bij 1e poging, zonder hint, RT ≤ `rtSlow` | 1.0 |
| Correct bij 1e poging, zonder hint, RT > `rtSlow` | 0.85 |
| Correct bij 2e poging | 0.5 |
| Correct na hint (3e poging) | 0.25 |
| Gemodelleerd (na 3e fout) | 0.0 |
| RT < 500 ms **én** fout (gokindicator) | niet meetellen; wél `fb.guess.1` tonen |

Voor **FL.\*** telt tijd zwaarder: `s = 1.0` alleen als `RT ≤ doeltijd` (FL.GRAPHEME 2 s, FL.CVC 3 s),
anders `0.6`. Voorlopige `rtSlow`-waarden: `LK.*` 4 s, `DE.CVC` 8 s, `DE.CCVC` 10 s, `ZI.*` 20 s.

### 4.2 EWMA-update (ED §10.2)

```
alpha       = max(0.2, 1 / (attempts + 1))
mastery_new = mastery_old + alpha * (s - mastery_old)
startwaarde = 0.0            # of instapcheck-uitkomst, max 0.5
```

`accuracy` = aandeel correct bij 1e poging over de **laatste 20 items**.
`avgResponseMs` = **mediane** responstijd over de laatste **10 correcte** items.
Item met `isGuess === true` verhoogt `attempts` **niet** en raakt `mastery`/`accuracy` niet.

### 4.3 Drempels en beslisregels (ED §10.3)

| Situatie | Regel | Actie |
|---|---|---|
| **Gemeesterd** | `mastery ≥ 0.80` **en** `attempts ≥ N` (per fase, ED §3) **en** `consecutiveCorrect ≥ 4` **en** `sessionsSeen ≥ 2` | doel gemeesterd; volgend doel/grafeem vrijgeven |
| **Doorgaan** | `mastery > 0.85` **en** `consecutiveCorrect ≥ 5` | moeilijkheid +1 (meer afleiders, minimale paren, minder audio) |
| **Vereenvoudigen** | `mastery < 0.5` na ≥ 6 items, **of** 2 items op rij met `s ≤ 0.25` | niveau −1 (3→2 afleiders, automatische audio, gerekte klanken, kortere woorden) |
| **Frustratiestop** | 3 items op rij gemodelleerd | gemeesterd makkelijk item (succes), daarna andere activiteit; rapportage "extra oefening" |
| **Terugval** | gemeesterd doel zakt `< 0.65` bij herhaling | status "in oefening"; Leitner-box → 1 |
| **Doelsucces/sessie** | streef 80–85% correct bij 1e poging | > 95% over 10 items → niveau +1; < 65% → niveau −1 |

Sessiemix: **60%** huidig doel, **25%** herhaling (Leitner), **15%** voorbereidend.

### 4.4 Leitner (ED §10.4)

| Box | Herhaling | Promotie (correct 1e poging, zonder hint) | Degradatie |
|---|---|---|---|
| 1 | elke sessie | → 2 | – |
| 2 | elke 2e sessie | → 3 | fout → 1 |
| 3 | elke 4e sessie | → 4 | fout → 1 (bij `s = 0.5`: → 2) |
| 4 | elke 8e sessie | → 5 | fout → 2 |
| 5 | elke 16e sessie (onderhoud) | blijft 5 | fout → 2 |

Leitner geldt **per item-skill** (`AnswerEvent.itemKey`). Een doel geldt pas als "vast gemeesterd" in de
rapportage wanneer **≥ 80%** van zijn items in box **≥ 3** staat.

### 4.5 Afleider-keuze (ED §10.5)

| Niveau | Grafeem-afstand | Woord-afstand |
|---|---|---|
| A | andere klasse/vorm (klinker ↔ medeklinker, `m ↔ a`) | verschilt op alle posities (`kam ↔ tas ↔ rit`) |
| B | zelfde klasse, ander type/plaats (`m ↔ s ↔ k`) | verschilt op 2 posities (`kam ↔ tas ↔ kas`) |
| C | gelijk type/vergelijkbare vorm (`m ↔ n`, `a ↔ aa`, `e ↔ ee`) | verschilt op 1 positie (`kam ↔ kat ↔ ram`) |
| D | klassieke verwarringen (`b ↔ d ↔ p`, `m ↔ n`, `u ↔ n`, `o ↔ oo`) | minimale paren + omkering (`tak ↔ kat`, `kas ↔ kaas`) |

Regels: start elk nieuw doel op **niveau A** met **max 2 afleiders**; alleen afleiders uit **geleerde**
grafemen/woorden; **nooit twee juiste antwoorden** (`ei/ij`, `ou/au`, `g/ch` bij klank→grafeem); **nooit
een geblokkeerd woord**; niveau D pas als niveau C ≥ 0.85; **positie van het juiste antwoord
gerandomiseerd, nooit 3× dezelfde positie op rij**. Aantal opties MVP: **2 → 3 → 4**.

### 4.6 Unlock-regel voor een nieuw grafeem (ED §3 regel 2)

Een nieuw grafeem mag **alleen** geïntroduceerd worden als:

1. het **vorige** grafeem in de volgorde `LK.<g>.SOUND ≥ 0.8` heeft, **en**
2. de som van "zwakke" grafemen (`mastery < 0.6`) **≤ 2** is, **en**
3. er in deze sessie nog **geen** nieuw grafeem is geïntroduceerd (max **één per sessie**).

De eerste grafeem-positie (`m`) is altijd vrij. `core/Progression.ts` exporteert
`nextGraphemeToIntroduce(state, content)` en `canIntroduceNewGrapheme(state)`.

---

## 5. Content-validator

`src/content/validator.ts` (eigendom: Content Builder). Draait twee keer: als **test** (`vitest`) én als
**build-gate** via `npm run validate` (`scripts/validate.ts`). Bij fouten: exit-code 1 → build faalt.

### 5.1 Regels

1. **Unlocked-grafemen-regel** — elk woord bestaat uitsluitend uit grafemen die in zijn `block`/`phase` zijn geïntroduceerd (`block >= grapheme.introducedInPhase`-mapping).
2. **Join-regel** — `word.graphemes.join('') === word.word`.
3. **Foneem-consistentie** — `word.graphemes.length === word.phonemes.length` (tweetekenklank = 1 foneem), en elk foneem is een geldige IPA-string.
4. **Patroon-regel** — het gedeclareerde `pattern` volgt uit de C/V-klassen van `word.graphemes` (V = klinker/tweeklank, C = medeklinker).
5. **Blokkeerlijst** — `word.word` en **elke gegenereerde afleider** mogen niet in `blocklist.ts` voorkomen (ED §6.4).
6. **Sight words** — een `SightWord` mag alleen in een `Sentence` voorkomen als hij geïntroduceerd is (`requiresSightWords` ⊆ geïntroduceerde SW-IDs) en de introductieketen klopt (`SW.de → SW.een → SW.het`).
7. **Zinnen** — elk woord in `sentence.words` is ofwel een `Word` uit de woordbank, ofwel een geïntroduceerd sight word. Zinnen verwijzen alleen naar woorden waarvan de vereiste blokken beschikbaar zijn.
8. **ID-uniekheid** — alle `Grapheme.id`, `Word.word`, `SightWord.id`, `Sentence.id`, feedback-keys en ui-keys zijn uniek; een ID mag niet leeg zijn.
9. **Audio-referenties** — elke `AudioClip.src` volgt de padconventie (`audio/graphemes/m_sound.mp3`, `audio/words/kam.mp3`, `audio/feedback/fb.correct.1.mp3`) en `key` is uniek.

### 5.2 `isWordAllowed`

```ts
export function isWordAllowed(
  word: string,
  learnedGraphemes: ReadonlySet<string>,
): boolean
```

Segmenteert `word` greedly in grafemen uit de geïnventariseerde content (langste match eerst: `aa` vóór
`a`) en retourneert `false` zodra een segment ontbreekt of niet in `learnedGraphemes` zit, óf het woord
geblokkeerd is. Retourneert `false` bij mislukte segmentatie (onbekende letter). Dit is de functie die
**alle** woord- en afleider-generatoren in `learning/` **moeten** gebruiken (via de content-API), zodat de
blokkeerlijst en de geleerde-grafemen-regel nooit omzeild worden.

### 5.3 `validateContent`

```ts
export interface ValidationIssue {
  rule: string;          // stabiele regelcode, bv. 'JOIN_MISMATCH'
  severity: 'error' | 'warning';
  message: string;
  location?: string;     // bv. 'words:kam'
}
export interface ValidationResult { ok: boolean; issues: ValidationIssue[]; }

export function validateContent(bundle?: ContentBundle): ValidationResult
```

`scripts/validate.ts` roept `validateContent()` aan, print alle issues gegroepeerd en `process.exit(1)`
bij `ok === false`. Dezelfde `validateContent()` draait in `content/__tests__/validator.test.ts` met
`expect(result.ok).toBe(true)`, plus gerichte negatieve tests (bv. een woord met een niet-geleerd
grafeem moet een `GRAPHENES_NOT_LEARNED`-fout geven).

---

## 6. Audio-systeem

`src/audio/AudioService.ts` (eigendom: Builder). Interface-first, DOM-adapters injecteerbaar.

### 6.1 Abstractie

```ts
export interface AudioService {
  preload(keys: string[]): Promise<void>;
  play(key: string): Promise<PlayResult>;
  stop(): void;
  isAvailable(): boolean;          // false als noch clip noch lokale TTS bruikbaar is
  readonly mode: 'clip' | 'tts' | 'silent';
}
export type PlayResult = 'played-clip' | 'played-tts' | 'silent';
```

### 6.2 Resolutievolgorde (primair → fallback)

1. **Opgenomen clip** (primair). Padconventie:
   - grafeem-klank: `audio/graphemes/<id>_sound.mp3` (bv. `m_sound.mp3`, `aa_sound.mp3`)
   - grafeem-letternaam: `audio/graphemes/<id>_name.mp3`
   - grafeem-voorbeeld: `audio/graphemes/<id>_example.mp3`
   - woord: `audio/words/<woord>.mp3`
   - sight word: `audio/sightwords/<id>.mp3`
   - feedback/instructie: `audio/feedback/<key>.mp3` (key bv. `fb.correct.1`)
   - gerekte/gehakte reeks: `audio/blends/<woord>.mp3` (bv. `kam.mp3` met "k…a…m")
2. **Web Speech API (`nl-NL`)** — **uitsluitend** voices met `voice.localService === true`. Cloud-TTS
   wordt **nooit** gebruikt (privacy). Als geen lokale stem beschikbaar is → volgende stap.
3. **Silent-fallback** — geen audio: `play()` resolvet naar `'silent'`, de UI herhaalt de visuele
   ondersteuning (bv. klankkaart/hint-icoon) en `aria-live` meldt de tekst. **Het spel crasht nooit**
   zonder audio (`isAvailable() === false` is een geldige toestand; alle schermen moeten werken).

### 6.3 Regels en constraints

- Losse klanken en gerekte/gehakte reeksen **altijd** als opname (ED §13 regel 1). TTS is alleen een
  **ontwikkel-/noodfallback** voor hele woorden/zinnen, nooit voor losse fonemen.
- `soundHint` in `Grapheme` stuurt de opname-instructie ("mmm", "sss", "rrr", zonder sjwa).
- Goed en fout feedback klinken **even luid en even vriendelijk** (GD §5.6); normaliseer clips op een vast
  luidheidniveau.
- Eén `play()` tegelijk; nieuwe prompt stopt de vorige (voorkomt overlapping).
- Autoplay-beleid: audio start pas na een gebruikersinteractie; de app toont daarvoor een startscherm
  (startknop), zodat browser-autoplay-blokkades geen leerblokkade worden.

### 6.4 Release-blokkade

Vóór release zijn **echte opnames van een native Standaardnederlands spreker verplicht** (ED §13 regel 1,
GD §13). In de repo staan alleen placeholders/geen binaire bestanden; de `AudioService` moet zonder
bestanden volledig functioneren (silent/TTS). Dit wordt als acceptatiecriterium opgenomen.

---

## 7. Save-systeem & privacy

`src/core/SaveSystem.ts`. **localStorage** is de standaard (klein datavolume, synchroon, eenvoudig);
**IndexedDB** is de escape-route als het save-bestand > ~1 MB wordt (bv. toekomstige audio-caching of
grote geschiedenis). De interface is storage-agnostisch:

```ts
export interface SaveStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}
export function loadProfile(storage?: SaveStorage): Profile;
export function saveProfile(profile: Profile, storage?: SaveStorage): void;
export function migrate(raw: unknown): Profile;      // schemaVersion-migraties
export function exportProfile(profile: Profile): string;   // JSON-string
export function resetProfile(storage?: SaveStorage): Profile; // verse start
```

- **`schemaVersion`** in het save-object; `migrate()` schakelt stapsgewijs `v(n) → v(n+1)` en gooit nooit
  weg zonder eerst een export aan te bieden. Onbekende/te nieuwe versie → veilige defaults + waarschuwing.
- **Geen persoonsgegevens.** Geen naam, e-mail, geboortedatum, locatie. Profiel-identiteit = een gekozen
  **dierenicoon** (`avatarIcon`). `profileId` is een willekeurige lokale ID (geen PII). Dit is de
  gedocumenteerde keuze; optioneel een **bijnaam** is bewust **niet** voorzien (vermijd PII).
- **Export/reset in de ouderzone** (achter `ParentGate`): export naar een gedownload JSON-bestand, en een
  reset met dubbele bevestiging. Beide alleen bereikbaar door de ouder/leerkracht.
- Opslagsleutel: `leesavontuur.save.v1` (vast, niet per apparaat-gebaseerd op PII).

---

## 8. Accessibility & privacy

### 8.1 Accessibility

- **Toetsenbord:** alles bedienbaar met Tab/Shift+Tab, pijltjes (←→ binnen een optiegroep), Enter/Spatie
  activeren, cijfers 1–4 als directe opties (GD §8.4). Zichtbare, hoog-contrast **focus-ring**; logische
  focus-volgorde; focus verplaatst naar het nieuwe item na feedback; focus valt nooit weg.
- **ARIA:** opties als echte `<button>` met `aria-label`; groepen via `role="group"` + `aria-labelledby`;
  feedback via `aria-live="polite"` (rustig, niet onderbrekend); voortgang/hoogte via tekst-alternatief,
  nooit alleen een meter. Decoratieve SVG's `aria-hidden="true"`.
- **Contrast:** minimaal WCAG 2.1 AA (4.5:1 voor tekst, 3:1 voor grote tekst/UI). **Nooit alleen kleur**
  als informatie (bv. "zeker/oefent/nog niet" = kleur **én** vorm/icoon/label).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` schakelt grote/loop-animaties uit; alle
  essentiële feedback blijft (statisch + audio).
- **Doelgrootte:** tikdoelen ≥ 64 px, liefst ≥ 88 px (GD §8.3); ruimte tussen opties.
- **Leesbaarheid:** schreefloze, jonge-lezers-vriendelijke lettervorm, grote tekst, rustige achtergrond
  met contrast tegen leesmateriaal.

### 8.2 Privacy

- **Geen netwerkverzoeken tijdens gebruik.** Geen fetch/XHR, geen analytics, geen tracking, geen externe
  fonts/CDN's. Alles lokaal.
- **CSP meta-tag** in de productiebuild (`vite.config.ts`, plugin
  `leesavontuur-production-csp`): `default-src 'self'; script-src 'self'; style-src 'self';
  img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none';
  base-uri 'none'; form-action 'none'`. Geen externe hosts en geen `data:`/`blob:`.
  `frame-ancestors` staat **niet** in de meta-CSP: browsers negeren die directive in een
  `<meta http-equiv>`-tag. Anti-clickjacking loopt via de **HTTP-header** op de hostingserver
  (voorbeelden in `deploy/`; zie ook `docs/SECURITY_HEADERS.md`). `vite preview` stuurt dezelfde
  hardening-headers lokaal mee (`preview.headers`).
- **Geen cloud-TTS** (zie §6.2) en geen spraakherkenning (ED §13 regel 2).
- Ouderzone toont **nooit** diagnose-/stoornis-termen, percentielen of vergelijking met anderen (ED §12.3).
- Audio- en savewerking blijven volledig offline; de app is bruikbaar zonder internet.

> Dev-caveat: tijdens `vite dev` gebruikt Vite HMR een websocket. De strikte CSP (`connect-src 'self'`)
> staat in dev geen `ws:` toe; voor lokaal HMR kan de CSP tijdelijk worden versoepeld of kan de app via
> `vite preview`/productie-build worden getest. De **productie**-CSP is de bindende, hierboven beschreven
> policy.

---

## 9. Teststrategie

### 9.1 Unit tests (Vitest, DOM-vrij)

- **Mastery** (`core/Mastery.ts`): EWMA met `alpha = max(0.2, 1/(attempts+1))`; itemscore-tabel exact
  (1.0 / 0.85 / 0.5 / 0.25 / 0.0); gok (< 500 ms én fout) telt niet; startwaarde/max 0.5.
- **Spaced repetition** (`core/SpacedRepetition.ts`): box-intervallen 1/2/4/8/16; promotie- en
  degradatiepaden inclusief `s = 0.5`-uitzondering in box 3; "vast gemeesterd" ≥ 80% items in box ≥ 3.
- **Adaptive** (`core/Adaptive.ts`): niveau +1 bij `mastery > 0.85 && consecutiveCorrect ≥ 5`; niveau −1
  bij `mastery < 0.5` na 6 items of 2× `s ≤ 0.25`; frustratiestop na 3× modeling; optieaantal 2→3→4;
  nooit 3× dezelfde juiste positie op rij.
- **Progression/poortconditie** (`core/Progression.ts`): nieuw grafeem alleen als vorige ≥ 0.8, zwakke
  grafemen ≤ 2, en max één per sessie.
- **Validator** (`content/validator.ts`): happy path `validateContent().ok === true`; negatieve cases
  (niet-geleerd grafeem, join-mismatch, foneem-count, blokkeerlijst, dubbele ID). **Specifiek:**
  `isWordAllowed('kat', MVP-set) === true` en `isWordAllowed('boom', MVP-set) === false`.
- **Segmenting/Blending** (`learning/Segmenting.ts`, `learning/Blending.ts`, deterministisch met vaste
  RNG): `kam → k-a-m`; plakken van `k,a,m → kam`; afleiders zijn minimale paren; nooit geblokkeerde of
  niet-geleerde items.
- **Letter-klank** (`learning/LetterSound.ts`): correct/incorrect, letternaam-vs-klank-detectie
  (`fb.try1.5`), nooit `ei/ij` of `ou/au` als twee geldige opties.

### 9.2 Integratie tests

- **SessionPlanner** (`core/SessionPlanner.ts`): sessiemix ~60/25/15; vaste sessie-loop uit GD §3.1;
  zwakke grafemen komen vaker terug; nieuw grafeem alleen bij open poort; herstart na onderbreking op
  **sectie**-niveau (GD §3.2); herhalingsitems wisselen afleiders/positie (ED §11 regel 10).

### 9.3 UX-flow tests (jsdom + `@testing-library/dom`)

Kind kan een activiteit **starten**, een antwoord **geven**, feedback **krijgen** en **verder**. Concreet:
audio-prompt (silent-fallback) → optie aanklikken → `aria-live`-feedback verschijnt → goede/foute route →
volgend item. Ook: **toetsenbord-only** (Tab/Enter, cijfers 1–4), huisknop stopt en bevestigt, en de
herhaal-knop speelt de laatste prompt opnieuw.

### 9.4 Contract tests (content)

De vorm van het datamodel wordt op **type-niveau** geborgd (TypeScript strict) én op runtime-niveau:
`validateContent()` over de echte content, plus gerichte fixtures. Dit is de "content contract test".
`npm run validate` is dezelfde check als build-gate.

---

## 10. Werkverdeling voor parallelle builders

Er zijn **twee** builders. Bestandsgrenzen zijn **strikt**; wijzig nooit een bestand dat de ander bezit.
`docs/UX_DESIGN.md` is van de UX-designer en wordt door **niemand** van de builders aangeraakt.

### 10.1 Builder (applicatie)

**Bezit uitsluitend:**

- `src/main.ts`
- `src/core/**` (GameState, Progression, Mastery, SpacedRepetition, Adaptive, SaveSystem, SessionPlanner)
- `src/learning/**` (DOM-vrije activiteit-generatoren: Phonology, FirstSound, LetterSound, Segmenting, Blending, WordReading, Klimboom)
- `src/audio/**` (AudioService)
- `src/ui/**` (schermen + componenten, incl. `ActivityView`; de activiteiten Klankjager, Letter-klank, Hakken, Plakken, Woord Lezen en De Klimboom worden hier gerenderd)
- `src/parent/**` (ParentGate, ParentDashboard)

De Builder **leest** de content-API en **schrijft nooit** in `src/content/**` of `src/types.ts`.

### 10.2 Content Builder

**Bezit uitsluitend:**

- `src/content/**` — inclusief `validator.ts`, `blocklist.ts`, `index.ts` en `__tests__/**`
- `scripts/validate.ts`

De Content Builder **leest** `src/types.ts` en **schrijft nooit** in de Builder-mappen of `src/types.ts`.

### 10.3 Gedeelde contracten (door Architect nu gemaakt)

**`src/types.ts`** — alle gedeelde interfaces (§3). Bevroren; wijzigingen via de Architect.

**Publieke API van de content-module** (`src/content/index.ts`). De Builder programmeert hiertegen:

```ts
// data
export const graphemes: Grapheme[];                       // ED §5, in introductievolgorde
export const words: Word[];                               // ED §6
export const sightWords: SightWord[];                     // ED §7
export const sentences: Sentence[];                       // ED §8
export const feedback: Record<string, string>;            // fb.* (GD §5)
export const uiTexts: Record<string, string>;             // ui.*
export const content: ContentBundle;                      // alles gebundeld

// queries
export function getGrapheme(id: string): Grapheme | undefined;
export function getWord(word: string): Word | undefined;
export function getGraphemesUpTo(order: number): Grapheme[];      // alle grafemen met order <= n
export function wordsForGraphemes(learned: ReadonlySet<string>): Word[];
export function isWordAllowed(word: string, learned: ReadonlySet<string>): boolean;
export function isBlockedWord(word: string): boolean;
export function ui(key: string): string;                  // ui-tekst met fallback
export function fbText(key: string): string;              // feedbacktekst met fallback

// validation
export function validateContent(bundle?: ContentBundle): ValidationResult;
```

Deze API bestaat **nu als stub** (met `TODO`) zodat de Builder kan compileren vóórdat de echte content
klaar is. De Content Builder vervangt de stub-implementatie door echte data, zonder de signatures te
wijzigen.

### 10.4 Statussignalen

- De Builder mag **niet** starten met UI-werk dat `content/index.ts`-signatures vereist tot die stub er is
  (die is er nu).
- De Content Builder levert eerst `validateContent()` groen, daarna breidt hij de data uit; `npm run
  validate` moet te allen tijde groen zijn op de gecommitte content.
- Integratie loopt via de Architect; wijzigingen aan `src/types.ts` of aan de publieke content-API gaan
  via de Architect.

---

## 11. Build, scripts & kwaliteitspoorten

| Script | Doet | Poort |
|---|---|---|
| `npm run dev` | Vite dev-server | – |
| `npm run build` | `tsc --noEmit && vite build` | typecheck **en** build falen bij fouten |
| `npm run preview` | productie-build lokaal serveren | – |
| `npm test` | Vitest (jsdom) één keer | tests falen de build in CI |
| `npm run test:watch` | Vitest watch | – |
| `npm run validate` | `vite-node scripts/validate.ts` | **exit 1 bij contentfouten** |
| `npm run typecheck` | `tsc --noEmit` (strict) | – |

`tsconfig.json` staat **strict** met o.a. `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`. `vitest` draait in `jsdom`.

---

## 12. Risico's & openstaande punten

1. **Echte audio ontbreekt** tot release: alle losse klanken moeten opgenomen worden (ED §13 regel 1).
   Tot die tijd is TTS/silent een fallback, geen eindtoestand.
2. **Preact-beslissing** kan later vallen; de core/learning/content-modules blijven er immuun voor.
3. **Woordlijst-review** door tweede taalkundige/leerkracht vóór release (ED §13 regel 7) — inhoudelijk,
   buiten software, maar blokkerend voor release.
4. **jsdom vs. echte browser:** audio en focus-gedrag verschillen; UX-flowtests in jsdom zijn een
   ondergrens, handmatige/touch-test op echte tablets blijft nodig (GD §13).
