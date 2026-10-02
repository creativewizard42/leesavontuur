# LEESAVONTUUR – GAME_DESIGN.md

| | |
|---|---|
| Versie | 0.1 (concept, hoort bij `EDUCATIONAL_DESIGN.md` v0.1) |
| Rol | Game-ontwerp. Bevat **geen code** en geen wijziging van didactiek. |
| Doelgroep spelers | kinderen van 5–6 jaar (eind groep 2 – groep 3), Nederlands |
| Bindend | Leerdoel-ID's, fasen, MVP-grafemen (m, a, s, t, k, r), MVP-woordenlijst en anti-raadregels komen **letterlijk** uit `EDUCATIONAL_DESIGN.md` (hierna: ED). Bij conflict wint ED. |

> Dit document beschrijft de **verpakking** van het leren. Elke mechanic heeft een kopje *Pedagogisch doel* (uit ED) en een kopje *Game-mechanic/verpakking* (vrij ontwerp). De verpakking mag het leerdoel nooit vervangen of verraden (ED §1.3, §11).

---

## 1. Concept & originele spelwereld

### 1.1 Wereld: **Het Klankwoud**

**Het Klankwoud** is een eigen, originele wereld: een zacht, kleurrijk bos waar geluid en letters *groeien*. Midden in het bos staat de **Klankboom**. Elke keer als een kind een klank echt onder de knie heeft, groeit er een nieuw blaadje aan de Klankboom, en verschijnt er een nieuw dier of plekje in het bos.

Het bos heeft geen bestaande personages, geen methode-figuren en geen leenwerelden. Alles is eigen ontwerp [ONTWERP]. "Letterland" en vergelijkbare bestaande merken worden bewust **niet** gebruikt.

### 1.2 Hoofdpersonage: **Ploef**

**Ploef** is een klein, rond, donzig boswezentje met **grote oren**. Grote oren zijn Ploefs handelsmerk: Ploef is een goede luisteraar (en daarom goed in klanken). Ploef is nieuwsgierig, een tikje onhandig, en praat tegen het kind als een vriendje — nooit betuttelend.

- Eigen naam, eigen vorm (rond lijf, pluizige buik, flaporen, één lange voorarm om mee te tikken/wijzen). Geen bekende mascotte.
- Ploef **doet nooit het antwoord voor** in een oefening (dat zou de leerhandeling stelen, ED §1.3).
- Ploef mag wel **modelen** ná 3 fouten (ED §9.2), en dan samen met het kind.
- Humor: Ploef laat de oren klapperen bij een goede klank, laat een "oor-plof" horen, struikelt zachtjes over een letterblokje (nooit straffend), en mompelt grapjes als "Mmm… Ploef lust wel een klankje." Humor zit in animatie en geluid, **niet** in tekst die het kind moet lezen.

### 1.3 Gebieden volgen de leerfasen (ED §3)

De wereldkaart van het Klankwoud heeft negen plekken die **exact** de negen fasen uit ED §3 volgen. Eigennamen [ONTWERP]:

| Fase (ED §3) | Gebied in het Klankwoud | Wat er gebeurt |
|---|---|---|
| 1 Klanken herkennen (auditief) | **De Fluisterheuvel** | Rijm, klappen, eerste/laatste klank horen |
| 2 Letters (vorm) | **Het Vormenwoud** | Letter zien → klank horen → letter terugvinden |
| 3 Letter-klankkoppeling | **De Klankbron** | Letter zien → juiste klank kiezen |
| 4 Samenvoegen (analyse/synthese) | **De Plakplek** | Hakken en plakken van klanken |
| 5 Korte klankzuivere woorden | **De Woordweide** | Eerste echte woorden lezen |
| 6 Meer woorden (clusters, tweetekenklanken) | **De Klauterrotsen** | Langere/moeilijker woorden |
| 7 Zinnen | **De Zinnenzee** | Woordgroepen en zinnen |
| 8 Korte teksten | **Het Verhalendal** | Verhaalpagina's |
| 9 Automatiseren | **De Vlotheidstoren** | Snelheid t.o.v. eigen record |
| Vrij spelen | **De Speelwei** | Vrij oefenen zonder opdracht |

### 1.4 Hoe nieuwe letters "aankomen" (verhaallijn)

Nieuwe grafemen komen **niet** als tekst-uitleg, maar als gebeurtenis:

1. De Klankboom laat een **klank-ei** vallen dat zachtjes naar beneden dwarrelt.
2. Het klank-ei rolt naar een plekje in het bos en **opent** met een zachte "ploep".
3. Uit het ei komt de nieuwe klank tevoorschijn en Ploef hoort hem: "Ooo, luister! k… k… k!"
4. Het kind gaat de nieuwe klank ontdekken in De Klankbron (ED §3, fase 2→3).
5. Pas als `LK.<g>.SOUND ≥ 0.8`, krijgt het grafeem een vast blaadje aan de Klankboom.

**Belangrijk (didactiek, niet schrijven wegens ED §3 regel 2):** er komt **hooguit één nieuw grafeem per sessie**, en alleen als het vorige `LK.<g>.SOUND ≥ 0.8` **en** het aantal zwakke grafemen (mastery < 0.6) ≤ 2. De verpakking vraagt dit niet aan het kind; het systeem bepaalt het.

### 1.5 Toon & humor (richtlijnen)

- Taal in audio is **kort, warm, spreektaal**, positief en zonder straf (ED §9).
- Ploef reageert op *proces* ("Je luisterde goed naar elke klank"), nooit op het kind als persoon.
- Geluidshumor: plofjes, oor-flap, belletje bij een nieuw blaadje; **geen** zoemer of foutpiep (ED §9.1).
- Nooit tekst die het kind zelfstandig moet **lezen** als instructie (ED §9 + UX §8 hierna).

---

## 2. Scheiding: pedagogisch doel vs. game-mechanic

Deze tabel is de kern van het document. Alles in de kolom *Pedagogisch doel* is bindend (ED). Alles in *Game-mechanic/verpakking* is vrij ontwerp zolang het de linkerkolom niet schaadt.

