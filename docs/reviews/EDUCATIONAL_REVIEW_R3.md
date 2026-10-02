# LEESAVONTUUR – Educational Review, ronde 3 (eindverificatie)

| | |
|---|---|
| Rol | Educational Reviewer (Nederlandse leesdidactiek, aanvankelijk lezen, groep 2–3) |
| Toetsingskader | `docs/EDUCATIONAL_DESIGN.md` (ED, leidend), `docs/GAME_DESIGN.md` (GD), `docs/ARCHITECTURE.md` (ARCH) |
| Datum | 2026-10-02 |
| Repo | `C:\Users\Jan\VM Scan\leesavontuur`, git `main` @ `d4b9b8d` |
| Bereik | Eindverificatie: status EDU-R2-001…007 + open ronde-1-punten (EDU-009/012/016/017/024/026/027/028/030), deadlock-oplossing + unlock-tempo, steekproef `docs/RECORDINGS.md`, nieuwe instructie-/feedbackteksten, kidFriendly-filter, anti-raad-regels, consistentie ED-document |
| Methode | Codelezing + `npm test` (243 groen) + `npm run validate` (0 fouten, 1811 waarschuwingen) + `npm run typecheck` (schoon) + ad-hoc probes in `C:\Users\Jan\VM Scan\edu-tmp` (buiten de repo) |
| Wijzigingen | **Geen broncode gewijzigd, geen commits.** Alleen dit bestand. |

---

## Samenvatting

De ronde-2-Blocker is gedicht en de kern van de leerroute werkt nu aantoonbaar: vanuit een vers profiel komen de MVP-grafemen vrij (`m:2, a:5, s:9, t:13, k:16, r:19` sessies), de eerste letter wordt écht gescoord met audio-only klank-afleiders, dynamische instructies worden per variabele opgenomen en in de UI opgelost, hak-/plakinstructies worden vóór de stimulus gesproken, foutspecifieke feedback werkt voor plakken en hakken, en de afleiders bij decodeertaken zijn even lang. De opnamelijst (`docs/RECORDINGS.md`, 1521 clips) bevat geen enkele letterlijke `{placeholder}` meer en de uitspraakaanwijzingen zijn per klanktype geformuleerd.

**Maar er zijn twee nieuwe Majors in de feedbacklaag die de centrale MVP-oefening (LK.`<g>`.SOUND) raken:** (1) bij een fout antwoord in een letter-klank-item levert `fb.specific.middle_sound` een **kapotte, onwaarachtige zin** op (`{sound}` wordt niet gevuld en de tekst vraagt naar "welke klinker" bij medeklinkerletters), en (2) **geen enkele feedbackzin wordt in de UI uitgesproken** (alleen als tekst getoond), terwijl GD §5 expliciet eist dat alle feedback een klankbestand is en er "geen zin in beeld staat die het kind moet lezen". Daarnaast is `docs/EDUCATIONAL_DESIGN.md` op de MVP-woordenlijst en twee bewuste afwijkingen nog niet bijgewerkt.

Netto: de MVP is didactisch **bruikbaar met voorwaarden** — de leerlus en de anti-raad-regels kloppen, maar de feedbacklaag moet worden hersteld en de ED-documentatie gelijkgetrokken. Zie de sign-off onderaan.

---

## 1. Status EDU-R2-001…007 en open ronde-1-punten

Legenda: **O** = opgelost, **D** = deels, **X** = open.

### Nieuwe ronde-2-bevindingen

