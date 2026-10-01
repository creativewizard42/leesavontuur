# LEESAVONTUUR – UX_DESIGN.md

| | |
|---|---|
| Versie | 0.1 (hoort bij `EDUCATIONAL_DESIGN.md` v0.1 en `GAME_DESIGN.md` v0.1) |
| Rol | UX- en visueel ontwerp. Bevat **geen** spellogica-code; alleen tokens (CSS custom properties), wireframes en specificaties. |
| Doelgroep | kinderen van 5–6 jaar (eind groep 2 – groep 3), Nederlands |
| Bindend | Leerdoel-ID's, anti-raadregels en feedbackprincipes (ED §9, §11) en de schermstructuur uit `GAME_DESIGN.md` (GD) zijn leidend. Bij conflict wint ED, daarna GD, daarna dit document. |

> Dit document beschrijft **hoe het spel voelt en ziet**. Elke visuele keuze mag het antwoord nooit verraden (ED §11) en de leerhandeling nooit overnemen (ED §1.3).

## 1. Ontwerpprincipes voor 5–6-jarigen

| # | Principe | Regel in LEESAVONTUUR |
|---|---|---|
| UX1 | **Minimale tekst** | Geen instructiezin die het kind moet **lezen**; alle uitleg is audio + icoon (GD §8.1). Geschreven tekst = alleen leesmateriaal of een korte naam in de ouderzone. Max. 1 regel per kinderscherm. |
| UX2 | **Audio-first** | Elk scherm begint met één korte gesproken opdracht (opname, geen TTS voor losse klanken — ED §13.1), ± 400 ms ná de schermovergang. |
| UX3 | **Één taak per scherm** | Eén vraag, één leerhandeling, max. 4 antwoordopties + navigatie (GD §8.3). Substappen (hakken → plakken) zijn eigen schermtoestanden. |
| UX4 | **Voorspelbare vaste knoppen** | Vaste plek in drie hoeken: *huis* linksboven, *oor/herhaal* rechtsboven, *verder-pijl* rechtsonder. Nooit verplaatsen. |
| UX5 | **Geen tijdsdruk** | Nergens een aftellende klok of timer (behalve fase 9 FL.*, buiten MVP, en dan tegen eigen record). |
| UX6 | **Geen menu-diepte** | Max. 2 tikken tot elke activiteit. Terug kan altijd met *huis* (GD §3.2). |
| UX7 | **Fout is veilig** | Geen rood, kruis, zoemer, levens of scoreverlies (ED §9.1). Terugsturen met een neutrale, zachte beweging. |
| UX8 | **Succes zichtbaar én hoorbaar** | Correctie nooit alleen via kleur: altijd kleur + icoon/vorm + geluid + Ploef-beweging. |
| UX9 | **Rust** | Vaste indeling, rustige achtergrond, geen flitsen of drukke decoratie achter leesmateriaal (GD §8.3). |
| UX10 | **Eigen record** | Voortgang aan het kind = blaadjes/klankvonkjes, nooit percentages of vergelijking met anderen (GD §6.3). |

**Vaste veilige zones:**

```
┌──────────────────────────────────────────────┐
│ [HUIS]                              [OOR]     │  zone A (≥64px, altijd aanwezig)
│          SPEELVELD / LEESMATERIAAL           │  zone B (midden, nooit onder knoppen)
│                                   [VERDER ▶] │  zone C (≥72px, alleen als er iets te
└──────────────────────────────────────────────┘     "verder" valt)
```
**Afstemming met GD:** GD §3.2/§8.6 zetten *huis* rechtsboven en *oor* rechtsonder. Deze brief kiest bewust **huis linksboven, oor rechtsboven, verder rechtsonder** voor een rustiger leesveld; dit is de bindende plek en GD-tekst wordt hierop bijgesteld.

## 2. Design tokens (CSS custom properties)

Enige bron van waarheid voor kleur, typografie, ruimte, radius, schaduw en targetgrootte. Tablet-eerst (landscape primair).

### 2.1 Kleur – thema "Het Klankwoud"

Vrolijk, natuurlijk bos-groen met warm licht; **geen rood in de kind-UI**.

