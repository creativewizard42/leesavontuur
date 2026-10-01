# LEESAVONTUUR – hardening-headers per host (SEC-R2-003)

De productiebuild bevat een strikte **meta-CSP** (zie `vite.config.ts`). Eén
belangrijke directive werkt daar niet in: `frame-ancestors`. Browsers negeren
die in een `<meta http-equiv="Content-Security-Policy">`. Daarom moet
**anti-clickjacking** als **HTTP-response-header** op de hostingserver worden
gezet. Zonder die header kan de app in een `<iframe>` geladen worden.

Deze map bevat kant-en-klare voorbeelden:

| Host | Bestand |
|------|---------|
| Netlify | `netlify/_headers` |
| nginx | `nginx/leesavontuur-headers.conf` |
| Apache | `apache/.htaccess` |

`public/_headers` staat klaar zodat Netlify het automatisch meelevert met de
build (Vite kopieert `public/` naar `dist/`). Voor andere hosts kopieert u het
relevante voorbeeld naar de configuratie van de server.

## Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

De meta-CSP in de build is identiek, maar zonder `frame-ancestors`. De
HTTP-header is leidend; de meta-CSP blijft als defense-in-depth.

Bij levering als lokale installatie of via `file://` is clickjacking niet
relevant; bij publieke webhosting is deze header verplicht.