| ID | R2 | Status R3 | Bewijs / restpunt |
|---|---|---|---|
| EDU-R2-001 | Blocker | **O** | `SessionPlanner.ts:283-298,423-446`; `LetterSound.ts:37,46,291` (`allowUnlearnedAuditoryDistractors`); `util.ts:149-182`. Probe `r2-progress-probe.ts`: intro-sessie bevat nu **5 LK-items** (1 ongescoord + 4 `LK.m.SOUND`); sessies 2–6 elk **4× `LK.m.SOUND`**. Simulatie `r3-progress-sim.ts`: `m` isMastered na 3 sessies, `a` komt vrij. Officiële test `ProgressionSimulation.test.ts` logt `{"m":2,"a":5,"s":9,"t":13,"k":16,"r":19}`. |
| EDU-R2-002 | Major | **O** | `dynamicClips.ts:53-97,217-247`; `audioManifest.ts:70-77`; `ui/audioPrompts.ts:29-42`; `ActivityView.ts:165-180`. Probe `r3-feedback-probe.ts`: `instr.ph.rhyme` → `instr.ph.rhyme.raam`, `instr.fn.first_sound` → `instr.fn.first_sound.k`, `instr.lk.intro` → `instr.lk.intro.m`; **0 placeholders** in de manifest; validator eist per variabele een clip. Restpunt: het item draagt nog de generieke `prompt.audio.key` (`instr.ph.rhyme`); de UI lost dit correct op via `instructionClips`, maar de fallback `[item.prompt.audio]` wijst naar een niet-bestaand pad (TTS-tekst is wél correct). Zie EDU-R3-005. |
| EDU-R2-003 | Minor | **D** | `scripts/recording-list.ts:51-67`; `RECORDINGS.md:708,715,726,740`. Losse-klank-hints nu per type; "Te spreken tekst" = canonieke `soundHint`, TTS-benadering apart. **Restpunt:** de plosief-hint luidt voor álle plosieven "Korte, **stemloze** plof" — onjuist voor de stemhebbende `/b/` en `/d/` (`RECORDINGS.md:711,714`). Zie EDU-R3-003. |
| EDU-R2-004 | Minor | **O** | `answer.ts:59-68,173-177`; `dynamicClips.ts:122-129`. Probe: `plakken` fout → `"Luister nog eens: mmm - a - mmm. Kun jij ze samenplakken?"` (niet leeg). |
| EDU-R2-005 | Minor | **O** | `answer.ts:70-77,178-180`; `Segmenting.ts:77-82`. Probe: `hakken` fout → `fb.specific.count` = `"Je telde 2. Tel nog eens mee: hoeveel klanken hoor je?"` (niet `fb.try1.4`). |
| EDU-R2-006 | Minor | **O** | `ActivityView.ts:165-180,566-575`; `instructions.ts:27-30`. Tests `instructions.test.ts`: "speelt bij hakken eerst de instructie en dan het woord", "speelt bij plakken eerst de plakinstructie". `instr.lk.intro` bestaat nu en wordt gesproken. |
| EDU-R2-007 | Minor | **O** | `AudioService.ts:326,352-353`; `App.ts:78-82,129-131,292-298`; `ParentDashboard.ts:105-115`; `uiTexts.ts:78`. Test `instructions.test.ts` (`observeApproximate`). |

### Open ronde-1-punten

| ID | R1 | Status R3 | Bewijs / restpunt |
|---|---|---|---|
| EDU-009 | Major | **O** | Sleutels genormaliseerd; `instr.klim.<woord>` per woord; dynamische varianten + validatordekking (`validator.ts:564-600`). Restpunt: enkele *vereiste* sleutels zijn ongebruikt (`instr.hakken.start`, `instr.plakken.r2`) omdat `responseMode` altijd `'count'` is (EDU-R3-004). |
| EDU-012 | Minor | **D** | Foutspecifieke selectie werkt, maar de `letterklank`-tak levert een kapotte tekst (`{sound}`) en een onjuiste vraag ("welke klinker") bij medeklinkers → **EDU-R3-001**. |
| EDU-016 | Minor | **O** (impl.) | `words.ts:35-55`: `mak/smak/mars` volledig verwijderd; `allowedWordObjects` filtert `kidFriendly` (`util.ts:207-212`); `validate` → **0** `NOT_KID_FRIENDLY`-waarschuwingen. **ED-doc nog niet bijgewerkt** (zie §4). |
| EDU-017 | Minor | **D** | `graphemes.ts:34-37,47,51-52,58-59` voegt `ttsHint` toe; opnamelijst geeft per type een hint. `soundHint` blijft de kale letter en TTS van korte klinkers/plosieven blijft een gemarkeerde benadering; echte opnames ontbreken nog (ED §13.1). |
| EDU-024 | Minor | **O** | `ActivityView.ts:531-542` (`repeat()` → `promptClips()`): bij hakken wordt nu `instr.hakken.count` + het hele woord herhaald, niet de gerekte reeks; de gerekte reeks komt alleen via de hinttrap (`applyHint`). |
| EDU-026 | Minor | **O** | `SessionPlanner.ts:475-525`; gemeten met `r3-mix.ts`: prep **18%**, huidig **59%**, herhaling **24%** (doel 15/60/25) — binnen afronding. |
| EDU-027 | Nit | **O** | `GameState.ts:30-32,148-166`; `completeSession` kent `max(1, aantal afgeronde stappen 3–6)` vonkjes toe; `SessionPlanner.ts:527-533` zet `metadata.step`. |
| EDU-028 | Minor | **D/Open** | `ParentDashboard.ts:193-219`: "extra oefening"-kaart mengt nog klanken/plakken/hintgebruik onder één kop; `ui.parent.report.ongoing` (ED §12.2) wordt nergens gebruikt; `wordsRead` (`:164-165`) telt itemrecords, niet woorden. |
| EDU-030 | Nit | **X** | Originaliteit onveranderd; externe tweede review blijft voorwaarde (ED §13 regel 7). |

