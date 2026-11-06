# LiveMusicJapan 24/7

Installable web app (PWA) with gig listings in Japanese and English.

Run locally: `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
Install: Android/Chrome shows an "Add to home screen" button; on iPhone use Safari's Share > Add to Home Screen.
(Installing from a phone needs HTTPS, so that works once it is deployed.)

Add a language: copy `i18n/en.json` to `i18n/<code>.json`, translate it, and add the code to `LANGS` in `app.js`.
Data: `data/events.json` (sample data only).

## Real listings
`importers/import_venues.py` reads venue schedule pages in Tokyo, Osaka, Nagoya and Kyoto into `data/live-events.json`.
GitHub Actions runs it daily (`.github/workflows/import.yml`), then rebuilds the static pages. The app shows these by default; add `?sample` to see the demo data.

## Static pages
`node tools/build-pages.mjs` builds the city, venue, guide and about pages, the 404 page, `robots.txt`, `sitemap.xml` and the listings inside `index.html`.
Edit guide and venue text in that script, not in the generated pages. A new venue needs a description there, or the build stops with an error.
Test a parser offline: `python importers/import_venues.py --offline <folder of saved pages>`.
