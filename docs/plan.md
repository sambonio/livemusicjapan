# LiveMusicJapan 24/7 — First Plan

**Audience:** tourists and people who live in Japan.
**Languages:** Japanese first, English second, more added easily (Korean, Simplified/Traditional Chinese are the obvious next ones given visitor numbers).
**First feature (default, not yet confirmed):** gig listings with venue info. Tickets and maps come later.

## 1. What the app does first
- A list of upcoming gigs: date, start/door time, artist, venue, area, genre, price, and a ticket/info link.
- Filters: date (today / this week / pick a date), city or area (Shibuya, Shimokitazawa, Koenji, Namba…), genre, "foreigner friendly" (English info or staff, card payment, no fan-club-only tickets).
- Venue pages: address in both scripts, nearest station, map link, capacity, payment methods, drink charge note (a common surprise for visitors).
- Works offline for already loaded listings, installable on iPhone and Android from the browser.

## 2. Stack
| Layer | Choice | Why |
|---|---|---|
| App | PWA (web app with manifest + service worker) | One codebase, installs to the home screen on iOS and Android, no app store review. |
| Frontend | Prototype: plain HTML/CSS/JS. Production: SvelteKit or Next.js (static export) | Prototype stays dependency free; a framework once there are many pages and SEO matters. |
| Data | JSON API backed by Postgres (Supabase) | Hosted DB, auth and simple admin UI out of the box. |
| Search/filter | Postgres queries to start | Enough for thousands of gigs; add a search service only if needed. |
| Hosting | Cloudflare Pages or Vercel (frontend), Supabase (data) | Free tiers, fast edge delivery in Japan, HTTPS by default (required for PWA). |

## 3. Languages (i18n)
- UI text lives in one JSON file per language (`i18n/ja.json`, `i18n/en.json`). Adding a language = adding one file and one line to the language list.
- Language picked from the browser setting, switchable in the header, remembered on the device.
- Gig data stores names in both original and romanised/translated forms where available (e.g. `venue.name.ja` / `venue.name.en`); missing translations fall back to Japanese, never to blank.
- Dates and prices formatted with the browser's `Intl` API so each language gets correct formats (2026年10月18日(土) vs Sat, Oct 18).
- Later: machine translation of event descriptions, flagged as such, with human-edited text taking priority.

## 4. Where gig data comes from
Japanese live house listings are fragmented, so this is the main risk. In order of practicality:
1. **Venue submissions:** a simple form/admin page for live houses and promoters to post their own schedules. Cleanest legally, slowest to grow.
2. **Venue schedule pages:** most live houses (Loft, Shelter, Club Quattro, WWW, etc.) publish monthly schedules on their own sites. Can be collected with per-site importers, but check each site's terms first and ask permission where possible.
3. **Ticketing platforms:** e+, Pia, Lawson Ticket, Livepocket, Zaiko, TIGET. Few have public APIs; partnership/affiliate deals are the realistic route and would also give ticket links.
4. **International APIs:** Songkick, Bandsintown, Ticketmaster Discovery have APIs but thin coverage of small Japanese venues; useful for touring foreign acts.
5. **Community submissions** from users, moderated.

Recommendation: start with a hand-curated set of venues in one or two areas of Tokyo (e.g. Shibuya + Shimokitazawa), plus venue self-submission, and approach one ticketing platform about a partnership.

## 5. Hosting and launch steps
1. Create a GitHub repository and move the prototype in. *(needs your OK)*
2. Deploy to Cloudflare Pages or Vercel on a free subdomain; buy a domain later. *(needs your OK)*
3. Set up Supabase with tables: `venues`, `events`, `artists`, `translations`.
4. Build the first importer / admin form and load real listings for the pilot area.
5. Share with a few testers (tourists and residents), then widen to Osaka and other cities.

## 6. Open questions for you
- Confirm gig listings as the first feature (or tickets / maps instead).
- A name and look: keep "LiveMusicJapan 24/7"?
- Any venues, promoters or ticket platforms you already have contacts with.
