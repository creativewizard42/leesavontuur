# LEESAVONTUUR – Educational Design (didactisch ontwerpdocument)

| | |
|---|---|
| Versie | 1.1 (0.1 + ontwerpbeslissingen na review; zie §15) |
| Doelgroep | kinderen van 5–6 jaar (eind groep 2 – groep 3), Nederlands |
| Status | Didactisch ontwerp. Bevat geen code. IDs in dit document zijn bindend voor de software (mastery-skills). |
| Herziening | 2026-10-02 – gelijkgetrokken met de implementatie naar aanleiding van de educational/QA/security-reviews (ronde 1–3). Bewuste afwijkingen zijn onderbouwd in §15. |
| Afbakening | Origineel ontwerp. Er is géén lettervolgorde, geen personages en geen kernwoorden van een commerciële methode (o.a. *Veilig leren lezen*, *Lijn 3*) overgenomen. |

**Leeswijzer bronmarkering**
- **[B1]–[B4]** = bron die tijdens dit ontwerp echt is geraadpleegd (zie §14).
- **[VK]** = algemene vakkennis over leesdidactiek/onderzoek (bekend uit de literatuur, niet online gecontroleerd tijdens dit ontwerp). De Architect/opdrachtgever kan deze claims laten valideren door een leesspecialist.
- **[ONTWERP]** = eigen ontwerpbeslissing voor LEESAVONTUUR.

---

## 1. Gebruikte Nederlandse onderwijsprincipes

### 1.1 Kader
- De wettelijke kerndoelen Nederlands (2006) en de daarop gebaseerde tussendoelen en leerlijnen (TULE) zijn ontwikkeld door SLO samen met het Expertisecentrum Nederlands [B1]. Sinds augustus 2026 staan nieuwe kerndoelen Nederlands in de wet, met overgangsrecht tot augustus 2031 [B3]. LEESAVONTUUR richt zich op het **technisch-lezen-fundament** (beginnende geletterdheid → aanvankelijk lezen) en sluit aan bij de bedoeling van kerndoel 9 (plezier in lezen; voor groep 3/4: "gemotiveerd om zelf te kunnen lezen", "verhalende boeken om zelf te lezen") [B2].
- Nieuwe kerndoelen benadrukken rijke teksten; aangepaste teksten zijn toegestaan "als scaffold" [B3]. LEESAVONTUUR levert juist die scaffold (decodeerbare oefenteksten) en **vervangt geen** voorlezen of rijk tekstaanbod (zie §13).
- Het Expertisecentrum Nederlands publiceert het *Protocol Preventie van Leesproblemen groep 1 en 2* en is betrokken bij Dyslexie Centraal [B4]. De algemene principes uit de protocollen leesproblemen en dyslexie (vroeg signaleren, systematische instructie, extra oefentijd, monitoren) gebruiken wij als ontwerpprincipe [VK]; we nemen géén diagnose- of normeringsfunctie over.

### 1.2 Kernprincipes (pedagogisch)

| # | Principe | Betekenis voor LEESAVONTUUR | Bron |
|---|---|---|---|
| P1 | **Beginnende geletterdheid** | Kind ontdekt dat geschreven taal betekenis draagt en dat letters klanken voorstellen. Spel start met plezier en verhaal. | [B2], [VK] |
| P2 | **Fonologisch bewustzijn** (grote eenheden) | Rijm, lettergrepen klappen; voorwaarde, geen eindstation. Kort aanbieden. | [VK] |
| P3 | **Fonemisch bewustzijn** | Losse klanken in woorden horen: eerste klank, laatste klank, aantal klanken. Sterkste voorspeller van leessucces. | [VK] (o.a. National Reading Panel 2000) |
| P4 | **Alfabetisch principe** | Inzicht dat letters (grafemen) klanken (fonemen) representeren en dat de volgorde links→rechts telt. | [VK] |
| P5 | **Letter-klankkoppeling** | Expliciet, systematisch, één grafeem tegelijk, inclusief tweetekenklanken als één eenheid (aa = 1 klank). Klank vóór letternaam. | [VK] |
| P6 | **Auditieve analyse (hakken)** | Gesproken woord opdelen in klanken: kam → k-a-m. | [VK] |
| P7 | **Auditieve synthese (plakken)** | Losse klanken samenvoegen: k-a-m → kam. | [VK] |
| P8 | **Decoderen klankzuivere woorden (MKM)** | Elk grafeem heeft precies de geleerde klank; woorden worden opgebouwd van VC → MKM → clusters. | [VK] |
| P9 | **Woordherkenning** | Na herhaald correct decoderen wordt een woord direct herkend (Ehri: van alfabetisch naar geconsolideerd lezen). | [VK] |
| P10 | **Beginnende leesvloeiendheid / automatiseren** | Snelheid komt ná accuraatheid; herhaald lezen van bekende woorden en zinnen. | [VK] |
| P11 | **Succesgericht oefenen** | Hoge slagingskans (~80–85%), korte sessies, directe en specifieke feedback. | [VK] |
| P12 | **Gespreide herhaling** | Gemeesterde inhoud keert terug met toenemende tussenpozen. | [VK] |

### 1.3 PEDAGOGISCHE UITGANGSPUNTEN versus GAME-MECHANICS
- **Pedagogische uitgangspunten** (niet onderhandelbaar voor de Game Designer): P1–P12, de lettervolgorde (§5), de klankzuiverheidsregels (§6), de anti-raadregels (§11) en de feedbackprincipes (§9).
- **Game-mechanics** (vrij te ontwerpen, mits ze bovenstaande niet schenden): wereld, personages, beloningen, animaties, verzamelobjecten, navigatie. Een mechanic mag **nooit** een leerhandeling vervangen (bv. een plaatje dat het antwoord verraadt, of een timer die angst geeft).

---

## 2. Leerdoelen met unieke IDs

Conventie: `DOMEIN.ONDERWERP[.SUBDOEL]`. Grafeem-IDs gebruiken kleine letters zonder accenten, tweetekenklanken als geheel (`LK.aa.SOUND`, `LK.ij.SOUND`). Elk ID is één mastery-skill in de software.

### 2.1 Fonologisch bewustzijn (PH)
| ID | Omschrijving | Meetbaar gedrag in spel |
|---|---|---|
| PH.RHYME | Hoort of twee woorden rijmen | Kiest uit 2–3 gesproken woorden het rijmwoord |
| PH.SYLLABLE | Verdeelt een woord in lettergrepen | Tikt het aantal klappen (1–3) bij gesproken woord |

### 2.2 Fonemisch bewustzijn (FN)
| ID | Omschrijving | Meetbaar gedrag |
|---|---|---|
| FN.FIRST_SOUND | Hoort de eerste klank | Kiest welk woord begint met /m/ (auditief) |
| FN.LAST_SOUND | Hoort de laatste klank | Kiest welk woord eindigt op /s/ |
| FN.MID_SOUND | Hoort de middelste klank (klinker) | Kiest: hoor je /ɑ/ of /aː/ in "kam"? |
| FN.COUNT | Telt klanken in een woord (2–4) | Legt evenveel steentjes als klanken |

### 2.3 Letter-klank (LK) – per grafeem `<g>`
| ID-patroon | Omschrijving | Richting |
|---|---|---|
| LK.`<g>`.SOUND | Ziet grafeem → kiest de juiste klank uit 2–4 audio-knoppen | grafeem → klank (leesrichting, hoofddoel) |
| LK.`<g>`.RECOGNIZE | Hoort klank → vindt het grafeem tussen afleiders | klank → grafeem |
| LK.`<g>`.UPPER | Herkent de hoofdletter (pas vanaf fase 7, alleen voor letters aan zinsbegin/namen) | grafeem → klank |

`<g>` ∈ {m, a, s, t, k, r, i, v, aa, l, n, oo, e, d, ee, p, o, z, ie, h, oe, u, b, uu, j, ij, w, g, eu, ui, f, ei, ou, au, ch, ng, nk} (+ later alleen herkenning: c, x, y, q).

### 2.4 Analyse en synthese (AN/SY)
| ID | Omschrijving |
|---|---|
| AN.VC | Hakt gesproken VC-woord (as) in klanken |
| AN.CVC | Hakt gesproken MKM-woord (kam → k-a-m) |
| AN.CLUSTER | Hakt woord met medeklinkercluster (stam → s-t-a-m) |
| SY.VC | Plakt 2 gesproken klanken tot woord |
| SY.CVC | Plakt 3 gesproken klanken tot woord (k-a-m → kam) |
| SY.CLUSTER | Plakt 4–5 klanken met cluster |

### 2.5 Decoderen (DE) – geschreven woorden
| ID | Patroon | Voorbeeld |
|---|---|---|
| DE.VC | klinker-medeklinker | as, in, al |
| DE.CVC | MKM, korte klinker | kam, tas |
| DE.CVVC | MKM, lange klinker/tweetekenklank | kaas, voet, huis |
| DE.CCVC | MMKM (cluster vooraan) | stam, slak |
| DE.CVCC | MKMM (cluster achteraan) | kast, mist |
| DE.CCVCC | MMKMM | start, staart |
| DE.MULTI | meerlettergrepig (pas na fase 9, buiten MVP) | – |

### 2.6 Sight words (SW), zinnen (ZI), teksten (TX), vloeiendheid (FL)
| ID | Omschrijving |
|---|---|
| SW.de, SW.een, SW.het, SW.ze, SW.we, SW.je | Herkent het niet-klankzuivere woord direct (zie §7) |
| ZI.PHRASE | Leest woordgroep van 2–3 woorden (de kat) |
| ZI.SIMPLE | Leest eenvoudige zin (3–5 woorden) en toont begrip |
| ZI.CAPITAL | Leest zin met hoofdletter en punt |
| TX.SHORT | Leest korte tekst (3–5 zinnen) en beantwoordt 1 begripsvraag |
| FL.GRAPHEME | Benoemt/kiest gemeesterde klanken snel (< 2 s per item) |
| FL.CVC | Leest bekende MKM-woorden snel en accuraat |
| FL.WORDLIST | Leest reeks van 5–10 woorden achter elkaar |
| FL.SENTENCE | Leest bekende zin vlot (herhaald lezen) |

---

## 3. Leerlijn in 9 fasen

