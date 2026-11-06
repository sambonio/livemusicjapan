// Builds the static city, venue, guide and about pages, and the listings in index.html,
// from data/live-events.json. Run after the importer, and after editing the text below:
//   node tools/build-pages.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://livemusicjapan.app";
const CONTACT_URL = "https://github.com/sambonio/livemusicjapan/issues";
const ADS = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6255445381875860" crossorigin="anonymous"></script>`;
const CONTENT_DATE = "2026-11-05"; // Change when guide or venue text is edited
const CITY_LIMIT = 60;
const HOME_LIMIT = 20;

const data = JSON.parse(readFileSync(join(ROOT, "data/live-events.json"), "utf8"));
const LISTINGS_DATE = String(data.updated).slice(0, 10);
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());

// Listings come from venue websites, so everything is escaped before going into a page.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const text = (v) => (v && typeof v === "object" ? v.en || v.ja || "" : v || "");
const safeUrl = (u) => (/^https?:\/\//.test(u || "") ? u : "");
const CHANGED = /延期|中止|cancel|postpone/i;

const events = data.events
  .filter((e) => e.date >= today && (text(e.artist) || text(e.title)))
  .sort((a, b) => (a.date + (a.start || a.open || "")).localeCompare(b.date + (b.start || b.open || "")));

const CITIES = {
  tokyo: {
    name: "Tokyo",
    intro: "Tokyo has one of the densest live music scenes in the world, spread across neighbourhoods with very different characters. Shimokitazawa and Koenji are known for small rock and underground venues, Shibuya for mid-sized rooms that host touring bands and rising acts, and Shinjuku for both punk history and serious jazz.",
    tip: "Many venues are a short walk from a major station, but basement entrances can be easy to miss. Allow extra time and check the map before you leave, especially in Shibuya, where station exits can be a long way apart.",
  },
  osaka: {
    name: "Osaka",
    intro: "Osaka's live music is centred on the south of the city. Shinsaibashi and the nearby Amerikamura area have a cluster of live houses within walking distance of each other, while Horie has smaller independent spaces. Umeda, to the north, is home to larger rooms close to the main rail hub.",
    tip: "Shinsaibashi is a lively area late into the evening, and it can be busy around show times. If you're staying near Namba or Umeda, the Midosuji subway line connects both to Shinsaibashi directly.",
  },
  kyoto: {
    name: "Kyoto",
    intro: "Kyoto is better known for temples than for gigs, but it has a small and long-running independent music scene with close ties to the city's universities. Venues are fewer and more intimate than those in Tokyo or Osaka, which makes a Kyoto show a different kind of evening out.",
    tip: "Kyoto's buses and trains finish earlier than you might expect in a city this popular. If you're staying outside the centre, check your route home before the show, or consider a late-night taxi.",
  },
  nagoya: {
    name: "Nagoya",
    intro: "Nagoya is a regular stop on national tours between Tokyo and Osaka, so it can be a good place to see a band when tickets elsewhere have sold out. Its central Sakae and Yabacho area has shopping, restaurants and live venues close together.",
    tip: "Nagoya is well connected by Shinkansen, but it's worth checking the last train if you're planning a day trip. Most shows finish in time for a late train, though not always in time for a long connection.",
  },
};

const VENUES = {
  shelter: "A basement live house in Shimokitazawa and part of the Loft group. It's a small, close-up room focused mainly on rock and punk bands, so expect to be near the stage wherever you stand.",
  loft: "One of the best-known names in Japanese rock. Loft began in Shinjuku in the 1970s and now runs from Kabukicho, in a basement venue that has hosted generations of punk and rock bands.",
  www: "A mid-sized venue in Shibuya's Udagawacho district, built in a converted cinema. Its stepped floor helps with sightlines, and the schedule covers indie, electronic and experimental acts as well as touring artists.",
  wwwx: "The sister venue to WWW, in the same Shibuya building. It's a larger, flat-floored room used for a similar mix of indie and international artists.",
  liquidroom: "A well-known mid-sized venue in Ebisu, which moved there from Shinjuku in the 2000s. It hosts Japanese and international bands as well as club events.",
  ufoclub: "A small basement club in Higashi-Koenji with a strong reputation for psychedelic and underground rock. It's a good choice if you want to see something you wouldn't find on a big festival bill.",
  pitinn: "One of Japan's most respected jazz clubs, in business in Shinjuku since the 1960s. Many schedules have separate afternoon and evening sessions, and it publishes some information in English, which makes it an easy first choice for visitors.",
  unit: "A basement venue in Daikanyama that hosts both live bands and club nights. The surrounding streets are quieter than nearby Shibuya, and it's an easy walk from Daikanyama Station.",
  quattro_shibuya: "The Shibuya branch of the CLUB QUATTRO venues, a regular stop on tours for established Japanese and overseas acts. It's a mid-sized standing room in the middle of Shibuya's shopping streets.",
  quattro_umeda: "CLUB QUATTRO's Osaka branch, located near the Umeda rail hub. It's a convenient, mid-sized stop for touring bands and a practical choice if you're staying in the north of the city.",
  bigcat: "A larger live house in the Shinsaibashi and Amerikamura area, a regular stop on national tours. It's close to plenty of food and nightlife if you want to make an evening of it.",
  janus: "A live house in Shinsaibashi, close to several other Osaka music venues. Its schedule covers a broad range of Japanese bands and solo artists on tour.",
  socore: "An independent venue in Osaka's Minami-Horie district, a neighbourhood known for its independent shops and cafes. It's a small space with a varied schedule of underground and alternative acts.",
  quattro_nagoya: "CLUB QUATTRO's Nagoya branch, close to Yabacho Station and the Sakae shopping area. It's a regular mid-sized stop for bands touring between Tokyo and Osaka.",
  metro: "A long-running Kyoto club beside Jingu-Marutamachi Station. It has a reputation for an eclectic programme of bands, DJs and club events.",
  nano: "A small live house in central Kyoto, close to the Nijo area. It's an intimate space with a focus on local and independent bands.",
};

const GUIDES = [
  {
    slug: "how-live-houses-work",
    title: "How Live Houses Work in Japan: A First-Timer's Guide",
    short: "Doors, drink charges, numbered entry and etiquette",
    desc: "What to expect at a Japanese live house: ticket numbers, the drink charge, early start times, lockers and venue etiquette.",
    body: `<p>A live house (ライブハウス) is a small or mid-sized music venue, usually standing-room and often in a basement. They're at the centre of Japan's music scene, and most bands play them for years. Going to one is simple, but a few customs can surprise first-time visitors.</p>
<h2>Shows start early</h2>
<p>Listings show two times: 開場 (<em>kaijō</em>) is when doors open and 開演 (<em>kaien</em>) is when the show starts, usually 30 minutes to an hour later. Evening shows commonly start between 18:30 and 19:30 and finish by about 21:30. Arriving at 21:00, as you might elsewhere, could mean missing most of it. Weekend shows may start earlier still.</p>
<h2>The drink charge</h2>
<p>Nearly every live house adds a compulsory drink charge on top of the ticket, typically around ¥500 to ¥800, paid in cash at the door. You'll usually get a token or ticket to exchange at the bar for one drink. Listings may show this as 1ドリンク別 (one drink extra). It isn't a mistake or a scam, and it applies even if you don't want a drink, though soft drinks are normally available too.</p>
<h2>Entry order and ticket numbers</h2>
<p>Many tickets carry an entry number called 整理番号 (<em>seiri bangō</em>). Staff call numbers in order at the door, often in groups of ten. A low number gets you closer to the stage, while a high number just means going in later. Arrive before doors open, listen for your number, and ask a nearby fan or a staff member if you're unsure. Some shows also have priority groups marked A or B, with all of A going in first.</p>
<h2>What to bring</h2>
<ul>
<li><strong>Cash:</strong> door tickets and drink charges are often cash only, even where tickets were sold online.</li>
<li><strong>Your ticket and possibly ID:</strong> some larger shows check names against tickets.</li>
<li><strong>Coins for a locker:</strong> many venues have small coin lockers, and there often isn't anywhere else for bags. For large bags, use a station locker before you arrive.</li>
</ul>
<h2>Etiquette inside</h2>
<p>Photo and video rules vary. Many Japanese shows ban both, so look for signs or watch what others are doing. Audiences can seem quiet between songs, then respond in unison during the set. That's normal and doesn't mean people aren't enjoying it. Keep your bag small and hold it in front of you in a crowded room.</p>
<h2>After the show</h2>
<p>Bands often sell merchandise near the entrance, and members may come out to meet fans at smaller shows. Merch tables usually prefer cash. Check your last train before the show starts, especially if your route has a transfer.</p>`,
  },
  {
    slug: "buying-tickets",
    title: "How to Buy Gig Tickets in Japan as a Visitor",
    short: "Advance sales, lotteries, door tickets and konbini",
    desc: "A practical guide to buying concert tickets in Japan: advance sales, lotteries, door tickets, konbini payment and what to do if a site won't accept you.",
    body: `<p>Buying tickets for a small show in Japan is often straightforward. For a bigger artist, it can be one of the hardest parts of the trip. Start with the venue's page for the show, because it normally says exactly where tickets are sold.</p>
<h2>Advance or door?</h2>
<p>Prices are often listed as 前売 (<em>maeuri</em>, or ADV), for advance tickets, and 当日 (<em>tōjitsu</em>, or DOOR), for tickets on the day. Door tickets usually cost a few hundred yen more. A smaller show may well have door tickets available, but they aren't guaranteed, and sold-out shows won't have any. It's a good idea to contact the venue before you make a special trip.</p>
<h2>Where tickets are sold</h2>
<p>Large Japanese ticket sellers include e+ (eplus), Ticket Pia and Lawson Ticket. Zaiko, LivePocket and TIGET are also common, especially for independent events and streamed or digital tickets. Some small venues and bands also take reservations by email or through a form, which you then pay for at the door. This is called 取り置き (<em>torioki</em>).</p>
<h2>Lotteries and fan clubs</h2>
<p>Popular shows are often sold in stages. A fan club pre-sale (先行, <em>senkō</em>) comes first, then a lottery (抽選, <em>chūsen</em>), where you apply and are told later if you won. Finally, any remaining tickets go on general first-come sale (先着, <em>senchaku</em>). Sell-outs are common before general sale begins.</p>
<h2>Common problems for visitors</h2>
<ul>
<li><strong>Japanese phone numbers:</strong> some ticket sites require one to register. Look for an English or overseas-customer version, since some sellers and promoters offer one for bigger tours.</li>
<li><strong>Foreign credit cards:</strong> these can be declined. Many sites let you pay in cash at a convenience store (konbini) instead, using a payment number.</li>
<li><strong>Picking up tickets:</strong> paper tickets are often issued at a konbini machine or counter, using a reference number. Digital tickets may need an app.</li>
<li><strong>Named tickets:</strong> some shows check ID and don't allow tickets to be transferred, so be careful about buying from resale sites and always check the official rules first.</li>
</ul>
<h2>If you're stuck</h2>
<p>Hotel staff may be willing to help with a konbini purchase, and smaller venues will often reply to a short, polite email. If a big show proves impossible, look for a smaller band in the same scene. Our <a href="/tokyo/">city listings</a> are a good place to start, and you could find a great show you'd never have thought to look for.</p>`,
  },
  {
    slug: "gig-japanese",
    title: "Japanese Words and Phrases for Going to a Gig",
    short: "Read a schedule and get through the door",
    desc: "The Japanese words you'll see on gig schedules and tickets, and simple phrases for buying a ticket and asking questions at a live house.",
    body: `<p>Most Japanese venue websites are only in Japanese, but schedules follow a very regular pattern. Learn these few terms and you can read nearly any listing. Browser translation handles the rest, though it often garbles band names.</p>
<h2>Words on schedules and tickets</h2>
<table>
<thead><tr><th>Japanese</th><th>Reading</th><th>Meaning</th></tr></thead>
<tbody>
<tr><td lang="ja">開場</td><td>kaijō</td><td>Doors open</td></tr>
<tr><td lang="ja">開演</td><td>kaien</td><td>Show starts</td></tr>
<tr><td lang="ja">前売 / 前売り</td><td>maeuri</td><td>Advance price</td></tr>
<tr><td lang="ja">当日</td><td>tōjitsu</td><td>Price on the day</td></tr>
<tr><td lang="ja">1ドリンク別</td><td>wan dorinku betsu</td><td>One-drink charge is extra</td></tr>
<tr><td lang="ja">整理番号</td><td>seiri bangō</td><td>Entry-order number</td></tr>
<tr><td lang="ja">出演</td><td>shutsuen</td><td>Performers</td></tr>
<tr><td lang="ja">対バン</td><td>taiban</td><td>A bill shared by several bands</td></tr>
<tr><td lang="ja">ワンマン</td><td>wanman</td><td>A headline show by one artist</td></tr>
<tr><td lang="ja">完売 / SOLD OUT</td><td>kanbai</td><td>Sold out</td></tr>
<tr><td lang="ja">中止</td><td>chūshi</td><td>Cancelled</td></tr>
<tr><td lang="ja">延期</td><td>enki</td><td>Postponed</td></tr>
</tbody>
</table>
<h2>Useful phrases at the venue</h2>
<ul class="phrases">
<li><span lang="ja">当日券はありますか？</span><br>tōjitsuken wa arimasu ka?<br><em>Do you have tickets for today?</em></li>
<li><span lang="ja">ドリンク代はいくらですか？</span><br>dorinku-dai wa ikura desu ka?<br><em>How much is the drink charge?</em></li>
<li><span lang="ja">ロッカーはありますか？</span><br>rokkā wa arimasu ka?<br><em>Are there lockers?</em></li>
<li><span lang="ja">写真を撮ってもいいですか？</span><br>shashin o totte mo ii desu ka?<br><em>May I take photos?</em></li>
<li><span lang="ja">整理番号は何番まで呼びましたか？</span><br>seiri bangō wa nanban made yobimashita ka?<br><em>What number have they called up to?</em></li>
<li><span lang="ja">最高でした！</span><br>saikō deshita!<br><em>That was amazing! (nice to say at the merch table)</em></li>
</ul>
<h2>Reading a band's name</h2>
<p>Band names are often written in Japanese with no official English version, and the same act may appear in more than one script. That's why our listings show the name as the venue wrote it. If you want to hear a band before you go, copying the exact Japanese text into YouTube or a streaming app usually works best.</p>
<p>For more everyday travel Japanese, try <a href="https://tabitranslator.app/">Tabi Phrasebook</a>, a free offline phrasebook from the same maker.</p>`,
  },
];

const venueCities = Object.keys(CITIES).filter((c) => Object.values(data.venues).some((v) => v.city === c));
const nav = `<nav aria-label="Cities">${venueCities.map((c) => `<a href="/${c}/">${CITIES[c].name}</a>`).join("")}</nav>
<nav aria-label="Guides">${GUIDES.map((g) => `<a href="/guides/${g.slug}/">${esc(g.short)}</a>`).join("")}</nav>
<nav aria-label="Site"><a href="/">All gigs</a><a href="/about/">About</a><a href="/privacy.html">Privacy policy</a><a href="${CONTACT_URL}" rel="noopener">Contact</a></nav>`;

const head = ({ title, desc, path, ads = true, robots = "index, follow", ld = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#e0245e">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${path ? `<link rel="canonical" href="${ORIGIN}${path}">\n` : ""}<meta name="robots" content="${robots}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="icon" href="/icons/icon-192.png">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/pages.css">
${ads ? ADS + "\n" : ""}${ld}</head>
<body class="static">
<header><div><a class="brand" href="/">Live Music Japan</a></div></header>
`;
const foot = `<footer class="sitefoot">
${nav}
</footer>
</body>
</html>
`;

const dayLabel = (d) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
const yen = (n) => "¥" + Number(n).toLocaleString("en-US");

function gigCard(e, { showVenue = true } = {}) {
  const v = data.venues[e.venue];
  const artist = text(e.artist) || text(e.title);
  const title = text(e.title);
  const url = safeUrl(e.url) || safeUrl(v.site);
  const times = [e.open && `Doors ${e.open}`, e.start && e.start !== e.open && `Start ${e.start}`].filter(Boolean).join(" · ");
  const meta = [times, e.price != null && yen(e.price)].filter(Boolean).join(" · ");
  const changed = CHANGED.test(artist + title);
  return `<article class="card">
<h3 class="gig" lang="ja">${esc(artist)}</h3>
${title && title !== artist ? `<p class="subtitle" lang="ja">${esc(title)}</p>\n` : ""}${showVenue ? `<p class="venue"><a href="/venues/${esc(e.venue)}/">${esc(text(v.name))}</a> · ${esc(text(v.area))}</p>\n` : ""}${meta ? `<p class="meta">${esc(meta)}</p>\n` : ""}${url ? `<p class="meta"><a href="${esc(url)}" rel="noopener">Venue details</a></p>\n` : ""}${e.soldOut || changed ? `<div class="tags">${e.soldOut ? `<span class="tag bad">Sold out</span>` : ""}${changed ? `<span class="tag bad">Check status with venue</span>` : ""}</div>\n` : ""}</article>`;
}

function gigList(list, opts) {
  let html = "", last = "";
  for (const e of list) {
    if (e.date !== last) { html += `<h3 class="day">${esc(dayLabel(e.date))}</h3>\n`; last = e.date; }
    html += gigCard(e, opts) + "\n";
  }
  return html;
}

function eventLd(list) {
  const items = list.filter((e) => !CHANGED.test(text(e.artist) + text(e.title))).map((e) => {
    const v = data.venues[e.venue];
    const time = e.start || e.open;
    return {
      "@context": "https://schema.org", "@type": "Event",
      name: text(e.title) || text(e.artist),
      startDate: time ? `${e.date}T${time}:00+09:00` : e.date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "MusicVenue", name: text(v.name), address: { "@type": "PostalAddress", addressLocality: text(v.area), addressRegion: CITIES[v.city].name, addressCountry: "JP" } },
      performer: { "@type": "PerformingGroup", name: text(e.artist) || text(e.title) },
      url: safeUrl(e.url) || safeUrl(v.site) || undefined,
    };
  });
  if (!items.length) return "";
  return `<script type="application/ld+json">${JSON.stringify(items).replace(/</g, "\\u003c")}</script>\n`;
}

const notice = `<p class="meta">Listings are collected daily from each venue's own website and may change. Always check the venue's page before you go.</p>`;

function cityPage(id) {
  const c = CITIES[id];
  const vs = Object.entries(data.venues).filter(([, v]) => v.city === id);
  const all = events.filter((e) => data.venues[e.venue].city === id);
  const shown = all.slice(0, CITY_LIMIT);
  return head({
    title: `Live Music in ${c.name}: Upcoming Gigs | Live Music Japan`,
    desc: `Upcoming gigs at ${vs.length} ${c.name} live music venues, with door times, prices and links to each venue, plus tips for visitors.`,
    path: `/${id}/`, ld: eventLd(shown),
  }) + `<main class="page">
<p class="crumb"><a href="/">All gigs</a> / ${c.name}</p>
<h1>Live music in ${c.name}</h1>
<p>${esc(c.intro)}</p>
<p>${esc(c.tip)}</p>
<h2>Venues in ${c.name}</h2>
<ul class="venue-list">
${vs.map(([k, v]) => `<li><a href="/venues/${esc(k)}/">${esc(text(v.name))}</a> <span class="meta">· ${esc(text(v.area))}</span></li>`).join("\n")}
</ul>
<h2>Upcoming gigs</h2>
${notice}
${shown.length ? gigList(shown) : `<p class="empty">No upcoming gigs are listed right now.</p>`}
${all.length > shown.length ? `<p>See each venue's page for later dates, or browse <a href="/">all gigs with filters</a>.</p>\n` : ""}<h2>New to Japanese live houses?</h2>
<p>Read <a href="/guides/how-live-houses-work/">how live houses work</a> and <a href="/guides/buying-tickets/">how to buy tickets as a visitor</a>.</p>
</main>
` + foot;
}

function venuePage(id) {
  const v = data.venues[id];
  const c = CITIES[v.city];
  const name = text(v.name);
  const list = events.filter((e) => e.venue === id);
  const others = Object.entries(data.venues).filter(([k, o]) => o.city === v.city && k !== id);
  const site = safeUrl(v.site);
  if (!VENUES[id]) throw new Error(`Add a description for venue "${id}" in tools/build-pages.mjs`);
  return head({
    title: `${name}: Schedule and Visitor Guide | Live Music Japan`,
    desc: `Upcoming gigs at ${name} in ${text(v.area)}, ${c.name}, with door times, prices and practical information for visitors.`,
    path: `/venues/${id}/`, ld: eventLd(list),
  }) + `<main class="page">
<p class="crumb"><a href="/">All gigs</a> / <a href="/${v.city}/">${c.name}</a> / ${esc(name)}</p>
<h1>${esc(name)}</h1>
<p lang="ja" class="meta">${esc(v.name.ja)}</p>
<p>${esc(VENUES[id])}</p>
<ul class="facts">
<li><strong>Area:</strong> ${esc(text(v.area))}, ${c.name}</li>
${text(v.station) ? `<li><strong>Nearest station:</strong> ${esc(text(v.station))}</li>\n` : ""}${site ? `<li><strong>Official schedule:</strong> <a href="${esc(site)}" rel="noopener">venue website</a></li>\n` : ""}<li><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(v.name.en || v.name.ja)}" rel="noopener">Open in Google Maps</a></li>
</ul>
<h2>Upcoming gigs at ${esc(name)}</h2>
${notice}
${list.length ? gigList(list, { showVenue: false }) : `<p class="empty">No upcoming gigs are listed right now. Check the venue's website for the latest schedule.</p>`}
<h2>Before you go</h2>
<p>Expect a drink charge on top of your ticket, and bring some cash. Our guide to <a href="/guides/how-live-houses-work/">how live houses work</a> explains entry numbers and door times, and <a href="/guides/gig-japanese/">Japanese for going to a gig</a> will help you read the venue's own schedule.</p>
${others.length ? `<h2>More venues in ${c.name}</h2>\n<ul class="venue-list">\n${others.map(([k, o]) => `<li><a href="/venues/${esc(k)}/">${esc(text(o.name))}</a></li>`).join("\n")}\n</ul>\n` : ""}</main>
` + foot;
}

const guidePage = (g) => head({ title: `${g.title} | Live Music Japan`, desc: g.desc, path: `/guides/${g.slug}/` }) + `<main class="page">
<p class="crumb"><a href="/">All gigs</a> / Guides</p>
<h1>${esc(g.title)}</h1>
${g.body}
<h2>Find a show</h2>
<ul class="venue-list">
${venueCities.map((c) => `<li><a href="/${c}/">Gigs in ${CITIES[c].name}</a></li>`).join("\n")}
</ul>
</main>
` + foot;

const aboutPage = head({
  title: "About Live Music Japan",
  desc: "What Live Music Japan is, where its gig listings come from, and how venues can ask for changes.",
  path: "/about/",
}) + `<main class="page">
<h1>About Live Music Japan</h1>
<p>Live Music Japan brings gig schedules from independent venues together in one place, in Japanese and English, for people who live in Japan and people visiting. Japan's live music scene is huge, but it's spread across hundreds of venue websites, most of them only in Japanese. This site aims to make it easier to find a show on any given night.</p>
<h2>Where the listings come from</h2>
<p>Listings are collected once a day from the public schedule pages of each venue, and every gig links back to the venue's own page. We currently cover ${Object.keys(data.venues).length} venues across ${venueCities.map((c) => CITIES[c].name).join(", ")}. Band names and event titles appear as the venue wrote them, usually in Japanese.</p>
<p>Listings can be out of date or incomplete, and the venue's own page is always the final word. Please check it before you travel, especially for prices, door times and cancellations.</p>
<h2>Guides</h2>
<ul class="venue-list">
${GUIDES.map((g) => `<li><a href="/guides/${g.slug}/">${esc(g.title)}</a></li>`).join("\n")}
</ul>
<h2>Venues and corrections</h2>
<p>If you run a venue and want your listings changed or removed, or you've spotted a mistake, please <a href="${CONTACT_URL}" rel="noopener">contact us here</a>. We'll be glad to add your venue too.</p>
</main>
` + foot;

const notFound = head({
  title: "Page not found | Live Music Japan",
  desc: "This page could not be found.",
  ads: false, robots: "noindex",
}) + `<main class="page">
<h1>Page not found</h1>
<p>That page doesn't exist. It may have moved, or the address may have a typo.</p>
<p><a href="/">See all upcoming gigs</a></p>
</main>
` + foot;

function write(path, content) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

for (const c of venueCities) write(`${c}/index.html`, cityPage(c));
for (const id of Object.keys(data.venues)) write(`venues/${id}/index.html`, venuePage(id));
for (const g of GUIDES) write(`guides/${g.slug}/index.html`, guidePage(g));
write("about/index.html", aboutPage);
write("404.html", notFound);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

// The app replaces this list when JavaScript runs; it's here for readers and crawlers before that.
const homeGigs = gigList(events.slice(0, HOME_LIMIT));
const home = readFileSync(join(ROOT, "index.html"), "utf8");
const marked = /<!-- build:gigs -->[\s\S]*<!-- \/build:gigs -->/;
const homeLinks = /<!-- build:links -->[\s\S]*<!-- \/build:links -->/;
if (!marked.test(home) || !homeLinks.test(home)) throw new Error("index.html is missing its build markers");
write("index.html", home
  .replace(marked, () => `<!-- build:gigs -->\n${homeGigs}<!-- /build:gigs -->`)
  .replace(homeLinks, () => `<!-- build:links -->\n${nav}\n<!-- /build:links -->`));

const urls = [
  ["/", LISTINGS_DATE],
  ...venueCities.map((c) => [`/${c}/`, LISTINGS_DATE]),
  ...Object.keys(data.venues).map((id) => [`/venues/${id}/`, LISTINGS_DATE]),
  ...GUIDES.map((g) => [`/guides/${g.slug}/`, CONTENT_DATE]),
  ["/about/", CONTENT_DATE],
  ["/privacy.html", CONTENT_DATE],
];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${d}</lastmod></url>`).join("\n")}
</urlset>
`);
console.log(`Built ${venueCities.length} city, ${Object.keys(data.venues).length} venue and ${GUIDES.length} guide pages; ${events.length} upcoming gigs; ${urls.length} sitemap URLs.`);