| Mechanic | Pedagogisch doel (leerdoel-ID, ED) | Game-mechanic/verpakking (vrij) |
|---|---|---|
| Warming-up | PH.RHYME, PH.SYLLABLE (herhaling van gemeesterd materiaal) | Ploef rekt zich uit op de Fluisterheuvel; rijmparen als "klank-wekkertjes" |
| Klankjager | FN.FIRST_SOUND, FN.LAST_SOUND | Ploef jaagt met een "oor-net" op de eerste klank van een woord |
| Letter-klank | LK.`<g>`.SOUND, LK.`<g>`.RECOGNIZE | Klankbron: water dat klankt als je een letter aanraakt; klankparels |
| Hakken | AN.VC, AN.CVC, FN.COUNT | Letterspringers: letters springen los als het kind ze aantikt |
| Plakken | SY.VC, SY.CVC | Klanklijm: klankblokjes schuiven tegen elkaar tot ze "klikken" |
| Woord lezen | DE.VC, DE.CVC (MVP) | Raam-onthul / Woordweide: het plaatje komt pas ná lezen |
| Mini-game De Klimboom | DE.CVC (MVP), woordherkenning | Ploef klimt omhoog: audio-opdracht → het juiste geschreven woord tikken |
| Beloningen | Ondersteunend (P11, P12): motivatie | Klankvonkjes, vriendjeskaarten, blaadjes aan de Klankboom |
| Wereldkaart | Ondersteunend: mastery bepaalt toegang (ED §10) | De kaart van het Klankwoud gaat per gebied open |
| Ouderzone | Rapportage (ED §12) | "Ouderhol" achter een oudercheck |

**Regel:** als een verpakkingselement (plaatje, animatie, geluid, kleur) het antwoord zou verklappen of de leerhandeling zou overnemen, is het verboden (ED §11, §1.3).

---

## 3. Sessie-loop (5–10 min, stoppen kan altijd)

### 3.1 Vaste volgorde

De sessie is **voorspelbaar** (veiligheid voor jonge kinderen) maar de inhoud past zich aan.

`warming-up → klankoefening → nieuwe letter/klank → oefenen → woorden lezen → mini-game → herhaling → beloning → vrij spelen`

| # | Stap | MVP-aantal items | Richtduur | Leerdoelen (ED) | Toelichting |
|---|---|---|---|---|---|
| 1 | Warming-up | 2–3 | ~1 min | PH.RHYME / PH.SYLLABLE | Alleen gemeesterd materiaal; succeservaring start |
| 2 | Klankoefening | 3 | ~1 min | FN.FIRST_SOUND, FN.LAST_SOUND | Puur auditief, geen geschreven woord |
| 3 | Nieuwe letter/klank | 4–5 | ~1,5 min | LK.`<g>`.RECOGNIZE, LK.`<g>`.SOUND | Alleen als de poort (ED §3 regel 2) opengaat; anders vervalt deze stap |
| 4 | Oefenen | 5–6 | ~2 min | AN.CVC, SY.CVC, FN.COUNT | Hakken/plakken met de nieuwste + zwakke grafemen |
| 5 | Woorden lezen | 5–8 | ~2 min | DE.VC, DE.CVC | Geschreven woord, plaatje pas ná correct |
| 6 | Mini-game De Klimboom | 6–10 korte items | ~1,5 min | DE.CVC, woordherkenning | Decoderen is de enige route om te "klimmen" |
| 7 | Herhaling | 3–4 | ~1 min | Leitner-box (ED §10.4) | Wat bijna wegzakte komt terug |
| 8 | Beloning | 1 | ~15 s | Ondersteunend | Klein, ná leeswerk, deterministisch |
| 9 | Vrij spelen | optioneel | vrij | alle gemeesterde doelen | De Speelwei; geen opdracht, geen score |

**Totaal MVP ≈ 30–40 interacties, 5–10 minuten.** Dit blijft binnen de aanbeveling van ED §3 regel 4 (10–15 min max) en is korter voor jonge kleuters.

### 3.2 De grote huisknop (altijd stoppen)

- Rechtsboven staat **altijd** een grote **huisknop** (het "klank-huisje", ≥ 88 px, herkenbaar icoon).
- Eén tik → korte bevestiging in audio: *"We stoppen. Knap gedaan vandaag!"* (fb.nav.stop.1) → terug naar kaart.
- **Nooit** verplicht "nog één ronde", geen aftellende klok, geen straf voor stoppen.
- Onderbroken sessies hervatten bij de **sectie**, niet opnieuw bij het begin.

### 3.3 Wanneer de sessie zelf eindigt

- Na stap 9 (of na de beloning als het kind vrij spelen overslaat) verschijnt de kaart met Ploef die gaapt.
- Audio: *"We zijn klaar! Je hebt goed geoefend."* (fb.nav.done.1)
- Er wordt **geen** sessietimer of streak-druk getoond.

---

## 4. Activiteiten

Elke activiteit heeft dezelfde vaste kopjes, zodat de Architect ze eenduidig kan bouwen: schermopbouw, invoer, audio-prompt, feedback-flow, afleiders, bijgewerkte leerdoelen, waarom niet via plaatje te raden.

Algemene regels die voor **alle** activiteiten gelden (uit ED §9, §10.5, §11):
- Positie van het juiste antwoord is gerandomiseerd; nooit 3× dezelfde positie.
- Antwoorden < 500 ms na de prompt worden als **gokindicator** behandeld: item telt niet mee, rustige prompt *"Rustig maar. Eerst goed kijken."* (fb.guess.1).
- Nooit een geblokkeerd woord (ED §6.4), ook niet als afleider.
- Audio-opties hebben **identieke** knoppen (geen verschillend icoon/kleur/lengte).
- Bij elke activiteit is er een **herhaal-knop** (oor-icoon, ≥ 64 px) die de laatste audio-prompt opnieuw afspeelt, zonder straf.

---

### 4a. Klankjager (eerste klank herkennen)

**Pedagogisch doel:** FN.FIRST_SOUND (variant voor de laatste klank: FN.LAST_SOUND). Auditief; geen geschreven woord in beeld (ED §11 regel 3).

**Game-mechanic/verpakking:** Ploef loopt met een groot "oor-net" over de Fluisterheuvel en vangt het woord dat met de juiste klank begint.

