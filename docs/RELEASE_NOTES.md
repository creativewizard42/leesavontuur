# Leesavontuur 0.2.0-beta.1

Begeleide bèta voor ontwikkeling en ouderfeedback. Geen volledige leesmethode.

- Rustige bosvormgeving, grote knoppen en een herkenbare avonturenkaart.
- Gebiedsselectie, eerste decodeerbare zinnen en korte verhalen.
- Audio speelt sequenties volledig af; ontbrekend oefengeluid wordt niet gescoord.
- 811 tijdelijke computerstemfragmenten; 776 menselijke klankfragmenten ontbreken.
- Lokale voortgang, gecontroleerde import/export en een uitgebreid ouderdashboard.
- Offline PWA met bereikverzoeken voor audio, ook onder een repositorypad.
- Ouders kunnen op updates controleren en een gereedstaande versie openen.

Definitieve menselijke audio, didactische review, een pilot met kinderen en fysieke
iPhone-tests zijn nodig voor een volledige release. De bèta vervangt leesonderwijs
en begeleiding niet. Bij een geblokkeerde oefening ga je via het huisje terug.

## GitHub Pages

De workflow bouwt en controleert vóór publicatie. Onder **Settings → Pages →
Build and deployment → Source** moet **GitHub Actions** geselecteerd zijn.
De workflow publiceert vervolgens naar de URL die GitHub zelf teruggeeft.
Er wordt geen eigen domein ingesteld en geen bestaande hosting aangepast.

GitHub Pages ondersteunt geen aangepaste HTTP-headers uit `_headers`.
De ingebouwde meta-CSP blijft actief; `frame-ancestors`, Permissions-Policy en
de aanvullende HTTP-hardeningheaders moeten op hosting met headerondersteuning
worden toegepast als die deploymentvereisten gelden.

## Installatie en herstel

Open de HTTPS-site; op iPhone gebruik je Safari → Deel → Zet op beginscherm.
Laat de bestanden met internet volledig downloaden voordat je offline speelt.
Maak regelmatig een voortgangsexport. Herstel via het ouderdashboard; een
browsercache of appbestand bevat geen reservekopie van je profiel.

## Reproduceerbare pakketten

`npm ci` en `npm run release:beta` produceren een gecontroleerd tar.gz-pakket,
SHA-256 en metadata in `releases/`. De broncommit en eventuele lokale wijzigingen
staan in die metadata. `release:stable` vereist een stabiele pakketversie en alle
menselijke audio-goedkeuringen. De bètaroute wijzigt die strenge audiopoort niet.
