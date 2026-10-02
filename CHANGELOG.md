# Changelog

Alle noemenswaardige wijzigingen van LEESAVONTUUR. Opmaak losjes gebaseerd op
[Keep a Changelog](https://keepachangelog.com/nl/1.1.0/); versie 0.1.0.

## [0.1.0] – 2026-10-02

### MVP – speelbare verticale slice
- Volledige speelbare slice: startscherm, Klankwoud-kaart, sessiescherm,
  beloning en ouderhol.
- Mini-games: Klankjager, Letter-klank, Hakken, Plakken, Woord Lezen en
  De Klimboom; vaste sessie-opbouw met beloning.
- Audio via `AudioService` (opname → lokale TTS → visuele fallback), offline-first.
- Ouderzone met gate, voortgangsoverzicht, export en reset; verwarringslog.

### Reviewronde 1 – fixes
- **F1 (audio/content):** echte audio-detectie + gemarkeerde TTS-fallback, schone
  fonologie-bank, validator- en skill-mapping.
- **F2 (core/learning):** sessieplanner, adaptieve queue en foutspecifieke feedback.
- **F3 (ui/security):** UI-integratie van de nieuwe engine-/audio-API en security
  hardening (CSP, hostconfig, veilige DOM-helpers).

### Reviewronde 2 – fixes
- **Content/audio (G2):** per-variabele instructie-/feedbackclips
  (`instructionClips`, concrete sleutels zonder `{placeholders}`), opname-hints
  voor plosieven/klinkers, en een kindvriendelijk woordfilter.
- **Core/learning (G1):** progressiedeadlock na de eerste letter opgelost,
  adaptieve herstel- en veiligheidsfixes; `SessionQueue.fromJSON` valideert strikt
  en begrenst (SEC-R2-001/002).
- **UI/security (G3):** R2-labels, echte instructieclips, benaderingsindicator,
  audio-only/vorm-opties zonder zichtbare keys, en hostconfig-voorbeelden.
- **Integratie:** woordkeuze sluit `kidFriendly:false` uit; UI rendert de
  G1-metadata (`modelFirst`, `simplified`, `windDown`, `auditoryDistractors`),
  `fb.specific.count` en de concrete `instructionClips`; integratietest speelt een
  volledige sessie in jsdom (vers profiel en m,a,s,t geleerd).
- **Documentatie:** README, `docs/BUILD.md`, `docs/PRIVACY.md`,
  `docs/SECURITY.md` en dit changelog.