```css
:root {
  /* Merk & natuur */
  --la-bos-diep:   #14342A;  /* donkerste groen: tekst, contouren */
  --la-bos:        #1F6B45;  /* merk-groen: koppen, iconen, actieve rand */
  --la-blad:       #4CAF6D;  /* bladgroen: accenten, oefen-status */
  --la-mos:        #A9D6B0;
  --la-lucht:      #EAF7EF;  /* vlakke kind-achtergrond */
  --la-room:       #FFFDF5;  /* kaart/tegel (bijna wit) */
  /* Warme accenten */
  --la-honing:     #F2B705;  /* hint-gloed, beloning */
  --la-zon:        #FFD447;  /* klankvonkje */
  --la-bes:        #6A4C93;
  --la-water:      #2E7DAF;
  --la-water-diep: #1B4F70;
  /* Semantisch (kind-UI) */
  --la-goed-vlak:    #2E7D46;
  --la-goed-merk:    #1F7A3D;
  --la-opnieuw-vlak: #2E6E9E;  /* "probeer opnieuw": koel neutraal, GEEN rood */
  --la-hint-ring:    #F2B705;
  /* Tekst */
  --la-tekst:       #14342A;
  --la-tekst-zacht: #3E5B4C;
  /* Focus (zeer zichtbaar) */
  --la-focus:      #0B5FFF;
  --la-focus-halo: #FFFDF5;
  /* Ouderzone (rustig, volwassen) */
  --la-ouder-bg:    #F4F1EA;
  --la-ouder-kaart: #FFFFFF;
  --la-ouder-zeker: #1F7A3D;  /* "Beheerst" */
  --la-ouder-oefen: #B26A00;  /* "In ontwikkeling" (oker, niet rood) */
  --la-ouder-nog:   #6B7280;  /* "Nog niet begonnen" */
}
```

**Contrast (WCAG, benaderd):**

| Combinatie | Ratio | Eis |
|---|---|---|
| `--la-tekst` op `--la-room` / `--la-lucht` | ≈ 13,3 / 12,4 : 1 | AAA |
| letters op leestegel (donker op `--la-room`) | ≈ 13,3 : 1 | AAA (ruim) |
| `--la-tekst` op `--la-blad` | ≈ 4,9 : 1 | AA (groot/tegelletters) |
| wit symbool op `--la-goed-vlak` / `--la-opnieuw-vlak` | ≈ 5,1 / 5,5 : 1 | AA groot, ≥ 3:1 niet-tekst |
| `--la-focus` op `--la-room` / `--la-blad` | ≥ 3 : 1 | 3:1 niet-tekst (focus) |

Tekst ≥ **4,5 : 1** (AA); letters op leestegels **liefst AAA** — donkere letters op lichte tegel, nooit licht-op-licht. Correct/opnieuw/hint nooit uitsluitend via kleur (§4). Geen rood in de kind-UI.

### 2.2 Typografie

- **Leesmateriaal:** `Andika` (SIL Open Font License, **lokaal meegeleverd**, geen externe download). Schoolschrift-achtige vormen met **éénverdiepings-‘a’ en -‘g’** en duidelijke ‘l’ — ondersteunt beginnende lezers.
- **UI + ouderzone:** `Atkinson Hyperlegible` (open licentie, lokaal) — maximaal letteronderscheid (b/d, I/l).
- Letters zijn **kleine letters**, groot, met **ruime letterspatiëring**.

```css
:root {
  --la-font-lees: "Andika", "Atkinson Hyperlegible", "Verdana", system-ui, sans-serif;
  --la-font-ui:   "Atkinson Hyperlegible", "Segoe UI", system-ui, -apple-system, sans-serif;
  --la-letter-tegel: clamp(64px, 8vw, 120px);   /* eis ≥64px leestegels */
  --la-letter-groot: clamp(96px, 16vw, 220px);  /* één letter in beeld */
  --la-woord-groot:  clamp(64px, 9vw, 140px);
  --la-zin-groot:    clamp(32px, 4.5vw, 56px);
  --la-letterspatie: 0.08em;
  --la-regelafstand: 1.5;
  --la-text-s: 15px; --la-text-m: 18px; --la-text-l: 24px; --la-text-xl: 32px;
}
```

### 2.3 Ruimte, radius, schaduw, targetgrootte

