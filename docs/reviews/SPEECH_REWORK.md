# Spraakherontwikkeling — 10 oktober 2026

## Veranderingen in 0.2.0-beta.2

- Alle 1.587 manifestfragmenten gegenereerd met Piper `nl_NL-pim-medium`.
  Hieronder vallen ook 776 klanken, reeksen en klankgebonden instructies die in
  de vorige bèta ontbraken. Er ontbreken nu geen manifestbestanden.
- Woorden, zinnen en instructies gebruiken een Nederlandse uitspraakpipeline.
  Letterklanken worden expliciet vanuit IPA gegenereerd. Een korte `a` gebruikt
  `ɑ`, een lange `aa` gebruikt `aː`; er wordt geen tekst `mmm` of letter `t`
  aan gewone tekst-naar-spraak gegeven om een onderwijsfoneem te raden.
- De IPA wordt aangepast aan de Nederlandse fonetische symbolen waarop dit model
  getraind is: onder andere `ʏ` → `ɵ`, `ɛi` → `ɛɪ`, `ʌu` → `ʌʊ`, `ɦ` → `h`.
- Hak-/plakclips zijn afzonderlijke klanken met 160 ms tussenruimte. Dynamische
  instructies/feedback combineren Nederlandse spraak met expliciete klanken.
  Functiewoorden zoals `een`, `de`, `we` en `je` krijgen expliciete zwakke vormen.
- Rustige spreeksnelheid, monogeluid, begrensde pieken en gelijkmatiger volume.
- De automatische herhaling na 1,5 seconde én na vijf seconden verwijderd.
  Dit geldt ook wanneer oude profielen de oude herhaalinstelling bevatten.
  Herhalen gebeurt via een bewuste actie op de luisterknop.
- De letterintroductie voegt niet nogmaals dezelfde doelklank toe.
- Verdergaan wacht op antwoordgeluid én feedback. Geannuleerde audio start
  geen oude feedback meer; een onderbroken kandidatenreeks laat geen knoppen vastlopen.
- Bestandsaudio wordt als synthetisch gemarkeerd; bestandsaanwezigheid betekent
  geen menselijke opname of didactische goedkeuring.
- Een nieuwe sessie wordt vóór het eerste antwoord opgeslagen, zodat herladen
  tijdens de eerste instructie niet opnieuw een andere sessie plant.
- Het ouderdashboard biedt een luistercontrole met alle 41 klanken en hun
  letternamen. Dit verandert geen kindvoortgang en speelt één fragment tegelijk.

## Uitspraakcontrole en grenzen

De 41 doelgrafemen en de woordsegmentaties komen uit de contentregistry. De
generator weigert onbekende modelphonemen en bewaart herkomst en hashes.

Whisper tiny en base (Nederlands ingesteld) zijn als onafhankelijke diagnostische
steekproef gebruikt. Instructies zijn in de vergelijking met de vorige stem beter
herkend. Losse woorden en sommige korte zinnen worden echter nog inconsistent
herkend. Vergelijkingen van beide stemmen en verschillende uitspraakinstellingen
geven geen betrouwbare automatische uitspraakgoedkeuring. Zie
`SPEECH_ASR_SAMPLES.json` voor de niet weggefilterde resultaten.

Er is **geen menselijke luisterreview uitgevoerd**. Vooral losse plofklanken,
tweeklanken en korte klinkercontrasten moeten nog beluisterd worden. Directe IPA
voorkomt verkeerde tekstinterpretatie, maar bewijst niet dat de neurale synthese
akoestisch correct is. Deze bèta mag dus niet als volledig uitspraakgevalideerde
leesonderwijsmethode worden gepresenteerd.

## Functionele controle

Nieuwe regressietests controleren dat `extraAudio` geen timerherhaling start,
handmatig herhalen bereikbaar blijft, en de afrondcallback wacht op zowel
antwoordgeluid als feedback. De volledige tests en browsercontroles worden vóór
publicatie uitgevoerd. De MP3-controle decodeert alle bestanden en controleert
checksum, duur en een niet-stil signaal; dit is technische validatie.

De echte Chromium-beginsessie is doorlopen tot de beloning en opgeslagen
sessievoortgang, zonder ontbrekende audioclips. Voor deze controle draait afspelen
op 4× snelheid: zij toetst `ended`-events en bediening, geen luisterkwaliteit.

## Reproduceren

```sh
npm run audio:speech-plan
python scripts/tts/regenerate_speech.py --model-dir /pad/naar/vits-piper-nl_NL-pim-medium
npm run audio:catalog
python scripts/tts/verify_audio.py
```

Gebruik de vastgelegde Python-dependencies in `scripts/tts/requirements.txt`.
Het model blijft buiten de webapp; gegenereerde MP3s draaien lokaal en offline.
`--repair-phonetics` hergenereert alleen de betrokken klankvarianten en intro's.
Menselijk goedgekeurde bestanden blijven behouden. De algemene releasepoort voor
menselijke, per hash gereviewde audio blijft streng en wordt niet groen gemaakt
door deze synthetische generatie.
