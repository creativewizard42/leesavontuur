# Audit Leesavontuur — 10 oktober 2026

## Oordeel en reikwijdte

De MVP heeft een bruikbare technische basis voor begeleid oefenen: een gescheiden
leerengine, adaptieve oefeningen, herhaling, lokale opslag, ouderzone en een bestaande
testsuite. De MVP was **geen volledige leesmethode**. Met de aanpassingen in deze
werkronde zijn meer onderdelen daadwerkelijk bereikbaar en is offlinegebruik
geïmplementeerd. De app is nog **niet klaar voor zelfstandig gebruik als complete
leesopleiding** of een release met de definitieve menselijke stem.

Dit is een code-, content- en browseraudit. Er is geen onderzoek met kinderen,
onderwijsprofessional of echte iPhone uitgevoerd. Technisch gesimuleerde perfecte
antwoorden bewijzen uitsluitend dat een route bereikbaar is. Ze bewijzen geen
leesvaardigheid of onderwijseffectiviteit.

## Bevindingen en status

| Prioriteit | Bevinding in de onderzochte MVP | Gevolg | Uitkomst van deze werkronde |
|---|---|---|---|
| P0 | Alle audio ontbrak; losse fonemen werden via TTS benaderd | Letterklank kan als letternaam of verkeerd foneem klinken; luistervragen zijn zonder stimulus niet beantwoordbaar | 811 synthetische, lokale MP3-concepten toegevoegd voor woorden, zinnen en veilige instructies. 776 fragmenten vereisen menselijke opname. Fonemen en instructies met fonemen mogen niet naar TTS. Ontbrekend oefengeluid blokkeert scoring. |
| P0 | Geen toetsing van zelfstandig hardop lezen | Goede luisterkeuzes kunnen ten onrechte als lezen worden geïnterpreteerd | Begripsvragen en geholpen lezen apart gemarkeerd; ouderzone legt grenzen uit. Onafhankelijke leesobservaties en representatieve transferitems blijven nodig. |
| P1 | Kaart negeerde geselecteerd gebied (`onSelectArea` startte altijd dezelfde sessie) | Kind verwacht een andere activiteit maar krijgt dezelfde route | Gerichte planner toegevoegd; gebieden met geen beschikbare oefeningen blijven gesloten; gewone route heeft een eigen hoofdknop. Vlotheidstoren blijft gesloten zolang geen volwaardige meetactiviteit bestaat. |
| P1 | Zinnen, sight words en verhalen bestonden als data maar hadden geen uitvoerende leergenerator | Leerroute stopte praktisch bij woordoefeningen | Sight-wordherkenning en een eerste zin-/verhaalactiviteit toegevoegd met geleerde-grafeem- en sight-wordvoorwaarden. Vraag verschijnt na de leesstap. Ondersteund lezen telt als geholpen. |
| P1 | Afspelen werd als voltooid beschouwd bij laden/starten | Volgende clip onderbrak de vorige; klankreeksen konden worden afgekapt | Opnames wachten op `ended`, lokale spraak op `onend`; nieuwe opdrachten stoppen oude opdrachten inclusief vervolgstappen. Gedekt door regressietests. |
| P1 | Algemene hints/modeling spraken altijd over `kam`, `tak`, `mmm` of `sss` | Uitleg kon niet bij het actuele doel passen | Algemene dragers neutraal gemaakt; bestaande doelgerichte klank-/woordstimulus blijft de inhoudelijke hulp. |
| P1 | Audio-opties hadden hover/focus-preview, geen universele aanraakbare luisterknop | Op touch niet duidelijk hoe je kunt luisteren zonder direct te antwoorden; focus kon instructies onderbreken | Afzonderlijke luisterknoppen voor audio-opties; kandidaat-audio volgt de volledige instructie. |
| P1 | Geen service worker, manifest of installatie-iconen | “Offline-first” betekende geen gegarandeerde offline-herstart; iPhone-installatie ontbrak | PWA, versiegebonden atomische precache, relatieve buildpaden en iPhone-iconen toegevoegd. Offlineherstart en MP3 byte-ranges getest op root en subpad. |
| P1 | Export zonder import; toekomstige saves konden worden overschreven | Geen bruikbare apparaatmigratie; voortgang kon verloren gaan bij oude appversie | Import met validatie, bestandsgroottegrens, expliciete bevestiging en veilige foutmelding toegevoegd. Save van nieuwere schemaversie blijft behouden. |
| P2 | Ouderdashboard beperkte klanken tot het MVP-blok | Latere voortgang was onzichtbaar | Dashboard toont alle geïnventariseerde grafemen; opname- en PWA-status toegevoegd. |
| P2 | Vrij oefenen ontsloot alle grafemen | Ongeleerde letters/woorden konden verschijnen | Vrij oefenen gebruikt de huidige geleerde set en introduceert geen nieuwe letters. |
| P2 | Kind moest een tekstzware kaart lezen; sessievoortgang alleen voor schermlezers | Navigatie vraagt vaardigheden die nog worden geleerd | Rustige bosillustratie, herkenbare gebiedsiconen, grote hoofdactie en voortgangssteentjes toegevoegd. Tikdoelen, contrast- en rustige modus behouden. |
| P2 | Privacyverklaring bevat een contactplaceholder | Publicatie-informatie incompleet | Contactadres `info@leesavontuur.nl` ingevuld op aanwijzing van de maker. |

