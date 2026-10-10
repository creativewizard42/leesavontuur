# LEESAVONTUUR — privacy in het kort

**Wat is dit?** LEESAVONTUUR is een leesspel voor kinderen van 5–6 jaar. Het werkt
**op dit apparaat**. Er is geen account. De webapp heeft eerst een verbinding
nodig om de appbestanden te laden. Na volledige offline-installatie en heropenen
is geen verbinding nodig om te spelen. Webhosting kan gebruikelijke technische
verbindingsgegevens ontvangen bij het downloaden van de app; de leergegevens
worden daarbij niet verstuurd.

**Welke gegevens bewaart het spel?**

- Een **dierenvriendje** als profiel (bijvoorbeeld eekhoorn, uil, vos of konijn).
  Er wordt **geen naam, geen leeftijd, geen geboortedatum en geen woonplaats**
  gevraagd of bewaard.
- Hoe ver uw kind is: welke klanken en woorden al geleerd zijn, een paar cijfers
  over het oefenen (aantal sessies, reactietijd) en beloningsblaadjes.
- Welke klanken of woorden wel eens verwisseld worden, zodat het spel daar extra
  mee kan oefenen.
- Als een sessie wordt onderbroken: de tussenstand van die sessie, zodat uw kind
  verder kan waar het gebleven was. Een tussenstand die ouder is dan **12 uur**
  wordt niet meer hervat en wordt bij de volgende start van het spel
  **verwijderd**.

Al deze gegevens staan **alleen op dit apparaat** (in de browseropslag) onder de
sleutels `leesavontuur.save.v1`, `leesavontuur.confusions.v1` en
`leesavontuur.session.v1`. Ze worden **niet verstuurd, niet geüpload en niet
gedeeld**. Er zijn **geen advertenties, geen tracking en geen analytics**.

**Geluid.** Het spel gebruikt alleen gesproken audio die **op dit apparaat**
beschikbaar is. Er worden **geen teksten naar internet gestuurd** voor spraak.
Alleen een stem die het apparaat zelf aanbiedt (een zogenoemde lokale stem) wordt
gebruikt voor geschikte hele woorden en instructies. De huidige ontwikkelversie
bevat voorlopige, vooraf gegenereerde computerstem-MP3s. Tijdens het spelen
wordt daarvoor geen externe spraakdienst gebruikt. Losse klanken en hak-/plakreeksen
vereisen menselijke opnames. Een oefening zonder essentieel geluid kan niet worden
beoordeeld; vraag een volwassene om hulp.

**Offline appbestanden.** Een service worker bewaart de app, fonts, illustraties
en aanwezige audio in de browsercache. Updates vervangen geen actieve sessie.
De cache bevat geen extra kindgegevens. Het apparaat kan cache of lokale opslag
wissen; maak daarom regelmatig een profiel-export.

**Bewaren.** De gegevens blijven staan zolang u het spel op dit apparaat gebruikt,
zodat uw kind verder kan waar het gebleven is. Er is geen tijdslimiet aan
verbonden; u bepaalt zelf wanneer u wist.

**Uw kind laten stoppen of gegevens wissen.** Achter het **ouderhol** (5 seconden
vasthouden + een eenvoudige som) kunt u:

- de gegevens **bewaren als bestand** (een JSON-bestand op dit apparaat) — dit
  bestand bevat geen namen of andere persoonlijke gegevens; en
- een eerder geëxporteerd profiel **terugzetten** na controle en bevestiging; en
- **alles wissen** met "Begin helemaal opnieuw". Dit wist het spelprofiel, het log
  met verwisselingen én een eventueel onderbroken sessie.

**Toekomst.** Als er ooit synchronisatie tussen apparaten komt, dan alleen met
**duidelijke toestemming van ouders**, met zo weinig gegevens als mogelijk,
versleuteld, en na een privacytoets (DPIA). Nu is dat er niet.

**Vragen?** Neem contact op met de makers van LEESAVONTUUR:
**info@leesavontuur.nl**.
