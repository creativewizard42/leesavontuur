# Nederlandse stemproeven via ElevenLabs

De gebruiker kiest synthetische spraak, zonder menselijke stemopnames.
Gekozen Voice ID: `JoZAnrliG62q9Iogun7f` — **Marti - Dutch student philosophy**.
De API bevestigt taal `nl`, standaardaccent, categorie `professional`.

## Status op 12 oktober 2026

De veilige sleutel werkt: de stemgegevens kunnen worden opgehaald.
Generatie van de eerste korte proef met `eleven_multilingual_v2` werd door
ElevenLabs geweigerd met **HTTP 402 `payment_required`**. Er is geen proefaudio
gegenereerd en er zijn geen productiebestanden door ElevenLabs vervangen.
Een andere stem die binnen het gratis account beschikbaar is, of een door de
gebruiker gekozen betaald plan, is nodig voordat deze generatie kan doorgaan.

## Koppeling

1. Open https://elevenlabs.io/ en voeg de gewenste Nederlandse stem toe aan
   **My Voices**. Beluister de stem op verstaanbaarheid en kindvriendelijkheid.
2. Maak via **Developers → API Keys** een sleutel met Text to Speech-toegang en
   leesrechten voor Voices. Models-leesrechten zijn nuttig voor modelverkenning.
3. Bewaar de sleutel uitsluitend als geheim `LEESAVONTUUR_ELEVENLABS_KEY` in de
   beveiligde cloudomgevingsinstellingen. Deel alleen de Voice ID in de chat.
4. De API-bestemming is `api.elevenlabs.io`. De secretvereiste en bestemming zijn
   als configuratieconcept opgeslagen; sla de instellingen op en publiceer ze
   wanneer wijzigingen nog niet actief zijn.

De eerder voorbereide Azure-koppeling wordt niet gebruikt. Eventuele ongebruikte
Azure-vereisten kunnen in de omgevingsinstellingen worden verwijderd.
Controleer de actuele credits en publicatierechten van het gekozen ElevenLabs-plan.
Er komt geen API-sleutel of externe spraakaanroep in de kinderapp.

## Kleine stemproef vóór de volledige bundel

```sh
python3 scripts/tts/elevenlabs_samples.py --plan
python3 scripts/tts/elevenlabs_samples.py --voice JoZAnrliG62q9Iogun7f
```

`--plan` doet geen netwerkverzoek. De generator maakt vier proeven: instructie,
complimenten met rustige instellingen, complimenten met meer expressie en korte
Nederlandse woorden. Taal is expliciet Nederlands. De twee complimentproeven
hebben dezelfde tekst, zodat intonatie en duidelijkheid vergeleken kunnen worden.

Uitvoer staat buiten de app in `/tmp/leesavontuur-elevenlabs-stemproeven/`.
De generator bewaart instellingen en checksums, hervat zonder identieke proeven
opnieuw te betalen en stopt bij een API-fout. Een gewijzigde stem of instellingen
vereisen een nieuwe uitvoermap via `--output`. Geen automatische betaalupgrade.

Na het beluisteren van de proeven volgen de volledige bundel en aparte controle
van leesklanken, korte/lange klinkers, medeklinkers zonder toegevoegde klinker en
klankreeksen. Een natuurlijke stem alleen bewijst geen correcte uitspraak.