```css
:root {
  --la-s1: 4px;  --la-s2: 8px;  --la-s3: 12px; --la-s4: 16px;
  --la-s5: 24px; --la-s6: 32px; --la-s7: 48px; --la-s8: 64px;
  --la-radius-s: 12px; --la-radius-m: 20px; --la-radius-l: 32px; --la-radius-rond: 999px;
  --la-schaduw-1: 0 2px 0 rgba(20,52,42,.18);
  --la-schaduw-2: 0 6px 16px rgba(20,52,42,.14);
  --la-schaduw-op: 0 0 0 6px var(--la-hint-ring), 0 6px 18px rgba(20,52,42,.18);
  --la-tik-min:   48px;   /* absolute ondergrens (uitzondering) */
  --la-tik:       64px;   /* eis: alle interactieve elementen */
  --la-tik-groot: 88px;   /* vaste hoekknoppen en opties */
  --la-tik-super: 120px;  /* antwoordtegels bij 2–3 opties */
  --la-rand: 2px solid var(--la-bos);
  --la-focus-ring: 0 0 0 4px var(--la-focus);
  --la-focus-halo: 0 0 0 8px var(--la-focus-halo);
}
```
Knoppen/tegels **≥ 64 × 64 px**, liefst ≥ 88 px, met **≥ 16 px** tussenruimte. 4 opties: raster 2 × 2, nooit kleiner dan 64 px (GD §7). Focus = 4 px `--la-focus` + witte halo, zichtbaar op groen, wit en water.

## 3. Schermen (wireframes)

`[ ]` = grote knop/tegel, `( )` = niet-interactief beeld/SVG. Alle schermen houden de vaste hoeken uit §1.

**3.1 Start / kies profiel-icoon**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│                (Ploef zwaait)                │
│         ┌────────┐ ┌────────┐ ┌────────┐     │
│         │ avatar │ │ avatar │ │   +    │     │
│         │  Rik   │ │  Lies  │ │ nieuw  │     │
│         └────────┘ └────────┘ └────────┘     │
│          ≥ 96×96 px, naam uitgesproken        │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
```
Profielkeuze alleen bij > 1 profiel. Tik = audio *"Hallo Rik!"* + Ploef-oor-flap; naam niet geschreven voor het kind.

**3.2 Wereldkaart (Het Klankwoud)**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│      (Fluisterheuvel)                        │
│              \   (Vormenwoud)                │
│            (Klankbron)  (Plakplek)           │
│               (Woordweide) (Speelwei)        │
│                  (Klankboom) ← voortgang     │
│  legenda: [groen blad]=zeker [half]=oefent   │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
```
Gebieden = fasen uit GD §1.3, open/dicht via mastery (GD §6.3). Dicht = gedempt, niet klikbaar, geen percentages. Teruggevallen gebied blijft open om te oefenen.

**3.3 Klankjager (4a)**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│        (Ploef met oor-net)                   │
│        ( )        ( )        ( )             │
│      klankbol   klankbol   klankbol          │
│      ≥96px, identiek, geen label/plaatje     │
│   audio: "Welk woord begint met mmm?"        │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
```
Bolletjes visueel **identiek**, volgorde gerandomiseerd (ED §11.5, §10.5.6). Focus met ←→; hover/focus speelt het bijbehorende woord.

**3.4 Letter-klank (4b) – twee richtingen**
```
Richting 1: letter → klank           Richting 2: klank → letter
┌───────────────────────────┐        ┌───────────────────────────┐
│ [HUIS]              [OOR] │        │ [HUIS]              [OOR] │
│          (  m  )          │        │        (Ploef luistert)   │
│        ≥200px, stil       │        │     audio: "sss"          │
│  [🔊]  [🔊]  [🔊]         │        │  [ s ]  [ m ]  [ t ]      │
│  identieke klankknoppen   │        │  letters, ≥120px          │
│                 [VERDER ▶]│        │                 [VERDER ▶]│
└───────────────────────────┘        └───────────────────────────┘
```
Geen voorbeeldwoord/plaatje naast de letter (ED §11.4). Letter bij binnenkomst **stil** (GD §4b).

**3.5 Hakken (4c)**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│           (Ploef, hak-hamertje)              │
│      ┌───┐   ┌───┐   ┌───┐   ≥96px blokken   │
│      │ k │   │ a │   │ m │                    │
│      └───┘   └───┘   └───┘                    │
│        ▢       ▢       ▢     ← klankrij loopt  │
│      audio: "Tik de letters één voor één."   │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
```
Tikken **links→rechts**; bij fout volgorde een vinger-animatie naar links (ED §9.3). Klankrij onthult het aantal pas ná tikken (GD §4c).