**Schermopbouw**
- Boven: Ploef met oor-net.
- Midden: 2–3 identieke "klankbolletjes" (grote ronde knoppen, geen labels).
- Onder: herhaal-knop (oor-icoon) + huisknop.
- De bolletjes hebben **geen** plaatje en **geen** beginletter.

**Invoer**
- Tik/klik op een bolletje; spatie + pijltjestoetsen + Enter als toetsenbord-equivalent (focus-ring duidelijk).
- Sleep is hier niet nodig (minder motorische belasting).

**Audio-prompt (exact)**
- Midden: *"Welk woord begint met mmm?"*
- Bij variant laatste klank: *"Welk woord eindigt op sss?"*
- Daarna worden de kandidaten één voor één uitgesproken met een korte pauze: *"mat. … tas. … kam."* (knoppen geven bij hover/focus dezelfde audio).

**Feedback-flow**
| Poging | Reactie |
|---|---|
| Correct | fb.correct.6 *"Je luisterde goed."* + het juiste woord wordt nog eens gezegd, met de doelklank gerekt: *"mmm-mat."* |
| 1e fout | fb.try1.2 *"Luister nog eens goed."* + alleen de eerste klank van de gekozen optie wordt herhaald |
| 2e fout (hint) | fb.hint.4 *"De klank is mmm. Welk woord begint daarmee?"* + de doelklank wordt 2× gerekt |
| 3e fout (modeling) | fb.model.3 *"Samen: mmm-mat. Mat begint met mmm. Straks mag je het nog een keer."* → succeservaring, item komt later terug |

**Afleiders** (ED §10.5): start op niveau A (klinker vs. medeklinker, bv. doel *mat* naast *as*), dan B (andere medeklinker, bv. *tas*), dan C (nabije klank, bv. *rat* ↔ *mat*). Maximaal 2 afleiders in MVP; nooit 3 vóór mastery ≥ 0.85.

**Bijgewerkte leerdoelen**
- FN.FIRST_SOUND / FN.LAST_SOUND: `mastery`, `accuracy`, `attempts`, `hints_used`, `consecutive_correct` (ED §10.1).

**Waarom niet te raden via plaatje**
Er zijn **geen plaatjes** in deze taak (ED §4.1). Alle opties zijn gesproken woorden; onderscheid kan alleen door naar de **eerste/laatste klank** te luisteren. Omdat de knoppen identiek zijn en de volgorde willekeurig, geeft niets anders een hint.

---

### 4b. Letter-klank (letter zien → klank kiezen, en klank horen → letter tikken)

**Pedagogisch doel:** LK.`<g>`.SOUND (grafeem → klank, leesrichting, hoofddoel) en LK.`<g>`.RECOGNIZE (klank → grafeem). Splitsing: **richting 1** = letter zien, klank kiezen; **richting 2** = klank horen, letter tikken.

**Game-mechanic/verpakking:** De Klankbron. Een grote letter hangt boven het water; als je hem aanraakt, klinkt het water (de klank). Klankparels drijven in een rij.

**Schermopbouw richting 1 (letter → klank)**
- Boven: één grote letter (≥ 200 px), nog **stil** bij binnenkomst (ED §4.1: "eerst stil").
- Midden: 2–4 identieke klankknoppen met luidspreker-icoon (geen tekst op de knop).
- Herhaal-knop en huisknop.

**Schermopbouw richting 2 (klank → letter)**
- Boven: Ploef die de klank laat horen (geen geschreven voorbeeldwoord ernaast, ED §11 regel 4).
- Midden: 2–4 letterknoppen in willekeurige volgorde.

**Invoer**
- Tik/klik op een klankknop of letterknop; toetsenbord: Tab/←→ + Enter; cijfertoetsen 1–4 als snelkoppeling naar knop 1–4.

**Audio-prompt (exact)**
- Richting 1: *"Welke klank zegt deze letter?"* (letter blijft in beeld).
- Richting 2: *"Welke letter hoort bij sss?"*
- Bij aanraken van een klankknop hoort het kind telkens één klank, in willekeurige volgorde.

**Feedback-flow**
| Poging | Reactie |
|---|---|
| Correct | fb.correct.1 *"Super!"* + de klank wordt herhaald: *"Deze letter zegt mmm."* |
| 1e fout (letternaam gekozen, ED §9.3) | fb.try1.5 *"Dat is de naam van de letter. Welke klank maakt hij?"* |
| 1e fout (andere klank) | fb.try1.2 *"Luister nog eens goed."* |
| 2e fout (hint) | fb.hint.2 *"Deze letter zegt sss."* + klank gerekt |
| 3e fout (modeling) | fb.model.4 *"Samen: de s zegt sss. Jij mag het straks nog eens."* |

**Afleiders** (ED §10.5, nooit twee juiste antwoorden): 
- niveau A: klinker vs. medeklinker (m ↔ a);
- niveau B: zelfde klasse (m ↔ s ↔ k);
- niveau C/D: klassieke verwarringen — uitsluitend met **geleerde** grafemen (in MVP: m/n niet mogelijk, want n nog niet geleerd; wel t/k, m/r indien verwarrend).
- **Regel:** ei/ij en ou/au staan hier nooit samen (ED §5.3 note).

**Bijgewerkte leerdoelen**
- LK.`<g>`.SOUND of LK.`<g>`.RECOGNIZE: `mastery`, `accuracy`, `response_time`, `attempts`, `hints_used`, `sessions_seen`, `leitner_box`.

**Waarom niet te raden via plaatje**
Geen plaatjes en geen voorbeeldwoord naast de letter (ED §11 regel 4). De klankknoppen zijn visueel identiek en de posities willekeurig. Alleen wie de klank kent, kiest goed.

---

### 4c. Hakken (geschreven woord → letters één voor één tikken)

**Pedagogisch doel:** AN.CVC (en AN.VC), daarna FN.COUNT (aantal klanken). Let op ED §4.1: "Stenen hakken" is auditief, maar **hakken op geschreven letters** hoort bij de leesrichting en ondersteunt DE.*; de **score** blijft op AN.*/FN.COUNT (ED §4.1 noot bij Woordbouwer: spellingsrichting telt niet voor DE.*).