De fasen zijn **niet strikt lineair**: elk nieuw grafeem doorloopt fase 2→3→5 opnieuw (spiraal). Fase 1 loopt door zolang FN-doelen nog niet gemeesterd zijn. "Mastery" = waarde uit §10 (0–1).

| Fase | Naam | Doelen (IDs) | Instapcriteria | Beheersingscriteria | Kernactiviteiten |
|---|---|---|---|---|---|
| 1 | Klanken herkennen (auditief) | PH.RHYME, PH.SYLLABLE, FN.FIRST_SOUND, FN.LAST_SOUND, FN.COUNT | Geen (startfase); korte instapcheck | PH.* ≥ 0.75 over ≥ 10 items; FN.FIRST_SOUND ≥ 0.8 over ≥ 12 items | Rijmpoort, klapbrug, "wat hoor je eerst?" |
| 2 | Letters (vorm) | LK.`<g>`.RECOGNIZE voor nieuw grafeem | FN.FIRST_SOUND ≥ 0.8 | LK.`<g>`.RECOGNIZE ≥ 0.8 over ≥ 10 items | Klank horen → letter vinden; letter natekenen (optioneel, niet gescoord) |
| 3 | Letter-klankkoppeling | LK.`<g>`.SOUND | LK.`<g>`.RECOGNIZE ≥ 0.6 | LK.`<g>`.SOUND ≥ 0.8 over ≥ 12 items, in ≥ 2 sessies | Letter zien → juiste klank-knop kiezen |
| 4 | Samenvoegen (analyse/synthese) | AN.VC, SY.VC, AN.CVC, SY.CVC, FN.COUNT | ≥ 3 grafemen gemeesterd (LK.SOUND ≥ 0.8) waaronder 1 klinker | SY.CVC en AN.CVC ≥ 0.8 over ≥ 12 items | Klankenbrug (plakken), stenen leggen (hakken) |
| 5 | Korte klankzuivere woorden | DE.VC, DE.CVC | SY.CVC ≥ 0.7 en alle grafemen in het woord LK.SOUND ≥ 0.8 | DE.CVC ≥ 0.8 over ≥ 15 items | Lees-en-kies (audio), woordbouwer, raam-onthul (plaatje ná lezen) |
| 6 | Meer woorden | DE.CVVC (aa/oo/ee én latere tweetekenklanken), DE.CCVC, DE.CVCC, DE.CCVCC, AN/SY.CLUSTER | DE.CVC ≥ 0.8; ≥ 15 grafemen gemeesterd | Elk DE-patroon ≥ 0.8 over ≥ 15 items | Clusterbrug, minimale-parenpad |
| 7 | Zinnen | SW.*, ZI.PHRASE, ZI.SIMPLE, ZI.CAPITAL, LK.`<g>`.UPPER | DE.CVC ≥ 0.85; SW.de en SW.een ≥ 0.8 | ZI.SIMPLE ≥ 0.8 over ≥ 10 zinnen | Zinnentrein, zin-actie (doe wat er staat) |
| 8 | Korte teksten | TX.SHORT | ZI.SIMPLE ≥ 0.8 | TX.SHORT ≥ 0.8 over ≥ 5 teksten (begripsvraag + leesaccuraatheid) | Verhaalpagina's, kies-het-vervolg |
| 9 | Automatiseren | FL.GRAPHEME, FL.CVC, FL.WORDLIST, FL.SENTENCE | DE.CVC ≥ 0.85 (accuraatheid eerst!) | FL.CVC: ≥ 90% correct én mediane responstijd ≤ 3 s over ≥ 20 items; FL.SENTENCE: herhaald lezen zonder fout | Flitsrace tegen eigen record (geen klok tegen anderen), woordenlint |

**Regels bij fasen [ONTWERP]**
1. Snelheid (FL.*) wordt nooit getraind voordat accuraatheid ≥ 0.85 is.
2. Een nieuw grafeem wordt pas geïntroduceerd als het vorige LK.`<g>`.SOUND **beheerst** is volgens de volledige beheersingsdefinitie (§10.3: mastery ≥ 0.8 **en** ≥ 12 items **en** ≥ 4 op rij correct **en** ≥ 2 sessies) **en** de som van "zwakke" grafemen (mastery < 0.6) ≤ 2 is.
3. Per sessie hooguit **één** nieuw grafeem.
4. Een sessie duurt 10–15 minuten (aanbeveling; kleuters/groep-3-kinderen hebben korte aandachtsspanne [VK]).
5. **Eerste letter en poort (afwijking, zie §15.2):** de allereerste letter wordt geïntroduceerd met uitsluitend `LK.<g>.SOUND` (met auditieve, niet-getoonde klank-afleiders), en de poort naar fase 3 toetst `LK.<g>.SOUND`. `LK.<g>.RECOGNIZE` start pas zodra er ≥ 2 geleerde grafemen zijn.
6. **Niet eindeloos vasthouden in fase 1 (vangnet, zie §15.7):** een leerling die de fase-1-poort (`FN.FIRST_SOUND ≥ 0.8`) ondanks gerichte oefening niet haalt, krijgt na verloop van tijd **toch** de eerste letter, met extra auditieve ondersteuning, terwijl de fase-1-oefening in de warming-up blijft. Principe: een kind mag niet onbeperkt in één fase vastzitten.

---

## 4. Relatie gameactiviteiten ↔ leerdoelen

### 4.1 Activiteitentabel
"Hoort/ziet/doet" beschrijft de leerhandeling; de verpakking (thema, beloning) is game-mechanic en vrij.

| Activiteitstype | Kind hoort | Kind ziet | Kind doet | Leerdoel | Waarom niet via plaatje te raden |
|---|---|---|---|---|---|
| Rijmpoort | "kat … wat rijmt op kat?" + 3 woorden | 3 neutrale knoppen (geen plaatjes) of plaatjes die alle drie benoemd worden | tikt rijmwoord | PH.RHYME | Alle opties zijn woorden; kiezen kan alleen door luisteren naar het eind |
| Klapbrug | woord ("ko-nijn") | plank per klap | tikt per lettergreep | PH.SYLLABLE | Puur auditief |
| Eerste-klank-vangst | "Welk woord begint met mmm?" + 3 woorden | genummerde knoppen of afgebeelde objecten **die het spel hardop noemt** | kiest | FN.FIRST_SOUND | Afleiders kunnen ook afgebeeld worden; antwoord vereist klankvergelijking |
| Eindklank-vangst | "Welk woord eindigt op sss?" | idem | kiest | FN.LAST_SOUND | idem |
| Klanken tellen | "kam" | lege stenen | legt 1 steen per klank | FN.COUNT, AN.CVC | Geen tekst, geen plaatje-hint over aantal |
| Klankenbrug (plakken) | "k … a … m" (gerekt, pauzes) | 3 plaatjes: kam, kat, ram | kiest | SY.CVC | Afleiders zijn minimale paren: alleen correct plakken onderscheidt ze |
| Stenen hakken | "tas" | 3 stenen, elk gaat klinken bij tik | tikt stenen in volgorde, spel laat klank horen | AN.CVC | Auditief; geen plaatje |
| Letterzoeker | "sss" | 2–4 letters | tikt letter | LK.`<g>`.RECOGNIZE | Geen plaatjes; geen woord met beginletter ernaast |
| Klankknop | – (eerst stil) | één letter groot | tikt 1 van 2–4 klank-knoppen (luidspreker-icoon), hoort elke optie | LK.`<g>`.SOUND | Klankknoppen zijn identiek van uiterlijk; volgorde random |
| Lees-en-kies (audio) | 3 gesproken woorden via knoppen | één geschreven woord ("kam") | kiest knop die bij het woord hoort | DE.* | Er is geen plaatje vóór het antwoord |
| Woordzoeker | "Waar staat kat?" | 3 geschreven woorden (kat, kam, tak) | tikt woord | DE.*, woordherkenning | Opties verschillen in letters; geen plaatjes |
| Klankglijbaan | – | woord; letters lichten op als kind erover veegt; spel laat elke klank horen | veegt (zelf-plakken), kiest daarna audio-optie | DE.CVC + SY | Plaatje verschijnt pas ná correcte keuze |
| Raam-onthul | – | woord | leest (Klankknop/Lees-en-kies) → raam gaat open → plaatje | DE.* (beloning) | Plaatje is beloning/betekenis, nooit hint |
| Woordbouwer (spellingsrichting, ondersteunend) | "kam" | letterblokjes | legt k-a-m | AN.CVC + LK.RECOGNIZE | Auditief, geen plaatje; telt **niet** voor DE.* |
| Sight-word-flits | – | woord (de/een/het) 1,5 s, dan 3 opties | kiest | SW.* | Opties zijn visueel gelijkend (de/en/een) |
| Zinnentrein | – | zin in wagons | leest; tik op wagon = hulp (woord wordt hardop geplakt, telt als hint) | ZI.* | Begripskeuze tussen 2–3 plaatjes die minimaal verschillen (kat op mat / kat in tas) en pas ná het lezen getoond worden |
| Zin-actie | – | "de kat zit op het dak" | sleept kat naar juiste plek | ZI.SIMPLE | Scène bevat alle mogelijke plekken; alleen de zin bepaalt het doel |
| Verhaalpagina | (optioneel model-lezen ná eigen poging) | 3–5 zinnen | leest, beantwoordt 1 vraag | TX.SHORT | Illustratie verschijnt pas na de laatste zin |
| Flitsrace | – | bekende woorden achter elkaar | leest/kiest snel; vergelijking alleen met eigen vorige keer | FL.* | Alleen gemeesterde woorden |

### 4.2 Onderscheid kort
- **PEDAGOGISCH**: welke handeling (luisteren, kiezen van klank bij letter, plakken), welke afleiders, wanneer een plaatje mag, hoe feedback klinkt.
- **GAME-MECHANIC**: verpakking zoals "raam", "brug", "trein", sterren, verzamelkaarten, wereldkaart. Beloningen worden gegeven voor **inzet en voortgang**, niet voor snelheid (behalve FL.*, en dan alleen ten opzichte van zichzelf).

---

## 5. Opbouw letters/klanken (eigen volgorde)