**Tussenstand:** EDU-R2-001…007: 5 opgelost, 2 deels (003, 005 zijn O; 003 is D). Ronde-1: 6 opgelost, 2 deels, 1 open.

---

## 2. Didactische beoordeling van de deadlock-oplossing en het unlock-tempo

**Oplossing (LK.`<g>`.SOUND bij de eerste letter, audio-only klank-afleiders):** de aanpak is didactisch verdedigbaar als **tijdelijke steiger**, maar het is een bewuste afwijking van ED §10.5 regel 2 ("alleen afleiders uit geleerde grafemen/woorden"):

- Het kind ziet de letter `m` en kiest uit 2–3 **oor-knoppen** (geen letters in beeld, `OptionGrid.ts:114-117` + `LetterSound.ts:63-64`). Er komt dus geen ongeleerd grafeem in beeld; de afleiders zijn puur auditief (ED §6.2 regel 8, mits als "auditief" gemarkeerd — gebeurt via `metadata.auditoryDistractors`, `LetterSound.ts:113-115`).
- De afleiders komen bij niveau A uit de **klinkerklasse** (`util.ts:120-136`, `graphemeScore`), dus akoestisch zeer verschillend van `/m/`. Dat is goed gekozen.
- **Kanttekening:** in de introductiesessie heeft het kind nog geen enkele klank-tekenkoppeling; de 4 gescoorde `LK.m.SOUND`-items zijn dan vooral "herken de zojuist gemodelleerde klank". Dat levert bruikbare mastery-data en doorbreekt de kip-ei-situatie, maar het is geen echte retrieval. Zodra `a` vrij is (sessie 5) worden de afleiders geleerd (`m` ↔ `a`) en wordt de taak betekenisvoller. Voor de allereerste letter is dit acceptabel; documenteer het als bewuste afwijking.
- **RECOGNIZE uitgesteld:** `SessionPlanner.ts:246-298` slaat `LK.m.RECOGNIZE` over tot er ≥ 2 geleerde grafemen zijn. ED §3 zet fase 2 (RECOGNIZE) vóór fase 3 (SOUND). Ook dit is een bewuste, gedocumenteerde afwijking in code; de poort toetst uitsluitend `LK.<g>.SOUND` (`Progression.ts:81-87`). Gevolg: `LK.<g>.RECOGNIZE` wordt per grafeem slechts 2× geoefend (in de introductiesessie van de volgende letter) en raakt nooit `isMastered`. Didactisch te verantwoorden voor de MVP, maar niet conform ED §3.

**Unlock-tempo (perfecte leerling, vers profiel):** officieel bevestigd door `ProgressionSimulation.test.ts`:

```
Unlock-sessies per grafeem: {"m":2,"a":5,"s":9,"t":13,"k":16,"r":19}
```

Dit is exact het opgegeven tempo. Vanaf `m` kosten de letters **3–4 sessies** per grafeem (intervallen 3, 4, 4, 3, 3). Bij sessies van 5–10 minuten is dat **~15–40 minuten speeltijd per letter**; de hele MVP (6 grafemen) vraagt ~19 sessies ≈ **1,5–3 uur**, gespreid over meerdere dagen. Dat is **redelijk voor 5–6-jarigen**: het respecteert de beheersingspoort (12 items, ≥ 2 sessies, ≥ 4 op rij), past bij een korte aandachtsspanne en voorkomt het ronde-1-probleem van "elke sessie een nieuwe letter". Het is aan de rustige kant, maar didactisch verantwoord; een kind dat fouten maakt gaat langzamer en dat is precies de bedoeling.

---

## 3. Steekproef `docs/RECORDINGS.md`, nieuwe teksten en anti-raad-regels