**Game-mechanic/verpakking:** Letterspringers. Elk geschreven woord staat uit elkaar als losse letters op glimmende steentjes. Als het kind een letter aantikt, **springt** die letter los en laat zijn **klank** horen.

**Schermopbouw**
- Boven: Ploef met een "hak-hamertje" (puur visueel).
- Midden: het geschreven woord in losse letters, van links naar rechts (grote blokken ≥ 96 px).
- Onder: een **klankrij** (evenveel lege vakjes als klanken) die stap voor stap volloopt.
- Herhaal-knop, huisknop.

**Invoer**
- Tik op letters **in volgorde links→rechts**; toetsenbord: ←→ om te kiezen, Enter/Spatie om te tikken.
- Slepen is niet nodig (bewegingsrust).

**Audio-prompt (exact)**
- Start: *"Tik de letters één voor één. Hoor je de klanken?"*
- Bij elke tik: de klank van die letter, gerekt: *"k…"*, *"a…"*, *"m…"*.
- Na de laatste letter: *"Hoeveel klanken hoor je?"* (FN.COUNT).

**Feedback-flow**
| Poging | Reactie |
|---|---|
| Correct (goede letter op goede plek, oplopend) | per tik een plofje + fb.correct.6 bij de laatste; daarna fb.correct.7 *"Goed gehakt!"* |
| 1e fout (verkeerde letter / verkeerde volgorde) | fb.try1.4 *"We lezen van links naar rechts. Begin hier."* + vinger-animatie |
| 2e fout (hint) | fb.hint.5 *"Luister: k… a… m. Tik ze in deze volgorde."* |
| 3e fout (modeling) | fb.model.1 *"We doen het samen. k-a-m … kam! Straks komt hij nog een keer."* → spel tikt de letters mee, kind tikt na |

**Afleiders / fouttypen:** verwisselde volgorde (tak ↔ kat) → omkeer-hint (ED §9.3); verkeerde letter → *"Kijk naar de eerste letter. Welke klank zegt die?"*.

**Bijgewerkte leerdoelen**
- AN.CVC / AN.VC (hakken) en FN.COUNT (aantal klanken). **Niet** DE.* (ED §4.1).

**Waarom niet te raden via plaatje**
Er is geen plaatje; het woord staat als **letters** in beeld en er is geen gesproken doelwoord vóór het hakken (ED §11 regel 3). De klankrij onthult het aantal klanken pas ná het tikken.

---

### 4d. Plakken (gerekte klanken → geschreven woord kiezen / klankblokjes samen)

**Pedagogisch doel:** SY.CVC, SY.VC (synthese). Twee routes: (1) kiezen uit geschreven woorden; (2) klankblokjes samen schuiven.

**Game-mechanic/verpakking:** Klanklijm. Klankparels zweven; als het kind ze samenbrengt "klikt" het woord vast.

**Schermopbouw route 1 (klanken horen → woord kiezen)**
- Boven: Ploef die klanken laat horen; geen geschreven doelwoord.
- Midden: 2–3 geschreven woorden (gelijkende lengte, ED §11 regel 6).
- Audio speelt de klanken **gerekt** met pauzes: *"k … a … m"*.

**Schermopbouw route 2 (klankblokjes schuiven)**
- Midden: 2–3 klankblokjes met **gesproken** klank (klik = klank), lege "plakbaan".
- Kind schuift de blokjes in de plakbaan; bij een foute volgorde klikt het niet.

**Invoer**
- Route 1: tik/klik woord; toetsenbord: ←→ + Enter.
- Route 2: slepen met vinger/muis (grote blokken), toetsenbord-alternatief: blok kiezen met ←→, plaatsen met Enter, terug met Backspace.

**Audio-prompt (exact)**
- Route 1: *"Plak de klanken aan elkaar. Welk woord hoor je?"* → *"k … a … m."*
- Route 2: *"Sleep de klanken in de goede volgorde."*

**Feedback-flow**
| Poging | Reactie |
|---|---|
| Correct | fb.correct.5 *"Knap geplakt!"* + het hele woord nog eens vlot: *"kam."* |
| 1e fout (klinker) | fb.try1.6 *"Luister naar het midden. Hoor je a of o?"* |
| 1e fout (begin/eind) | fb.try1.3 *"Het begin klopt! Kijk nog eens naar het eind."* |
| 2e fout (hint) | fb.hint.1 *"Luister: k… a… m. Plak maar aan elkaar."* + klanken 1× gerekt |
| 3e fout (modeling) | fb.model.1 *"We doen het samen. k-a-m … kam! Straks komt hij nog een keer."* |

**Afleiders** (ED §10.5): minimale paren — *kam / kat / ram* (route 1). Start niveau A (kam ↔ tas ↔ rit), dan C/D (kam ↔ kat ↔ kas). Nooit ei/ij of ou/au samen.

**Bijgewerkte leerdoelen**
- SY.CVC / SY.VC: `mastery`, `accuracy`, `response_time`, `attempts`, `hints_used`.

**Waarom niet te raden via plaatje**
Route 1 toont **geen plaatjes** en speelt het doelwoord niet vooraf als woord; de afleiders zijn minimale paren, dus alleen correct plakken onderscheidt. Route 2 is puur volgorde van klanken; er valt niets te benoemen.

---

### 4e. Woord lezen (geschreven woord → zelf hakken & plakken → pas daarna betekenis)

**Pedagogisch doel:** DE.VC, DE.CVC (MVP). Dit is het **hoofddoel** van fase 5; het plaatje is **beloning en betekeniscontrole**, nooit hint (ED §4.1, §11 regel 1).

**Game-mechanic/verpakking:** Raam-onthul. Achter een "raam" in het Klankwoud zit een plaatje. Eerst lezen, dan zwaait het raam open.

**Schermopbouw**
- Boven: Ploef voor het gesloten raam.
- Midden: het **geschreven woord** (groot, ≥ 120 px), nog geen plaatje.
- Onder: twee knoppen — "hakken" (tik de letters, roept 4c aan) en "plakken/lezen" (audio-opties, roept 4d route 1 aan). Er is **geen** voorlees-knop van het doelwoord vóór het antwoord.
- Pas **na correct**: het raam schuift open en het plaatje + het gesproken woord verschijnen: *"kam. Dit is een kam."*

