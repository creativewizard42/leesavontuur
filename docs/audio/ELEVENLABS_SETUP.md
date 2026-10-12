# Nederlandse spraak via ElevenLabs

De maker kiest synthetische spraak, zonder menselijke stemopnames.
Gekozen stem: **Jessica**, Voice ID `cgSgspJ2msm6clMCkdW9`.
Model: `eleven_multilingual_v2`, taal expliciet `nl`.
De maker beluisterde de proeven en koos **levendige complimenten**.
Dit is een stijlkeuze, geen uitspraakgoedkeuring van de volledige bundel.

## Productie voor 0.2.0-beta.4

311 unieke fragmenten met samen 4.008 teksttekens leveren door hergebruik
1.458 lokale MP3s op. 183 losse klanken en hak-/plakreeksen blijven van Piper;
klankgebonden instructies combineren Jessica met die bestaande leesklanken.
Complimenten gebruiken stability 0.35, style 0.5 en speed 0.98;
instructies stability 0.5, style 0.15 en speed 0.90. Losse woorden gebruiken
style 0.1. De app bevat de bestanden en heeft geen spraakdienst nodig.

De gebruiker meldde 9.624 resterende credits en stond maximaal 9.600 toe.
Deze productieronde gebruikt een conservatieve limiet van 4.500 teksttekens.
De administratie telt verzonden tekens; het resterende accountsaldo is niet
via deze API-sleutel gecontroleerd. Er zijn geen automatische herpogingen.

## Koppeling en hervatten

Bewaar de sleutel uitsluitend als geheim `LEESAVONTUUR_ELEVENLABS_KEY` in de
beveiligde cloudomgevingsinstellingen, bestemming `api.elevenlabs.io`.
Text to Speech-toegang is nodig; Voices-leestoegang helpt bij stemkeuze.
Er komt geen sleutel of externe spraakaanroep in de kinderapp.

```sh
python3 scripts/tts/elevenlabs_generate.py
python3 scripts/tts/elevenlabs_generate.py --generate --budget-characters 4500
python3 scripts/tts/elevenlabs_generate.py --apply --budget-characters 4500
npm run audio:catalog
python3 scripts/tts/verify_audio.py
```

Python met numpy en FFmpeg zijn vereist. Zonder vlaggen wordt uitsluitend
het plan getoond. De cache en het kredietlogboek staan buiten de checkout in
`/workspace/.leesavontuur-tools/elevenlabs-jessica`. Identieke, geverifieerde
fragmenten worden hergebruikt. De generator reserveert tekens vóór elke aanvraag
en stopt bij fouten. `--apply` controleert eerst alle bronnen en schrijft pas
na volledige conversie de MP3s en hun herkomstgegevens.

## Luistercontrole

Open vanuit het oudergedeelte **Beluister de nieuwe spreekstem** voor 18
voorbeelden. Gebruik daarnaast `audio-review.html` voor de losse klanken en
klinkercontrasten. Jessica heeft een Engelstalige basisstem: ondersteuning voor
Nederlands bewijst geen foutloze Nederlandse uitspraak. Alle fragmenten blijven
`reviewed: false` tot een inhoudelijke luistercontrole is vastgelegd.

Attributie staat in het oudergedeelte, de luisterpagina en
`public/licenses/elevenlabs-attribution.txt`. De actuele ElevenLabs-planvoorwaarden
bepalen de publicatierechten; deze attributie kent geen aanvullende licentie toe.

Historisch: de eerder gekozen professionele stem Marti gaf HTTP 402 op het
beschikbare account. Jessica-proeven en deze productieronde werkten wel.
De eerder voorbereide Azure-koppeling wordt niet gebruikt.