### Opnamelijst
- Structuur: 1521 clips, pad/sleutel/tekst/aanwijzing per type; **0 clips met een letterlijke `{placeholder}`** (`r3-feedback-probe.ts`).
- Losse klanken correct per type: `lk.m.sound` = `mmm` (continuant, aanhouden), `lk.t.sound`/`lk.k.sound` = plof zonder "uh", `lk.a.sound`/`lk.e.sound` = korte klinker "niet de letternaam", met de TTS-benadering apart (`RECORDINGS.md:708,715,726,740`).
- Gerekte reeksen correct: `blend.kam` = `k … a … mmm`, `blend.mam` = `mmm … a … mmm`.
- Dynamische varianten aanwezig en natuurlijk: `instr.fn.first_sound.m` = "Welk woord begint met mmm?", `instr.lk.intro.m` = "Dit is de letter m. Hij zegt mmm.", `instr.ph.rhyme.raam` = "Wat rijmt op raam?", `fb.specific.blend_retry.kam` = "Luister nog eens: k a mmm. Kun jij ze samenplakken?", `fb.specific.count.3` = "Je telde 3. Tel nog eens mee: hoeveel klanken hoor je?".
- **Fout (nieuw, Minor):** `lk.b.sound` en `lk.d.sound` zeggen "Korte, **stemloze** plof", maar `/b/` en `/d/` zijn stemhebbend (ED §5.3: "d … stem aan"). Zie EDU-R3-003.

### Nieuwe instructie-/feedbackteksten
- `instr.lk.intro`, `instr.hakken.count`, `instr.plakken.r1` zijn natuurlijk, leeftijdsadequaat en worden via `promptClips()` vóór de stimulus gespeeld (`ActivityView.ts:165-180`; tests `instructions.test.ts`).
- `fb.specific.first_sound/last_sound/order/count/blend_retry` vullen hun variabelen correct (probe).
- **Kapot (nieuw, Major):** `fb.specific.middle_sound` bij `letterklank` (grafeem→klank) levert `"Luister naar het midden: {sound}… Welke klinker hoor je?"`: `{sound}` wordt niet gevuld (`answer.ts:159-171` geeft alleen `sounds` en `letter`) en de vraag is onwaar voor medeklinkers. Dit raakt de hoofddoelstelling LK.`<g>`.SOUND, ook in de allereerste sessie. Zie EDU-R3-001.

### kidFriendly-filter
- `words.ts` verwijdert `mak/smak/mars`; `allowedWordObjects` sluit `kidFriendly:false` uit; `wordsForGraphemes` idem (`content/index.ts:106-116`). `npm run validate` → **0** `NOT_KID_FRIENDLY`-waarschuwingen. In een 30-sessiesimulatie kwamen uitsluitend kindvriendelijke woorden als doel/afleider voor.

### Probe "geen woord met ongeleerde grafemen in beeld"
`r3-generator-probe.ts` doorloopt 30 sessies (perfecte leerling) en controleert per item: optie-labels, geschreven doelwoorden, hak-antwoorden en even-lange afleiders.
```
Problemen gevonden: 0
Woordopties gezien: ark, arm, as, ik, is, kaart, kaas, kam, kar, kas, kast, kat, kist,
  kras, mam, mast, mat, mis, mist, raam, ram, rat, rit, staart, stam, start, taart, tak,
  tas, tik, vaas, vak, vat, vis
hakken-items gecontroleerd: 102
eerste-letter audio-only SOUND-items: 14
niet-kindvriendelijke woorden in bank: (geen)
```
Geen enkel ongeleerd grafeem in een getoond woord; geen geblokkeerd woord; geen plaatje vóór het antwoord (beeld alleen via `metadata.revealImage`, `WordReading.ts:71-72`, en `buildReveal` uitsluitend in `markCorrectOption`, `ActivityView.ts:465-475`).

### Anti-raad-regels in de UI
- **Plaatje pas na correct:** ✔ (`ActivityView.markCorrectOption`; test `activity.test.ts`).
- **Gelijke lengte afleiders:** ✔ (`util.ts:228-250` filtert op gelijk aantal grafemen vóór alles; probe: 0 ongelijke lengtes).
- **Geen gesegmenteerd antwoord bij hakken:** ✔ (`Segmenting.ts:51-52,85-89`: opties zijn aantallen; `responseMode:'count'`, `ActivityView.ts:298-306` toont geen letterreeks; 102 hak-items gecontroleerd, alle opties numeriek).
- **Klankjager/audio-only opties:** ✔ (oor-icoon + nummer, geen label; `OptionGrid.ts:114-117`).
- **Gok-detectie:** ✔ (`ActivityView.ts:480-498`, RT < 500 ms → `fb.guess.1`, geen mastery-event).

