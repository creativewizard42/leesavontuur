# Leesavontuur 0.2.0-beta.3

Deze update herstelt blokkades bij oefengeluid en varieert de complimenten.

- Eén gedeelde audiospeler voor instructies, luisteropties en feedback, zodat
  Safari geen nieuwe speler voor ieder vervolgfragment hoeft toe te staan.
- Na geblokkeerd of tijdelijk mislukt geluid kan het kind op een herstelknop
  tikken. Na succesvol afspelen worden antwoorden weer beschikbaar.
- Ontbrekende feedback bij letterverwisselingen aangevuld: 41 concrete
  doelklankfragmenten. Geen verwijzing meer naar een ontbrekende basistekst.
- Hulp bij rijmen, klappen, eindklanken en tekstbegrip past bij de opdracht;
  rijm- en klapoefeningen vragen niet langer om ontbrekende hakfragmenten.
- Vijf extra complimenten; sessies wisselen passende, specifieke feedback af
  met algemene aanmoedigingen zonder hetzelfde compliment direct te herhalen.
- 1.641 lokale MP3s aanwezig. De extra clips gebruiken voorlopig nog Piper.
- Uitgebreide controle van gegenereerde opdrachten, luisterknoppen,
  foutfeedback en vervolgstappen toegevoegd aan de publicatieworkflow.

Een ElevenLabs-stem is gekozen en de koppeling werkt. De proefgeneratie is
geblokkeerd door HTTP 402 `payment_required`; de nieuwe stem is nog niet in de
app opgenomen. Zie [audio/ELEVENLABS_SETUP.md](audio/ELEVENLABS_SETUP.md). Alle huidige audio is synthetisch;
uitspraakgoedkeuring en een fysieke iPhone-controle zijn nog open.

## Bijwerken

Na een geslaagde Pages-workflow: open het oudergedeelte, kies **Controleer op een
update** en daarna **Open de nieuwe versie**. Sluit andere geopende appvensters
als de update daarom vraagt. Voortgang blijft lokaal bewaard.

De workflow publiceert de geteste build via GitHub Actions naar GitHub Pages.
Dit blijft een begeleide bèta; het is nog geen volledig gevalideerde leesmethode.
