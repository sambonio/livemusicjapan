# First Tokyo venues for real listings (checked 2026-10-19 JST)

How this was checked: each venue's own schedule page was opened and read. "Terms" = whether the site says anything about reusing its content.

| Venue | Area | Schedule page | What's on it | English | Terms | Verdict |
|---|---|---|---|---|---|---|
| SHELTER (Loft group) | Shimokitazawa | loft-prj.co.jp/schedule/shelter | Date, artists, open/start, link per gig. No prices on list | No | Only "All Rights Reserved" | **Start** |
| Shinjuku LOFT + 9 other Loft venues | Shinjuku etc. | same site/format as SHELTER | Same as above | No | Same | **Start** (one importer covers the group) |
| WWW / WWW X | Shibuya | www-shibuya.jp/schedule/ | Date, artists, open/start, venue. No prices on list | Partly | Copyright line + privacy policy only | **Start** |
| LIQUIDROOM | Ebisu | liquidroom.net/schedule | Date, title, open/start, **prices** | No | Copyright line only | **Start** |
| U.F.O. CLUB | Higashi-Koenji | ufoclub.jp/schedule/ (+ /next-month) | Date, artists, open/start, **prices**, sold-out | No | Copyright line only | **Start** |
| Shinjuku PIT INN (jazz) | Shinjuku | pit-inn.com/schedule | Date, artists, times, some prices | **Yes** (pit-inn.com/e) | Copyright line only | **Start** (good for visitors) |
| UNIT | Daikanyama | unit-tokyo.com/schedule/ | Date, title, doors. No prices | Menu only | Copyright line only | **Start** |
| CLUB QUATTRO | Shibuya | club-quattro.com | Per-event pages, list not easy to read | No | None found | Later |
| Spotify O-EAST/WEST/nest/Crest | Shibuya | shibuya-o.com | Schedule not on home page; per-venue pages | No | Copyright line only | Later (needs a closer look) |
| Blue Note Tokyo (jazz) | Aoyama | bluenote.co.jp/jp/schedule/ | Loaded by script, couldn't read it | Some | Disclaimer + policy pages | Later (ask for a feed; strong tourist draw) |
| CLUB Que | Shimokitazawa | ukproject.com/que/schedule/ | **Site blocks automated reading** | – | – | **Skip unless they agree** |

## Takeaways
- No venue says anything specific about reusing listings; all just say "All Rights Reserved". Dates, times and artist names are facts, but to be safe and to build goodwill we should **ask each venue (or group) for permission**, always link back to their page, and offer the app as free promotion.
- One importer for the **Loft group** covers ~10 venues at once.
- Most lists have no prices; those come from each gig's own page, so importers read the list and then each gig page.
- Nobody has English listings except PIT INN, which is exactly the gap this app fills (we translate).
- **Ticketmaster:** its API says coverage is "global" with a free key (5,000 calls/day), but Japan isn't named. Matthias needs to register a free key at developer.ticketmaster.com so we can test what Japan returns.
- Also worth knowing: **Tokyo Gig Guide** (tokyogigguide.com) is an existing English gig listing site, run by volunteers/submissions. A competitor, or a possible partner.