### 5.1 Ontwerpcriteria [ONTWERP, onderbouwd met VK]
1. **Rekbare klanken (continuanten) eerst**: m, s, (r, l, n, v, z) kun je aanhouden ("mmmm"), waardoor plakken makkelijker is dan met plofklanken.
2. **Snel echte woorden kunnen maken**: na 3–5 grafemen moeten betekenisvolle woorden mogelijk zijn (motivatie, P1).
3. **Verwarbare paren uit elkaar**: m/n (10 posities), b/d (9), ei/ij (6), v/f (23), s/z (15), p/b (7), u/n (visueel, 11), a/aa en e/ee pas als korte klinker stevig zit.
4. **Frequentie**: hoogfrequente grafemen (t, n, e, a, r, s, k) vroeg.
5. **Klinkers gespreid**: elk blok bevat minstens één klinker, zodat het woordaanbod groeit.
6. **Regionale variatie later**: g/ch (zachte of harde g), w, uitspraak van r in de coda worden niet in de eerste blokken als ankerklank gebruikt.
7. **Eén klank – één teken in het begin**: grafemen met twee spellingen voor één klank (ei/ij, ou/au) komen laat.

### 5.2 Beoordeling MVP-voorstel opdrachtgever (m, s, k, a)
- **Positief**: m en s zijn continuanten; a is een frequente korte klinker; k is frequent.
- **Probleem 1 – te weinig woorden**: met m, s, k, a zijn alleen *kam, kas, mam, mak, as, smak* mogelijk = 6 echte woorden, waarvan maar 3 goed afbeeldbaar. Dat haalt de eis van ≥ 8 niet.
- **Probleem 2 – ongepaste combinatie**: *kak* is direct vormbaar → moet op de blokkeerlijst (§6.4).
- **Besluit [ONTWERP]**: MVP = **m, a, s, t, k, r** (6 grafemen) = het voorstel + t + r.
  - t (hoge frequentie) levert direct *mat, tas, kat, tak, kast, mast, stam*.
  - r (continuant) levert *ram, rat, kar, arm, kras*.
  - Hiermee ontstaan **18 kindvriendelijke, klankzuivere woorden**, waarvan 17 goed afbeeldbaar (§6.5). Drie kandidaten uit de eerste versie zijn vervallen: `mak` (niet afbeeldbaar), `smak` en `mars` (niet kindvriendelijk/betekenisvol). Het restant blijft ruim boven de eis van ≥ 8.
  - Volgorde binnen het MVP: m → a → s → t → k → r. Na elk nieuw grafeem komen er meteen woorden bij (m+a: *mam*; +s: *as*; +t: *mat, tas*; +k: *kam, kat, tak, kas*; +r: *ram, rat, kar*).
  - Afweging: t en k zijn plofklanken (niet rekbaar). Ze komen pas na twee continuanten en een klinker en worden steeds aan het **eind** van het eerste plak-oefenwoord aangeboden (*mat* vóór *tas*), zodat het kind eerst met rekbare klanken leert plakken.

### 5.3 Volledige volgorde (37 grafemen + herkenning)

