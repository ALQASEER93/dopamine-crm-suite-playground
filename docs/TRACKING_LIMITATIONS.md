# Tracking Limitations (PWA)

## Foreground only
The PWA can only track location while the app is open and active in the browser.
When the browser is closed or the device suspends the tab, background tracking
is not available in standard web contexts.

## Required for true background tracking
To support real background tracking, we need a native Android wrapper (TWA or
custom WebView) with a background location service and a secure bridge back to
the CRM API.

## Mobile GPS test note
Geolocation on real devices needs a Secure Context (HTTPS). Use Cloudflare
Tunnel or a local HTTPS dev certificate to test GPS on phones.

## Mobile GPS requires HTTPS
Mobile browsers only allow Geolocation on Secure Contexts (HTTPS).
Options:
- Cloudflare Tunnel (quick public HTTPS URL to your local dev server).
- Local HTTPS dev certificate (self-signed or mkcert).
If you run on plain http, the browser will block location and the app will show
permission/secure-origin errors.

## Admin note
Any UI references to continuous tracking should be treated as foreground-only
until the native bridge is delivered.
