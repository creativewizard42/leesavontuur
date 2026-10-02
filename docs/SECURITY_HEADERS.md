# Beveiligingsheaders bij hosting (SEC-002 / SEC-R2-003)

De app levert een strikte CSP via een **meta-tag** in de productiebuild
(`vite.config.ts`, plugin `leesavontuur-production-csp`). Eén directive werkt
daarin **niet**:

> `frame-ancestors` (en `sandbox` / `report-uri`) worden door browsers
> **genegeerd** in een `<meta http-equiv="Content-Security-Policy">`. Ze werken
> alleen als **HTTP-response-header**.

Daarom staat `frame-ancestors` bewust niet in de meta-CSP. Zet de anti-
clickjacking-bescherming (en aanverwante hardening) op de hostingserver als
HTTP-header. Zonder deze header kan de app in een `<iframe>` geladen worden.

Kant-en-klare voorbeelden staan in **`deploy/`** (Netlify, nginx, Apache) en
`public/_headers` wordt door Netlify automatisch met de build meegeleverd.
`vite preview` stuurt dezelfde headers lokaal (`preview.headers` in
`vite.config.ts`).

## Aanbevolen headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Let op: de volledige CSP-header hierboven is gelijk aan de meta-CSP, maar met
`frame-ancestors 'none'` toegevoegd. `img-src`/`media-src` zijn bewust tot
`'self'` beperkt (`data:`/`blob:` zijn niet nodig; de export-download via een
blob-URL is een navigatie en valt niet onder deze directives). Als je de header
zet, mag de meta-CSP blijven staan als defense-in-depth; de header is leidend.

## Voorbeeldconfiguratie

### Netlify (`_headers` of `netlify.toml`)

Zie `deploy/netlify/_headers` (of `public/_headers`, dat automatisch meegaat):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### nginx

Zie `deploy/nginx/leesavontuur-headers.conf`.

### Apache (`.htaccess`)

Zie `deploy/apache/.htaccess`.

Bij levering als lokale installatie of via `file://` is clickjacking niet
relevant; bij webhosting is deze header verplicht.
