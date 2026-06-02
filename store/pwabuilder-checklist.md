# PWABuilder Checklist

Run this against:

https://billclear-4k9.pages.dev

## Before Running PWABuilder

- Confirm `dist/manifest.webmanifest` is deployed.
- Confirm `dist/sw.js` is deployed.
- Confirm icons load:
  - `/assets/icons/icon-192.png`
  - `/assets/icons/icon-512.png`
  - `/assets/icons/maskable-512.png`
- Confirm the app works at `/`.
- Confirm the launch plan page works at `/marketing-plan`.
- Confirm the privacy page works at `/privacy`.

## Partner Center Values Needed

From Product management > Product Identity:

- Package ID:
- Publisher ID:
- Publisher display name:

Paste these into PWABuilder > Package for Stores > Windows.

## Package Output To Keep

Place downloaded package files here after PWABuilder runs:

`store/packages/`

Expected files:

- `.msixbundle`
- `.classic.appxbundle`
- signing/certificate notes from PWABuilder, if included

Do not commit private certificates or secrets.