**Invoer**
- Tik letters om te hakken; kies daarna de juiste klankreeks/het juiste beeld (afhankelijk van substap). Toetsenbord: ←→ + Enter.

**Audio-prompt (exact)**
- *"Lees dit woord. Tik eerst de letters, plak ze daarna aan elkaar."*
- Na correct: *"[woord]. Dit is [beeld]."*
- Bij begripscheck (variant): *"Wat hoort bij dit woord?"*

**Feedback-flow**
| Poging | Reactie |
|---|---|
| Correct | fb.correct.4 *"Mooi gelezen!"* + woord + raam opent |
| 1e fout (kort/lang) | fb.try1.7 *"Kijk: staat er één a of twee? Eén a klinkt kort."* |
| 1e fout (overig) | fb.try1.3 *"Kijk nog eens naar het eind."* of fb.try1.6 *"Luister naar het midden."* |
| 2e fout (hint) | fb.hint.1 gerekte klanken zonder het plaatje |
| 3e fout (modeling) | fb.model.1 modeling; daarna raam alsnog open (succeservaring) |

**Afleiders (begripsvariant)**: plaatjes-opties die **minimaal verschillen** (kat op de mat / kat in de tas) en pas ná lezen getoond (ED §11 regel 2).

**Bijgewerkte leerdoelen**
- DE.VC / DE.CVC: `mastery`, `accuracy`, `response_time`, `sessions_seen`.
- Indirect: SY.CVC (via de plakstap).

**Waarom niet te raden via plaatje**
Er is **geen plaatje vóór** het antwoord (ED §11 regel 1). De audio-opties zijn identieke knoppen zonder plaatje. Bij de begripsvariant zijn alle plaatjes gelijkwaardig tot de hele tekst gelezen is.

---

### 4f. Mini-game MVP: **De Klimboom** (vereist echt decoderen)

**Pedagogisch doel:** DE.CVC (MVP) + beginnende woordherkenning (P9). De enige route omhoog is het **juiste geschreven woord** kiezen bij een **gesproken** opdracht.

**Game-mechanic/verpakking:** Ploef wil tot boven in de Klankboom klimmen. Op elke tak liggen 3 geschreven woorden. Ploef hoort een woord en tikt de tak met dat woord; bij goed springt Ploef een tak hoger, bij fout zakt hij één tak terug en probeert opnieuw. Geen tijdsdruk; "record" alleen binnen deze sessie.

**Schermopbouw**
- Links: Ploef op een tak, hoogtemeter met blaadjes (geen getal als er leesdruk van uitgaat; liever blaadjes).
- Midden: 3 geschreven woorden op takken (≥ 96 px hoog).
- Audio-opdracht via oor; herhaal-knop; huisknop.

**Invoer**
- Tik/klik de tak; toetsenbord: ←→ + Enter, cijfers 1–3.

**Audio-prompt (exact)**
- *"Klim naar kam."* (doelwoord uit MVP-lijst; nooit vooraf gespeld).
- Herhaal-knop herhaalt exact deze zin.

**Feedback-flow**
| Poging | Reactie |
|---|---|
| Correct | Ploef springt een tak hoger + fb.correct.2 *"Goed gedaan!"* |
| 1e fout | Ploef waggelt, zakt niet meteen; fb.try1.3 *"Kijk nog eens naar het eind."* |
| 2e fout (hint) | Ploef blijft staan; fb.hint.1 gerekte klanken van het doelwoord |
| 3e fout (modeling) | fb.model.2 *"Samen: dit is tak. t-a-k. Jij mag hem straks nog eens."* + Ploef zakt één tak, daarna een makkelijker woord (niveau −1) |

**Afleiders:** minimale paren uit de **MVP-woordenlijst** (kam / kat / tak; mat / rat / stam), niveau C/D alleen bij mastery ≥ 0.85 (ED §10.5 regel 5). Nooit *kak* of andere geblokkeerde woorden (ED §6.4).

**Bijgewerkte leerdoelen**
- DE.CVC: `mastery`, `accuracy`, `response_time`, `consecutive_correct`.
- Woordherkenning (P9): indirect via herhaald correct decoderen.

**Waarom niet te raden via plaatje**
Er zijn **geen plaatjes** bij de woorden op de takken; de opdracht is alleen **audio** en de woorden zijn zichtbaar geschreven. Alleen decoderen koppelt het gesproken woord aan het juiste geschreven woord. Positie en afleiders wisselen per ronde.

> **Waarom precies deze mini-game:** hij gebruikt dezelfde handeling als ED §4.1 "Lees-en-kies (audio)" en "Woordzoeker" (audio → geschreven woord), maar met een eigen, kindvriendelijke speelvorm (klimmen), zonder timer, zonder verlies, en met een sessie-eigen "record" als zachte motivatie. Hij **verraadt niets via plaatjes** en dwingt decoderen af.

---

## 5. Centrale feedbackteksten met ID's

Alle feedback is **klankbestand** (opname), niet TTS, vanwege de onbetrouwbaarheid van losse klanken (ED §13 regel 1). Geen "FOUT", geen rood kruis, geen levens, geen negatieve score (ED §9.1).

### 5.1 Correct
| ID | Tekst |
|---|---|
| fb.correct.1 | "Super!" |
| fb.correct.2 | "Goed gedaan!" |
| fb.correct.3 | "Ja, dat klopt." |
| fb.correct.4 | "Mooi gelezen!" |
| fb.correct.5 | "Knap geplakt!" |
| fb.correct.6 | "Je luisterde goed." |
| fb.correct.7 | "Goed gehakt!" |
| fb.correct.8 | "Fijn dat je het nog eens probeerde." |

### 5.2 Eerste poging fout (foutspecifiek, ED §9.3)
| ID | Tekst |
|---|---|
| fb.try1.1 | "Bijna. Probeer nog een keer." |
| fb.try1.2 | "Luister nog eens goed." |
| fb.try1.3 | "Het begin klopt! Kijk nog eens naar het eind." |
| fb.try1.4 | "We lezen van links naar rechts. Begin hier." |
| fb.try1.5 | "Dat is de naam van de letter. Welke klank maakt hij?" |
| fb.try1.6 | "Luister naar het midden. Hoor je a of o?" |
| fb.try1.7 | "Kijk: staat er één a of twee? Eén a klinkt kort." |