**3.6 Plakken (4d)**
```
Route 1: horen → woord kiezen        Route 2: klankblokjes schuiven
┌───────────────────────────┐        ┌───────────────────────────┐
│ [HUIS]              [OOR] │        │ [HUIS]              [OOR] │
│      (Ploef luistert)     │        │   [k]  [a]  [m]  blokjes  │
│  audio: "k … a … m"       │        │        ┌───────────┐      │
│  [ kam ] [ kat ] [ ram ]  │        │        │  plakbaan │      │
│  gelijke lengte, geen hint│        │        └───────────┘      │
│                 [VERDER ▶]│        │   "Sleep de klanken"      │
└───────────────────────────┘        │                 [VERDER ▶]│
                                     └───────────────────────────┘
```
Route 1: minimale paren, geen plaatje. Route 2: slepen met grote blokken; toetsenbord ←→ kiezen, Enter plaatsen, Backspace terug (GD §4d).

**3.7 Woord lezen (4e)**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│        (Ploef voor gesloten raam)            │
│                k  a  m   ≥120px, geen plaatje│
│     [ ✂ hakken ]        [ 🎧 plakken ]        │
│     (geen voorlees-knop van het doelwoord!)  │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
    ↓ ná correct: raam schuift open + plaatje + "kam. Dit is een kam."
```
Plaatje is **beloning en betekenis**, nooit hint (ED §11.1).

**3.8 Klimboom-mini-game (4f)**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│   (Ploef)   ┌────────┐                       │
│      ▲      │ [ kam ] │  ← tak 3             │
│   blaadjes  │ [ kat ] │  ← tak 2             │
│   hoogte-   │ [ tak ] │  ← tak 1  ≥96px      │
│   audio: "Klim naar kam."                     │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
```
Hoogte als **blaadjes**, geen getal (GD §4f). Fout = Ploef waggelt, zakt niet meteen.

**3.9 Beloningsscherm**
```
┌──────────────────────────────────────────────┐
│ [HUIS]                                 [OOR]  │
│            (Ploef, oor-flap)                 │
│           ✦ ✦ ✦  klankvonkjes  ✦ ✦ ✦          │
│        ┌────────────────────┐                │
│        │  nieuw blaadje aan  │  ← determinis- │
│        │  de Klankboom       │    tisch       │
│        └────────────────────┘                │
│   audio: "Een klankvonkje voor jou!"         │
│                                   [VERDER ▶] │
└──────────────────────────────────────────────┘
```
Klein, ná leeswerk, nooit na alleen tikken (GD §6.1). Geen loot-box of willekeurige zeldzaamheid.

**3.10 Pauze / stoppen**
```
┌──────────────────────────────────────────────┐
│                 (gedimd scherm)              │
│        ┌──────────────────────────────┐      │
│        │   (Ploef luistert)           │      │
│        │   [ ▶ doorgaan ]             │      │
│        │   [ 🏠 naar de kaart ]        │      │
│        │   "We stoppen. Knap gedaan!" │      │
│        └──────────────────────────────┘      │
└──────────────────────────────────────────────┘
```
Altijd te openen via *huis*; één tik = stoppen, geen "nog één ronde" (GD §3.2). Onderbroken sessie hervat bij de **sectie**, niet bij het begin.

**3.11 Ouder-gate (toegang Ouderhol)**
```
┌──────────────────────────────────────────────┐
│   Houd de knop 5 seconden ingedrukt          │
│        ┌──────────────────┐                  │
│        │   ○ vasthouden   │  (vult ring 5 s) │
│        └──────────────────┘                  │
│   Los op:   7 + 6 =  [     ]                 │
│   tekst is bewust voor volwassenen           │
└──────────────────────────────────────────────┘
```
Twee voorwaarden (GD §9.1): 5 s vasthouden **én** geschreven rekensom. Fout → stil terug naar het spel. Kind ziet alleen *"Vraag maar aan een grote mens."* (fb.help.parent.1).

