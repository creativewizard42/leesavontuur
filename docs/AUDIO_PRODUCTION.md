# Audio — menselijke eindversie en voorlopige ontwikkelbestanden

De definitieve stem is op verzoek van de maker **warm, rustig, menselijk en
Standaardnederlands**. De huidige MP3s zijn expliciet synthetische concepten,
geen menselijke opnames of didactisch vrijgegeven fonemen.

## Huidige inventaris

`npm run audio:catalog` schrijft de actuele aantallen en
`docs/audio/recording-script.json`. Op 10 oktober 2026 bevat de inventaris:

- 1.587 unieke fragmenten;
- 811 aanwezige synthetische MP3s voor woorden, namen, zinnen, feedback en
  instructies die geen fonemen voordoen;
- 776 ontbrekende menselijke fragmenten: letterklanken, hak-/plakreeksen en
  instructies/foutspecifieke feedback met ingebedde klanken.

De eerdere 1.847 validatorwaarschuwingen waren verwijzingen, geen telling van
unieke ontbrekende bestanden. Audio voor auditieve woorden in de rijm-/
lettergreepbank is nu ook opgenomen in de centrale inventaris.

Alle huidige concepten moeten uiteindelijk door de gekozen menselijke stem worden
vervangen. Bestandsnamen en logische sleutels blijven gelijk zodat runtime en
leercontent niet aan één productieproces vastzitten. Noem synthetische bestanden
nooit menselijke opnames. Een luisterreview van de concepten is nog niet uitgevoerd.

## Opnamebrief

- Native Standaardnederlands; uitnodigend, rustig en duidelijk, zonder overmatige
  kinderlijke stem of belonend schreeuwen. Goed en opnieuw proberen even vriendelijk.
- Neem losse fonemen op, geen letternamen: `m` is /m/, niet “em”; plofklanken kort,
  zonder een aangeplakte sjwa. Korte/lange klinkers expliciet door een leesexpert
  laten controleren; spelling alleen is geen voldoende uitspraakaanwijzing.
- De scriptregel bevat `key`, `src`, `text`, `kind` en `delivery`. Bij
  `human-required` is `text` een opnameaanwijzing; nooit blind door een TTS halen.
- Blends volgen grafeemsegmentatie; tweetekenklanken zijn één klank. Gebruik
  natuurlijke, pedagogisch afgesproken verbinding/pauzes. Een r-in-coda en
  contextafhankelijke uitspraak moeten passend worden ingesproken.
- Masteropnames: WAV, mono, minimaal 44,1kHz/16bit. Bewaar masters buiten `public`.
  Lever MP3 op het scriptpad. Geen leading knip, harde eindknip, ruis of muziek.
- Gebruik één afgesproken volume: richtwaarde −20 LUFS, true peak ≤ −2 dBTP,
  constante feedbackluidheid. Meet én luister; normalisatie vervangt geen review.

## Productie en goedkeuring

1. Spreker neemt de actuele scriptregels op; begin met het feitelijk benodigde
   MVP-pakket en lever uiteindelijk alle geselecteerde content af.
2. Audio-editor controleert clipping, stilte, codec, volume en bestandsnamen.
3. Een tweede luisteraar met leesdidactische expertise controleert uitspraak,
   fonemen, doelwoord, segmentatie, leeftijdspassendheid en instructiebetekenis.
4. Vervang de MP3 op exact dezelfde `src`. Verwijder zijn oude synthetische entry
   uit `public/audio/provenance.json` pas wanneer daadwerkelijk menselijke audio is
   geplaatst. Bewaar de vervangingsgeschiedenis buiten de runtime-bundel.
5. Leg na goedkeuring een entry in `docs/audio/review.json` vast:

```json
[
  {
    "src": "audio/graphemes/m_sound.mp3",
    "sha256": "de werkelijk berekende SHA-256 van het goedgekeurde bestand",
    "approved": true,
    "reviewer": "identificatie van de verantwoordelijke luisterreviewer"
  }
]
```

Het voorbeeld is geen goedkeuring. De repository start met een lege reviewlijst.
Een vervangen bestand verliest automatisch zijn goedkeuring door de hashcontrole.
`npm run audio:release` faalt bij ontbrekende, synthetische of niet-goedgekeurde
bestanden. Zonder menselijke review mogen bestanden geen vrijgavestatus krijgen.

## Herkomst van de huidige concepten

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