---

## 4. Consistentie `docs/EDUCATIONAL_DESIGN.md` met de implementatie

Het document is **niet** gewijzigd; onderstaande punten zijn geconstateerde verschillen.

1. **MVP-woordenlijst (§6.5, #9 `mak`, #19 `smak`, #20 `mars`; §5.2 regel 180/185; §6.5 slotnoot "21 MVP").** Het document noemt nog **21** MVP-woorden inclusief `mak/smak/mars` en markeert alle `Kv = ja`. De implementatie (`words.ts:35-55`) heeft **18** MVP-woorden; `mak/smak/mars` zijn verwijderd (niet kindvriendelijk). `words.ts` noemt de 18 zelf ook in een toelichting, maar ED is leidend en nog niet bijgewerkt. Ook de `Kv`-kolom van ED §6.5 is onjuist voor die drie woorden.
2. **Afleiders uit niet-geleerde grafemen (§10.5 regel 2).** ED zegt "alleen afleiders uit geleerde grafemen/woorden". De implementatie staat voor de allereerste letter **auditieve** afleiders uit de volledige inventaris toe (`LetterSound.ts:30-37`, `util.ts:175-180`). Dit is een bewuste, in code gedocumenteerde afwijking; ED vermeldt haar niet.
3. **Faseorde RECOGNIZE → SOUND (§3, fase 2/3).** ED zet `LK.<g>.RECOGNIZE` (fase 2) vóór `LK.<g>.SOUND` (fase 3). De implementatie introduceert de eerste letter met uitsluitend `LK.<g>.SOUND`-items en toetst de poort alleen op SOUND (`Progression.ts:81-87`); `RECOGNIZE` wordt nauwelijks gescoord.
4. **r in de coda (§6.3 vs §6.5).** §6.3 stelt dat in het MVP "eerst woorden met r vooraan (ram, rat)" komen, maar de MVP-lijst zelf bevat `kar, arm, ark, start` met r in de coda. Interne tegenspraak in ED (pre-existent); de implementatie volgt de lijst.
5. **Fase-indeling CVVC (§3 fase 5 vs `words.ts`).** ED §3/§6.1 plaatst `DE.CVVC` (aa/oo/ee) in fase 5; `phaseForPattern` (`words.ts:222-225`) mapt alleen `VC`/`CVC` naar fase 5 en al het overige (incl. CVVC) naar fase 6. `kaas/raam` krijgen dus fase 6.
6. **Mastery-formule (§10.2).** `alpha = max(0.2, 1/(attempts+1))` geeft bij `attempts = 0` alpha = 1 → mastery 1.0 na één correct item. De implementatie volgt de formule exact (`Mastery.ts:92-95`); de poort vangt dit af met `isMastered` (12 items/2 sessies/4 op rij, `Mastery.ts:223-231`). ED §10.2 verdient een waarschuwing dat de formule alleen in combinatie met de poort veilig is.
7. **Sight words (§7.1).** ED drukt de introductie uit in mastery (`SW.de` na `DE.CVC ≥ 0.7`); de implementatie gebruikt `requiresBlock: 7` als proxy (`sightWords.ts:28-37`). Geen tegenspraak, maar wel een ander mechanisme dan ED beschrijft.

---

## 5. Nieuwe bevindingen ronde 3

### EDU-R3-001 – **Major** – Foutspecifieke letter-klank-feedback is kapot en onwaar (`{sound}` niet gevuld; "welke klinker" bij medeklinkers)

Bestand: `src/learning/answer.ts:159-171`, `src/content/feedback.ts:45`, `src/content/dynamicClips.ts:111-115`
Bevinding: `specificForLetterSound` levert bij een niet-verwarrings-fout `fb.specific.middle_sound` met `vars = { sounds, letter }`. De tekst is echter `'Luister naar het midden: {sound}… Welke klinker hoor je?'`, dus `{sound}` blijft letterlijk staan (probe `r3-feedback-probe.ts`). Bovendien is de vraag onjuist wanneer het doel een medeklinker is (`m,s,t,k,r`) — de hoofddoelstelling van de MVP. Dit treedt juist ook op in de allereerste sessie (`m` vs. een klinkerafleider).
Bewijs:
```
letterklank wrong=g:a -> fb.specific.middle_sound :: "Luister naar het midden: {sound}… Welke klinker hoor je?"
```
Fix: geef `letterklank` een eigen tak (bv. `fb.specific.letter_sound`: "Deze letter zegt {sound}. Jij koos {chosen}.") die `sound` én de gekozen klank vult, of vul `sound` en splits de tekst in klinker/medeklinker-varianten. Voeg een test toe op de gerenderde tekst (nu alleen getest voor woordkeuze, `feedback.test.ts:50`).

### EDU-R3-002 – **Major** – Feedbackzinnen worden nooit uitgesproken; alleen als (onleesbare) tekst getoond

Bestand: `src/ui/components/ActivityView.ts:416-434` (`setFeedback` speelt geen audio), `src/ui/components/ActivityView.ts:41,433` (`onFeedback` wordt nergens aangesloten), `src/ui/screens/SessionScreen.ts`
Bevinding: `fb.correct.*`, `fb.try1.*`, `fb.hint.*`, `fb.model.*` en `fb.specific.*` worden alleen in `feedbackText.textContent` gezet; er is geen `audio.play(feedbackKey)` behalve voor `fb.guess.1` en de navigatie-/beloningsclips. `onFeedback` is een dode callback. Daarmee staan de 442 feedbackclips in de opnamelijst ongebruikt in de UI en ziet een 5-jarige een zin die hij niet kan lezen. Dit is in strijd met GD §5 ("Alle feedback is klankbestand") en GD regel 498 ("Alle uitleg is audio + icoon; er staat geen zin in beeld die het kind moet lezen").
Compensatie: correct → de juiste optie wordt afgespeeld; hint/model → `applyHint` speelt de klank/het woord; gok → `fb.guess.1`. De essentiële modeling-audio is dus aanwezig, maar de verbale feedback ontbreekt.
Fix: wire `onFeedback` (of `setFeedback`) aan het afspelen van de concrete feedbackclip (via `instructionClips`/`instructionVariantKeys`), met icoon + tekst als ondersteuning.

### EDU-R3-003 – **Minor** – Opnamelijst: stemhebbende plosieven `b`/`d` krijgen de aanwijzing "stemloze plof"

Bestand: `scripts/recording-list.ts:56-57`, `docs/RECORDINGS.md:711,714`
Bevinding: de `case 'plosive'` is generiek en zegt "Korte, stemloze plof". Voor `/b/` en `/d/` is dat fout (ED §5.3: "d … stem aan"). Bij een native inspreker kan dit tot devoicing leiden.
Fix: onderscheid stemhebbend/stemloos (bv. via een extra eigenschap of een uitzondering voor `b`/`d`) en vermeld "stem aan, geen 'uh'".

### EDU-R3-004 – **Minor** – Vereiste maar onbereikbare instructiesleutels (`instr.hakken.start`, `instr.plakken.r2`, e.a.)

Bestand: `src/content/instructions.ts:27-31,58-75`, `src/core/SessionPlanner.ts` (`responseMode` altijd `'count'`), `src/learning/Segmenting.ts:87`
Bevinding: `instr.hakken.start` is alleen bereikbaar bij `responseMode:'tap'`, maar de planner zet altijd `'count'`; `instr.plakken.r2` (sleep-variant) wordt nergens gebruikt. De validator eist ze als "required", wat de indruk wekt dat ze in de UI voorkomen.
Fix: verwijder dode sleutels of markeer ze als toekomstig; houd `REQUIRED_INSTRUCTION_KEYS` gelijk aan daadwerkelijk gebruikte sleutels.

### EDU-R3-005 – **Nit** – `prompt.audio` van dynamische items draagt nog de generieke key/pad

Bestand: `src/learning/LetterSound.ts:83,89`, `src/learning/FirstSound.ts:115`, `src/learning/Phonology.ts:49,99`
Bevinding: de items zetten `instructionClip('instr.ph.rhyme', <ingevulde tekst>)`, terwijl de manifest alleen `instr.ph.rhyme.<woord>` bevat. De UI lost dit correct op via `instructionClips` (`ActivityView.ts:176-177`), maar de fallback `[item.prompt.audio]` verwijst naar een niet-bestaand bestand. Alleen relevant wanneer de content-API-resolutie faalt; de TTS-tekst is dan wél goed.
Fix: laat de generator meteen de concrete sleutel zetten, of laat de validator eisen dat de generieke key alleen als template bestaat.

---

## 6. Educational sign-off

**Oordeel: AKKOORD MET VOORWAARDEN voor de MVP.**

De ronde-2-Blocker (progressiedeadlock) is aantoonbaar opgelost en de leerlus werkt: een vers profiel speelt de MVP-grafemen vrij in 19 sessies met behoud van de beheersingspoort, de anti-raad-regels gelden in de UI, de opnamelijst is placeholder-vrij en de eerste-letter-oplossing is didactisch verdedigbaar als steiger. De twee resterende Majors zitten in de **feedbacklaag** en raken de centrale LK.SOUND-oefening; ze zijn echter zonder herontwerp te repareren.

**Voorwaarden om definitief "Akkoord" te worden:**

1. **Major EDU-R3-001** opgelost: `letterklank`-foutfeedback vult `{sound}`/de gekozen klank en gebruikt een taalkundig juiste formulering voor medeklinkers; met een regressietest op de gerenderde tekst.
2. **Major EDU-R3-002** opgelost: feedbackzinnen worden daadwerkelijk uitgesproken (audio + icoon, GD §5 / GD regel 498); `onFeedback`/`setFeedback` speelt de concrete feedbackclip. Als dit bewust wordt uitgesteld, moet het expliciet als bekende beperking worden geaccepteerd — niet stilzwijgend.
3. **`docs/EDUCATIONAL_DESIGN.md` gelijkgetrokken** met de implementatie: MVP-lijst → 18 woorden (verwijder `mak/smak/mars`, corrigeer de `Kv`-kolom en de aantallen 21/13/17), en documenteer de twee bewuste afwijkingen (auditieve niet-geleerde afleiders; eerste letter SOUND vóór RECOGNIZE) plus de r-in-coda-noot en de fase-indeling CVVC.
4. **Echte audio-opnames vóór gebruik met kinderen** (ED §13.1): losse klanken, gerekte reeksen en feedback zijn opnames van een native Standaardnederlandse spreker; TTS blijft uitsluitend de gemarkeerde ontwikkel-fallback (EDU-R2-007). Los daarbij EDU-R3-003 (b/d) op.
5. **Vakinhoudelijke review door een tweede taalkundige/leerkracht** (ED §13 regel 7, EDU-030), inclusief de rijm-/lettergreepbank (`mis`, `pleit`, `kraam`, `aan` zijn weinig concreet voor 5–6-jarigen) en de `Kv`-kolom.
6. **Minors/nits** EDU-R3-004, EDU-R3-005, EDU-028, EDU-017-restpunt en de dode sleutels opgelost of expliciet als bekende beperking geaccepteerd.

---

## Verificatie (reproduceerbaar)

- `npm test` → **243/243 groen** (32 testfiles).
- `npm run validate` → **0 fouten**, 1811 waarschuwingen (alle `AUDIO_ASSET_MISSING`; geen `NOT_KID_FRIENDLY` meer).
- `npm run typecheck` → schoon.
- `npx vitest run src/core/__tests__/ProgressionSimulation.test.ts` → logt `Unlock-sessies per grafeem: {"m":2,"a":5,"s":9,"t":13,"k":16,"r":19}`.
- `edu-tmp/r2-progress-probe.ts` → deadlock weg: intro-sessie 5 LK-items, sessies 2–6 elk 4× `LK.m.SOUND`.
- `edu-tmp/r3-progress-sim.ts` → `m` isMastered na 3 sessies; `a` komt vrij; volledige route tot `aa`.
- `edu-tmp/r3-generator-probe.ts` → **0** problemen over 30 sessies (geen ongeleerd grafeem, geen geblokkeerd/ongewenst woord, gelijke lengtes, geen gesegmenteerd hak-antwoord, geen plaatje vóór antwoord).
- `edu-tmp/r3-feedback-probe.ts` → prompt-resolutie naar concrete varianten; 0 placeholders in de manifest; **`fb.specific.middle_sound` bij letterklank laat `{sound}` onvervuld** (EDU-R3-001).
- `edu-tmp/r3-mix.ts` → sessiemix 59/24/18 (huidig/herhaling/voorbereidend).