# Verificatie — 10 oktober 2026

## Nieuwste spraakronde: 0.2.0-beta.2

- 1.587/1.587 synthetische audiofragmenten aanwezig; alle checksums, volledige
  MP3-decoderingen, duren en niet-stille signalen gecontroleerd.
- Volledige Vitest-suite: 38 bestanden en 285 tests geslaagd.
- Contentvalidator: 0 fouten en 0 waarschuwingen.
- Productiebuild en offline browsercontrole onder `/` en `/spel/` geslaagd.
- Updatecontrole met meerdere vensters en offline heropenen geslaagd.
- Echte Chromium-beginsessie: 8 stappen tot de beloning, voortgang opgeslagen,
  geen geblokkeerd geluid; 4× afspeelsnelheid voor de bedieningscontrole.
- Luistercontrole voor volwassenen: alle 82 klank-/naamfragmenten aanwezig,
  afspelen getest en geen gelijktijdig geluid bij wisselen van fragment.
- Spraakherkenningssteekproeven zijn diagnostisch, **geen uitspraakgoedkeuring**.
  Sommige korte woorden/zinnen worden inconsistent herkend. De resultaten staan
  in `SPEECH_ASR_SAMPLES.json`; wijzigingen en beperkingen in `SPEECH_REWORK.md`.
- Menselijke luisterreview, didactische goedkeuring en fysieke iPhone-test
  zijn nog niet uitgevoerd.

Onderstaande resultaten beschrijven de eerdere bèta 1 en blijven historische
controle-evidence; de toen ontbrekende bestanden zijn inmiddels synthetisch gevuld.

## Geslaagd

- **Bètapakket 0.2.0-beta.1:** `npm run release:beta` geslaagd; tar.gz,
  SHA-256 en bronmetadata aangemaakt. Dit is geen volledige audio-release.
- **PWA-update:** `python3 scripts/browser-update-smoke.py` geslaagd in echt
  Chromium. Geen activering zonder ouderactie; meerdere vensters blokkeren de
  update; na activering is heropenen zonder netwerk succesvol.
- **GitHub-publicatievoorbereiding:** workflow toegevoegd voor dezelfde tests,
  beide browsercontroles, Pages en een GitHub-prerelease op een bèta-tag.
  Lokale controles bewijzen geen succesvolle GitHub-hosting; de remote workflow
  en Pages-instelling moeten afzonderlijk bevestigd worden.

- **Vitest:** 38 bestanden, 283 tests, geen gefaalde of overgeslagen tests.
- **TypeScript en productiebuild:** `npm run typecheck`, `npm run build`.
- **Distributie:** `npm run check:dist`: CSP, headers, geen externe runtime-URL's,
  gebundelde OFL-licenties.
- **Content:** `npm run validate`: geen fouten; 817 waarschuwingen over ontbrekende
  audioverwijzingen. De unieke bestandsinventaris telt 776 ontbrekende menselijke
  fragmenten; verwijzingen en unieke bestanden zijn verschillende tellingen.
- **Audio-assets:** alle 811 aanwezige MP3s vergeleken met hun SHA-256 en metadata;
  alle concepten hebben de classificatie `speech` en `reviewed: false`.
- **Browser:** `python scripts/browser-smoke.py` tegen de echte productiebuild;
  root en `/spel/`; schermbreedtes 320/390/844/1280; geen horizontale overflow;
  leesvraag verborgen vóór bevestiging; geen antwoordshortcut onder pauzedialoog;
  sessiehervatting; PWA-installatie en offline herladen; offline MP3-rangeverzoek
  met status 206 en juiste bytes; MP3 afspelen tot `ended`; geen externe requests
  of JavaScript-pageerrors.
- **Engine-route:** test vanaf vers profiel via normale planner/queue/scoring naar
  zin- en tekstbegrip. Perfecte gesimuleerde antwoorden controleren bereikbaarheid.
- **Git:** `git diff --check` schoon. Er is geen commit, push of publicatie gedaan.

## Bewust geblokkeerd

`npm run audio:release` faalt: 776 menselijke fragmenten ontbreken en 811 aanwezige
fragmenten zijn synthetische concepten zonder luistergoedkeuring. De releasepoort
mag pas slagen na vervanging/opname en gedocumenteerde review per actuele hash.

## Niet uitgevoerd

- Uitspraak-/luisterreview door native spreker en leesexpert.
- Onderzoek naar effectiviteit met kinderen; professionele didactische sign-off.
- Fysieke iPhone/iPad-test, Safari/VoiceOver, App Store-build of signing.
- Meerdere lokale profielen, synchronisatie, volledige woord-/verhalenbank en
  vlotheidsmeting; deze staan in het ontwikkelplan.

Browser-screenshots gebruiken alleen testprofielen:
[start](current/start.png), [kaart](current/map.png), [leesactiviteit](current/reading.png).
De screenshot is een visuele controle, geen gebruiksonderzoek met zesjarigen.