### 5.3 Tweede poging fout (hint)
| ID | Tekst |
|---|---|
| fb.hint.1 | "Luister: k… a… m. Plak maar aan elkaar." |
| fb.hint.2 | "Deze letter zegt sss." |
| fb.hint.3 | "Kijk naar de eerste letter. Welke klank zegt die?" |
| fb.hint.4 | "De klank is mmm. Welk woord begint daarmee?" |
| fb.hint.5 | "Luister: k… a… m. Tik ze in deze volgorde." |

### 5.4 Derde poging fout (modeling, ED §9.2)
| ID | Tekst |
|---|---|
| fb.model.1 | "We doen het samen. k-a-m … kam! Dit woord is kam. Straks komt hij nog een keer." |
| fb.model.2 | "Samen: dit is tak. t-a-k. Jij mag hem straks nog eens." |
| fb.model.3 | "Samen: mmm-mat. Mat begint met mmm. Straks mag je het nog een keer." |
| fb.model.4 | "Samen: de s zegt sss. Jij mag het straks nog eens." |

### 5.5 Overig
| ID | Tekst |
|---|---|
| fb.guess.1 | "Rustig maar. Eerst goed kijken." |
| fb.nav.stop.1 | "We stoppen. Knap gedaan vandaag!" |
| fb.nav.done.1 | "We zijn klaar! Je hebt goed geoefend." |
| fb.audio.repeat.1 | "Ik zeg het nog een keer." |
| fb.reward.1 | "Een klankvonkje voor jou!" |
| fb.letterarrive.1 | "Ooo, luister! Er is een nieuwe klank." |
| fb.help.parent.1 | "Vraag maar aan een grote mens." (als ouderzone nodig is) |

### 5.6 Regels
- Feedback klinkt **altijd** even vriendelijk en even luid bij goed en fout (ED §9.1).
- Na een fout volgt **altijd** een succeservaring binnen hetzelfde item (ED §9.1).
- Het gemodelleerde item komt later in de sessie terug (ED §9.2, stap 7 "herhaling").

---

## 6. Beloningen & progressie

### 6.1 Verzamelobjecten
- **Klankvonkjes:** klein, niet-gokachtig, **altijd na leeswerk** (nooit als je alleen maar tikt). Één vonkje per afgeronde leesstap (stappen 3, 4, 5, 6 uit §3.1).
- **Vriendjeskaarten:** bij een nieuw gemeesterd grafeem; deterministisch (je weet welke kaart, geen loot-box/verrassingsei-economie).
- **Blaadjes aan de Klankboom:** groeien bij `LK.<g>.SOUND ≥ 0.8`.
- Beloningen zijn **niet inwisselbaar tegen tijdwinst of hogere moeilijkheid**; ze versieren de wereld.

**Verboden:** loot boxes, gokmechanieken, willekeurige zeldzaamheid, verliesbare valuta, "daily streak" die stress geeft, aankopen.

### 6.2 Geen tijdsdruk
- Geen aftellende klok, geen "snel of weg".
- Snelheid (FL.*) komt **pas** als accuraatheid ≥ 0.85 (ED §3 regel 1) en wordt **alleen** met de eigen vorige sessie vergeleken (ED §4.1 Flitsrace).

### 6.3 Wereldkaart op basis van mastery
- Een gebied gaat open als de **beheersingscriteria** van de bijbehorende fase uit ED §3 zijn gehaald (mastery ≥ 0.8, attempts ≥ N, consecutive_correct ≥ 4, sessions_seen ≥ 2).
- De kaart toont **geen** percentages aan het kind; wel groene blaadjes bij "zeker", een half blaadje bij "aan het oefenen".
- Terugvallen (ED §10.3 "terugval") sluit een gebied **niet** weer af; het kind kan er altijd naar terug om te oefenen.

### 6.4 Hoe nieuwe letters "aankomen" (gameplay)
Zie §1.4. In gameplaytermen:
1. Poortcheck slaagt (ED §3 regel 2).
2. Klank-ei valt → korte animatie → klank klinkt → nieuw gebiedsdeel licht op.
3. Meteen daarna stap 3 van de sessie (§3.1) met het nieuwe grafeem.

---

## 7. Adaptiviteit in gameplay-termen

De regels komen uit ED §10; hier vertaald naar wat het kind ziet/hoort.

| Situatie (ED §10.3) | Concreet in de game |
|---|---|
| Vereenvoudigen (mastery < 0.5, of 2× s ≤ 0.25) | Minder afleiders (3 → 2), klank/letter wordt **automatisch** nog eens gezegd, klanken worden gerekt, kortere woorden |
| Moeilijker (mastery > 0.85 en consecutive_correct ≥ 5) | Meer afleiders (2 → 3 → 4), minimale paren, minder automatische audio-ondersteuning |
| Frustratiestop (3× modeling op rij) | Schakel naar een **gemeesterd** makkelijk item (succes), daarna andere activiteit; rapportage: "extra oefening" |
| Zwakke letters | Zwakke grafemen (mastery < 0.6) komen **vaker** terug in warming-up, oefenen en herhaling |
| Terugval (gemeesterd zakt < 0.65) | Letter terug naar "in oefening"; Leitner-box 1 (ED §10.4) |
| Sessiemix (ED §10.3) | ~60% huidig doel, ~25% herhaling (Leitner), ~15% voorbereidend |

**Keuzeaantallen (UI):** MVP gebruikt **2 → 3 → 4** antwoordopties. De UI toont alles groot; bij 4 opties staan ze in 2×2, nooit kleiner dan 64 px (§8).

**Extra audio:** bij lage mastery wordt de prompt na een korte pauze **automatisch** herhaald (niet alleen op de oor-knop), en worden losse klanken gerekt (mmm, sss, rrr).

**Herhaling zwakke letters:** het systeem mengt zwakke grafemen door de oefen- en herhaalstap; het kind ziet dit niet als "extra fout", alleen als "deze klank komt nog eens langs".

---

## 8. UX voor 5–6-jarigen

