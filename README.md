# LiveMusicJapan 24/7 prototype

Installable web app (PWA) with sample gig listings in Japanese and English. No build step.

Run locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
Install: Android/Chrome shows an "Add to home screen" button; on iPhone use Safari's Share > Add to Home Screen.
(Installing from a phone needs HTTPS, so that works once it is deployed.)

Add a language: copy `i18n/en.json` to `i18n/<code>.json`, translate it, and add the code to `LANGS` in `app.js`.
Data: `data/events.json` (sample data only).

## Real listings (preview)
`importers/import_venues.py` reads the schedule pages of 7 Tokyo venues (SHELTER, Shinjuku LOFT, WWW / WWW X, LIQUIDROOM, U.F.O. CLUB, PIT INN, UNIT) into `data/live-events.json`.
GitHub Actions runs it daily (`.github/workflows/import.yml`). Preview the real listings at `?live`, e.g. https://livemusicjapan.app/?live
Test a parser offline: `python importers/import_venues.py --offline <folder of saved pages>`.
