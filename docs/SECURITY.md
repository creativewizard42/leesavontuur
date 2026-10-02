# LEESAVONTUUR – securityoverzicht

LEESAVONTUUR is een volledig client-side, offline web-app. Er is geen backend,
geen account en geen netwerkverkeer tijdens het spelen. Dit document vat de
belangrijkste maatregelen samen en verwijst naar de onafhankelijke reviews.

## Maatregelen

- **Geen netwerk.** De app doet geen requests naar externe hosts. De
  productie-CSP staat alleen `'self'` toe (`default-src`, `script-src`,
  `style-src`, `img-src`, `media-src`, `font-src`, `connect-src`), met
  `object-src 'none'`, `base-uri 'none'` en `form-action 'none'`.
- **CSP + hardening-headers.** De build bevat een strikte meta-CSP
  (`vite.config.ts`). Omdat `frame-ancestors` in een meta-tag wordt genegeerd,
  wordt anti-clickjacking als **HTTP-header** geleverd via `deploy/` (Netlify,
  nginx, Apache) en `public/_headers`; `npm run preview` stuurt dezelfde headers.
  Zie `docs/SECURITY_HEADERS.md`.
- **Alleen lokale TTS.** Spraak gebruikt uitsluitend een **lokale** nl-NL-stem van
  het apparaat (Web Speech API). Er gaan geen teksten naar internet. Is er geen
  lokale stem of opname, dan blijft de app werken met een visuele fallback.
- **Lokale opslag met vaste sleutels en TTL.** Profiel, verwarringslog en
  sessie-tussenstand staan alleen in de browseropslag onder
  `leesavontuur.save.v1`, `leesavontuur.confusions.v1` en
  `leesavontuur.session.v1`. De sessie-tussenstand heeft een **TTL van 12 uur** en
  wordt daarna niet meer hervat.
- **Strikte validatie van hervat-JSON.** `SessionQueue.fromJSON` valideert types
  en begrenst aantallen secties/items/opties/metadata en de maximale omvang
  (lokale DoS-mitigatie), en filtert gevaarlijke keys (`__proto__`, `constructor`,
  `prototype`). Ongeldige invoer levert `null` en de UI start dan vers.
- **Reset wist alles.** Via het ouderhol wist "Begin helemaal opnieuw" het
  profiel, de verwarringslog én een eventuele onderbroken sessie.
- **Ouder-gate.** Het ouderhol zit achter 5 seconden vasthouden plus een som, zodat
  een kind niet per ongeluk gegevens kan wissen of exporteren.
- **Geen onveilige HTML-sinks.** `innerHTML` komt alleen voor in de statische
  SVG-helper; de ongebruikte `html`-optie is verwijderd (SEC-R2-004).
- **Afhankelijkheden.** `npm audit` hoort **0 vulnerabilities** te melden; de
  runtime-dependencies zijn beperkt tot twee gebundelde lettertypen.

## Reviews en status

De onafhankelijke security-/privacytests staan in `docs/reviews/`:

- `docs/reviews/SECURITY_PRIVACY_REVIEW.md` – ronde 1.
- `docs/reviews/SECURITY_PRIVACY_REVIEW_R2.md` – ronde 2 (met de definitieve
  privacytekst die in `docs/PRIVACY.md` is overgenomen).

Status na ronde 2: geen Critical- of High-bevindingen. De Medium/Low-punten zijn
opgelost of afgedekt: SEC-R2-001/002 (strikte `fromJSON`-validatie en
omvangsbegrenzing), SEC-R2-003 (hostconfig + headers) en SEC-R2-004 (verwijderen
onveilige `html`-optie). Voor **publieke webhosting** blijft het zetten van de
HTTP-hardening-headers verplicht; voor lokaal/offline gebruik is dat niet nodig.

Zie voor de dreigingsanalyse en acceptatiecriteria de reviewrapporten zelf.