**3.12 Ouderdashboard**
```
┌──────────────────────────────────────────────────────────┐
│  Het Ouderhol – Rik                       [ ← terug ]     │
│  Klanken        ●m zeker  ●a zeker  ●s oefent  ○t nog niet│
│  Hakken/plakken   AN.CVC  ▓▓▓▓▓▓▓░░  In ontwikkeling     │
│                   SY.CVC  ▓▓▓▓▓▓▓▓▓  Beheerst            │
│  Woorden (DE)     DE.CVC  ▓▓▓▓▓░░░░  In ontwikkeling     │
│  Oefentijd deze week     4 sessies · 32 minuten          │
│  Hulpgebruik             ▓▓▓░░░░░░   dalend              │
│  Tip: laat Rik woorden uit het spel opzoeken in een      │
│  prentenboek.                                            │
└──────────────────────────────────────────────────────────┘
```
Rustige, volwassen opmaak (zie §8); altijd een **tekstlabel** naast balk/kleur.

## 4. Feedback-visualisatie

Feedback gebruikt **altijd** minstens drie kanalen: kleur + vorm/icoon + beweging/geluid. Kleur alleen is verboden (ED §9.1, WCAG 1.4.1).

| Uitkomst | Kleur | Vorm/icoon | Beweging | Geluid | Audio |
|---|---|---|---|---|---|
| **Correct** | `--la-goed-vlak` | groot **vinkje** + **ster** | tegel licht op; Ploef **klappert met oren** | vriendelijke ping (even luid als bij fout) | `fb.correct.1`–`.8` |
| **Probeer opnieuw** | `--la-opnieuw-vlak` (koel neutraal) | **zachte golf/knikje**, **GEEN kruis, GEEN rood** | tegel **wiebelt terug**; Ploef knikt/knipoogt, schudt niet straffend | zachte warme toon (geen zoemer) | `fb.try1.*` |
| **Hint** | `--la-hint-ring` | oplichtend kader rond de relevante letter(s) | letters **lichten in volgorde** op (links→rechts) + klank | gerekte klank | `fb.hint.*` |
| **Modeling** | `--la-hint-ring` + Ploef | Ploef wijst/doet mee | stappen lopen synchroon ("samen") | gesproken model | `fb.model.*` |

- **Nooit** "FOUT", rood kruis of foutpiep (ED §9.1).
- Eerste fout: neutrale prompt + **foutspecifieke** aanwijzing (ED §9.3); visueel signaal blijft zacht en gelijk van toon.
- **Hint** pas bij de 2e fout, en licht exact de nodige deelstap op (*kam→kat*: laatste letter; *tak→kat*: pijl links→rechts).
- **Modeling** bij de 3e fout; item komt later in de sessie terug (ED §9.2).
- De gekozen tegel blijft zichtbaar tijdens feedback, zodat het kind de relatie ziet. Animaties rustig (200–600 ms, §5).

## 5. Animaties

Beweging is **betekenisvol**, rustig en kort: standaard 200–600 ms; niets flitst (GD §8.3).

| Animatie | Verloop | Duur | `prefers-reduced-motion`-alternatief |
|---|---|---|---|
| **Hakken** | letters **springen uit elkaar**; elke tik: letter springt los + eigen klank | 200–300 ms/letter | letters lichten kort op i.p.v. springen; klank blijft |
| **Plakken** (route 1) | klankparels **schuiven samen** en klikken vast | 300–450 ms | blokjes direct naast elkaar, zachte randgloed |
| **Plakken** (route 2) | blokje volgt vinger/muis; bij goed **klik** + gerekte klank | 200 ms + 400 ms klik | blokje verspringt direct; klik-geluid blijft |
| **Correct** | tegel licht op → Ploef oor-flap → vonkje | 400–600 ms | tegel krijgt vinkje; Ploef blijft stil (icoon + geluid) |
| **Probeer opnieuw** | tegel wiebelt 1× terug; Ploef knikt | 300 ms | zachte rand op tegel; Ploef stil |
| **Hint** | letters lichten na elkaar op (links→rechts) | 150 ms/letter | blijvende oplichtende rand in volgorde |
| **Klank-ei** | dwarrelt, opent met "ploep" | 600 ms | ei staat direct open; klank blijft |
| **Ploef-klim** | Ploef springt één tak hoger | 400 ms | Ploef verspringt direct; blaadje groeit |

