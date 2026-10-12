# Audio — synthetische spraak en uitspraakcontrole

## Huidige productie: 0.2.0-beta.4

De maker koos inmiddels expliciet voor synthetische spraak zonder menselijke
stemopnames. Jessica van ElevenLabs verzorgt 1.458 fragmenten: woorden,
instructies, verhalen en levendige complimenten. 183 losse leesklanken en
hak-/plakreeksen blijven met Piper Pim gegenereerd. Klankgebonden opdrachten
combineren Jessica-spraak met deze bestaande klanken.

De inventaris telt 1.641 aanwezige MP3s en nul ontbrekende manifestbestanden.
Alle audio blijft synthetisch en nog niet volledig luistergoedgekeurd.
Zie [ElevenLabs-productie](audio/ELEVENLABS_SETUP.md) voor de generator,
instellingen, het budget en de cache. De eerdere Pim-productie is beschreven in
[spraakherontwikkeling](reviews/SPEECH_REWORK.md).

`npm run audio:catalog` vernieuwt de inventaris en
`docs/audio/recording-script.json`. Bestandsnamen en logische sleutels blijven
gelijk, zodat de app onafhankelijk blijft van de gebruikte spraakdienst.

## Uitspraakcontrole

- Controleer Standaardnederlands, verstaanbaarheid, warmte en rustig tempo.
- Controleer losse fonemen, geen letternamen: m is /m/, niet “em”. Plofklanken
  mogen geen aangeplakte klinker krijgen. Controleer korte/lange klinkers apart.
- Bij legacy-classificatie `human-required` is de tekst een fonetische aanwijzing;
  deze mag niet blind als natuurlijke taal naar een spraakdienst worden gestuurd.
- Controleer segmentatie, tweetekenklanken en de pauzes in hak-/plakreeksen.
- Beluister ook samengestelde instructies met een andere stem voor de doelklank.
- Controleer codec, clipping, stilte, volume, bestandsnamen en uitspraakbetekenis.
  Automatische decodering of normalisatie bewijst geen goede uitspraak.

Gebruik `speech-review.html` voor de nieuwe spreekstem en `audio-review.html`
voor de klanken. Een deskundige luisteraar legt goedkeuring pas na controle vast
in `docs/audio/review.json` met src, SHA-256, approved en reviewer. Een gewijzigde
hash maakt eerdere goedkeuring ongeldig. De reviewlijst is momenteel leeg.

`npm run audio:release` hanteert nog de oorspronkelijke, strengere poort voor
menselijke opnames en luisterreview. Deze update gebruikt `release:beta` en
verzwakt die poort niet. Voor een stabiele synthetische release is een expliciete
herziening van het vrijgavebeleid en een inhoudelijke uitspraakreview nodig.

## Technische productie

De optionele Python-productiestappen zijn alleen nodig om audio te vernieuwen.
De app gebruikt meegeleverde MP3s en vereist geen Python, model of API-sleutel.
Jessica-uitvoer wordt naar mono MP3, 44,1 kHz, 128 kbps geconverteerd; samengesteld
materiaal krijgt 160 ms tussenruimte. Het RMS-doel is 0,0794 met pieklimiet 0,79.
Herkomst, segmenten, duur, SHA-256 en `reviewed: false` staan per bestand in
`public/audio/provenance.json`. `scripts/tts/verify_audio.py` controleert volledige
decodering, hashes, duur en niet-lege signalen.

## Historische herkomst van de Ronnie-concepten (bèta 1)

- Offline gegenereerd met Piper `nl_NL-ronnie-medium`, via sherpa-onnx 1.12.36,
  speed 0.92, twee CPU-threads. Geen spraakdienst of microfoon gebruikt tijdens
  runtime; de app speelt same-origin MP3s af.
- Modelbron:
  `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-nl_NL-ronnie-medium.tar.bz2`.
- Ontvangen archief SHA-256:
  `d2cc688abf46054eba1d47b3b1406c742ccf66732cd47998a3ee727c1b96c09f`.
  Dit is de lokaal vastgelegde hash van de via TLS verkregen distributie, geen
  onafhankelijk gepubliceerde upstream-checksum.
- De meegeleverde model card vermeldt de dataset van OHF-Voice met CC0 en
  finetuning vanaf Lessac. Die card staat in
  `public/licenses/ronnie-MODEL_CARD.txt`; “CC0” beschrijft de dataset, niet een
  zelf verzonnen volledige modellicentie. Voor definitieve menselijke audio
  moet de maker distributie- en stemrechten met de spreker vastleggen.
- `public/audio/provenance.json` vermeldt per fragment herkomst, tekst, hash,
  duur en `reviewed: false`. De metadata is deel van de reviewbare oplevering.
- FFmpeg converteerde naar mono MP3, 44,1kHz, 96kbps met loudnorm op −20 LUFS,
  −2dBTP. Het productieproces controleerde niet-lege output en audioduur.

## Concepten reproduceerbaar genereren

Dit is een optionele contentproductiestap; de normale appinstallatie gebruikt de
meegeleverde MP3s en heeft geen Python-model nodig.

```bash
npm run audio:catalog
python -m venv /workspace/.leesavontuur-tools/venv
/workspace/.leesavontuur-tools/venv/bin/pip install -r scripts/tts/requirements.txt
# Download het bovengenoemde modelarchief via geverifieerde TLS.
# Controleer de vastgelegde hash en pak het uit buiten de checkout.
/workspace/.leesavontuur-tools/venv/bin/python scripts/tts/generate_drafts.py \
  --model-dir /workspace/.leesavontuur-tools/vits-piper-nl_NL-ronnie-medium
npm run audio:catalog
```

De generator overschrijft bestaande bestanden niet. Wijzigingen aan de
opnamepolicy moeten eerst de scriptinventaris vernieuwen. Synthese van menselijke
foneemregels blijft uitgesloten. Gebruik de releasepoort naast de gewone
contentvalidator; een waarschuwingvrij buildbestand bewijst geen goede uitspraak.