| Blok | # | Grafeem | Letternaam | Klank (IPA) | Uitspraak-hint voor opname/TTS (zonder sjwa) | Type | Voorbeeldwoord (alleen geleerde grafemen) |
|---|---|---|---|---|---|---|---|
| 1 (MVP) | 1 | m | "em" | /m/ | "mmm" (lippen dicht, 1 s aanhouden; níét "muh") | continuant (nasaal) | – alleen auditief: *maan* |
| 1 | 2 | a | "aa" | /ɑ/ | kort "a" als in *kam*; niet de letternaam "aa" | korte klinker | *mam* |
| 1 | 3 | s | "es" | /s/ | "sss" (sissen, niet "suh") | continuant | *as* |
| 1 | 4 | t | "tee" | /t/ | kort tikje "t", stemloos, zonder naklinkende "uh" | plosief | *mat*, *tas* |
| 1 | 5 | k | "kaa" | /k/ | kort "k", zachte plof, zonder "uh" | plosief | *kam*, *kat* |
| 1 | 6 | r | "er" | /r/ | "rrr" (tongpunt- of huig-r, aangehouden; geen "ruh") | continuant | *ram*, *rat* |
| 2 | 7 | i | "ie" | /ɪ/ | kort "i" als in *kist*; niet de letternaam "ie" | korte klinker | *mis*, *kist* |
| 2 | 8 | v | "vee" | /v/ | "vvv" (zacht, stem aan; in veel regio's bijna f – opname met duidelijke v) | continuant | *vat*, *vis* |
| 2 | 9 | aa | "lange aa" | /aː/ | "aaa" | lange klinker (tweeteken) | *kaas*, *raam* |
| 2 | 10 | l | "el" | /l/ | "lll" | continuant | *lam*, *slak* |
| 2 | 11 | n | "en" | /n/ | "nnn" (tong tegen tandvlees) | continuant (nasaal) | *kan*, *maan* |
| 3 | 12 | oo | "lange oo" | /oː/ | "ooo" | lange klinker (tweeteken) | *kool*, *rook* |
| 3 | 13 | e | "ee" | /ɛ/ | kort "e" als in *nek*; geen sjwa | korte klinker | *nek*, *mes* |
| 3 | 14 | d | "dee" | /d/ | kort "d", stem aan, alleen aan woordbegin aanbieden | plosief | *dak*, *das* |
| 3 | 15 | ee | "lange ee" | /eː/ | "eee" | lange klinker (tweeteken) | *teen*, *steen* |
| 4 | 16 | p | "pee" | /p/ | kort "p", geen "puh" | plosief | *kip*, *pan* |
| 4 | 17 | o | "oo" | /ɔ/ | kort "o" als in *pop* | korte klinker | *pop*, *sok* |
| 4 | 18 | z | "zet" | /z/ | "zzz" (zoemen) | continuant | *zon*, *zak* |
| 4 | 19 | ie | "ie" | /i/ | "ie" (gespannen, kort-lang) | klinker (tweeteken) | *riem*, *diep* |
| 4 | 20 | h | "haa" | /ɦ/ | zacht hijgen "hhh" | continuant (glottaal) | *hek*, *hok* |
| 5 | 21 | oe | "oe" | /u/ | "oe" | klinker (tweeteken) | *voet*, *koek* |
| 5 | 22 | u | "uu" | /ʏ/ | kort "u" als in *hut* | korte klinker | *hut*, *mus* |
| 5 | 23 | b | "bee" | /b/ | kort "b", stem aan, alleen aan woordbegin | plosief | *bal*, *bus* |
| 5 | 24 | uu | "lange uu" | /y/ | "uuu" | lange klinker (tweeteken) | *muur*, *vuur* (zie r-noot §6.3) |
| 5 | 25 | j | "jee" | /j/ | "jjj" (als begin van *ja*) | continuant (glijklank) | *jas* (niet *jam*: Engelse uitspraak) |
| 6 | 26 | ij | "lange ij" | /ɛi/ | "ij" | tweeklank | *ijs*, *pijl* |
| 6 | 27 | w | "wee" | /ʋ/ | "www" (lip-tand, niet Engels w) | continuant | *wol*, *wiel* |
| 6 | 28 | g | "gee" | /ɣ/ (vaak [x]) | "ggg" schurend; opnames in noordelijke én zuidelijke variant overwegen | continuant | *gat*, *geel* |
| 6 | 29 | eu | "eu" | /øː/ | "eu" | lange klinker (tweeteken) | *neus*, *reus* |
| 6 | 30 | ui | "ui" | /œy/ | "ui" | tweeklank | *huis*, *muis* |
| 7 | 31 | f | "ef" | /f/ | "fff" | continuant | *fles*, *fiets* |
| 7 | 32 | ei | "korte ei" | /ɛi/ | zelfde klank als ij | tweeklank | *geit*, *ei* |
| 7 | 33 | ou | "ou" | /ʌu/ | "ou" | tweeklank | *zout*, *hout* |
| 7 | 34 | au | "au" | /ʌu/ | zelfde klank als ou | tweeklank | *saus* |
| 7 | 35 | ch | "cee-haa" | /x/ | "ggg/chch" schurend, zelfde als g in veel regio's | continuant | *lach*, *licht* |
| 8 | 36 | ng | "en-gee" | /ŋ/ | "ng" (achter in de mond, géén g erachter) | continuant (nasaal) | *ring*, *slang* |
| 8 | 37 | nk | "en-kaa" | /ŋk/ | "ngk" | nasaal + plosief | *bank*, *pink* |
| later | – | c, x, y, q | – | wisselend | alleen herkennen; niet in decodeeroefeningen | – | – |

Noten bij de volgorde:
- **Waarom oo vóór korte o?** oo levert met de letters van blok 1–2 direct woorden (*kool, rook, room, look*), korte o pas zinvol met p (*pop, kop*). Het contrast o/oo wordt in blok 4 expliciet geoefend (FN.MID_SOUND).
- **ei/ij en ou/au** klinken gelijk. In klank→grafeem-taken (LK.RECOGNIZE) mogen ze **nooit** samen als opties verschijnen (twee juiste antwoorden). In grafeem→klank-taken zijn beide gewoon "dezelfde klank" (eigen kaartje "twee manieren om hetzelfde te schrijven").
- **Letternaam vs. klank**: in alle oefeningen staat de **klank** centraal. De letternaam wordt alleen gebruikt in ouderinformatie en eventueel in een alfabetliedje (buiten de mastery-skills).
- **Clusters** (st, sl, kr, sp, schr …) zijn geen eigen grafemen; ze worden geoefend in DE.CCVC/DE.CVCC. *sch* wordt in fase 6 aangeboden als s + ch.

---

## 6. Opbouw woordcomplexiteit

### 6.1 Volgorde van patronen
| Stap | Patroon | Voorbeelden | Fase |
|---|---|---|---|
| 1 | VC | as, in, al | 4–5 |
| 2 | MKM kort (CVC) | kam, tas, vis | 5 |
| 3 | MKM lang (CVVC, met aa/oo/ee) | kaas, kool, been | 6 |
| 4 | MKMM (CVCC) | kast, mist, tent | 5–6 |
| 5 | MMKM (CCVC) | stam, slak, kras | 6 |
| 6 | Tweetekenklanken oe, ie, ui, eu, ij/ei, ou/au | voet, riem, huis, neus | 6 |
| 7 | MMKMM / ng / nk / ch | start, slang, bank, lacht | 6 |
| 8 | Meerlettergrepig (open/gesloten lettergreep, verdubbeling) | buiten MVP; vervolgontwerp | na 9 |

### 6.2 Regels voor klankzuiverheid (filter op woordenbank) [VK + ONTWERP]
Een woord is pas "klankzuiver" in LEESAVONTUUR als het aan **alle** regels voldoet:
1. **Geen eindklankverscherping**: geen woorden die eindigen op -b of -d (*hond, bed, web, lid, goud, koud*) en tot fase 6 ook niet op -g (*vlag, leeg, deeg*).
2. **Geen sjwa** (stomme e): geen *-e, -en, -el, -er* uitgangen. Woorden als *de, een, het, ze, we, je* zijn **sight words** (§7).
3. **Geen -ig, -lijk, -tie, -isch**.
4. **Geen verdubbeling/verenkeling** (open lettergrepen als *ma-nen*, *bom-men*) vóór DE.MULTI.
5. **Let op r-klinkerkleuring**: ee, oo, eu, ie vóór r klinken anders (*beer, oor, deur, mier*). Deze worden **uitgesloten** tot een aparte stap na fase 6. aa en uu vóór r (*raam* heeft r vooraan; *muur, vuur, kaart*) klinken alleen iets langer: toegestaan, mits de opname gecontroleerd is.
6. **Geen leenwoorden met afwijkende uitspraak** (*chips, cent, jus*).
7. **Geen assimilatie-gevoelige combinaties** in vroege fasen (bv. *-mb-*).
8. **Alleen geleerde grafemen** (uitzondering: als het item puur auditief is, gemarkeerd "auditief").
9. **Betekenis gecontroleerd**: correct standaardnederlands, geen ongepaste of kwetsende betekenis (blokkeerlijst §6.4).

### 6.3 Opmerking over r in de coda
In *kar, arm, ark* en *start* staat r **na** de klinker (coda). De eerdere formulering dat in het MVP "eerst woorden met r vooraan" komen, was strijdig met de eigen MVP-lijst (§6.5) en is vervallen: de implementatie volgt de lijst. Didactische onderbouwing:

- **Korte a + r is geen klinkerkleuring.** Echte r-kleuring treedt op bij *ee, oo, eu, ie* vóór r (*beer, oor, deur, mier*); die worden uitgesloten tot na fase 6 (§6.2 regel 5). In *kar, arm, ark, start* staat een **korte a**, die in standaard-Nederlands geen gekleurde klank oplevert. De woorden zijn dus klankzuiver en verantwoord in het MVP.
- **Aandachtspunt voor de leerkracht-review (§13 regel 7).** De realisatie van r varieert sterk (tongpunt-r, huig-r, "Gooise" r) en in *start* staat r in een cluster (s-t-a-r-t), wat de opname gevoelig maakt. Dit is geen reden om het woord te weren, maar wel een expliciet aandachtspunt bij de native opnames en de vakinhoudelijke review: opnemen met een duidelijke r en controleren dat de klinker niet onbedoeld kleurt.

### 6.4 Blokkeerlijst (nooit tonen, ook niet als afleider of gegenereerd item)
*kak, pik, kut, lul, tiet, tet, pis, poep, kont, neuk, seks, lijk, dood, moord, dom, gek, dik, ras* (+ alle varianten). Toelichting: *dik/dom/gek* zijn kwetsend als ze over mensen gaan; *ras* kan als etnische term worden opgevat. **Regel voor de Architect**: elke generator van woorden of afleiders controleert tegen deze lijst, ook bij een combinatie die toevallig ontstaat (bv. als afleider bij *kam*).

### 6.5 Startlijst fase 5 – korte klankzuivere woorden (incl. MVP)
Legenda: Patroon C = medeklinker, V = klinkerfoneem (tweeteken = 1 V). Kv = kindvriendelijk. Pl = plaatje geschikt (ja/matig/nee). Blok = eerste blok waarin alle grafemen bekend zijn. **MVP** = met m, a, s, t, k, r.

| # | Woord | Grafemen | Fonemen | Patroon | Kv | Pl | Blok |
|---|---|---|---|---|---|---|---|
| 1 | mam | m-a-m | /mɑm/ | CVC | ja | ja | **MVP** |
| 2 | as | a-s | /ɑs/ | VC | ja | matig | **MVP** |
| 3 | mat | m-a-t | /mɑt/ | CVC | ja | ja | **MVP** |
| 4 | tas | t-a-s | /tɑs/ | CVC | ja | ja | **MVP** |
| 5 | kam | k-a-m | /kɑm/ | CVC | ja | ja | **MVP** |
| 6 | kat | k-a-t | /kɑt/ | CVC | ja | ja | **MVP** |
| 7 | tak | t-a-k | /tɑk/ | CVC | ja | ja | **MVP** |
| 8 | kas | k-a-s | /kɑs/ | CVC | ja | ja (broeikas) | **MVP** |
| 9 | ram | r-a-m | /rɑm/ | CVC | ja | ja (dier) | **MVP** |
| 10 | rat | r-a-t | /rɑt/ | CVC | ja | ja | **MVP** |
| 11 | kar | k-a-r | /kɑr/ | CVC | ja | ja | **MVP** |
| 12 | arm | a-r-m | /ɑrm/ | VCC | ja | ja | **MVP** |
| 13 | ark | a-r-k | /ɑrk/ | VCC | ja | matig | **MVP** |
| 14 | kast | k-a-s-t | /kɑst/ | CVCC | ja | ja | **MVP** |
| 15 | mast | m-a-s-t | /mɑst/ | CVCC | ja | ja | **MVP** |
| 16 | stam | s-t-a-m | /stɑm/ | CCVC | ja | ja (boomstam) | **MVP** |
| 17 | kras | k-r-a-s | /krɑs/ | CCVC | ja | matig | **MVP** |
| 18 | start | s-t-a-r-t | /stɑrt/ | CCVCC | ja | matig | **MVP** |
| 19 | mis | m-i-s | /mɪs/ | CVC | ja | nee | 2 |
| 20 | kist | k-i-s-t | /kɪst/ | CVCC | ja | ja | 2 |
| 21 | mist | m-i-s-t | /mɪst/ | CVCC | ja | matig | 2 |
| 22 | rit | r-i-t | /rɪt/ | CVC | ja | matig | 2 |
| 23 | tik | t-i-k | /tɪk/ | CVC | ja | nee | 2 |
| 24 | vis | v-i-s | /vɪs/ | CVC | ja | ja | 2 |
| 25 | vat | v-a-t | /vɑt/ | CVC | ja | ja | 2 |
| 26 | vak | v-a-k | /vɑk/ | CVC | ja | matig | 2 |
| 27 | kaas | k-aa-s | /kaːs/ | CVVC | ja | ja | 2 |
| 28 | raam | r-aa-m | /raːm/ | CVVC | ja | ja | 2 |
| 29 | vaas | v-aa-s | /vaːs/ | CVVC | ja | ja | 2 |
| 30 | kaart | k-aa-r-t | /kaːrt/ | CVVCC | ja | ja | 2 |
| 31 | taart | t-aa-r-t | /taːrt/ | CVVCC | ja | ja | 2 |
| 32 | staart | s-t-aa-r-t | /staːrt/ | CCVVCC | ja | ja | 2 |
| 33 | lam | l-a-m | /lɑm/ | CVC | ja | ja | 2 |
| 34 | slak | s-l-a-k | /slɑk/ | CCVC | ja | ja | 2 |
| 35 | stal | s-t-a-l | /stɑl/ | CCVC | ja | ja | 2 |
| 36 | val | v-a-l | /vɑl/ | CVC | ja | matig | 2 |
| 37 | kaal | k-aa-l | /kaːl/ | CVVC | ja | matig | 2 |
| 38 | kan | k-a-n | /kɑn/ | CVC | ja | ja | 2 |
| 39 | man | m-a-n | /mɑn/ | CVC | ja | ja | 2 |
| 40 | nat | n-a-t | /nɑt/ | CVC | ja | matig | 2 |
| 41 | kin | k-i-n | /kɪn/ | CVC | ja | ja | 2 |
| 42 | vin | v-i-n | /vɪn/ | CVC | ja | ja | 2 |
| 43 | maan | m-aa-n | /maːn/ | CVVC | ja | ja | 2 |
| 44 | kraan | k-r-aa-n | /kraːn/ | CCVVC | ja | ja | 2 |
| 45 | lint | l-i-n-t | /lɪnt/ | CVCC | ja | ja | 2 |
| 46 | kool | k-oo-l | /koːl/ | CVVC | ja | ja | 3 |
| 47 | rook | r-oo-k | /roːk/ | CVVC | ja | ja | 3 |
| 48 | oom | oo-m | /oːm/ | VVC | ja | matig | 3 |
| 49 | noot | n-oo-t | /noːt/ | CVVC | ja | ja | 3 |
| 50 | look | l-oo-k | /loːk/ | CVVC | ja | ja | 3 |
| 51 | nek | n-e-k | /nɛk/ | CVC | ja | ja | 3 |
| 52 | mes | m-e-s | /mɛs/ | CVC | ja | ja (botermes) | 3 |
| 53 | net | n-e-t | /nɛt/ | CVC | ja | ja | 3 |
| 54 | tent | t-e-n-t | /tɛnt/ | CVCC | ja | ja | 3 |
| 55 | rem | r-e-m | /rɛm/ | CVC | ja | matig | 3 |
| 56 | melk | m-e-l-k | /mɛlk/ | CVCC | ja | ja | 3 |
| 57 | dak | d-a-k | /dɑk/ | CVC | ja | ja | 3 |
| 58 | das | d-a-s | /dɑs/ | CVC | ja | ja (sjaal/dier) | 3 |
| 59 | dal | d-a-l | /dɑl/ | CVC | ja | matig | 3 |
| 60 | teen | t-ee-n | /teːn/ | CVVC | ja | ja | 3 |
| 61 | steen | s-t-ee-n | /steːn/ | CCVVC | ja | ja | 3 |
| 62 | keel | k-ee-l | /keːl/ | CVVC | ja | matig | 3 |
| 63 | eet | ee-t | /eːt/ | VVC | ja | nee | 3 |

Noot: *been* gebruikt b (blok 5) en staat daarom in fase 6 (§6.6). Fase 5 bevat **63 kandidaten, waarvan 18 MVP**. `mak`, `smak` en `mars` zijn uit de lijst verwijderd om didactische redenen (zie §15.1); de `Kv`-kolom is daarmee voor alle resterende woorden juist.

**MVP-woordenlijst (m, a, s, t, k, r)** – 18 kindvriendelijke, klankzuivere woorden (waarvan 17 met een belonings-SVG; `start` heeft nog geen asset):
- Kern (MKM/VC): *mam, mat, tas, kam, kat, tak, kas, ram, rat, kar, as* (11)
- Uitbreiding (clusters, MVP-eindniveau): *arm, ark, kast, mast, stam, kras, start* (7)
- Verwijderd t.o.v. versie 0.1: *mak* (niet afbeeldbaar), *smak* en *mars* (niet kindvriendelijk/betekenisvol).
- Geblokkeerd: *kak*. Vermeden: *ras* (zie §6.4), *tam* (zeldzaam).

### 6.6 Startlijst fase 6 – meer woorden (nieuwe grafemen + clusters)

| # | Woord | Grafemen | Fonemen | Patroon | Kv | Pl | Blok |
|---|---|---|---|---|---|---|---|
| 1 | pan | p-a-n | /pɑn/ | CVC | ja | ja | 4 |
| 2 | kip | k-i-p | /kɪp/ | CVC | ja | ja | 4 |
| 3 | pet | p-e-t | /pɛt/ | CVC | ja | ja | 4 |
| 4 | lip | l-i-p | /lɪp/ | CVC | ja | ja | 4 |
| 5 | pop | p-o-p | /pɔp/ | CVC | ja | ja | 4 |
| 6 | mol | m-o-l | /mɔl/ | CVC | ja | ja | 4 |
| 7 | kop | k-o-p | /kɔp/ | CVC | ja | ja | 4 |
| 8 | rok | r-o-k | /rɔk/ | CVC | ja | ja | 4 |
| 9 | sok | s-o-k | /sɔk/ | CVC | ja | ja | 4 |
| 10 | vos | v-o-s | /vɔs/ | CVC | ja | ja | 4 |
| 11 | pot | p-o-t | /pɔt/ | CVC | ja | ja | 4 |
| 12 | stok | s-t-o-k | /stɔk/ | CCVC | ja | ja | 4 |
| 13 | slot | s-l-o-t | /slɔt/ | CCVC | ja | ja | 4 |
| 14 | zon | z-o-n | /zɔn/ | CVC | ja | ja | 4 |
| 15 | zak | z-a-k | /zɑk/ | CVC | ja | ja | 4 |
| 16 | zes | z-e-s | /zɛs/ | CVC | ja | ja (cijfer) | 4 |
| 17 | zeep | z-ee-p | /zeːp/ | CVVC | ja | ja | 4 |
| 18 | riem | r-ie-m | /rim/ | CVVC | ja | ja | 4 |
| 19 | diep | d-ie-p | /dip/ | CVVC | ja | matig | 4 |
| 20 | kies | k-ie-s | /kis/ | CVVC | ja | matig | 4 |
| 21 | hek | h-e-k | /ɦɛk/ | CVC | ja | ja | 4 |
| 22 | hok | h-o-k | /ɦɔk/ | CVC | ja | ja | 4 |
| 23 | haas | h-aa-s | /ɦaːs/ | CVVC | ja | ja | 4 |
| 24 | voet | v-oe-t | /vut/ | CVVC | ja | ja | 5 |
| 25 | koek | k-oe-k | /kuk/ | CVVC | ja | ja | 5 |
| 26 | poes | p-oe-s | /pus/ | CVVC | ja | ja | 5 |
| 27 | soep | s-oe-p | /sup/ | CVVC | ja | ja | 5 |
| 28 | stoel | s-t-oe-l | /stul/ | CCVVC | ja | ja | 5 |
| 29 | hut | h-u-t | /ɦʏt/ | CVC | ja | ja | 5 |
| 30 | mus | m-u-s | /mʏs/ | CVC | ja | ja | 5 |
| 31 | bus | b-u-s | /bʏs/ | CVC | ja | ja | 5 |
| 32 | bal | b-a-l | /bɑl/ | CVC | ja | ja | 5 |
| 33 | bes | b-e-s | /bɛs/ | CVC | ja | ja | 5 |
| 34 | been | b-ee-n | /beːn/ | CVVC | ja | ja | 5 |
| 35 | boom | b-oo-m | /boːm/ | CVVC | ja | ja | 5 |
| 36 | boek | b-oe-k | /buk/ | CVVC | ja | ja | 5 |
| 37 | muur | m-uu-r | /myːr/ | CVVC | ja | ja | 5 |
| 38 | vuur | v-uu-r | /vyːr/ | CVVC | ja | ja | 5 |
| 39 | jas | j-a-s | /jɑs/ | CVC | ja | ja | 5 |
| 40 | ijs | ij-s | /ɛis/ | VVC | ja | ja | 6 |
| 41 | pijl | p-ij-l | /pɛil/ | CVVC | ja | ja | 6 |
| 42 | lijm | l-ij-m | /lɛim/ | CVVC | ja | ja | 6 |
| 43 | wol | w-o-l | /ʋɔl/ | CVC | ja | ja | 6 |
| 44 | wiel | w-ie-l | /ʋil/ | CVVC | ja | ja | 6 |
| 45 | gat | g-a-t | /ɣɑt/ | CVC | ja | ja | 6 |
| 46 | geel | g-ee-l | /ɣeːl/ | CVVC | ja | ja (kleur) | 6 |
| 47 | neus | n-eu-s | /nøːs/ | CVVC | ja | ja | 6 |
| 48 | huis | h-ui-s | /ɦœys/ | CVVC | ja | ja | 6 |
| 49 | muis | m-ui-s | /mœys/ | CVVC | ja | ja | 6 |
| 50 | duim | d-ui-m | /dœym/ | CVVC | ja | ja | 6 |
| 51 | tuin | t-ui-n | /tœyn/ | CVVC | ja | ja | 6 |
| 52 | buik | b-ui-k | /bœyk/ | CVVC | ja | ja | 6 |
| 53 | fles | f-l-e-s | /flɛs/ | CCVC | ja | ja | 7 |
| 54 | geit | g-ei-t | /ɣɛit/ | CVVC | ja | ja | 7 |
| 55 | zout | z-ou-t | /zʌut/ | CVVC | ja | ja | 7 |
| 56 | saus | s-au-s | /sʌus/ | CVVC | ja | ja | 7 |
| 57 | lach | l-a-ch | /lɑx/ | CVC | ja | matig | 7 |
| 58 | ring | r-i-ng | /rɪŋ/ | CVC | ja | ja | 8 |
| 59 | slang | s-l-a-ng | /slɑŋ/ | CCVC | ja | ja | 8 |
| 60 | bank | b-a-nk | /bɑŋk/ | CVCC | ja | ja | 8 |
| 61 | pink | p-i-nk | /pɪŋk/ | CVCC | ja | ja | 8 |
| 62 | klok | k-l-o-k | /klɔk/ | CCVC | ja | ja | 4 |

Noten: fase 6 bevat 61 kandidaten. *jam* is uitgesloten (Engelse uitspraak bij veel sprekers). *jas* is het voorbeeldwoord bij j. *muur/vuur*: zie §6.2 regel 5.

---

## 7. Sight words

### 7.1 Set (bewust klein)
| ID | Woord | Waarom sight word | Introductie (na) |
|---|---|---|---|
| SW.de | de | sjwa /də/ | DE.CVC ≥ 0.7 (begin fase 7) |
| SW.een | een | sjwa /ən/ (leest als "uhn", niet als "eeen") | SW.de ≥ 0.6 |
| SW.het | het | sjwa /ət/ (h vaak stil) | SW.een ≥ 0.6 |
| SW.ze | ze | sjwa /zə/ | blok 4 (z) bekend |
| SW.we | we | sjwa /ʋə/ | blok 6 (w) bekend |
| SW.je | je | sjwa /jə/ | blok 5 (j) bekend |

*ik, is, en, in, op, al* zijn **wel klankzuiver** en worden gewoon gedecodeerd (DE.VC), niet als sight word aangeleerd. Zo blijft het alfabetisch principe intact.

> **Implementatienoot (afwijking, zie §15.6).** Dit document drukt de introductie uit in mastery (`SW.de` na `DE.CVC ≥ 0.7`); de implementatie gebruikt voor SW.de/een/het in plaats daarvan `requiresBlock: 7` als **proxy** (het echte blok), omdat de skill-drempel in het huidige model niet uitgedrukt kan worden. SW.ze/we/je hangen aan hun blok (4/6/5).

### 7.2 Hoe introduceren [ONTWERP]
1. Aparte categorie en visueel herkenbare "flitskaart" (bv. eigen kleurrand) – nooit gemengd in decodeeroefeningen.
2. Expliciet: "Dit woord lees je niet met klanken. Dit woord ken je uit je hoofd: **de**." (één keer met audio, dan oefenen).
3. Maximaal **één nieuw sight word per sessie**, max. 6 in het hele MVP+-traject.
4. Oefenen in woordgroepen (*de kat*, *een tas*) zodra gemeesterd.

### 7.3 Anti-gok-maatregelen
- Afleiders zijn visueel gelijkend: *de / en / een / het / ze*.
- Flitstijd 1,5 s, daarna woord weg en kiezen uit audio-opties; voorkomt raden op lengte.
- Positie van het juiste antwoord random; nooit 3× achter elkaar dezelfde positie.
- Sight words tellen niet mee voor DE.*-mastery.

---

## 8. Zinnen en korte teksten

### 8.1 Regels
1. Elk woord in een zin is ofwel gemeesterd (DE-patroon ≥ 0.8 en alle grafemen LK.SOUND ≥ 0.8) ofwel een geïntroduceerd sight word (SW ≥ 0.8).
2. Lengte: woordgroep (2–3 woorden) → zin 3–4 woorden → zin 5–6 woorden.
3. Hoofdletter en punt pas vanaf ZI.CAPITAL; de benodigde hoofdletters worden eerst als LK.`<g>`.UPPER geoefend (alleen letters die aan zinsbegin of in namen voorkomen: D, I, E, R, L, J, F, T, M).
4. Eigen namen: **Rik, Lies, Joep, Fem** (klankzuiver, kort, ontleend aan geen bekende methode voor zover bekend; opdrachtgever controleert op overlap). Geen *Sam, Kim, Pim, Sim* e.d.
5. Geen woorden met r-kleuring, sjwa (behalve SW), of eindklankverscherping.
6. Elke zin heeft een **afbeeldbare, eenduidige** betekenis en een begripscheck met minimaal verschillende plaatjes (§11).
7. Werkwoordsvormen alleen klankzuiver: *zit, eet, pakt, rent, ziet, lacht*.

### 8.2 Voorbeeldzinnen (met vermelding vereiste blokken)
| Niveau | Zin | Vereist |
|---|---|---|
| woordgroep | de kat | MVP + SW.de |
| woordgroep | een tas | MVP + SW.een |
| woordgroep | mam en de kat | MVP + blok 3 (e, n) + SW.de |
| zin 3–4 | de kat is nat. | blok 2 + SW.de |
| zin 3–4 | ik eet kaas. | blok 3 |
| zin 3–4 | mam is in de kas. | blok 2 + SW.de |
| zin 3–4 | de rat zit in de tas. | blok 4 (z) + SW.de |
| zin 4–5 | de kip is op het dak. | blok 4 + SW.de, SW.het |
| zin 4–5 | Rik pakt de bal. | blok 5 + SW.de + R, D-hoofdletters indien zinsbegin |
| zin 4–5 | de zon is geel. | blok 6 |
| zin 5–6 | de muis zit in het huis. | blok 6 + SW.het |
| zin 5–6 | Lies ziet een vos in de tuin. | blok 6 + SW.een, SW.de |
| zin 3 | Joep eet soep. | blok 5 (*niet* "met een lepel": *lepel* heeft sjwa) |

### 8.3 Voorbeeldteksten (TX.SHORT)
**Tekst 1 (na blok 7):**
> Lies is in de tuin.
> Ze ziet een muis.
> De muis rent in het gras.
> Lies lacht.

Begripsvraag: "Wat ziet Lies?" – kiezen uit 3 plaatjes (muis / vos / kat), getoond ná het lezen.

**Tekst 2 (na blok 5):**
> Rik pakt een bal.
> De bal rolt in de sloot.
> Joep zit in de boot.
> Joep pakt de bal.

Begripsvraag: "Wie pakt de bal uit de sloot?" (Rik / Joep). Gecontroleerd en verworpen tijdens het schrijven: *rood* en *pad* (eindklankverscherping), *heeft* (f pas in blok 7).

**Tekst 3 (na blok 7):**
> Fem is bij de geit.
> De geit eet gras.
> Fem lacht.
> De geit is lief.

Begripsvraag: "Wat eet de geit?" (gras / soep / kaas). Verworpen: *aait* (aai nog niet geleerd).

*Controle: bij = b-ij, rolt = r-o-l-t, sloot = s-l-oo-t, lacht = l-a-ch-t, lief = l-ie-f – alle klankzuiver.*

---

## 9. Feedbackprincipes

### 9.1 Uitgangspunten [VK + ONTWERP]
- Geen straf, geen levens verliezen, geen woord "FOUT", geen "nee!", geen rode kruizen, geen zoemer- of foutgeluid.
- Feedback is **direct, kort en specifiek** (wat moet het kind anders doen), niet persoonsgericht.
- Prijs het **proces** ("Je luisterde goed naar elke klank"), niet het kind ("Wat ben je slim").
- Na een fout volgt altijd een **succeservaring** binnen hetzelfde item (via hint of modeling).
- Het gemodelleerde item komt later in de sessie terug (herkansing zonder druk).
- Stem: vriendelijk, rustig, positief. Volume en tempo gelijk bij goed en fout.
- **Feedback wordt altijd ook uitgesproken (audio), nooit alleen als tekst getoond.** De geschreven feedback en het icoon ondersteunen de gesproken boodschap; er staat geen zin in beeld die het kind zelf moet lezen (GD §5, GD §8.1). Dit geldt voor `fb.correct.*`, `fb.try1.*`, `fb.hint.*`, `fb.model.*` en `fb.specific.*` (zie §15.9).

### 9.2 Escalatieladder per item
| Poging | Reactie | Voorbeeld (kort Nederlands) |
|---|---|---|
| Correct | bevestigen + herhalen van het woord/de klank | "Ja! Kam." / "Goed gelezen: k-a-m, kam." / "Knap, je plakte de klanken." |
| 1e fout | aanmoedigen + foutspecifieke aanwijzing, kind probeert opnieuw | "Bijna. Kijk nog eens naar de laatste letter." / "Luister nog eens goed." |
| 2e fout | hint: spel laat de deelstappen horen; kind kiest opnieuw | "Luister: k… a… m. Plak maar aan elkaar." / "Deze letter zegt mmm." |
| 3e fout | modeling: samen doen, dan door | "We doen het samen. k-a-m … kam! Dit woord is kam. Straks komt hij nog een keer." |

### 9.3 Foutspecifieke feedback (voorbeelden)
| Fouttype (gedetecteerd uit gekozen afleider) | Formulering |
|---|---|
| Eerste klank fout (kam → ram) | "Kijk naar de eerste letter. Welke klank zegt die?" |
| Laatste klank fout (kam → kat) | "Het begin klopt! Kijk nog eens naar het eind." |
| Klinker fout (kam → kom) | "Luister naar het midden. Hoor je a of o?" |
| Kort/lang (kas → kaas) | "Kijk: staat er één a of twee? Eén a klinkt kort." |
| Omkering (tak → kat) | "We lezen van links naar rechts. Begin hier." (pijl/vinger-animatie) |
| Letternaam i.p.v. klank (kiest "em" bij m) | "Dat is de naam van de letter. Welke klank maakt hij? mmm." |
| Te snel getikt (< 0,5 s) | "Rustig maar. Eerst goed kijken." (geen afstraffing) |

### 9.4 Algemene aanmoedigingen (variatie, roteren)
"Goed zo." – "Ja, dat klopt." – "Je bent goed aan het oefenen." – "Mooi geplakt." – "Je hebt goed geluisterd." – "Nog één keer, je kunt het." – "Fijn dat je het nog eens probeert."

---

## 10. Adaptief leren

### 10.1 Variabelen per leerdoel (per kind)
| Variabele | Type | Toelichting |
|---|---|---|
| `mastery` | float 0–1 | EWMA (zie 10.2) |
| `accuracy` | float | aandeel correct bij 1e poging over laatste 20 items |
| `response_time` | ms | mediane responstijd laatste 10 correcte items |
| `attempts` | int | totaal aantal items |
| `hints_used` | int | aantal items met hint of modeling |
| `consecutive_correct` | int | reeks correct-bij-1e-poging |
| `sessions_seen` | int | aantal verschillende sessies met dit doel |
| `leitner_box` | int 1–5 | zie 10.4 |
| `last_seen_session` | int | sessienummer |

### 10.2 Mastery-formule (EWMA)
Itemscore `s`:

| Uitkomst | s |
|---|---|
| Correct bij 1e poging, zonder hint | 1.0 |
| idem, maar responstijd > `rt_slow` van het doel | 0.85 |
| Correct bij 2e poging | 0.5 |
| Correct na hint (3e poging) | 0.25 |
| Gemodelleerd | 0.0 |
| Te snel getikt (< 500 ms) én fout | niet meetellen (gokindicator), wel feedback |

Update:
```
alpha = max(0.2, 1 / (attempts + 1))      # snelle opwarming bij de eerste items
mastery_new = mastery_old + alpha * (s - mastery_old)
startwaarde mastery = 0.0 (of instapcheck-uitkomst, max 0.5)
```
**Let op (zie §15.5).** Bij `attempts = 0` geeft de formule `alpha = 1`, zodat één correct item de mastery direct op 1.0 zet. `mastery` alleen is daardoor **geen** betrouwbare beheersingsmaat. De formule is uitsluitend veilig in combinatie met de volledige beheersingspoort `isMastered` uit §10.3 (≥ 12 items, ≥ 4 op rij correct, ≥ 2 sessies). Elke vrijgave of rapportage moet die poort gebruiken, niet `mastery ≥ 0.8` alleen.
`rt_slow` (voorstel): LK.* 4 s, DE.CVC 8 s, DE.CCVC 10 s, ZI.* 20 s. Voor FL.* telt tijd zwaarder: s = 1.0 alleen als RT ≤ doeltijd (FL.GRAPHEME 2 s, FL.CVC 3 s), anders 0.6.

### 10.3 Drempels en beslisregels
| Situatie | Regel | Actie |
|---|---|---|
| Gemeesterd | mastery ≥ 0.80 **en** attempts ≥ N (§3) **en** consecutive_correct ≥ 4 **en** sessions_seen ≥ 2 | doel = gemeesterd; volgende doel/grafeem vrijgeven |
| Doorgaan binnen doel | mastery > 0.85 **en** consecutive_correct ≥ 5 | moeilijkheidsniveau +1 (meer afleiders, minimale paren, minder audio-ondersteuning) |
| Vereenvoudigen | mastery < 0.5 na ≥ 6 items, **of** 2 items op rij met s ≤ 0.25 | niveau −1: minder afleiders (3→2), automatische audio van letter/klank, gerekte klanken, kortere woorden |
| Frustratiestop | 3 items op rij gemodelleerd | schakel naar een gemeesterd, makkelijk item (succes), daarna andere activiteit; meld in rapportage "extra oefening" |
| Terugval | gemeesterd doel zakt < 0.65 bij herhaling | status terug naar "in oefening"; Leitner-box 1 |
| Doelsucces per sessie | streef 80–85% correct bij 1e poging | Als > 95% over 10 items: niveau +1; als < 65%: niveau −1 |

Sessiemix (voorstel): 60% huidig doel, 25% herhaling (Leitner), 15% voorbereidend (bv. FN-taak bij volgend grafeem).

### 10.4 Spaced repetition (Leitner per sessie)
| Box | Herhaling | Promotie | Degradatie |
|---|---|---|---|
| 1 | elke sessie | correct 1e poging zonder hint → box 2 | – |
| 2 | elke 2e sessie | idem → box 3 | fout → box 1 |
| 3 | elke 4e sessie | idem → box 4 | fout → box 1 (bij s = 0.5: box 2) |
| 4 | elke 8e sessie | idem → box 5 | fout → box 2 |
| 5 | elke 16e sessie (onderhoud) | blijft | fout → box 2 |

Leitner geldt per **item-skill** (grafeem, woord, sight word). Een doel telt pas als "vast gemeesterd" in rapportage als ≥ 80% van zijn items in box ≥ 3 staat.

### 10.5 Afleider-keuze
Afstandsniveaus (A = groot verschil, D = minimaal paar):

| Niveau | Grafemen (LK) | Woorden (DE) |
|---|---|---|
| A | andere klasse en vorm: klinker vs. medeklinker (m ↔ a) | verschillen op alle posities (kam ↔ tas ↔ rit) |
| B | zelfde klasse, ander type/plaats (m ↔ s ↔ k) | verschillen op 2 posities (kam ↔ tas ↔ kas)|
| C | gelijk type of vergelijkbare vorm (m ↔ n, a ↔ aa, e ↔ ee) | verschillen op 1 positie (kam ↔ kat ↔ ram) |
| D | klassieke verwarringen (b ↔ d ↔ p, m ↔ n, u ↔ n, o ↔ oo) | minimale paren + omkering (tak ↔ kat, kas ↔ kaas) |

Regels:
1. Start elk nieuw doel op niveau A, hoogstens 2 afleiders.
2. Alleen afleiders uit **geleerde** grafemen/woorden. **Uitzondering (afwijking, zie §15.2):** bij de allereerste letter mogen bij `LK.<g>.SOUND` (grafeem→klank) **auditieve, niet-getoonde** klank-afleiders uit de volledige inventaris worden gebruikt zolang er nog geen tweede geleerd grafeem is. Deze opties zijn audio-only knoppen (geen letter in beeld) en gelden als auditieve discriminatie (ED §6.2 regel 8). Voor klank→grafeem (`LK.<g>.RECOGNIZE`) geldt de uitzondering **niet**; die taken starten pas zodra er ≥ 2 geleerde grafemen zijn.
3. Nooit twee juiste antwoorden (ei/ij, ou/au, g/ch bij klank→grafeem).
4. Nooit een geblokkeerd woord (§6.4).
5. Niveau D alleen als niveau C ≥ 0.85.
6. Positie van juiste antwoord gerandomiseerd; geen patroon.

---

## 11. Regels tegen raden via plaatjes

1. **Plaatje pas NA correct decoderen** bij DE.*, ZI.*, TX.*: het plaatje is beloning en betekeniscontrole, nooit hint.
2. Bij begripschecks (ZI/TX) zijn alle plaatjes-opties **minimaal verschillend** en alleen te onderscheiden door de hele zin te lezen (kat **op** de mat / kat **in** de tas / rat op de mat).
3. **Geen tekst die het auditieve antwoord verraadt**: in auditieve taken (FN, SY, AN) staat geen geschreven woord; in leestaken wordt het doelwoord niet vooraf voorgelezen (alleen bij modeling ná 3e poging).
4. Geen beginletter-plaatjes naast letters (geen "a-appel"-kaart in LK-taken), want dan wordt het plaatje benoemd i.p.v. de letter gelezen.
5. Audio-opties bij Lees-en-kies hebben **identieke knoppen** (geen plaatjes, kleuren of iconen die verschillen).
6. Woordlengte geeft geen hint: afleiders hebben dezelfde lengte als het doelwoord (behalve bewuste kort/lang-paren).
7. Geen contextverhaal dat het woord voorspelt vóór het lezen ("De kat is moe. Lees: kat").
8. Tik-op-woord-hulp (zinnentrein) telt als hint (s ≤ 0.25).
9. Gok-detectie: responstijd < 500 ms of steeds dezelfde knoppositie → item telt niet, rustige prompt ("Eerst goed kijken").
10. Herhalingsitems wisselen afleiders en volgorde, zodat het kind niet "de plek" onthoudt.

---

## 12. Ouder- en leerkrachtrapportage

### 12.1 Indicatoren
| Indicator | Bron | Weergave |
|---|---|---|
| Geleerde klanken | LK.*.SOUND ≥ 0.8 | lijst/kaart van grafemen (groen = zeker, geel = oefent, grijs = nog niet) |
| Klanken die extra aandacht vragen | LK.* < 0.6 na ≥ 10 items | lijst |
| Hakken en plakken | AN.CVC, SY.CVC | "zeker / oefent / nog niet" |
| Woorden lezen | DE.* per patroon | idem + voorbeeldwoorden die goed gaan |
| Sight words | SW.* | lijst |
| Zinnen/teksten | ZI.SIMPLE, TX.SHORT | aantal gelezen zinnen/teksten |
| Vlotheid | FL.* (alleen na accuraatheid) | trend t.o.v. eigen eerdere sessies, geen normen |
| Oefentijd | sessies, minuten | per week |
| Hulpgebruik | hints_used / attempts | trend |

### 12.2 Formuleringen (voorbeelden)
- "Rik kent nu de klanken m, a, s, t en k."
- "Rik kan korte woorden als *kam* en *tas* lezen."
- "Rik heeft extra oefening nodig bij het verschil tussen *a* en *aa*."
- "Rik heeft extra oefening nodig bij het plakken van klanken tot een woord."
- "Rik gebruikt bij woorden met drie klanken vaak nog een hint. Dat hoort bij deze fase; het spel biedt deze woorden vaker aan."
- "Tip: laat Rik thuis woorden uit het spel opzoeken in een prentenboek."
- Bij aanhoudende moeite (bv. LK-doel na ≥ 4 sessies < 0.5): "Het lezen van ... gaat nog moeizaam, ook na veel oefening. U kunt dit bespreken met de leerkracht."

### 12.3 Verboden in rapportage
- Geen diagnoseclaims of -termen ("dyslexie", "leesstoornis", "achterstand", "risicokind").
- Geen percentielen, AVI-/DMT-niveaus of vergelijking met andere kinderen (het spel is niet genormeerd).
- Geen rode markeringen of negatieve labels; neutrale kleuren.

---

## 13. Beperkingen

1. **TTS van losse klanken is onbetrouwbaar**: synthetische stemmen maken van /m/ vaak "muh" of zeggen de letternaam. **Aanbeveling**: alle losse klanken, gerekte klanken, gehakte woorden ("k…a…m") en feedbackzinnen als **opnames** van een native spreker (Standaardnederlands, duidelijke r en v). TTS hooguit voor hele woorden/zinnen en altijd steekproefsgewijs gecontroleerd.
2. **Geen spraakherkenning in MVP**: spraakherkenning voor 5-jarigen is onbetrouwbaar; daarom kiest het kind uit audio-opties. Hardop lezen wordt dus niet gemeten; vlotheid (FL.*) is een benadering via keuze-responstijd.
3. **Geen vervanging van de leerkracht**: LEESAVONTUUR is oefenmateriaal naast instructie, voorlezen en rijke teksten in de klas [B3].
4. **Geen normering of diagnose**: mastery-waarden zijn interne stuurwaarden, geen toetsscores.
5. **Regionale uitspraakvariatie** (g, r, w, v/f, ei/ij) kan leiden tot onterechte "fouten" bij FN-taken; daarom deze klanken later en met zorgvuldige opnames.
6. **Afstemming met schoolmethode**: de eigen lettervolgorde wijkt bewust af van commerciële methodes; voor kinderen die op school een andere volgorde volgen kan een instapcheck grafemen vrijgeven (instelling voor ouder/leerkracht – advies voor vervolgontwerp).
7. **Woordlijsten** zijn op klankzuiverheid en gepastheid gecontroleerd door de ontwerper, maar moeten vóór release nogmaals door een tweede taalkundige/leerkracht worden gereviewd.
8. **Vakkennis [VK]** in dit document is niet tijdens het ontwerp online geverifieerd (zie §14).
9. **Meertalige kinderen**: woordbetekenis kan onbekend zijn; daarom na lezen het plaatje + gesproken woord als betekenisondersteuning.

---

## 14. Bronnenlijst

### 14.1 Daadwerkelijk geraadpleegd (webfetch, 1 oktober 2026)
| Code | URL | Kern |
|---|---|---|
| B1 | https://tule.slo.nl/Nederlands/F-KDNederlands.html (doorgestuurd naar slo.nl/thema/meer/tule/nederlands/) | Overzicht wettelijke kerndoelen Nederlands 1–12; TULE-tussendoelen en leerlijnen ontwikkeld door SLO en het Expertisecentrum Nederlands; verwijzing naar actualisatie kerndoelen (conceptkerndoelen gepubliceerd 17 april 2025). |
| B2 | https://www.slo.nl/thema/meer/tule/nederlands/kerndoel-9/ | Kerndoel 9 (plezier in lezen en schrijven). Groep 1–2: plezier in voorgelezen worden, zelf boeken bekijken en "lezen", rijmpjes/versjes; groep 3–4: plezier in zelf lezen, gemotiveerd om zelf te kunnen lezen, verhalende boeken om zelf te lezen. |
| B3 | https://www.actualisatiekerndoelen.nl/nederlands | Nieuwe kerndoelen Nederlands staan vanaf augustus 2026 in de wet, overgangsrecht tot augustus 2031; nadruk op rijke teksten en wereldkennis; aangepaste teksten zijn bruikbaar als scaffold; scholen kiezen zelf leermiddelen. |
| B4 | https://www.expertisecentrumnederlands.nl | Expertisecentrum Nederlands (Nijmegen) doet onderzoek naar effectief taalonderwijs; publiceert o.a. *Protocol Preventie van Leesproblemen groep 1 en 2*; uitvoerder Dyslexie Centraal; thema's Lezen & Schrijven, Dyslexie. |

### 14.2 Geprobeerd, niet geladen
- https://www.expertisecentrumnederlands.nl/beginnende-geletterdheid → 404
- https://www.slo.nl/thema/vakspecifieke-thema/nederlands/ → 404

### 14.3 Algemene vakkennis [VK] (niet online gecontroleerd tijdens dit ontwerp; aanbevolen om te valideren)
- Protocollen *Leesproblemen en Dyslexie* (Expertisecentrum Nederlands; o.a. groep 1–2 en groep 3): fasering beginnende geletterdheid → aanvankelijk lezen, signaleren, extra oefentijd.
- Tussendoelen beginnende geletterdheid (Verhoeven & Aarnoutse, Expertisecentrum Nederlands/SLO): o.a. taalbewustzijn, alfabetisch principe, functioneel schrijven en lezen.
- National Reading Panel (2000), *Teaching Children to Read*: effect van expliciete instructie in fonemisch bewustzijn en klank-tekenkoppeling.
- Ehri, L. C. – fasen van woordherkenning (pre-alfabetisch → gedeeltelijk alfabetisch → volledig alfabetisch → geconsolideerd).
- Share, D. L. – self-teaching hypothesis (decoderen als motor voor woordherkenning).
- Algemene Nederlandse fonologie (eindklankverscherping, sjwa, r-kleuring van klinkers, regionale variatie g/r/w).
- Leitner-systeem en spaced repetition; EWMA als eenvoudige kennisschatting.

### 14.4 Bewust níét gebruikt
Commerciële methodes (*Veilig leren lezen*, *Lijn 3* e.a.): geen lettervolgorde, kernwoorden, personages of teksten overgenomen. Overeenkomsten in algemene principes (bv. continuanten vroeg) volgen uit de vakliteratuur, niet uit een methode.

---

## 15. Ontwerpbeslissingen na review (versie 1.1)

Deze sectie bundelt de **bewuste afwijkingen** van versie 0.1 en de punten waarop het document met de implementatie is gelijkgetrokken, naar aanleiding van de educational-, QA- en security-reviews (ronde 1–3, commits op `main`). De secties hierboven zijn waar nodig aangepast; waar de implementatie bewust afwijkt, staat de onderbouwing hier. De implementatie blijft leidend voor gedrag, dit document voor de didactische bedoeling.

### 15.1 MVP-woordenlijst: 18 kindvriendelijke woorden
- `mak`, `smak` en `mars` zijn uit de MVP-lijst verwijderd: `mak` is niet goed afbeeldbaar, `smak` en `mars` zijn weinig concreet/betekenisvol voor 5–6-jarigen. De implementatie (`src/content/words.ts`) bevat daarmee **18 MVP-woorden**, waarvan 17 met een belonings-SVG (`start` heeft nog geen asset).
- De `Kv`-kolom in §6.5 was voor die drie woorden onterecht "ja"; met hun verwijdering is de kolom consistent. §5.2, §6.5 en de aantallen zijn bijgewerkt: **63 kandidaten in fase 5, waarvan 18 MVP**. Dat blijft ruim boven de eis van ≥ 8 (ED §5.2).

### 15.2 Auditieve afleiders en de eerste letter (LK.`<g>`.SOUND vóór RECOGNIZE)
Dit is een **bewuste omkering van de faseorde** in §3: in plaats van eerst fase 2 (RECOGNIZE, klank→grafeem) en dan fase 3 (SOUND, grafeem→klank), introduceert de implementatie de allereerste letter met uitsluitend `LK.<g>.SOUND`.

- **Poort toetst SOUND.** De poort naar fase 3 hangt aan `LK.<g>.SOUND` (`Progression.ts`), niet aan RECOGNIZE. Zolang de fase-2-poort (`FN.FIRST_SOUND ≥ 0.8`) dicht is, oefent de warming-up gericht op `FN.FIRST_SOUND`.
- **Auditieve, niet-getoonde afleiders.** Zolang er nog geen tweede geleerd grafeem is, mogen bij grafeem→klank afleiders uit de volledige inventaris komen (`allowUnlearnedAuditoryDistractors`). Er komt **geen ongeleerd grafeem in beeld**: de opties zijn audio-only klankknoppen (oor-icoon + nummer), op niveau A (klinker vs. medeklinker, dus akoestisch zo ver mogelijk van het doel). Dit is de expliciete uitzondering van §6.2 regel 8 en staat nu in §10.5 regel 2.
- **RECOGNIZE vanaf 2 grafemen.** Klank→grafeem wordt uitgesteld tot er ≥ 2 geleerde grafemen zijn, zodat nooit een ongeleerde letter als optie verschijnt. Gevolg: RECOGNIZE wordt per grafeem beperkt geoefend en raakt in de MVP niet aan `isMastered`.
- **Didactische eerlijkheid.** In de introductiesessie is er nog geen klank-tekenkoppeling; de gescoorde SOUND-items zijn dan vooral "herken de zojuist gemodelleerde klank" en nog geen echte retrieval. Zodra het tweede grafeem vrij is, worden de afleiders geleerd en wordt de taak betekenisvoller. Voor de allereerste letter is dit een verantwoorde **tijdelijke steiger** die de kip-ei-situatie (geen letter zonder geleerd grafeem, geen geleerd grafeem zonder letter) doorbreekt.

### 15.3 r in de coda (§6.3)
Zie de herziene §6.3. Kort: de eerdere eis "in het MVP eerst r vooraan" was intern tegenstrijdig met de MVP-lijst (*kar, arm, ark, start*) en is vervallen. Korte a + r geeft geen klinkerkleuring (die hoort bij *ee/oo/eu/ie* vóór r), dus de woorden zijn klankzuiver. De realisatie van r en de r in het cluster *start* blijven een **expliciet aandachtspunt voor de native opname en de vakinhoudelijke review** (§13 regel 7).

### 15.4 CVVC-fase-mapping
§3 en §6.1 plaatsten CVVC (aa/oo/ee) in fase 5; de implementatie (`phaseForPattern` in `words.ts`) mapt alleen `VC`/`CVC` naar fase 5 en **al het overige, inclusief CVVC, naar fase 6**. Het document is hierop gelijkgetrokken: CVVC staat nu in fase 6. Didactisch blijft de bedoeling dat kaas/raam als **staart van fase 5** worden geoefend; de faseadministratie volgt de patronenclassificatie van de code. De woordselectie (§6.5) is ongewijzigd.

### 15.5 Mastery bij `attempts = 0` (alpha = 1)
De EWMA-formule (§10.2) geeft bij `attempts = 0` `alpha = 1`, waardoor één correct item `mastery = 1.0` oplevert. Dat is **alleen veilig in combinatie met de volledige beheersingspoort** `isMastered` (§10.3): mastery ≥ 0.8 **en** ≥ 12 items **en** ≥ 4 op rij correct **en** ≥ 2 sessies. De implementatie gebruikt de poort dan ook overal waar "beheerst" of vrijgave wordt bepaald (`Progression.ts`, `SessionPlanner.ts`). `mastery ≥ 0.8` alleen mag nooit als beheersing worden geïnterpreteerd.

### 15.6 Sight words: `requiresBlock`-proxy
§7.1 drukt de introductie uit in mastery (`SW.de` na `DE.CVC ≥ 0.7`). De implementatie gebruikt voor SW.de/een/het `requiresBlock: 7` als **proxy** (zie de noot in §7.1), omdat de skill-drempel in het huidige contentmodel niet uitgedrukt kan worden. De volgorde/keten (`introducedAfter`) blijft gelijk; SW.ze/we/je hangen aan hun eigen blok.

### 15.7 Vangnet fase-1-poort: niet eindeloos vasthouden in één fase
Uit de QA-review bleek de fase-2-drempel (`FN.FIRST_SOUND ≥ 0.8`) voor een leerling die de helft van de items pas bij de tweede poging goed heeft **onbereikbaar**: de EWMA convergeert dan naar ~0,78 en een harde drempel geeft nooit letters. De implementatie voegt daarom een **vangnet** toe:

- Een leerling die na een aantal sessies de fase-1-poort niet haalt, krijgt **toch de eerste letter**, met **extra auditieve ondersteuning**.
- De fase-1-oefening blijft intussen in de **warming-up** staan, zodat fonemisch bewustzijn niet verdwijnt.
- Ontwerpprincipe: **een kind mag niet onbeperkt in één fase vastzitten.** Er is geen exact getal in dit document; de implementatie gebruikt een ruwe sessiegrens (indicatief **na ongeveer 6–10 sessies zonder poort-doorgang, zie code**). De precieze waarde is een implementatie-/testdetail en mag worden bijgesteld op basis van observatie met kinderen.

### 15.8 Woordsecties pas bij ≥ 2 even lange kindvriendelijke woorden
De lees-/klimsecties (stap 5 en 6) openen niet meer op "er is überhaupt een woord", maar pas als er **minimaal 2 kindvriendelijke woorden van dezelfde grafeemlengte** zijn, zodat er een echte keuze is zonder lengte-hint (ED §11 regel 6). Eén-optie-items worden niet als gescoorde keuze aangeboden; als die situatie toch optreedt, is het item ongescoord (blootstelling/model) en niet een schijnkeuze. Dit volgt de fix-richting uit de QA-review en houdt de gelijke-lengte-eis van §11.6 intact.

### 15.9 Feedback wordt altijd ook uitgesproken
Zie §9.1. **Alle** feedback (`fb.correct.*`, `fb.try1.*`, `fb.hint.*`, `fb.model.*`, `fb.specific.*` en de gok-feedback) wordt naast de tekst-/icoonweergave **daadwerkelijk uitgesproken**. Er staat geen zin in beeld die het kind zelf moet lezen (GD §5, GD §8.1). Waar eerder alleen tekst werd getoond, moet de concrete feedbackclip worden afgespeeld.

### 15.10 Gemeten tempo van een perfecte leerling
Met een vers profiel en uitsluitend perfecte antwoorden komen de MVP-grafemen vrij in:

| Grafeem | m | a | s | t | k | r |
|---|---|---|---|---|---|---|
| **Unlock-sessie** | 2 | 5 | 9 | 13 | 16 | 19 |

Vanaf `m` kosten de letters dus **3–4 sessies** per grafeem (intervallen 3, 4, 4, 3, 3). Bij sessies van 5–10 minuten is dat ~15–40 minuten per letter en ~19 sessies (≈ 1,5–3 uur) voor de hele MVP, gespreid over meerdere dagen. Dat is passend voor 5–6-jarigen en respecteert de beheersingspoort. Een kind dat fouten maakt gaat langzamer — precies de bedoeling. Dit tempo is een **bovengrens** (perfecte leerling), geen norm.
