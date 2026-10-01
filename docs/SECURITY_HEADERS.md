# Beveiligingsheaders bij hosting (SEC-002)

De app levert een strikte CSP via een **meta-tag** in de productiebuild
(`vite.config.ts`, plugin `leesavontuur-production-csp`). Eén directive werkt
daarin **niet**:

> `frame-ancestors` (en `sandbox` / `report-uri`) worden door browsers
> **genegeerd** in een `<meta http-equiv="Content-Security-Policy">`. Ze werken
> alleen als **HTTP-response-header**.

Daarom staat `frame-ancestors` bewust niet in de meta-CSP. Zet de anti-
clickjacking-bescherming (en aanverwante hardening) op de hostingserver als
HTTP-header. Zonder deze header kan de app in een `<iframe>` geladen worden.

## Aanbevolen headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
```

Let op: de volledige CSP-header hierboven is gelijk aan de meta-CSP, maar met
`frame-ancestors 'none'` toegevoegd. Als je de header zet, mag de meta-CSP
blijven staan als defense-in-depth; de header is leidend.

## Voorbeeldconfiguratie

### Netlify (`_headers` of `netlify.toml`)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
```

### nginx

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
```

### Apache (`.htaccess`)

```apache
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer"
```

Bij levering als lokale installatie of via `file://` is clickjacking niet
relevant; bij webhosting is deze header verplicht.