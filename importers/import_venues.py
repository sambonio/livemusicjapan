"""Collect upcoming gigs from venue schedule pages into data/live-events.json.

Run daily by .github/workflows/import.yml. Each venue has a small parser for its
own page layout. Pages are fetched politely (identifying user agent, a pause
between requests) and only from venues whose robots.txt allows it.

Offline testing: python importers/import_venues.py --offline DIR
reads DIR/<venue>.html instead of fetching (current month only).
"""
import argparse
import json
import re
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from bs4 import BeautifulSoup

JST = timezone(timedelta(hours=9))
UA = "LiveMusicJapanBot/0.1 (+https://livemusicjapan.app/)"
ROOT = Path(__file__).resolve().parent.parent

VENUES = {
    "shelter": {"name": {"ja": "下北沢SHELTER", "en": "Shimokitazawa SHELTER"}, "area": {"ja": "下北沢", "en": "Shimokitazawa"},
                "city": "tokyo", "station": {"ja": "下北沢駅", "en": "Shimokitazawa Stn."}, "genre": "rock",
                "site": "https://www.loft-prj.co.jp/schedule/shelter"},
    "loft": {"name": {"ja": "新宿LOFT", "en": "Shinjuku LOFT"}, "area": {"ja": "新宿", "en": "Shinjuku"},
             "city": "tokyo", "station": {"ja": "西武新宿駅", "en": "Seibu-Shinjuku Stn."}, "genre": "rock",
             "site": "https://www.loft-prj.co.jp/schedule/loft"},
    "www": {"name": {"ja": "渋谷WWW", "en": "Shibuya WWW"}, "area": {"ja": "渋谷", "en": "Shibuya"},
            "city": "tokyo", "station": {"ja": "渋谷駅", "en": "Shibuya Stn."}, "genre": "various",
            "site": "https://www-shibuya.jp/schedule/"},
    "wwwx": {"name": {"ja": "渋谷WWW X", "en": "Shibuya WWW X"}, "area": {"ja": "渋谷", "en": "Shibuya"},
             "city": "tokyo", "station": {"ja": "渋谷駅", "en": "Shibuya Stn."}, "genre": "various",
             "site": "https://www-shibuya.jp/schedule/"},
    "liquidroom": {"name": {"ja": "恵比寿LIQUIDROOM", "en": "Ebisu LIQUIDROOM"}, "area": {"ja": "恵比寿", "en": "Ebisu"},
                   "city": "tokyo", "station": {"ja": "恵比寿駅", "en": "Ebisu Stn."}, "genre": "various",
                   "site": "https://www.liquidroom.net/schedule"},
    "ufoclub": {"name": {"ja": "東高円寺U.F.O.CLUB", "en": "Higashi-Koenji U.F.O. CLUB"}, "area": {"ja": "高円寺", "en": "Koenji"},
                "city": "tokyo", "station": {"ja": "東高円寺駅", "en": "Higashi-Koenji Stn."}, "genre": "rock",
                "site": "https://www.ufoclub.jp/schedule/"},
    "pitinn": {"name": {"ja": "新宿PIT INN", "en": "Shinjuku PIT INN"}, "area": {"ja": "新宿", "en": "Shinjuku"},
               "city": "tokyo", "station": {"ja": "新宿三丁目駅", "en": "Shinjuku-sanchome Stn."}, "genre": "jazz",
               "english": True, "site": "https://pit-inn.com/schedule"},
    "unit": {"name": {"ja": "代官山UNIT", "en": "Daikanyama UNIT"}, "area": {"ja": "代官山", "en": "Daikanyama"},
             "city": "tokyo", "station": {"ja": "代官山駅", "en": "Daikanyama Stn."}, "genre": "various",
             "site": "https://www.unit-tokyo.com/schedule/"},
}