### 8.1 Geen leesbare instructietekst nodig
- **Alle** uitleg is **audio + icoon**. Er staat geen zin in beeld die het kind moet lezen (behalve het leesmateriaal zelf, dat is de oefening).
- Iconen zijn eenduidig: oor = herhaal, huisje = stop, pijl = verder, ster/blaadje = beloning.

### 8.2 Herhaal-knop
- Altijd zichtbaar: **oor-icoon**, ≥ 64 px, rechtsonder. Herhaalt de laatste audio-prompt exact (fb.audio.repeat.1). Geen straf, geen limiet.

### 8.3 Doelgrootte en lay-out
- Tikdoelen **≥ 64 px**, liefst ≥ 88 px; ruimte ertussen zodat mis-tikken zeldzaam is.
- Weinig keuzes per scherm (max 4 antwoorden + navigatie).
- Grote, rustige animaties; geen flitsende effecten; geen drukke achtergrond (contrast met leesmateriaal).
- Letters die gelezen worden: schreefloze, jonge-lezers-vriendelijke vorm (enkele verdieping, duidelijke a).

### 8.4 Invoer
- **Touch** (tik/sleep) en **toetsenbord** (Tab/pijltjes + Enter; cijfers 1–4) zijn gelijkwaardig.
- Geen dubbele-tik, geen sleepprecisie vereist waar het niet nodig is (alleen bij "plakken" route 2).

### 8.5 Geen tijdslimiet
- Nergens een aftellende klok in MVP (behalve fase 9 FL.*, en dan alleen tegen eigen record).
- Pauzeren en stoppen kan altijd via de huisknop (§3.2).

### 8.6 Rust en voorspelbaarheid
- Vaste schermindeling en vaste knop-plekken (huisje altijd rechtsboven, oor altijd rechtsonder).
- Geen reclame, geen notificaties, geen externe links.

---

## 9. Ouderzone

### 9.1 Toegang: oudercheck
- De ouderzone ("Het Ouderhol") zit achter de Klankboom.
- Toegang vereist **twee** dingen (combinatie van ingedrukt houden + geschreven rekensom):
  1. Houd een knop **5 seconden** ingedrukt (voorkomt per ongeluk openen door een kind).
  2. Los een **geschreven rekensom** op die typisch te moeilijk is voor een 5–6-jarige, bv. "7 + 6 = ?". Fout → terug naar het spel, geen uitleg.
- Kinderen kunnen de ouderzone dus niet per ongeluk openen.

### 9.2 Dashboardinhoud (volgens ED §12)
Het dashboard neemt **letterlijk** de indicatoren uit ED §12.1 en de formuleringen uit §12.2 over, en respecteert §12.3.

| Onderdeel | Bron (ED) | Weergave |
|---|---|---|
| Geleerde klanken | LK.*.SOUND ≥ 0.8 | Kaart van grafemen: groen = zeker, geel = oefent, grijs = nog niet |
| Extra aandacht | LK.* < 0.6 na ≥ 10 items | Lijst met klanken |
| Hakken en plakken | AN.CVC, SY.CVC | "zeker / oefent / nog niet" |
| Woorden lezen | DE.* per patroon | idem + voorbeeldwoorden die goed gaan |
| Sight words | SW.* | lijst (buiten MVP; nu leeg/uitgegrijsd) |
| Zinnen/teksten | ZI.SIMPLE, TX.SHORT | aantal gelezen (buiten MVP) |
| Vlotheid | FL.* | trend t.o.v. eigen eerdere sessies; alleen na accuraatheid |
| Oefentijd | sessies, minuten | per week |
| Hulpgebruik | hints_used / attempts | trend |

### 9.3 Formuleringen en verboden
- Gebruik de voorbeeldformuleringen uit ED §12.2, bv. *"Rik kent nu de klanken m, a, s, t en k."* en *"Rik gebruikt bij woorden met drie klanken vaak nog een hint. Dat hoort bij deze fase; het spel biedt deze woorden vaker aan."*
- **Verboden** (ED §12.3): geen diagnose-/stoornistermen, geen percentielen of AVI/DMT, geen vergelijking met andere kinderen, geen rood of negatief label. Alleen neutrale kleuren.
- Tip-kaartjes (ED §12.2): *"Tip: laat Rik thuis woorden uit het spel opzoeken in een prentenboek."*
- Bij aanhoudende moeite de zachte doorverwijzing uit ED §12.2 ("bespreek dit met de leerkracht"), zonder diagnose.

---

## 10. MVP-scope vs. later

### 10.1 MVP (nu te bouwen)
- **Grafemen:** m, a, s, t, k, r (ED §5.2), volgorde m → a → s → t → k → r.
- **Leerdoelen:** FN.FIRST_SOUND, FN.LAST_SOUND, FN.COUNT, LK.`<g>`.SOUND, LK.`<g>`.RECOGNIZE, AN.VC, AN.CVC, SY.VC, SY.CVC, DE.VC, DE.CVC. (PH.RHYME/PH.SYLLABLE alleen als warming-up-herhaling.)
- **Woorden:** de 18 MVP-woorden uit ED §6.5 (mam, mat, tas, kam, kat, tak, kas, ram, rat, kar, as + arm, ark, kast, mast, stam, kras, start). Blokkeerlijst actief.
- **Gebieden:** Fluisterheuvel, Vormenwoud, Klankbron, Plakplek, Woordweide + Speelwei.
- **Activiteiten:** 4a Klankjager, 4b Letter-klank, 4c Hakken, 4d Plakken, 4e Woord lezen, 4f De Klimboom.
- **Beloningen:** klankvonkjes, blaadjes aan de Klankboom.
- **Ouderzone:** basisdashboard (klanken, hakken/plakken, woorden, oefentijd, hulpgebruik).
- **Audio:** opnames voor klanken, woorden, feedback en instructies (geen TTS voor losse klanken).
- **Geen:** spraakherkenning, sight words, zinnen, teksten, vlotheidsscores, meerlettergrepige woorden.