Bij `prefers-reduced-motion: reduce` gaan alle spring-/transform-animaties uit (`--la-anim-duur: 0ms`); **informatie blijft** via kleur + icoon + geluid. Nooit animatie als enige drager van feedback.

## 6. Toegankelijkheid

### 6.1 Toetsenbord

| Toets | Werking |
|---|---|
| `Tab` / `Shift+Tab` | focus naar volgende/vorige interactieve element |
| `←` `→` | focus binnen een antwoordgroep (1-dimensionaal) |
| `↑` `↓` | in een 2 × 2-raster tussen rijen |
| `Enter` of `Spatie` | gefocust element activeren |
| `1` `2` `3` `4` | **sneltoets**: direct antwoordoptie 1–4 kiezen |
| `H` | audio-prompt **herhalen** (zelfde als *oor*) |
| `Esc` | pauze/stoppen-paneel openen |
| `Home` | terug naar de wereldkaart (met audio-bevestiging) |
| *Plakken route 2* | `←`/`→` blok kiezen, `Enter` plaatsen, `Backspace` terugnemen |

Focusorde volgt de leesorde; focus-wrap blijft binnen het scherm. Focus-ring: 4 px `--la-focus` + witte halo (≥ 3:1 op alle achtergronden). Touch en toetsenbord zijn **gelijkwaardig** (GD §8.4); slepen alleen bij Plakken route 2, met toetsenbord-alternatief.

### 6.2 ARIA en live regions

- Elk interactief element heeft een **sprekend `aria-label`** ("klankknop 1", "letter m", "herhaal de opdracht", "stop en ga naar de kaart").
- Eén `aria-live="polite"`-regio kondigt feedback aan ("Goed gelezen", "Probeer nog eens"); `role="status"` voor beloningen. Nooit `assertive`.
- Antwoordopties in een `radiogroup`/lijst met `aria-posinset`/`aria-setsize`; gekozen optie `aria-checked`/`aria-pressed`.
- Decoratieve SVG's: `aria-hidden="true"` + `focusable="false"`; betekenisvolle beelden een korte `aria-label`. Leesmateriaal krijgt een tekstalternatief (`aria-label` = "letter m") zodat screenreaders niet spellen.

### 6.3 Kleur, contrast, grootte

Niet alleen kleur (WCAG 1.4.1): altijd icoon + vorm + geluid (§4). Tekstcontrast ≥ 4,5:1; letters op tegels liefst AAA (§2.1). Raakvlakken ≥ 64 × 64 px (min 48 px), ≥ 16 px tussenruimte. Leestekens ≥ 64 px, ruime spatiëring, kleine letters.

### 6.4 Schermgrootte

| Apparaat | Status | Opmerking |
|---|---|---|
| **Tablet landscape** | **primair** | ~1024 × 768 / 1180 × 820; vaste hoeken, 2–4 grote opties |
| Desktop | ondersteund | leesveld gecentreerd, max. ~1100 px; knoppen blijven in de hoeken |
| Tablet portrait | acceptabel | opties onder elkaar; geen verticale scroll in een taak |
| Telefoon portrait/landscape | acceptabel (niet optimaal) | 2 opties per rij; teksten ≥ 64 px; hoogte mag scrollen bij lange zinnen (fase 7+, buiten MVP) |

Geen horizontale scroll in taken. De veilige zones (§1) blijven ook op telefoon vrij.

## 7. Visuele assets: Ploef en plaatjes (eigen inline SVG)

**Stijl:** eigen, eenvoudige, vlakke SVG's; dikke ronde contouren (`--la-bos-diep`), vlakke vullingen, geen gradients/binnenschaduw. Geen externe of auteursrechtelijk beschermde beelden en **geen emoji als essentiële informatie** (emoji alleen als versiering, nooit als enige betekenis). Elke SVG schaalt naar ≥ 64 px en bevat **geen** tekst die het kind moet lezen (GD §11.3).