## Resterende onderwijskundige tekortkomingen

1. **Leerlijn en dekking.** De grafeeminventaris is groter dan de zes MVP-klanken,
   maar nog geen aantoonbaar complete leerlijn voor aanvankelijk lezen. Maak
   expliciet onderscheid tussen fonemen, lettercombinaties, contextafhankelijke
   uitspraak, herkenningsletters, open/gesloten lettergrepen en morfologie.
   `introducedInPhase` betekent nu een grafeemblok, niet een leerfase; maak dit in
   de volgende modelmigratie expliciet.
2. **Oefenvormen.** Meerkeuze, auditieve discriminatie en klanken tellen meten
   slechts deelvaardigheden. Voeg echte synthese, zelfstandig decoderen,
   woordbetekenis, hoofdletters, zinsbegrip en transfer naar nieuwe teksten toe.
   Hakken moet ook afzonderlijke klankposities kunnen oefenen zonder het antwoord
   weg te geven. Volwassen observatie is nodig voor hardop lezen.
3. **Beheersing.** Sommige fasepoorten gebruiken alleen EWMA en geen minimumaantal
   waarnemingen, spreiding over sessies of transfer. Tijd sinds schermopening bevat
   instructie-/luistertijd; dit is geen betrouwbare leestijd. Gebruik dit niet als
   vlotheidsdiagnose. Toets opnieuw vóór vlotheidsbeloningen of niveauclaims.
4. **Sight words.** De huidige `requiresBlock: 7` voor `de/een/het` stelt deze
   woorden laat beschikbaar. Deze werkronde respecteert die bestaande voorwaarden.
   Een leesexpert moet introductiemomenten en de combinatie met decodeerbare zinnen
   opnieuw vaststellen. Herkenning alleen is geen compleet sight-wordcurriculum.
5. **Verhalenbank.** Er zijn slechts drie korte teksten en drie nieuw aangesloten
   zinvragen. Dit is een technische verticale uitbreiding, geen volledige
   verhalenbibliotheek. Woordgroepen en hoofdletteroefeningen hebben nog beperkte
   uitvoerende dekking; begripvragen hoeven meer te meten dan letterlijk onthouden.
6. **Dosering.** De normale planner vult aantallen aan om een verhouding te benaderen.
   Met meer content kan een sessie lang worden. Ontwerp een harde, toetsbare
   sessiebegroting van circa 5–10 minuten en een bescheiden aantal opdrachten;
   laat hervatten en een positieve afsluiting ook bij vroeg stoppen werken.
7. **Validatie.** Woorden, IPA, rijm, r-in-coda, afleiders en betekenisillustraties
   vragen een tweede taalkundige/leesdidactische review. De bestaande historische
   reviews zijn geen goedkeuring van deze nieuwe wijzigingen.

## Architectuur, gebruik en toegankelijkheid

- Core en leergeneratoren blijven DOM-vrij. Er is geen technische reden voor een
  complete frameworkmigratie. De nieuwe PWA-adapter zit in `src/platform`;
  installatie en de statische build hebben geen backend nodig.
- Lokale werking gebruikt een lokale webserver of een reeds geïnstalleerde PWA.
  Direct openen via `file://` is niet betrouwbaar voor modulebestanden, opslag en
  service workers. Webhosting moet HTTPS en de meegeleverde headers gebruiken.
- PWA-opslag kan door het apparaat worden gewist. Export/import is daarom nodig;
  apparaatoverschrijdende synchronisatie en meerdere profielen zijn nog niet
  geïmplementeerd. Geen kindgegevens of microfoonopnames uploaden zonder nieuw
  ontwerp en expliciete ouderkeuze.
- Browser-testen vonden geen horizontale overflow bij 320, 390, 844 en 1280 px.
  Pauze blokkeert antwoordshortcuts. Vragen zijn verborgen vóór de leesbevestiging.
  Echte iOS/Safari-autoplay, VoiceOver, focus, schermrotatie, thuisicooninstallatie
  en opslagonderbreking moeten nog op apparaten worden getest.
- Nieuwe illustraties ondersteunen de navigatie. Rustig oefenmateriaal blijft op
  een aparte effen kaart. Aantrekkelijkheid en begrijpelijkheid voor zesjarigen
  zijn een te testen ontwerpdoel, geen uitkomst van de codeaudit.

## Validatie van deze werkronde

Zie [CURRENT_VERIFICATION.md](reviews/CURRENT_VERIFICATION.md) voor de resultaten
(283 tests in 38 bestanden) en `docs/DEVELOPMENT_PLAN.md` voor de releasepoorten.
Uitgevoerde controles: TypeScript, bestaande en toegevoegde Vitest-regressies,
productiebuild, contentvalidator, distributiecontrole en echte Chromium-smoke op
root en `/spel/`, inclusief offline audio met Range-headers en afspelen tot `ended`.

`npm run audio:release` hoort nu **te falen**: synthetische concepten en ontbrekende
menselijke opnames zijn geen vrijgegeven audio. Dit is een bewuste releaseblokkade.