### 10.2 Later (na MVP)
| Fase (ED §3) | Toevoeging |
|---|---|
| 6 | Clusters + tweetekenklanken (DE.CCVC/CVCC/CCVCC, AN/SY.CLUSTER), Klauterrotsen |
| 7 | Zinnen, sight words (SW.*), LK.UPPER, Zinnenzee |
| 8 | Korte teksten (TX.SHORT), Verhalendal |
| 9 | Vlotheid (FL.*), Vlotheidstoren, alleen na accuraatheid ≥ 0.85 |
| Later | Meertalige betekenisondersteuning, instapcheck voor methode-afstemming (ED §13 regel 6), alfabetliedje met letternamen |
| Nooit in MVP/tot bewezen | Spraakherkenning (ED §13 regel 2) |

---

## 11. Asset-lijst MVP

### 11.1 Beeld (eigen, eenvoudige SVG's – geen externe art)
**Personage & wereld**
- Ploef: idles (2), oor-flap (goed), struikel (zacht, niet straffend), klim (3 standen), wijs/vinger-animatie (bij omkeerhint), gapen (sessie-einde).
- Klankboom (3 groeistadia), klank-ei (dicht/open), klankvonkje, vriendjeskaart-achterkant, blaadje (groen/half).
- Achtergronden: 6 gebiedsachtergronden (Fluisterheuvel, Vormenwoud, Klankbron, Plakplek, Woordweide, Speelwei) + kaart van het Klankwoud.
- UI-iconen: oor (herhaal), huisje (stop), pijl (verder), ster/blaadje (beloning), klankparel, klankblokje, klanksteen, plakbaan.

**Lees-/klankmateriaal (geen hint-plaatjes in taken!)**
- Lettervormen voor m, a, s, t, k, r (grote versie + gewone versie).
- Plaatjes **alleen als beloning/betekenis ná lezen** (ED §11): mam, as, mat, tas, kam, kat, tak, kas, ram, rat, kar, arm, ark, kast, mast, stam, kras; optioneel start.
- **Nog niet afgebeeld (geen asset):** start.

### 11.2 Audio (opnames, native spreker, Standaardnederlands; geen TTS voor losse klanken – ED §13 regel 1)
**Per grafeem (m, a, s, t, k, r)**
- Letternaam (alleen ouderzone/liedje): "em", "aa", "es", "tee", "kaa", "er".
- Klank (kern): "mmm", kort "a", "sss", "t", "k", "rrr" — zonder sjwa ("muh").
- Voorbeeldwoord (auditief): m → maan; a → mam; s → as; t → mat/tas; k → kam/kat; r → ram/rat.

**Woorden (18 MVP-woorden):** mam, as, mat, tas, kam, kat, tak, kas, ram, rat, kar, arm, ark, kast, mast, stam, kras, start.

**Gerekte/gehakte klankreeksen:** k…a…m; m…a…t; t…a…s; s…t…a…m; (enz.) voor hint/modeling.

**Feedback (per ID, §5):** alle `fb.correct.*`, `fb.try1.*`, `fb.hint.*`, `fb.model.*`, `fb.guess.1`, `fb.nav.stop.1`, `fb.nav.done.1`, `fb.audio.repeat.1`, `fb.reward.1`, `fb.letterarrive.1`, `fb.help.parent.1`.

**Instructies (exacte zinnen, per activiteit):**
- Klankjager: "Welk woord begint met mmm?" / "Welk woord eindigt op sss?"
- Letter-klank r1: "Welke klank zegt deze letter?" / r2: "Welke letter hoort bij sss?"
- Hakken: "Tik de letters één voor één. Hoor je de klanken?" / "Hoeveel klanken hoor je?"
- Plakken: "Plak de klanken aan elkaar. Welk woord hoor je?" / "Sleep de klanken in de goede volgorde."
- Woord lezen: "Lees dit woord. Tik eerst de letters, plak ze daarna aan elkaar." / "[woord]. Dit is [beeld]."
- De Klimboom: "Klim naar kam." (per doelwoord ingestudeerd)
- Algemeen: "Ik zeg het nog een keer." / "Rustig maar. Eerst goed kijken."

### 11.3 Technisch/asset-meta
- Elke audio-clip: korte bestandsnaam = ID (`lk.m.sound`, `de.kam`, `fb.correct.1`), 44.1 kHz mono, genormaliseerd volume zodat goed/fout even luid zijn (ED §9.1).
- Elke SVG: geen tekst erin die het kind moet lezen; schaalt naar ≥ 64 px.
- Placeholders mogen TTS zijn voor **opnames van hele woorden** tijdens ontwikkeling, maar losse klanken en gerekte klanken **altijd** als echte opname (ED §13 regel 1).

---

## 12. Controle: ED-regels die dit ontwerp respecteert

1. Geen plaatje vóór correct decoderen bij DE.*/ZI.*/TX.* (ED §11 regel 1).
2. Geen geschreven antwoord in auditieve taken (ED §11 regel 3).
3. Geen twee juiste antwoorden (ei/ij, ou/au, g/ch) — in MVP n.v.t., regel blijft staan (ED §5.3 note).
4. Antwoordposities gerandomiseerd, geen patroon (ED §10.5 regel 6).
5. Gokdetectie < 500 ms: item telt niet, rustige prompt (ED §11 regel 9).
6. Hoge slagingskans ~80–85% (ED P11) via startniveau A en maximaal 2 afleiders.
7. Na fout altijd een succeservaring; gemodelleerd item komt terug (ED §9).
8. Nooit snelheid vóór accuraatheid (ED §3 regel 1).
9. Eén nieuw grafeem per sessie, met poortconditie (ED §3 regel 2).
10. Geen diagnose/percentiel aan de ouder (ED §12.3).

---

## 13. Openstaande punten (voor Architect & opdrachtgever)

1. Exacte bewoording/duur van alle audio-opnames vastleggen met een native spreker (ED §13 regel 1, §13 regel 7: tweede taalkundige/leerkracht reviewt woordlijsten vóór release).
2. Beslissen of het sessie-einde automatisch of met bevestiging gebeurt (UX-test met kinderen).
3. Instapcheck en methode-afstemming: nu buiten MVP (ED §13 regel 6).
4. Fase-9-vlotheid is ontworpen maar valt buiten MVP; UI mag nog geen timer tonen.
5. Toegankelijkheid: testen met toetsenbord-only en met touch-only, doelgrootte ≥ 64 px op kleine schermen.