**Ploef:** rond lijf, pluizige buik, **grote flaporen** (handelsmerk), één lange voorarm om te wijzen/tikken, twee veilige oogjes, klein neusje.

```html
<svg viewBox="0 0 200 200" role="img" aria-label="Ploef, een donzig boswezentje met grote oren"
     xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="60"  cy="55" rx="22" ry="40" fill="#A9D6B0" stroke="#14342A" stroke-width="4"/>
  <ellipse cx="140" cy="55" rx="22" ry="40" fill="#A9D6B0" stroke="#14342A" stroke-width="4"/>
  <ellipse cx="100" cy="125" rx="62" ry="58" fill="#4CAF6D" stroke="#14342A" stroke-width="5"/>
  <ellipse cx="100" cy="140" rx="34" ry="30" fill="#EAF7EF" stroke="#14342A" stroke-width="3"/>
  <circle cx="80" cy="112" r="7" fill="#14342A"/>
  <circle cx="120" cy="112" r="7" fill="#14342A"/>
  <ellipse cx="100" cy="130" rx="7" ry="5" fill="#F2B705" stroke="#14342A" stroke-width="2"/>
  <path d="M150 130 q28 6 34 26" fill="none" stroke="#14342A" stroke-width="6" stroke-linecap="round"/>
  <circle cx="186" cy="158" r="8" fill="#F2B705" stroke="#14342A" stroke-width="3"/>
</svg>
```
Aanvullende eigen assets: klankboom (3 groeistadia), klank-ei, klankvonkje, blaadje (groen/half), oor-icoon, huisje-icoon, verder-pijl, klankparel, klankblokje, klanksteen, plakbaan. Plaatjes voor woorden (kam, mat, tas, kat, ram …) **alleen ná correct lezen** (ED §11.1).

## 8. Ouderzone-visual

Rustig, volwassen, goed leesbaar en **zonder diagnose-taal** (ED §12.3).

- **Kleur & rust:** warme lichte achtergrond (`--la-ouder-bg`), witte kaarten, geen felle kleuren of animatie. Kleuren zijn **statuskleuren met tekstlabel**, nooit negatief rood.
- **Statuslabels (exact):** **Beheerst** (groen `--la-ouder-zeker`), **In ontwikkeling** (oker `--la-ouder-oefen`), **Nog niet begonnen** (grijs `--la-ouder-nog`). Elk label staat **als tekst** naast de kleur/balk.
- **Weergave:** per indicator een horizontale balk óf tabelregel met tekstlabel en, waar zinvol, voorbeeldwoorden die goed gaan ("kam, tas, mat").
- **Typografie:** `--la-font-ui` (Atkinson Hyperlegible), ≥ 15–18 px, normale regelafstand.
- **Geen** percentages, percentielen, AVI/DMT, scores, sterren of rode markeringen aan de ouder (ED §12.3).
- **Formuleringen:** gebruik de voorbeeldzinnen uit ED §12.2 (tip-kaartjes; bij aanhoudende moeite de **zachte** doorverwijzing "bespreek dit met de leerkracht").
- **Indicatoren** (ED §12.1/GD §9.2): geleerde klanken, klanken die extra aandacht vragen, hakken/plakken, woorden lezen (DE), sight words (buiten MVP: uitgegrijsd), oefentijd per week, hulpgebruik (trend).

## 9. Openstaande UX-punten

1. **Knop-plekken:** deze brief kiest *huis linksboven / oor rechtsboven / verder rechtsonder*; GD §3.2/§8.6 hierop bijstellen (documentatie).
2. **Modeling-animatie** ("samen doen"): kindtest nodig voor hoeveel beweging behulpzaam is.
3. **Telefoon portrait** bij langere zinnen (fase 7+, buiten MVP) nog testen op leesbaarheid.
4. **prefers-reduced-motion:** met kinderen testen of kleur/rand-alternatieven voldoende duidelijk zijn.
5. Toegankelijkheid testen met toetsenbord-only en touch-only; focus-ring en targetgrootte ≥ 64 px op kleine schermen (GD §13.5).