def text(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip() if el else ""


def first_yen(s):
    """Lowest ¥ amount in a price string, or None."""
    nums = [int(n.replace(",", "")) for n in re.findall(r"[¥￥]\s*([\d,]{3,})", s or "")]
    return min(nums) if nums else None


def times(s):
    """('18:00', '19:00') from strings like 'OPEN 18:00 - START 19:00' or 'OPEN&START 18:30'."""
    found = re.findall(r"(\d{1,2}:\d{2})", s or "")
    if not found:
        return None, None
    return found[0], (found[1] if len(found) > 1 else found[0])


def year_for(month, today):
    # Schedules only list month/day; a month far behind today belongs to next year
    return today.year + 1 if month < today.month - 6 else today.year


def event(venue, d, title="", artists="", open_=None, start=None, price_text="", url=""):
    sold_out = bool(re.search(r"SOLD\s*OUT|完売", price_text + title, re.I))
    return {"soldOut": sold_out, "venue": venue, "date": d.isoformat(), "open": open_, "start": start,
            "title": {"ja": title}, "artist": {"ja": artists or title},
            "genre": VENUES[venue]["genre"], "price": first_yen(price_text),
            "priceText": price_text or None, "url": url}


# ---------- parsers: (html, page_url, today) -> list of events ----------

def parse_loft(venue):
    def parse(html, page_url, today):
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for col in soup.select("section.block_schedule_list div.column:not(.swiper-slide)"):
            a = col.find("a", href=True)
            y, m, d = (text(col.select_one(f"time .{k}")) for k in ("year", "month", "day"))
            if not (a and y.isdigit() and m.isdigit() and d.isdigit()):
                continue
            o, s = times(text(col.select_one(".open")))
            artists = " / ".join(text(li) for li in col.select(".artist_tag li"))
            out.append(event(venue, date(int(y), int(m), int(d)), text(col.select_one(".c_title")), artists, o, s, url=a["href"]))
        return out
    return parse


def parse_www(html, page_url, today):
    soup = BeautifulSoup(html, "html.parser")
    m = re.search(r"(\d{4})(\d{2})\.php", page_url)
    if m:
        y, mo = int(m[1]), int(m[2])
    else:
        hdr = soup.select_one("li.month")
        y, mo = int(text(hdr.select_one(".year"))), int(text(hdr.select_one("a")))
    out = []
    for art in soup.select("article.column[data-place]"):
        day = text(art.select_one(".date .day"))
        if not day.isdigit():
            continue
        venue = "wwwx" if "x" in art["data-place"] else "www"
        a = art.select_one("a.pageLink")
        o, s = times(text(art.select_one(".openstart")))
        out.append(event(venue, date(y, mo, int(day)), text(art.select_one(".exp")), text(art.select_one(".title")),
                         o, s, url=a["href"] if a else page_url))
    return out


def parse_liquidroom(html, page_url, today):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for art in soup.select("article"):
        a = art.select_one("a.s_link")
        m = re.search(r"_(\d{4})(\d{2})(\d{2})", a["href"]) if a else None
        if not m:
            continue
        info = {text(dl.dt): text(dl.dd) for dl in art.select(".info dl") if dl.dt}
        price = " / ".join(f"{k} {v}" for k, v in info.items() if k in ("ADV", "DOOR", "TICKET"))
        out.append(event("liquidroom", date(int(m[1]), int(m[2]), int(m[3])), text(art.select_one(".subtitle")),
                         text(art.select_one("h2")), info.get("OPEN"), info.get("START") or info.get("OPEN"), price, a["href"]))
    return out


def parse_ufoclub(html, page_url, today):
    soup = BeautifulSoup(html, "html.parser")
    m = re.search(r"(\d{4})年(\d{1,2})月", text(soup.select_one("div.month")))
    if not m:
        return []
    y, mo = int(m[1]), int(m[2])
    out = []
    for tr in soup.select("table.schedule-table tr"):
        th, tds = tr.find("th"), tr.find_all("td")
        if not (th and text(th).isdigit() and len(tds) >= 2):
            continue
        body = tds[1]
        title = text(body.find("strong")).strip("【】")
        live = re.search(r"/LIVE;\s*(.+?)(?=\s/[A-Z ]+;|※|$)", text(body))
        o, s = times(text(tr.select_one(".td_open")))
        out.append(event("ufoclub", date(y, mo, int(text(th))), title, live[1].strip() if live else title, o, s,
                         text(tr.select_one(".td_charge")), page_url))
    return out


def parse_pitinn(html, page_url, today):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for box in soup.select("div.day_box"):
        m = re.match(r"(\d{1,2})/(\d{1,2})", text(box.select_one(".day_bar .date")))
        if not m:
            continue
        mo, d = int(m[1]), int(m[2])
        a = box.select_one(".day_pict a[href]") or box.select_one(".schedule_button a[href]")
        o, _ = times(text(box.select_one(".day_open")))
        _, s = times(text(box.select_one(".day_start")))
        fee = " ".join(t for t in (text(f) for f in box.select(".artist_fee")) if t)
        out.append(event("pitinn", date(year_for(mo, today), mo, d), text(box.select_one(".day_title")),
                         text(box.select_one(".day_name")), o, s or o, fee, a["href"] if a else page_url))
    return out


def parse_unit(html, page_url, today):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for item in soup.select("div.p-schedule__item"):
        m = re.match(r"(\d{1,2})/(\d{1,2})", text(item.select_one(".p-schedule__item-date")))
        if not m:
            continue
        mo, d = int(m[1]), int(m[2])
        a = item.find("a", href=True)
        o, s = times(text(item.select_one(".p-schedule__item-open")))
        title = " ".join(t for t in (text(item.select_one(c)) for c in (".p-schedule__item-title-top", ".p-schedule__item-title")) if t)
        out.append(event("unit", date(year_for(mo, today), mo, d), title,
                         text(item.select_one(".p-schedule__item-lineup")) or title, o, None, url=a["href"] if a else page_url))
    return out


def sources(today):
    """(snapshot name, parser, [this month's URL, next month's URL])"""
    nxt = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
    return [
        ("shelter", parse_loft("shelter"), ["https://www.loft-prj.co.jp/schedule/shelter"]),
        ("loft", parse_loft("loft"), ["https://www.loft-prj.co.jp/schedule/loft"]),
        ("www", parse_www, ["https://www-shibuya.jp/schedule/", f"https://www-shibuya.jp/schedule/{nxt:%Y%m}.php"]),
        ("liquidroom", parse_liquidroom, ["https://www.liquidroom.net/schedule", f"https://www.liquidroom.net/schedule/{nxt:%Y/%m}"]),
        ("ufoclub", parse_ufoclub, ["https://www.ufoclub.jp/schedule/", "https://www.ufoclub.jp/schedule/next-month/"]),
        ("pitinn", parse_pitinn, ["https://pit-inn.com/schedule", "https://pit-inn.com/schedule-day",
                                  "https://pit-inn.com/next-schedule"]),
        ("unit", parse_unit, ["https://www.unit-tokyo.com/schedule/", f"https://www.unit-tokyo.com/schedule/{nxt:%Y-%m}/"]),
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", help="read <name>.html snapshots from this folder instead of fetching")
    ap.add_argument("--out", default=str(ROOT / "data" / "live-events.json"))
    args = ap.parse_args()

    today = datetime.now(JST).date()
    events, report = [], {}
    if not args.offline:
        import requests
        session = requests.Session()
        session.headers["User-Agent"] = UA

    for name, parser, urls in sources(today):
        found = []
        for i, url in enumerate(urls):
            try:
                if args.offline:
                    if i > 0:
                        continue
                    html = (Path(args.offline) / f"{name}.html").read_text(encoding="utf-8")
                else:
                    r = session.get(url, timeout=30)
                    r.raise_for_status()
                    r.encoding = r.apparent_encoding if r.encoding in (None, "ISO-8859-1") else r.encoding
                    html = r.text
                    time.sleep(3)
                found += parser(html, url, today)
            except Exception as e:  # one broken page must not stop the others
                print(f"! {name} {url}: {e}", file=sys.stderr)
        report[name] = len(found)
        events += found

    # Keep upcoming gigs only, drop duplicates (same venue, date, start, title)
    seen, upcoming = set(), []
    for e in sorted(events, key=lambda e: (e["date"], e["start"] or "", e["venue"])):
        key = (e["venue"], e["date"], e["start"], e["artist"]["ja"])
        if e["date"] >= today.isoformat() and key not in seen:
            seen.add(key)
            upcoming.append(e)
    for i, e in enumerate(upcoming, 1):
        e["id"] = i

    venues = {k: {kk: vv for kk, vv in v.items() if kk != "genre"} for k, v in VENUES.items()}
    data = {"updated": datetime.now(JST).isoformat(timespec="minutes"), "venues": venues, "events": upcoming}
    Path(args.out).write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("found per page set:", report, "| upcoming:", len(upcoming))
    if not upcoming:
        sys.exit("no events found, check the parsers")


if __name__ == "__main__":
    main()
